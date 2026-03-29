---
title: 什么是 Harness：从 The long-running agent problem 理解 Agent 长期运行编排框架
description: 结合 Anthropic 于 2025 年 11 月 26 日和 2026 年 3 月 24 日发布的两篇工程文章，梳理 harness 在 agent 语境中的含义，以及它如何解决长期任务中的失忆、跑偏、误判和验收问题。
pubDatetime: 2026-03-29T10:30:00+08:00
draft: true
featured: false
tags:
  - ai-agent
  - architecture
  - anthropic
hideEditPost: false
---

这两年在 Agent 工程文章里，`harness` 这个词出现得越来越频繁。很多人第一次看到它时，会下意识把它理解成“工具集”“脚手架”或者“运行时”。这些理解都沾边，但都不够准确。

如果只看单词原义，`harness` 可以指“线束”“马具”“安全带”。可在 Anthropic 讨论长时间运行智能体的语境里，它真正指向的不是某一个具体部件，而是**把模型、工具、流程、状态和验收机制组织起来的一整套运行与编排框架**。

换句话说，`harness` 不是模型本身，而是让模型能持续干活、不轻易跑偏、并且能够被验证的一层外部系统。理解这一点之后，再看 `The long-running agent problem`，就会更容易明白 Anthropic 到底在解决什么。

## 一、Harness 到底是什么

如果要给 `harness` 下一个更贴近中文工程语境的定义，我更倾向于这样表述：

> `Harness` 是一种用于组织 Agent 长时间执行复杂任务的编排框架。

这里的重点不在“框架”这两个字，而在“编排”。

所谓编排，指的是下面这些事情不再由模型临场发挥，而是被放进一套明确的结构里：

- 任务怎么拆分，先做什么，后做什么
- 不同 Agent 扮演什么角色，各自关注什么目标
- 哪些工具可以调用，什么时候调用
- 当前状态如何被记录，下一轮如何接着做
- 什么算完成，谁来验证完成
- 如果实现结果不达标，如何进入下一轮迭代

所以在 Agent 语境里，`harness` 不是一个“附属小工具”，而更像一个小型项目执行系统。模型负责思考和产出，`harness` 负责组织、约束、交接和验收。

如果压缩成一句话，可以把它记成：

```text
Harness = prompt + tools + workflow + state handoff + evaluation loop
```

这也是为什么我更愿意把它译成“编排框架”或“运行编排框架”，而不是简单翻成“工作流”。工作流通常更强调步骤顺序，`harness` 则额外强调工具使用、上下文交接、环境控制和反馈回路。

## 二、The long-running agent problem 到底难在哪里

