---
title: 理解 MCP 的 Streamable HTTP：它和 SSE、WebSocket、JSON-RPC 到底是什么关系
description: 从 MCP 官方传输规范出发，解释 Streamable HTTP 的定位、工作方式，以及它与普通 POST 流式返回、SSE、WebSocket 和 JSON-RPC 的区别。
pubDatetime: 2026-03-13T20:25:00+08:00
draft: false
featured: false
tags:
  - mcp
  - http
  - sse
  - websocket
  - json-rpc
hideEditPost: false
---

很多人第一次接触 MCP 的远程传输时，都会被几个相近概念绕晕：

- `streamable-http`
- `SSE`
- `WebSocket`
- `JSON-RPC`
- “我自己写一个 `POST + text/event-stream` 不就行了吗？”

这些词看起来都和“流式传输”有关，但它们并不在同一个层次。本文尝试把它们拆开，再重新拼回 MCP 的完整通信模型里。

## 先给结论：Streamable HTTP 不是“另一个 WebSocket”

在 MCP 里，`streamable-http` 是官方定义的标准远程传输方式之一。它的核心不是发明一个全新的底层协议，而是把几件已经很常见的东西组合起来：

- 用 `HTTP` 承载请求
- 用 `JSON-RPC` 定义消息格式
- 在需要流式下行时使用 `SSE`（`Server-Sent Events`）
- 再补上会话、恢复、版本协商等 MCP 约定

所以更准确的理解应该是：

```text
Streamable HTTP
  = HTTP transport
  + JSON-RPC messages
  + optional SSE streaming
  + MCP session/version rules
```

这意味着它既不是“只有 SSE”，也不是“和 WebSocket 一样的双向长连接协议”。它是 MCP 在 HTTP 基础上定义的一套标准化传输方式。

## 它为什么会出现

MCP 最早有一套更偏 `HTTP + SSE` 的远程传输思路，但后续规范把它替换成了 `Streamable HTTP`。

这样做的主要目标是把远程调用收敛成一套更统一的模型：

- 统一使用一个 MCP endpoint
- 客户端继续用标准 HTTP 发请求
- 服务端既能普通返回，也能流式返回
- 必要时还能主动向客户端发送消息

从工程角度看，这种设计比单独拼接一堆 SSE endpoint 更容易接入现有基础设施，例如：

- 反向代理
- 鉴权
- 网关
- 负载均衡
- HTTP 监控

这也是它相比“自己写一个 `POST + event-stream` 接口”更有价值的地方。

## Streamable HTTP 到底怎么工作

可以把它理解成一个统一的 `/mcp` 端点，同时支持 `POST` 和 `GET`。

### 1. 客户端用 POST 发送 MCP 消息

客户端把 JSON-RPC 消息通过 `POST /mcp` 发送给服务端。请求体里放的是标准 JSON-RPC 消息，例如：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search",
    "arguments": {
      "q": "mcp streamable http"
    }
  }
}
```

### 1.1 它和普通 HTTP POST 请求体有什么区别

如果先看一个普通 HTTP API，请求体通常只是业务数据本身，例如：

```http
POST /api/chat HTTP/1.1
Content-Type: application/json

