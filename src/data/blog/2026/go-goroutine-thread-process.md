---
title: 从 Go 看并发：一文串起进程、线程、goroutine 与 GMP 模型
description: 把进程、线程、goroutine、内存模型、GMP 调度模型放到同一条主线中，结合 Go 代码示例，理解现代并发编程模型与底层实现机制的关系。
pubDatetime: 2026-03-14T20:00:00+08:00
draft: false
featured: false
tags:
  - golang
  - concurrency
  - goroutine
  - gmp
hideEditPost: false
---

很多学习并发编程的人会把进程、线程、goroutine、内存模型、GMP 模型混成一团。单个概念拆开看都不难，但一旦放到同一条链路里，就容易只记住名词，不清楚它们之间的关系。

本文尝试沿着一条更工程化的主线来整理这些概念：先说明进程、线程、协程各自解决什么问题，再进入 Go 的 goroutine 特性、内存模型保证、GMP 调度模型，最后用代码示例把这些概念串起来。

文中对 Go 内存模型的描述主要参考 [Go Memory Model](https://go.dev/ref/mem)（当前版本）。不同语言和运行时的并发语义有差异，理解时要避免把 Go 的行为直接套用到其他语言。

## 一、先把分工看清：进程、线程、协程各负责什么

从操作系统的视角看，这三个概念的抽象层次不同：

- **进程**：操作系统分配资源的基本单位，拥有独立的内存空间、文件描述符等
- **线程**：CPU 调度的基本单位，同一进程内的线程共享进程资源
- **协程**：用户态的轻量级执行单元，由用户态运行时调度，不直接对应内核线程

工程上可以这样理解：

- 当你需要隔离性、独立资源时，用进程
- 当你需要利用多核 CPU 并行执行时，用线程
- 当你需要高并发 I/O 密集任务、希望降低调度开销时，用协程

### 三者的资源隔离与共享

```text
进程 A                            进程 B
  | 独立内存、文件描述符等          | 独立内存、文件描述符等
  |
  |-- 线程 A1 (共享进程 A 资源)
  |   |-- 协程 1
  |   |-- 协程 2
  |
  |-- 线程 A2 (共享进程 A 资源)
      |-- 协程 3
      |-- 协程 4
```

从资源消耗角度看，协程 < 线程 < 进程；从隔离性角度看，进程 > 线程 > 协程。

### 同一进程内的线程共享哪些资源

同一进程内的所有线程共享以下资源：

#### 1. 虚拟地址空间

包括代码段（Text）、数据段、堆（Heap）和大部分内存映射区域。这意味着：

- 线程间可以直接访问共享的全局变量
- 堆上分配的内存对所有线程可见
- 动态链接库加载后的代码段是共享的

这也是为什么多线程编程需要同步机制——因为内存是共享的，多个线程可能同时读写同一块内存。

#### 2. 文件描述符表

每个进程维护一个文件描述符表，所有线程共享这张表。这意味着：

- 一个线程打开的文件，其他线程可以通过同一个文件描述符读写
- 网络连接、套接字、管道等对所有线程开放
- 文件指针（读写位置）是共享的，多个线程操作同一个文件需要协调

#### 3. 进程标识符

- **PID（Process ID）**：所有线程共享同一个进程 ID
- **PPID（Parent Process ID）**：父进程 ID 对所有线程相同
- **会话 ID 和进程组 ID**：信号处理等行为以进程为单位

#### 4. 信号处理

信号的处理行为（如 `SIGINT`、`SIGTERM`）是以进程为单位的：

- 信号会发送到整个进程，而不是单个线程
- 信号处理函数注册后，进程内任意线程都可能被选中执行该函数
- 线程可以独立屏蔽某些信号（`sigprocmask`/`pthread_sigmask`）

#### 5. 当前工作目录和根目录

- `getcwd()` / `chdir()`：改变工作目录会影响整个进程的所有线程
- 文件相对路径解析对所有线程一致

#### 6. 其他共享资源

| 资源类型 | 共享内容 | 说明 |
|---------|----------|------|
| 用户 ID / 组 ID | UID、GID、辅助组 | 权限检查以进程为单位 |
| 资源限制 | `rlimit` | 文件描述符数量、内存限制等 |
| 定时器 | `setitimer` 创建的定时器 | 定时器信号传递到进程 |
| 内存锁 | `mlock` | 内存页锁定对整个进程生效 |
| 共享内存 | System V、POSIX 共享内存 | 进程级共享，线程自然可访问 |

### 线程独享的资源

虽然共享了大量资源，但每个线程也有自己独立的状态：

| 独享资源 | 说明 |
|---------|------|
| **线程 ID** | `pthread_self()` 返回的标识符 |
| **寄存器状态** | 程序计数器、栈指针等 CPU 寄存器 |
| **栈空间** | 每个线程有独立的调用栈，用于函数调用和局部变量 |
| **线程局部存储** | `__thread` 或 `pthread_key_create` 创建的 TLS |
| **信号掩码** | 线程可以独立屏蔽某些信号 |
| **错误码** | `errno` 在某些实现中是线程局部的 |
| **调度优先级** | 线程可以设置独立的调度策略和优先级 |

## 二、传统线程模型的问题在哪里

传统的"一对一"线程模型中，每个用户线程对应一个内核线程。这种模型的问题在于：

- **创建成本高**：每个线程都有独立的栈空间、内核数据结构
- **切换成本高**：用户态与内核态切换、缓存失效、TLB 刷新
- **数量受限**：内核线程数量受系统资源限制，一台机器上很难支持数百万线程

当一个服务需要处理大量连接时，例如 Web 服务器、即时通讯、推送服务，每个连接一个线程的模型很快会遇到瓶颈。

这就是为什么需要"M:N"的线程模型：M 个用户线程映射到 N 个内核线程。

## 三、goroutine 是什么，和普通线程有什么区别

Go 的 goroutine 是一种用户态的轻量级协程。它的特点是：

- **创建成本低**：初始栈大小仅约 2KB，可动态伸缩
- **调度成本低**：用户态调度，不涉及内核态切换
- **数量可扩展**：单机上可以轻松创建数百万个 goroutine

一个简单的 goroutine 示例：

```go
package main

import (
	"fmt"
	"time"
)

func worker(id int) {
	for i := 0; i < 3; i++ {
		fmt.Printf("Worker %d: step %d\n", id, i)
		time.Sleep(time.Millisecond * 100)
	}
}

func main() {
	// 启动 5 个 goroutine
	for i := 1; i <= 5; i++ {
		go worker(i)
	}

	// 等待所有 goroutine 完成
	time.Sleep(time.Second)
	fmt.Println("Done")
}
```

这里的 `go worker(i)` 就启动了一个新的 goroutine，与主 goroutine 并发执行。

### goroutine 与操作系统的关系

关键理解是：goroutine 不是直接运行在操作系统线程上，而是由 Go 运行时调度到有限的操作系统线程上。

```text
goroutine 1, 2, 3, 4, 5, 6, ...
         |
         v
    Go Runtime (GMP 调度器)
         |
         v
OS Thread 1, OS Thread 2, OS Thread 3 (通常是 CPU 核心数)
```

## 四、GMP 模型：G、M、P 分别是什么

GMP 是 Go 调度器的核心模型，三个字母分别代表：

### 1. G：Goroutine

- 代表一个 goroutine
- 包含运行栈、程序计数器、状态等
- 一个 G 对应一个用户代码执行单元

### 2. M：Machine

- 代表一个系统线程
- 由操作系统调度，在 CPU 上执行
- 可以运行多个 G（通过调度切换）

### 3. P：Processor

- 代表逻辑处理器（通常等于 CPU 核心数）
- 维护一个本地运行队列（LRQ），存储待运行的 G
- P 是 M 运行 G 的"门票"：M 必须持有 P 才能执行 G

### GMP 的基本关系

```text
P (Processor)             P (Processor)             P (Processor)
  |                         |                         |
  |-- LRQ: G1, G2, G3       |-- LRQ: G4, G5           |-- LRQ: G6, G7
  |                         |                         |
  v                         v                         v
M (Thread 1)             M (Thread 2)             M (Thread 3)
(持有 P，运行 G)         (持有 P，运行 G)         (持有 P，运行 G)
```

当 P 的本地队列空了，它会尝试从全局队列（GRQ）或其他 P 的队列"偷"任务，这就是工作窃取（Work Stealing）机制。

### 调度时机

goroutine 会在以下时机被调度切换：

- 发起阻塞系统调用（如网络 I/O）
- 执行时间片耗尽（sysmon 监控）
- 主动调用 `runtime.Gosched()`
- 执行垃圾回收

## 五、Go 内存模型：happens-before 关系

理解并发编程时，内存模型是绕不开的话题。Go 内存模型定义了在不同 goroutine 间读写操作时，什么情况下能看到什么值。

核心概念是**happens-before**关系：如果操作 A happens-before 操作 B，那么 A 对内存的修改在 B 执行时一定是可见的。

### 必须满足的 happens-before 规则

1. **goroutine 创建**：`go` 语句 happens-before 该 goroutine 内的执行开始
2. **channel 发送与接收**：
   - 向 channel 发送 happens-before 对应的接收完成
   - channel 关闭 happens-before 从该 channel 接收到零值
3. **Lock**：对于 `sync.Mutex` 或 `sync.RWMutex`：
   - 第 n 次解锁 happens-before 第 n+1 次加锁
4. **Once**：`sync.Once` 的 `Do` 方法返回 happens-before 传入函数的执行
5. **原子操作**：使用 `sync/atomic` 时，happens-before 关系由具体函数保证

### 一个反例：未同步的并发访问

```go
package main

import "fmt"

var data int

func main() {
	go func() {
		data = 42  // goroutine 1 写入
	}()

	fmt.Println(data)  // main goroutine 读取
	// 输出可能是 0，也可能是 42，甚至可能是其他值
}
```

这里没有 happens-before 关系，所以读取结果是不确定的。

### 正确做法：使用 channel 同步

```go
package main

import "fmt"

func main() {
	ch := make(chan int)

	go func() {
		ch <- 42  // 发送 happens-before 接收完成
	}()

	val := <-ch  // 接收完成 happens-before 后续代码
	fmt.Println(val)  // 一定输出 42
}
```

有了 channel 的 happens-before 保证，结果就是确定性的。

### 使用 sync.WaitGroup

```go
package main

import (
	"fmt"
	"sync"
)

var data int
var wg sync.WaitGroup

func writer() {
	defer wg.Done()
	data = 42
}

func reader() {
	defer wg.Done()
	fmt.Println(data)
}

func main() {
	wg.Add(2)
	go writer()
	go reader()
	wg.Wait()
}
```

**注意**：上面的代码仍然有数据竞争问题！`WaitGroup` 只保证 goroutine 完成时间，不保证内存可见性。正确做法需要加锁或使用其他同步机制：

```go
package main

import (
	"fmt"
	"sync"
)

var data int
var mu sync.Mutex
var wg sync.WaitGroup

func writer() {
	defer wg.Done()
	mu.Lock()
	data = 42
	mu.Unlock()
}

func reader() {
	defer wg.Done()
	mu.Lock()
	fmt.Println(data)
	mu.Unlock()
}

func main() {
	wg.Add(2)
	go writer()
	go reader()
	wg.Wait()
}
```

## 六、channel：goroutine 间的通信管道

Go 的哲学是"不要通过共享内存来通信，而要通过通信来共享内存"。channel 就是这种哲学的核心实现。

### 基本用法

```go
package main

import "fmt"

func producer(ch chan<- int) {
	for i := 0; i < 5; i++ {
		ch <- i
		fmt.Printf("Sent: %d\n", i)
	}
	close(ch)
}

func consumer(ch <-chan int) {
	for val := range ch {
		fmt.Printf("Received: %d\n", val)
	}
}

func main() {
	ch := make(chan int)

	go producer(ch)
	consumer(ch)
}
```

### 无缓冲 vs 有缓冲 channel

```go
// 无缓冲：同步，发送方会阻塞直到接收方准备好
ch := make(chan int)

// 有缓冲：异步，缓冲区满之前发送方不会阻塞
ch := make(chan int, 10)
```

无缓冲 channel 本身就是一种同步机制，而带缓冲的 channel 则更像是消息队列。

### select：多路复用

```go
package main

import (
	"fmt"
	"time"
)

func main() {
	ch1 := make(chan string)
	ch2 := make(chan string)

	go func() {
		time.Sleep(time.Second)
		ch1 <- "from ch1"
	}()

	go func() {
		time.Sleep(time.Second * 2)
		ch2 <- "from ch2"
	}()

	for i := 0; i < 2; i++ {
		select {
		case msg := <-ch1:
			fmt.Println(msg)
		case msg := <-ch2:
			fmt.Println(msg)
		}
	}
}
```

## 七、sync 包：传统同步原语的 Go 实现

除了 channel，Go 的 `sync` 包提供了传统的同步原语。

### Mutex：互斥锁

```go
package main

import (
	"fmt"
	"sync"
)

type Counter struct {
	mu    sync.Mutex
	value int
}

func (c *Counter) Increment() {
	c.mu.Lock()
	c.value++
	c.mu.Unlock()
}

func (c *Counter) Value() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.value
}

func main() {
	var wg sync.WaitGroup
	counter := &Counter{}

	for i := 0; i < 1000; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			counter.Increment()
		}()
	}

	wg.Wait()
	fmt.Println(counter.Value())  // 1000
}
```

### RWMutex：读写锁

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

type Data struct {
	mu   sync.RWMutex
	data map[string]string
}

func (d *Data) Get(key string) (string, bool) {
	d.mu.RLock()
	defer d.mu.RUnlock()
	val, ok := d.data[key]
	return val, ok
}

func (d *Data) Set(key, value string) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.data[key] = value
}