Anthropic 在 2025 年 11 月 26 日发布的
[Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
里，把问题说得很直接：Agent 即使已经具备 `compaction` 这类上下文压缩能力，也还是很难稳定完成跨多个 context window 的长任务。

这里的“long-running”并不只是“跑得久”，而是同时包含几层含义：

- 任务不能在单个上下文窗口内完成
- 任务会跨多轮甚至多次 session
- 每一轮都可能只掌握局部上下文
- 后续工作必须建立在前面工作的可交接结果之上

Anthropic 观察到，裸跑的 Agent 在这类任务里容易暴露出几个典型失败模式：

| 问题            | 典型表现                     | 后果                       |
| --------------- | ---------------------------- | -------------------------- |
| 一次做太多      | 试图一口气把整个应用做完     | 中途耗尽上下文，留下半成品 |
| 跨 session 失忆 | 下一轮不知道上一轮做了什么   | 需要猜测现场，重复劳动     |
| 过早宣布完成    | 看见项目“像样了”就觉得结束了 | 还有大量 feature 未实现    |
| 自评过于乐观    | 觉得自己“基本搞定”           | 真正端到端测试一跑就露问题 |
| 环境不可接手    | 新一轮甚至不知道怎么启动项目 | 无法稳定持续迭代           |

如果把这个问题翻译成更口语化的话，其实就是：

> 单个 Agent 并不天然擅长长期工程协作。任务一长，它就容易失忆、跑偏、过早收工，或者高估自己已经完成的程度。

这也是为什么 Anthropic 的结论不是“把上下文窗口做大就好了”，而是“需要专门设计 harness”。

## 三、为什么只靠 Compaction 不够

Anthropic 的一个关键判断是：`compaction` 有帮助，但不够。

`compaction` 的做法，是把前面对话压缩总结后继续塞回同一个会话，让 Agent 在更短的历史上接着工作。它能缓解窗口膨胀问题，但它有两个天然限制。

第一，它不一定能把前文的意图、环境状态和未完成事项传递得足够清楚。压缩后的摘要再好，也难完全替代结构化交接物。

第二，它没有真正给 Agent 一个“干净的重新开始”。后来的 Anthropic 文章把这一点进一步总结为一种近似的 `context anxiety`：模型接近上下文极限时，容易变得保守、仓促，甚至倾向于提前收尾。

因此，Anthropic 早期对长任务的处理，不是单纯让同一个 Agent 在压缩上下文里硬撑下去，而是把问题拆成了：

- 如何为后续多轮执行准备一个可交接的环境
- 如何让每一轮 Agent 都只做小步、明确、可验证的增量推进

这正是 harness 的切入点。

## 四、Anthropic 早期方案：Initializer Agent + Coding Agent

在 2025 年 11 月 26 日那篇文章里，Anthropic 给出的主方案是一个两段式 harness：

1. `Initializer agent`
2. `Coding agent`

它背后的逻辑很像交接良好的工程团队。

### 1. Initializer agent 先搭环境，不急着做功能

第一轮 Agent 的职责不是“立刻把应用做出来”，而是先把长期任务运行所需的基础设施搭好。文章里给出的代表性产物包括：

- `init.sh`
  统一启动项目，让后续 Agent 知道如何把应用跑起来
- `claude-progress.txt`
  记录已经完成的工作、当前状态和后续注意事项
- 初始 `git commit`
  让后续会话能从提交历史理解代码库演进
- 结构化 `feature list`
  把用户高层需求展开成一组可验证的功能项，初始都标记为未通过

其中 `feature list` 很关键。Anthropic 的核心做法不是让 Agent 盯着一句高层需求自由发挥，而是把“完成定义”显式展开成一份结构化清单。这样后续 Agent 每次进入新 session 时，都能很快知道：

- 目标范围到底有多大
- 哪些功能还没做
- 哪些功能只是看起来像做了，其实还没验收通过

### 2. Coding agent 每次只做一个小步

后续每一轮 `coding agent` 的工作方式则被强约束成增量推进：

- 先读 `progress`、`git log`、`feature list`
- 跑起开发环境并做基本检查
- 只挑一个高优先级 feature 开工
- 做完以后进行验证
- 验证通过后再更新状态并提交 git

这种设计的重点不是“让 Agent 变聪明”，而是**不让它一次做太多**。

Anthropic 发现，只要不加约束，Agent 很容易尝试 one-shot 整个应用；而一旦限制为每轮只做一个 feature，再配上结构化交接文件，整体成功率会明显提高。

## 五、Anthropic 的问题与对策表

如果把这套思路压缩成一个“问题 / 对策”对照表，大致可以整理成下面这样：

| 问题             | 典型表现                            | Anthropic 推荐对策                   | 对应机制                                 |
| ---------------- | ----------------------------------- | ------------------------------------ | ---------------------------------------- |
| 一次做太多       | 试图一口气完成整个应用              | 强制增量开发                         | `feature list`，每轮只做一个 feature     |
| 跨 session 失忆  | 下一轮不清楚上一轮做了什么          | 留下结构化交接物                     | `claude-progress.txt`、`git log`         |
| 过早宣布完成     | 觉得“差不多了”就结束                | 明确完成定义                         | 所有功能先标记 `passes: false`，逐项验收 |
| 功能没有真正打通 | 改了代码但端到端不可用              | 做真实用户视角的验证                 | 浏览器自动化、端到端测试                 |
| 环境不可接手     | 后续 Agent 不知道怎么启动和验证项目 | 固化运行入口                         | `init.sh`                                |
| 环境被越改越乱   | 本轮做完后留下 bug 或未记录状态     | 每轮结束前恢复到可继续开发的干净状态 | `git commit`、进度更新、基本回归检查     |

这里最值得注意的一点是：Anthropic 并没有把问题简单归结为“模型记不住”。他们实际上是在把长期任务改写成一种更接近真实软件工程协作的形式。

也就是说，`harness` 的作用不是替代工程过程，而是把工程过程外显给 Agent。

## 六、从 Context Reset 到多 Agent：Anthropic 后续方案的演进

到了 2026 年 3 月 24 日发布的
[Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
里，Anthropic 又把问题往前推进了一步。

这篇文章保留了前一阶段的两个关键认识：

- 长任务必须拆成可管理的小块
- 必须用结构化产物在不同轮次之间交接上下文

但它新增了一条非常重要的判断：**自评是一个独立问题**。

文章指出，即使任务有明确的可验证结果，Agent 在评估自己产出时仍然经常过于宽松；而在设计这类更主观的任务里，这个问题会更明显。于是 Anthropic 把“生成”和“评估”拆成了不同角色。

最终形成的是一个三角色架构：

- `planner`
  把用户的简单需求扩展成更完整的产品规格
- `generator`
  按规格逐步实现功能
- `evaluator`
  通过真实工具和明确标准验证实现结果，并把问题反馈回去

这比前一版 harness 更进一步的地方在于，它不再只是解决“怎么长期接着做”，还开始解决“谁来判断做得够不够好”。

从工程角度看，这其实很自然。现实团队里，编码、评审、测试本来就不是完全由同一个人、同一个视角完成的。Anthropic 只是把这种分工显式迁移到了 Agent 系统里。

## 七、如何理解 Harness 的价值

如果现在再回头看 `harness`，就会发现它主要不是解决“让 Agent 跑得更久”这么单一的问题，而是在解决 Agent 一旦进入长任务后暴露出来的一整组工程问题：

- 如何拆分任务，避免一次做太多
- 如何跨 session 交接状态，避免失忆
- 如何把高层需求转成明确完成定义
- 如何保证环境可重复启动、可继续接手
- 如何验证功能真的完成，而不是“看起来差不多”
- 如何把实现和评估分离，降低自评偏乐观的问题

因此，更准确的说法不是：

> `Harness` 主要解决长期任务。

而是：

> `Harness` 主要解决 Agent 在长期复杂任务中的组织、记忆、执行和评估问题。

“长期”只是这些问题最容易集中暴露出来的场景。

如果必须再压缩成一句最短定义，我会这样写：

> `Harness` 是围绕 Agent 构建的长期运行编排框架，用来管理任务拆分、工具调用、状态交接与验收反馈。

## 八、结语

Anthropic 这两篇文章真正提供的启发，不只是“他们用了哪些 prompt”，而是一个更基础的工程判断：

当任务足够长、足够复杂时，决定系统效果的往往不只是模型能力本身，还包括你如何把模型放进一套可持续运行的结构里。

也正因为如此，`harness` 最好不要被理解成一个可有可无的外围脚手架。对于长时间运行的 Agent 来说，它更像是一套最小但必要的工程制度。没有它，Agent 可能也能开始工作；但很难稳定地把工作做完。

## 参考资料

- Anthropic, [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents), Published Nov 26, 2025.
- Anthropic, [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps), Published Mar 24, 2026.
