---
title: 从 nanobot 源码看类 OpenClaw 智能体架构设计
description: 通过分析 nanobot 源码，深入理解现代 AI Agent 框架如何通过消息总线、心跳服务、定时任务、会话管理等机制，实现被动响应与主动执行的统一。
pubDatetime: 2026-03-14T10:00:00+08:00
draft: false
featured: false
tags:
  - ai-agent
  - architecture
  - python
  - asyncio
hideEditPost: false
---

如果你用过 OpenClaw 这类"私人 AI 助手"，可能会好奇：为什么它能同时接入
Telegram、Discord、飞书等多个平台？为什么你告诉它"明天早上九点提醒我"，
第二天它真的会准时提醒？这背后是一套与传统"问答机器人"截然不同的架构设计。

本文通过分析 [nanobot](https://github.com/HKUDS/nanobot)（一个受 OpenClaw 启发的
轻量级 AI Agent 框架）的源码，带你理解这类智能体的核心设计思想。

## 一、传统智能体 vs 类 OpenClaw 智能体

先看核心差异：

| 特性 | 传统智能体 | 类 OpenClaw 智能体 |
|------|-----------|-------------------|
| 架构模式 | 同步请求-响应 | 异步消息总线 |
| 触发方式 | 被动等待用户 | 被动 + 主动（心跳/定时） |
| 连接方式 | 单一接口 | 多渠道统一抽象 |
| 状态管理 | 无状态/内存 | 持久化会话 |
| 任务调度 | 依赖外部 cron | 内置调度服务 |

用一句话概括：**传统智能体是"一问一答"的函数调用，类 OpenClaw 智能体是"长期运行的后台服务"。**

## 二、整体架构：消息总线解耦一切

nanobot 的核心是一个异步消息总线（`MessageBus`），它将**渠道层**（Telegram、Discord 等）
与**代理核心**（AgentLoop）完全解耦：

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         nanobot Architecture                              │
├───────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                               │
│  │ Telegram │   │ Discord  │   │ Feishu   │   ... more channels           │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘                               │
│       │              │              │                                     │
│       └──────────────┼──────────────┘                                     │
│                      ▼                                                    │
│              ┌───────────────┐        ┌───────────────┐                   │
│              │  MessageBus   │◄──────►│  AgentLoop    │                   │
│              │(asyncio.Queue)│        │ (Core Engine) │                   │
│              └───────────────┘        └───────┬───────┘                   │
│                      ▲                        │                           │
│       ┌──────────────┼──────────────┐         │                           │
│       │              │              │         ▼                           │
│  ┌────┴────┐   ┌────┴────┐   ┌────┴────┐  ┌────────┐                      │
│  │Heartbeat│   │  Cron   │   │ Session │  │ Tools  │                      │
│  │ Service │   │ Service │   │ Manager │  │Registry│                      │
│  └─────────┘   └─────────┘   └─────────┘  └────────┘                      │
└───────────────────────────────────────────────────────────────────────────┘
```

### 2.1 MessageBus：用 asyncio.Queue 实现解耦

```python
# nanobot/bus/queue.py
class MessageBus:
    def __init__(self):
        self.inbound: asyncio.Queue[InboundMessage] = asyncio.Queue()
        self.outbound: asyncio.Queue[OutboundMessage] = asyncio.Queue()

    async def publish_inbound(self, msg: InboundMessage) -> None:
        await self.inbound.put(msg)  # 非阻塞发布

    async def consume_inbound(self) -> InboundMessage:
        return await self.inbound.get()  # 阻塞消费
```

这个设计有几个好处：

1. **渠道无关**：Telegram、Discord 只需把消息丢进队列，不用关心后续处理
2. **天然背压**：队列满时自动阻塞，防止消息堆积爆内存
3. **统一调度**：AgentLoop 从队列消费，可以按优先级或时间排序处理

### 2.2 事件类型：统一的消息格式

所有渠道的消息都被标准化为 `InboundMessage` 和 `OutboundMessage`：

```python
# nanobot/bus/events.py
@dataclass
class InboundMessage:
    channel: str              # telegram, discord, slack...
    sender_id: str            # User identifier
    chat_id: str              # Chat/channel identifier
    content: str              # Message text
    media: list[str]          # Media file paths
    metadata: dict[str, Any]  # Channel-specific data

    @property
    def session_key(self) -> str:
        return f"{self.channel}:{self.chat_id}"  # 会话标识
```

## 三、Channel 抽象：一套接口，多端接入

每个渠道（Telegram、Discord 等）实现统一的 `BaseChannel` 接口：

```python
# nanobot/channels/base.py
class BaseChannel(ABC):
    @abstractmethod
    async def start(self) -> None:
        """Start the channel and begin listening for messages."""
        pass

    @abstractmethod
    async def send(self, msg: OutboundMessage) -> None:
        """Send a message through this channel."""
        pass

    async def _handle_message(self, sender_id, chat_id, content, ...):
        """Convert to InboundMessage and publish to bus."""
        await self.bus.publish_inbound(InboundMessage(...))
```

### 3.1 Telegram Channel 示例

以 Telegram 为例，使用 **Long Polling** 而非 WebSocket：

```python
# nanobot/channels/telegram.py
class TelegramChannel(BaseChannel):
    async def start(self) -> None:
        # Build application with connection pool
        self._app = Application.builder().token(self.config.token).build()

        # Register handlers
        self._app.add_handler(MessageHandler(filters.TEXT, self._on_message))

        # Start polling (no webhook/public IP needed)
        await self._app.updater.start_polling(drop_pending_updates=True)

        # Keep running
        while self._running:
            await asyncio.sleep(1)
```

**为什么用 Long Polling 而不是 WebSocket？**

- Telegram Bot API 官方推荐
- 不需要公网 IP 和 HTTPS 证书
- 实现简单，足够可靠

### 3.2 Typing 指示器：模拟"正在输入"

```python
async def _typing_loop(self, chat_id: str) -> None:
    """Repeatedly send 'typing' action until cancelled."""
    while self._app:
        await self._app.bot.send_chat_action(chat_id=int(chat_id), action="typing")
        await asyncio.sleep(4)  # 每 4 秒刷新
```

这个细节让用户体验更自然——智能体在"思考"时，用户能看到 typing 状态。

### 3.3 WebSocket vs Long Polling：两种连接策略

不同平台支持的连接方式不同，nanobot 根据平台特性选择最优策略：

| 平台 | 连接方式 | 原因 |
|------|----------|------|
| Telegram | Long Polling | Bot API 官方推荐，无需公网 IP |
| Discord | WebSocket | Discord Gateway 协议要求 |
| 飞书/Lark | WebSocket | 长连接模式，无需配置 webhook |

#### Discord Gateway：WebSocket 实现

Discord 使用自定义的 Gateway 协议，必须通过 WebSocket 连接：

```python
# nanobot/channels/discord.py
class DiscordChannel(BaseChannel):
    """Discord channel using Gateway websocket."""

    async def start(self) -> None:
        while self._running:
            try:
                # Connect to Discord Gateway
                async with websockets.connect(self.config.gateway_url) as ws:
                    self._ws = ws
                    await self._gateway_loop()
            except Exception as e:
                logger.warning("Discord gateway error: {}", e)
                if self._running:
                    await asyncio.sleep(5)  # Reconnect after 5s

    async def _gateway_loop(self) -> None:
        """Main gateway loop: identify, heartbeat, dispatch events."""
        async for raw in self._ws:
            data = json.loads(raw)
            op = data.get("op")

            if op == 10:  # HELLO
                interval_ms = data["d"].get("heartbeat_interval", 45000)
                await self._start_heartbeat(interval_ms / 1000)
                await self._identify()
            elif op == 0 and data.get("t") == "MESSAGE_CREATE":
                await self._handle_message_create(data["d"])
            elif op == 7:  # RECONNECT
                break
```

**Discord Gateway 心跳机制**：

```python
async def _start_heartbeat(self, interval_s: float) -> None:
    """Gateway heartbeat - must send periodically or connection drops."""
    async def heartbeat_loop():
        while self._running and self._ws:
            payload = {"op": 1, "d": self._seq}  # HEARTBEAT opcode
            await self._ws.send(json.dumps(payload))
            await asyncio.sleep(interval_s)

    self._heartbeat_task = asyncio.create_task(heartbeat_loop())
```

**关键点**：
- Discord 要求客户端定期发送心跳（通常 45 秒间隔）
- 如果心跳失败，服务器会主动断开连接
- 客户端需要处理重连逻辑（opcode 7 RECONNECT）

#### 飞书 WebSocket：长连接模式

飞书同样支持 WebSocket 长连接，无需配置公网 webhook：

```python
# nanobot/channels/feishu.py
class FeishuChannel(BaseChannel):
    """Feishu/Lark channel using WebSocket long connection."""

    async def start(self) -> None:
        import lark_oapi as lark

        # Create event handler
        event_handler = lark.EventDispatcherHandler.builder() \
            .register_p2_im_message_receive_v1(self._on_message_sync) \
            .build()

        # Create WebSocket client
        self._ws_client = lark.ws.Client(
            self.config.app_id,
            self.config.app_secret,
            event_handler=event_handler,
        )

        # Start WebSocket in separate thread (lark SDK requirement)
        def run_ws():
            ws_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(ws_loop)
            while self._running:
                try:
                    self._ws_client.start()
                except Exception as e:
                    logger.warning("Feishu WebSocket error: {}", e)
                if self._running:
                    time.sleep(5)

        self._ws_thread = threading.Thread(target=run_ws, daemon=True)
        self._ws_thread.start()
```

**飞书 WebSocket 的特殊处理**：

```python
# 飞书 SDK 在独立线程中运行，需要单独的事件循环
ws_loop = asyncio.new_event_loop()
asyncio.set_event_loop(ws_loop)
```

由于飞书 SDK 内部使用 `asyncio.get_event_loop()`，而主循环已经在运行，
需要在独立线程中创建新的 event loop，否则会报 "This event loop is already running" 错误。

### 3.4 Long Polling vs WebSocket 对比

```
Long Polling (Telegram):              WebSocket (Discord/Feishu):

Client                                Client
  │                                     │
  ├─── GET /getUpdates ────────────>    ├─── WebSocket Connect ───────>
  │<─── [messages or timeout] ──────    │<─── HELLO (opcode 10) ────────
  │                                     │
  ├─── GET /getUpdates ────────────>    ├─── HEARTBEAT ────────────────>
  │<─── [messages or timeout] ──────    │<─── HEARTBEAT ACK ────────────
  │                                     │
  ├─── GET /getUpdates ────────────>    │<─── MESSAGE_CREATE ───────────
  │<─── [messages] ─────────────────    │     (pushed by server)
  │                                     │
  ...                                   ...
```

| 特性 | Long Polling | WebSocket |
|------|--------------|-----------|
| 连接方式 | HTTP 轮询 | 持久 TCP 连接 |
| 实时性 | 依赖轮询间隔 | 真正实时推送 |
| 资源消耗 | 每次请求都有 HTTP 开销 | 建立后开销低 |
| 断线处理 | 下次轮询自动恢复 | 需要重连逻辑 |
| 心跳要求 | 无 | 必须定期发送 |
| 适用场景 | Bot API、简单场景 | 高频消息、实时协作 |

**nanobot 的选择策略**：

- **优先使用平台推荐方式**：Telegram 官方推荐 Long Polling
- **必须遵守协议要求**：Discord Gateway 必须用 WebSocket
- **考虑部署环境**：无公网 IP 时优先选择 Long Polling 或 WebSocket 长连接

## 四、心跳服务：让智能体"主动"起来

这是类 OpenClaw 智能体与传统机器人最大的区别。

### 4.1 设计目标

传统智能体只能**被动等待**用户触发。但现实场景中，我们需要：

- "明天早上 9 点提醒我开会"
- "每周五下午 5 点总结本周工作"
- "如果股市跌破 3000 点就通知我"

这些都需要智能体**主动**在特定时间执行任务。

### 4.2 HeartbeatService 实现

```python
# nanobot/heartbeat/service.py
class HeartbeatService:
    def __init__(self, interval_s: int = 30 * 60):  # 默认 30 分钟
        self.interval_s = interval_s

    async def _run_loop(self) -> None:
        while self._running:
            await asyncio.sleep(self.interval_s)
            await self._tick()

    async def _tick(self) -> None:
        # Phase 1: Read HEARTBEAT.md task file
        content = self._read_heartbeat_file()

        # Phase 2: Ask LLM to decide skip/run via virtual tool call
        action, tasks = await self._decide(content)

        if action == "run":
            # Phase 3: Execute and notify
            response = await self.on_execute(tasks)
            await self.on_notify(response)
```

### 4.3 LLM 驱动的决策

关键在于 `_decide()` 方法——它用 LLM 来判断"是否需要执行任务"：

```python
_HEARTBEAT_TOOL = [{
    "type": "function",
    "function": {
        "name": "heartbeat",
        "parameters": {
            "properties": {
                "action": {"enum": ["skip", "run"]},
                "tasks": {"description": "Summary of active tasks"},
            }
        }
    }
}]

async def _decide(self, content: str) -> tuple[str, str]:
    response = await self.provider.chat_with_retry(
        messages=[
            {"role": "system", "content": "You are a heartbeat agent..."},
            {"role": "user", "content": f"Review HEARTBEAT.md:\n{content}"},
        ],
        tools=_HEARTBEAT_TOOL,
    )
    args = response.tool_calls[0].arguments
    return args.get("action", "skip"), args.get("tasks", "")
```

**为什么用 LLM 而不是硬编码规则？**

- 自然语言理解：用户说"明天早上"，LLM 能理解是哪个时间点
- 灵活性：无需为每种任务类型写规则
- 容错性：即使表述不精确，LLM 也能"猜"出意图

## 五、定时任务：内置 Cron 服务

除了心跳，nanobot 还提供了完整的 Cron 调度系统。

### 5.1 支持三种调度方式

```python
# nanobot/cron/types.py
@dataclass
class CronSchedule:
    kind: Literal["at", "every", "cron"]
    at_ms: int | None = None      # One-time: timestamp in ms
    every_ms: int | None = None   # Recurring: interval in ms
    expr: str | None = None       # Cron expression: "0 9 * * *"
    tz: str | None = None         # Timezone support
```

三种方式对应不同场景：

| Kind | Example | Use Case |
|------|---------|----------|
| `at` | `2026-03-15T09:00:00` | One-time reminder |
| `every` | `every_ms=3600000` | Hourly check |
| `cron` | `0 9 * * 1-5` | Weekdays at 9am |

### 5.2 调度器核心逻辑

```python
# nanobot/cron/service.py
class CronService:
    async def start(self) -> None:
        self._load_store()            # Load from jobs.json
        self._recompute_next_runs()   # Calculate next run times
        self._arm_timer()             # Set async timer

    def _arm_timer(self) -> None:
        next_wake = self._get_next_wake_ms()
        delay_s = (next_wake - _now_ms()) / 1000

        async def tick():
            await asyncio.sleep(delay_s)
            await self._on_timer()

        self._timer_task = asyncio.create_task(tick())

    async def _on_timer(self) -> None:
        due_jobs = [j for j in jobs if now >= j.state.next_run_at_ms]
        for job in due_jobs:
            await self._execute_job(job)
        self._save_store()
        self._arm_timer()  # Re-arm for next job
```

### 5.3 自然语言创建任务

用户可以通过对话创建定时任务：

```
User: 每周五下午 5 点提醒我写周报
Agent: 好的，已创建定时任务，每周五 17:00 提醒你写周报。
```

底层通过 `CronTool` 实现：

```python
# nanobot/agent/tools/cron.py
class CronTool(Tool):
    @property
    def parameters(self) -> dict:
        return {
            "properties": {
                "action": {"enum": ["add", "list", "remove"]},
                "message": {"description": "Reminder message"},
                "cron_expr": {"description": "Cron expression like '0 9 * * *'"},
                "tz": {"description": "IANA timezone (e.g. 'Asia/Shanghai')"},
            }
        }
```

## 六、会话管理：JSONL 持久化

### 6.1 Session 数据结构

```python
# nanobot/session/manager.py
@dataclass
class Session:
    key: str                      # channel:chat_id
    messages: list[dict]          # Conversation history
    created_at: datetime
    updated_at: datetime
    last_consolidated: int = 0    # Memory consolidation marker
```

### 6.2 JSONL 存储格式

```
# sessions/telegram_12345.jsonl
{"_type":"metadata","key":"telegram:12345","created_at":"2026-03-14T10:00:00"}
{"role":"user","content":"帮我查天气","timestamp":"2026-03-14T10:01:00"}
{"role":"assistant","content":"好的，请问您在哪个城市？","timestamp":"2026-03-14T10:01:05"}
```

**为什么用 JSONL 而不是 SQLite/Redis？**

- 简单：无需额外依赖
- 可读：直接用文本编辑器查看
- 增量追加：高效写入
- 足够用：单用户场景下性能不是瓶颈

### 6.3 内存缓存 + 磁盘持久化

```python
class SessionManager:
    def __init__(self, workspace: Path):
        self.sessions_dir = workspace / "sessions"
        self._cache: dict[str, Session] = {}  # In-memory cache

    def get_or_create(self, key: str) -> Session:
        if key in self._cache:
            return self._cache[key]
        session = self._load(key) or Session(key=key)
        self._cache[key] = session
        return session

    def save(self, session: Session) -> None:
        # Write to disk
        with open(self._get_session_path(session.key), "w") as f:
            for msg in session.messages:
                f.write(json.dumps(msg) + "\n")
```

## 七、AgentLoop：核心处理引擎

### 7.1 主循环逻辑

```python
# nanobot/agent/loop.py
class AgentLoop:
    async def run(self) -> None:
        self._running = True
        while self._running:
            # 1. Wait for message from bus
            msg = await asyncio.wait_for(self.bus.consume_inbound(), timeout=1.0)

            # 2. Handle commands
            if msg.content == "/stop":
                await self._handle_stop(msg)
            elif msg.content == "/restart":
                await self._handle_restart(msg)
            else:
                # 3. Dispatch as async task (non-blocking)
                task = asyncio.create_task(self._dispatch(msg))
                self._active_tasks[msg.session_key].append(task)

    async def _process_message(self, msg: InboundMessage) -> OutboundMessage:
        # 1. Get or create session
        session = self.sessions.get_or_create(msg.session_key)

        # 2. Build context with history, memory, skills
        messages = self.context.build_messages(
            history=session.get_history(),
            current_message=msg.content,
        )

        # 3. Run agent loop (LLM calls + tool execution)
        final_content, tools_used, all_msgs = await self._run_agent_loop(messages)

        # 4. Save turn to session
        self._save_turn(session, all_msgs)
        self.sessions.save(session)

        return OutboundMessage(channel=msg.channel, chat_id=msg.chat_id, content=final_content)
```

### 7.2 工具执行循环

```python
async def _run_agent_loop(self, messages: list[dict]) -> tuple[str | None, list[str], list[dict]]:
    iteration = 0
    while iteration < self.max_iterations:
        iteration += 1

        # Call LLM with tools
        response = await self.provider.chat_with_retry(
            messages=messages,
            tools=self.tools.get_definitions(),
        )

        if response.has_tool_calls:
            # Execute tools and append results
            for tool_call in response.tool_calls:
                result = await self.tools.execute(tool_call.name, tool_call.arguments)
                messages = self.context.add_tool_result(messages, tool_call.id, result)
        else:
            # No tool calls - return final response
            return response.content, tools_used, messages
```

## 八、上下文工程：如何构建高质量的 Prompt

前面讨论的都是"如何让智能体运行起来"，这一节我们关注"如何让智能体更聪明"。
答案在于**上下文工程（Context Engineering）**——系统性地构建 LLM 的输入上下文。

### 8.1 系统提示的分层结构

nanobot 的 `ContextBuilder` 将系统提示分为多个层次：

```
┌─────────────────────────────────────────────────────────────┐
│                      System Prompt                          │
├─────────────────────────────────────────────────────────────┤
│  1. Identity        # nanobot 🐈 - 核心身份与运行时信息      │
│  2. Bootstrap Files # AGENTS.md, SOUL.md, USER.md, TOOLS.md │
│  3. Memory          # MEMORY.md - 长期记忆                  │
│  4. Active Skills   # 始终加载的技能文档                     │
│  5. Skills Summary  # 可用技能列表（按需加载）               │
└─────────────────────────────────────────────────────────────┘
```

```python
# nanobot/agent/context.py
class ContextBuilder:
    BOOTSTRAP_FILES = ["AGENTS.md", "SOUL.md", "USER.md", "TOOLS.md"]

    def build_system_prompt(self, skill_names: list[str] | None = None) -> str:
        parts = [self._get_identity()]           # 1. 身份
        parts.append(self._load_bootstrap_files()) # 2. 引导文件
        parts.append(f"# Memory\n{self.memory.get_memory_context()}")  # 3. 记忆
        parts.append(f"# Active Skills\n{always_skills}")  # 4. 常驻技能
        parts.append(f"# Skills\n{skills_summary}")        # 5. 技能列表
        return "\n\n---\n\n".join(parts)
```

### 8.2 引导文件：可定制的"人格"

nanobot 提供了四个引导文件，用户可以自由编辑：

| 文件 | 用途 | 示例内容 |
|------|------|---------|
| `SOUL.md` | 人格定义 | "Helpful and friendly, concise and to the point" |
| `USER.md` | 用户画像 | 姓名、时区、偏好、工作背景 |
| `AGENTS.md` | 行为指南 | 如何处理定时提醒、心跳任务 |
| `TOOLS.md` | 工具约束 | exec 的安全限制、输出截断规则 |

```markdown
<!-- SOUL.md - 人格定义 -->
# Soul

I am nanobot 🐈, a personal AI assistant.

## Personality
- Helpful and friendly
- Concise and to the point
- Curious and eager to learn

## Values
- Accuracy over speed
- User privacy and safety
- Transparency in actions
```

```markdown
<!-- USER.md - 用户画像 -->
# User Profile

## Basic Information
- **Name**: Alice
- **Timezone**: UTC+8
- **Language**: Chinese

## Work Context
- **Primary Role**: Backend Developer
- **Tools You Use**: Go, PostgreSQL, Kubernetes
```

### 8.3 记忆系统：双层架构

nanobot 采用**双层记忆**设计：

```
┌─────────────────────────────────────────────────────────────┐
│                      Memory System                          │
├──────────────────────┬──────────────────────────────────────┤
│   MEMORY.md          │   HISTORY.md                         │
│   (Long-term Facts)  │   (Grep-searchable Log)              │
├──────────────────────┼──────────────────────────────────────┤
│ - User prefers Go    │ [2026-03-14 10:00] USER: 帮我写个API │
│ - Timezone: UTC+8    │ [2026-03-14 10:05] ASSISTANT: 好的...│
│ - Project: nanobot   │ [2026-03-14 10:10] USER: 加个测试    │
│ - Key decisions...   │ ...                                  │
└──────────────────────┴──────────────────────────────────────┘
```

**MEMORY.md**：长期记忆，存储关于用户的事实和偏好

```markdown
# Long-term Memory

## User Preferences
- Prefers concise responses
- Works in Go and Python
- Uses Kubernetes for deployment

## Active Projects
- nanobot: AI agent framework
- Personal blog: AstroPaper theme

## Important Dates
- 2026-03-01: Started using nanobot
```

**HISTORY.md**：时间线日志，支持 grep 搜索

```markdown
[2026-03-14 10:00] USER: 帮我写一个 REST API
[2026-03-14 10:05] ASSISTANT [tools: write_file]: Created main.go
[2026-03-14 10:10] USER: 加个单元测试
[2026-03-14 10:12] ASSISTANT [tools: write_file, exec]: Created main_test.go, tests passed
```

### 8.4 记忆压缩：LLM 驱动的遗忘

随着对话增长，上下文窗口会溢出。nanobot 的解决方案是**LLM 驱动的记忆压缩**：

```python
# nanobot/agent/memory.py
class MemoryConsolidator:
    async def consolidate(self, messages: list[dict], provider, model) -> bool:
        prompt = f"""Process this conversation and call the save_memory tool.

## Current Long-term Memory
{current_memory or "(empty)"}

## Conversation to Process
{self._format_messages(messages)}
"""
        # LLM 调用 save_memory 工具，返回：
        # - history_entry: 写入 HISTORY.md 的日志条目
        # - memory_update: 更新后的 MEMORY.md 内容
```

**压缩工具定义**：

```python
_SAVE_MEMORY_TOOL = [{
    "type": "function",
    "function": {
        "name": "save_memory",
        "parameters": {
            "properties": {
                "history_entry": {
                    "description": "A paragraph summarizing key events. Start with [YYYY-MM-DD HH:MM]."
                },
                "memory_update": {
                    "description": "Full updated long-term memory. Include all existing facts plus new ones."
                }
            }
        }
    }
}]
```

**为什么用 LLM 而不是简单截断？**

- 保留关键信息：用户偏好、重要决策
- 去除噪音：闲聊、失败尝试、冗余内容
- 语义理解：LLM 能判断"什么值得记住"

### 8.5 运行时上下文：注入元数据

每次用户消息前，nanobot 会注入运行时元数据：

```python
def _build_runtime_context(channel: str | None, chat_id: str | None) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M (%A)")
    tz = time.strftime("%Z") or "UTC"
    lines = [f"Current Time: {now} ({tz})"]
    if channel and chat_id:
        lines += [f"Channel: {channel}", f"Chat ID: {chat_id}"]
    return "[Runtime Context — metadata only, not instructions]\n" + "\n".join(lines)
```

**实际效果**：

```
[Runtime Context — metadata only, not instructions]
Current Time: 2026-03-14 10:30 (Friday) (CST)
Channel: telegram
Chat ID: 12345678

用户的消息内容...
```

**设计意图**：

- 明确区分"元数据"和"用户指令"，防止 prompt 注入
- 提供当前时间，让智能体理解"明天"、"下周"等相对时间
- 标注渠道来源，便于针对性响应

### 8.6 技能系统：按需加载的上下文

为了避免系统提示过长，nanobot 采用**技能摘要 + 按需加载**策略：

```python
def build_system_prompt(self):
    # ...
    skills_summary = self.skills.build_skills_summary()
    parts.append(f"""# Skills

The following skills extend your capabilities. To use a skill, read its SKILL.md file.
Skills with available="false" need dependencies installed first.

| Skill | Available | Description |
|-------|-----------|-------------|
| weather | true | Get weather information |
| github | true | GitHub API operations |
| summarize | true | Summarize long documents |
""")
```

当智能体需要使用某个技能时，它会调用 `read_file` 工具读取对应的 `SKILL.md`，
获取详细的指令和示例。这种**延迟加载**策略显著减少了初始上下文长度。

### 8.7 上下文工程的核心原则

| 原则 | 实践 |
|------|------|
| **分层组织** | 身份 → 引导 → 记忆 → 技能，层次清晰 |
| **可定制性** | 所有引导文件用户可编辑 |
| **动态压缩** | LLM 驱动的记忆整理 |
| **按需加载** | 技能摘要 + 延迟读取详细文档 |
| **安全边界** | 运行时元数据明确标记为"非指令" |

---

## 九、总结：设计哲学

通过分析 nanobot 源码，可以提炼出类 OpenClaw 智能体的几个核心设计原则：

### 9.1 解耦至上

- **渠道与代理解耦**：通过 MessageBus
- **调度与执行解耦**：通过 HeartbeatService + CronService
- **存储与逻辑解耦**：通过 SessionManager

### 9.2 异步优先

- `asyncio` 贯穿全局
- 非阻塞 I/O：消息队列、定时器、HTTP 请求
- 并发处理：每个消息作为独立 Task

### 9.3 持久化一切

- 会话历史：JSONL 文件
- 定时任务：jobs.json
- 长期记忆：MEMORY.md + HISTORY.md

### 9.4 LLM 驱动的智能

- 心跳决策：LLM 判断是否需要执行任务
- 任务理解：自然语言转 cron 表达式
- 记忆压缩：LLM 生成摘要和历史条目

## 十、与传统架构的对比图

```
Traditional Agent:                  OpenClaw-like Agent:

User Request ──────> Handler        Channel ──────> MessageBus
       │                               │                │
       ▼                               ▼                ▼
    Process                      AgentLoop <────── CronService
       │                          │    │          HeartbeatService
       ▼                          │    ▼                │
    Response                      │  Tools              │
       │                          │    │                │
       ▼                          ▼    ▼                ▼
      END                    Session Manager    Persistent Store
```

**本质区别**：传统架构是"请求-响应"的函数调用；类 OpenClaw 架构是"长期运行的服务进程"，
具备主动能力、状态持久化和多渠道接入能力。

---

**参考资料**：

- [nanobot GitHub Repository](https://github.com/HKUDS/nanobot)
- [OpenClaw Official Site](https://github.com/openclaw/openclaw)
- Python asyncio 官方文档
- python-telegram-bot Library