func main() {
	d := &Data{data: make(map[string]string)}

	// 多个 goroutine 同时读
	for i := 0; i < 5; i++ {
		go func(id int) {
			if val, ok := d.Get("foo"); ok {
				fmt.Printf("Reader %d: %s\n", id, val)
			}
		}(i)
	}

	// 写操作需要独占锁
	d.Set("foo", "bar")
	time.Sleep(time.Millisecond * 100)
}
```

### Once：只执行一次

```go
package main

import (
	"fmt"
	"sync"
)

var once sync.Once
var config map[string]string

func loadConfig() {
	config = map[string]string{
		"host": "localhost",
		"port": "8080",
	}
	fmt.Println("Config loaded")
}

func getConfig() map[string]string {
	once.Do(loadConfig)
	return config
}

func main() {
	for i := 0; i < 5; i++ {
		go getConfig()
	}
}
// Config loaded 只打印一次
```

### Cond：条件变量

```go
package main

import (
	"fmt"
	"sync"
	"time"
)

type Queue struct {
	items []int
	cond  *sync.Cond
	mu    sync.Mutex
}

func NewQueue() *Queue {
	return &Queue{
		cond: sync.NewCond(&sync.Mutex{}),
	}
}

func (q *Queue) Enqueue(item int) {
	q.mu.Lock()
	defer q.mu.Unlock()
	q.items = append(q.items, item)
	q.cond.Signal()  // 通知一个等待的 goroutine
}