{
  "message": "Hello",
  "stream": true
}
```

这里的请求体没有统一协议外壳，字段含义完全由业务接口自己定义。服务端看到的是：

- 这是一个发给 `/api/chat` 的普通 POST
- 请求体是业务 JSON
- 如何解释 `message`、`stream` 取决于这个接口自己的实现

而在 MCP 的 `streamable-http` 里，请求体不是裸业务数据，而是一个 `JSON-RPC` 信封：

```http
POST /mcp HTTP/1.1
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "search",
    "arguments": {
      "q": "mcp streamable http"
    }
  }
}
```

这两者最核心的区别是：

- 普通 HTTP `POST` 请求体通常直接承载业务字段
- MCP `streamable-http` 请求体承载的是标准化的 RPC 调用描述

也就是说，在普通 HTTP 接口里，你关心的是“这个 URL 对应什么业务”；而在 MCP 里，你关心的是“我要调用哪个 MCP 方法、请求 ID 是多少、参数是什么”。

所以 `streamable-http` 并不是只把普通 `POST` 请求改成了流式返回，而是把请求体本身也纳入了统一协议约束。

### 2. 服务端有两种返回方式

对同一次 `POST`，服务端可以：

- 直接返回 `application/json`
- 或返回 `text/event-stream`

如果只是一个很快就能完成的请求，直接返回 JSON 就够了；如果要边处理边回进度、边生成边输出，服务端就可以把这次响应变成 SSE 流。

### 3. 客户端也可以用 GET 建立 SSE 通道

除了 `POST` 以外，客户端还可以通过 `GET /mcp` 建立一个单独的 SSE 通道。这样服务端在必要时可以主动发：

- notification
- request

这一点很重要，因为 MCP 不是只有“客户端问，服务端答”这么简单。某些场景下，服务端也需要主动给客户端发送消息。

## 它和“普通 POST 请求回 event”有什么区别

很多人会问：如果我自己做一个接口，让客户端发 `POST`，然后服务端返回 `text/event-stream`，这和 `streamable-http` 不是一样吗？

答案是：**传输技巧上类似，但协议层次上不一样。**

你自己写一个 `POST + SSE` 接口，本质上只是：

- 使用了 HTTP 流式响应
- 用了 `text/event-stream`
- 事件格式由你自己定义

而 MCP 的 `streamable-http` 除了允许这么做，还额外规定了：

- 消息体用 `JSON-RPC`
- 初始化流程怎么做
- 会话 ID 怎么传
- 协议版本怎么协商
- SSE 断线后怎么恢复
- 服务端主动消息怎么走

换句话说：

- 你自己写的 `POST + SSE` 是“能传”
- `streamable-http` 是“能互通、能恢复、能被 MCP 客户端标准化理解”

所以差别不只是“多了几个 header”，而是多了一整套交互行为约定。

再进一步说，普通 HTTP `POST` 接口很多时候只需要：

- 一个 URL
- 一份业务 JSON
- 一个普通 JSON 响应

而 `streamable-http` 额外统一了三件事：

- 请求体必须符合 JSON-RPC 结构
- 返回既可以是普通 JSON，也可以是 SSE 流
- 同一套传输里还要支持会话、恢复和服务端主动消息

因此它更像“标准化远程调用协议”，而不只是“一个会流式输出的 POST 接口”。

## 它和 WebSocket 的区别

`streamable-http` 最容易被拿来和 `WebSocket` 对比，因为它们都能做实时通信。

但两者的设计目标并不相同。

### WebSocket 的特点

- 建立一次连接后，双方都可以随时主动发消息
- 协议升级后不再是普通 HTTP 请求响应
- 更适合高频、低延迟、双向持续交互

典型场景是：

- 在线聊天
- 协同编辑
- 实时游戏
- 状态同步

### Streamable HTTP 的特点

- 仍然保留 HTTP 请求响应语义
- 客户端主要通过 `POST` 驱动调用
- 服务端在需要时通过 SSE 做流式下行
- 更容易复用现有 HTTP 基础设施

因此它更适合：

- 远程 MCP Server
- 工具调用
- 资源读取
- Agent 编排
- LLM 推理结果流式返回

一句话总结：

- `WebSocket` 更像一条自由的双向消息管道
- `streamable-http` 更像一套标准化的 HTTP 流式调用协议

## 那 JSON-RPC 又在里面扮演什么角色

理解这一点非常关键。

`HTTP` 负责的是“消息怎么运过去”，而 `JSON-RPC` 负责的是“消息里面长什么样”。它是一种基于 JSON 的远程过程调用协议，用来描述：

- 你要调用哪个方法
- 你传了什么参数
- 这是哪一个请求
- 成功结果是什么
- 失败错误是什么

在 MCP 里，像下面这样的调用都是 JSON-RPC 风格：

- `initialize`
- `tools/list`
- `tools/call`
- `resources/list`

所以你可以把整个分层关系理解成：

```text
MCP semantics
  -> JSON-RPC
    -> Streamable HTTP
      -> HTTP / SSE
```

如果只看 `streamable-http`，你会以为它只是“流式 HTTP”。但加上 `JSON-RPC` 后，它才真正具备“调用工具、返回结果、发送通知”的语义能力。

## 为什么官方没有把标准传输直接定成 WebSocket

这个问题非常自然。

从纯双向通信能力看，`WebSocket` 确实更强，但 MCP 官方选择 `streamable-http`，更像是一个工程上的折中：

- 对现有 HTTP 基础设施更友好
- 更容易部署在企业网关和代理之后
- 更方便接入认证和审计系统
- 对“请求驱动、按需流式返回”的工具调用场景已经足够

也就是说，MCP 的主流场景并不是“永远保持一条超活跃双向信道”，而是“标准化地调用远端能力，并在必要时流式返回结果”。对于这类需求，`streamable-http` 通常已经足够。

## 一张图看懂这几个概念的层次

```text
┌──────────────────────────────────────────────┐
│ MCP: tools, resources, prompts, initialize  │
├──────────────────────────────────────────────┤
│ JSON-RPC: method, params, id, result, error │
├──────────────────────────────────────────────┤
│ Streamable HTTP: POST/GET, session, resume   │
├──────────────────────────────────────────────┤
│ HTTP / SSE                                   │
└──────────────────────────────────────────────┘
```

如果换成 `WebSocket`，通常是你自己重新定义下面这一层的传输方式，但上面的 MCP 语义和 JSON-RPC 仍然可以继续存在。只是那样做出来的 transport 不再是 MCP 当前官方标准传输。

## 小结

理解 `streamable-http` 的关键，是把几个常见概念拆开：

- `HTTP` 是运输方式
- `SSE` 是一种服务端流式下行手段
- `WebSocket` 是另一种全双工传输协议
- `JSON-RPC` 定义消息格式
- `MCP streamable-http` 则是在这些基础上，定义远程 MCP Server 如何标准化通信

所以它不是“只是一个类 HTTP+SSE 的协议，多带几个参数”，而是：

**MCP 官方在 HTTP 基础上定义的标准远程传输层。**

当你这样理解之后，就不会再把它和普通 `POST + event-stream` 接口，或者和 `WebSocket` 的角色混在一起了。

## 参考资料

- [Model Context Protocol Specification - Transports](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)
- [Model Context Protocol Specification - 2025-03-26 Changelog](https://modelcontextprotocol.io/specification/2025-03-26/changelog)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