func (q *Queue) Dequeue() int {
	q.mu.Lock()
	defer q.mu.Unlock()

	for len(q.items) == 0 {
		q.cond.Wait()  // 等待条件满足
	}

	item := q.items[0]
	q.items = q.items[1:]
	return item
}

func main() {
	q := NewQueue()

	// 消费者
	go func() {
		for {
			item := q.Dequeue()
			fmt.Printf("Dequeued: %d\n", item)
		}
	}()

	// 生产者
	for i := 0; i < 5; i++ {
		q.Enqueue(i)
		time.Sleep(time.Millisecond * 500)
	}
}
```

## 八、context：跨 goroutine 的取消与超时传播

`context` 包用于跨 API 边界和 goroutine 传递取消信号、截止时间和请求值。

### 基本取消

```go
package main

import (
	"context"
	"fmt"
	"time"
)

func worker(ctx context.Context, id int) {
	for {
		select {
		case <-ctx.Done():
			fmt.Printf("Worker %d: %v\n", id, ctx.Err())
			return
		default:
			fmt.Printf("Worker %d: working...\n", id)
			time.Sleep(time.Millisecond * 500)
		}
	}
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())

	for i := 1; i <= 3; i++ {
		go worker(ctx, i)
	}

	time.Sleep(time.Second * 2)
	cancel()  // 取消所有 worker
	time.Sleep(time.Millisecond * 100)
}
```

### 超时控制

```go
package main

import (
	"context"
	"fmt"
	"time"
)

func doWork(ctx context.Context) error {
	select {
	case <-time.After(time.Second * 3):
		fmt.Println("Work completed")
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func main() {
	// 设置 2 秒超时
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*2)
	defer cancel()

	err := doWork(ctx)
	if err != nil {
		fmt.Printf("Error: %v\n", err)  // context deadline exceeded
	}
}
```

### 值传递

```go
package main

import (
	"context"
	"fmt"
)

type contextKey string

const userIDKey contextKey = "userID"

func processRequest(ctx context.Context) {
	if userID := ctx.Value(userIDKey); userID != nil {
		fmt.Printf("Processing request for user: %v\n", userID)
	}
}

func main() {
	ctx := context.WithValue(context.Background(), userIDKey, "user-123")
	processRequest(ctx)
}
```

## 九、实战示例：一个简单的 worker pool

综合前面的概念，实现一个 worker pool 来展示 goroutine、channel、context 和 sync 的配合使用：

```go
package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type Task struct {
	ID   int
	Data string
}

type Result struct {
	TaskID int
	Output string
	Error  error
}

func worker(ctx context.Context, id int, tasks <-chan Task, results chan<- Result, wg *sync.WaitGroup) {
	defer wg.Done()

	for {
		select {
		case <-ctx.Done():
			fmt.Printf("Worker %d: shutting down\n", id)
			return
		case task, ok := <-tasks:
			if !ok {
				fmt.Printf("Worker %d: tasks channel closed\n", id)
				return
			}
			// 模拟工作
			time.Sleep(time.Millisecond * 100 * time.Duration(id))
			results <- Result{
				TaskID: task.ID,
				Output: fmt.Sprintf("Processed %s by worker %d", task.Data, id),
			}
		}
	}
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 创建任务通道
	tasks := make(chan Task, 100)
	results := make(chan Result, 100)

	// 启动 worker pool
	var wg sync.WaitGroup
	workerCount := 5
	for i := 1; i <= workerCount; i++ {
		wg.Add(1)
		go worker(ctx, i, tasks, results, &wg)
	}

	// 启动结果收集器
	go func() {
		wg.Wait()
		close(results)
	}()

	// 提交任务
	for i := 1; i <= 20; i++ {
		tasks <- Task{ID: i, Data: fmt.Sprintf("task-%d", i)}
	}
	close(tasks)

	// 收集结果
	for result := range results {
		fmt.Printf("Result: %+v\n", result)
	}
}
```

## 十、总结

把本文内容压缩成最需要记住的几句话：

- 进程是资源隔离单位，线程是 CPU 调度单位，goroutine 是 Go 的用户态轻量级协程
- GMP 模型中，G 是 goroutine，M 是系统线程，P 是逻辑处理器；P 持有本地运行队列，M 需要持有 P 才能运行 G
- Go 内存模型的核心是 happens-before 关系，它决定了不同 goroutine 间内存操作的可见性
- channel 是 goroutine 间通信的首选方式，实现了"通过通信来共享内存"的哲学
- `sync` 包提供了互斥锁、读写锁、Once、条件变量等传统同步原语
- `context` 用于跨 goroutine 传递取消信号、截止时间和请求值，是优雅关闭的关键

理解到这里，再回头看 Go 的并发代码，就不会只剩下"加 `go` 关键字就行"了。

## 参考资料

- [Go Memory Model](https://go.dev/ref/mem)
- [Go Concurrency: Worker Pools](https://pkg.go.dev/sync#example-WaitGroup)
- [The Go scheduler: M, P and G](https://morsmachine.dk/go-scheduler)
- [Go's work-stealing scheduler](https://www.ardanlabs.com/blog/2018/08/scheduling-in-go-part1.html)
