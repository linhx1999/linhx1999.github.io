# Lhx's Blog

一个基于 Astro 构建的个人博客，主要用于发布中文技术文章与笔记。项目在
[AstroPaper](https://github.com/satnaing/astro-paper) 的基础上做了本地化与内容工作流调整，当前使用 Astro 5、TypeScript、Tailwind CSS 4 和 Keystatic。

站点地址：<https://linhx1999.github.io/>

## 特性

- 基于 `src/data/blog/**/*.md` 的 Markdown/Markdoc 内容工作流
- 自动从 Git 历史补全文章的 `pubDatetime` 和 `modDatetime`
- 内置全文搜索、标签页、归档页、RSS 和 sitemap
- 支持动态 OG 图片与文章分享图
- 本地可通过 Keystatic 可视化编辑文章
- GitHub Actions 自动构建并部署到 GitHub Pages

## 技术栈

- Astro 5
- TypeScript
- Tailwind CSS 4
- React 19
- Pagefind
- Keystatic

## 快速开始

### 环境要求

- Node.js 20+
- pnpm 10+

### 安装与运行

```bash
pnpm install
pnpm dev
```

开发服务器默认运行在 `http://localhost:4321`。

## 常用命令

| 命令                       | 说明                                           |
| -------------------------- | ---------------------------------------------- |
| `pnpm dev`                 | 启动本地开发服务器                             |
| `pnpm build`               | 执行类型检查、构建站点并生成 Pagefind 搜索索引 |
| `pnpm preview`             | 本地预览生产构建结果                           |
| `pnpm backfill:post-dates` | dry-run 检查并预览文章时间回填结果             |
| `pnpm lint`                | 运行 ESLint                                    |
| `pnpm format`              | 使用 Prettier 格式化仓库                       |
| `pnpm format:check`        | 检查格式是否符合 Prettier 规则                 |
| `pnpm sync`                | 生成 Astro 类型定义                            |

## 项目结构

```text
.
├── scripts/                # 维护脚本，例如文章时间回填
├── public/                 # 静态资源与构建后复制的 pagefind 文件
├── src/
│   ├── assets/             # 图标与文章图片
│   ├── components/         # 可复用组件
│   ├── data/blog/          # 博客文章 Markdown
│   ├── layouts/            # 页面布局
│   ├── pages/              # 文件路由
│   ├── styles/             # 全局样式
│   ├── utils/              # 工具函数与 OG 模板
│   ├── config.ts           # 站点配置
│   └── content.config.ts   # 内容集合与 Schema
├── astro.config.ts         # Astro 配置
└── keystatic.config.ts     # Keystatic 编辑器配置
```

## 写作与内容管理

文章存放在 `src/data/blog/` 下，例如：

```text
src/data/blog/2026/go-channel-deep-dive.md
```

近期新增的综述类文章也可作为结构参考，例如：

```text
src/data/blog/2026/http-to-quic-primer.md
src/data/blog/2026/mcp-streamable-http.md
```

对应访问路径通常为：

```text
/posts/2026/go-channel-deep-dive
```

建议 frontmatter 示例：

```yaml
---
title: 文章标题
description: 文章摘要
pubDatetime: 2026-03-07T09:45:26+08:00
modDatetime: 2026-03-08T21:10:00+08:00
tags: [Go, Distributed Systems]
featured: false
draft: true
---
```

说明：

- `pubDatetime` 和 `modDatetime` 可省略，系统会优先从 Git 历史推导。
- 如需把缺失时间写回 frontmatter，可执行 `pnpm backfill:post-dates -- --write`。
- 新文章默认建议使用 `draft: true`，确认后再发布。
- 使用 ASCII 图表时请只写英文，避免中英文混排导致对齐错位。
- Go 代码块请使用 Shiki 支持的语言标记 `go`，不要写成 `golang`，否则会回退为纯文本高亮。
- 文章页已提供自动生成的浮动目录，新文章默认不需要再手写 `## TOC`。
- 旧文章若保留 `## TOC`，页面会兼容并优先显示浮动目录；不建议继续作为新文章写法。
- 综述型文章建议围绕一条主线组织内容，例如协议分层、握手流程和版本演进。
- 协议或规范类文章建议注明所依据的规范版本或日期，避免读者把旧行为当成当前标准。
- 首次出现的英文缩写建议补充全称，例如 `SSE` 写为 `Server-Sent Events`。
- 对比协议或接口时，优先给出一个最小普通请求示例作为基线，再展示标准协议的额外约束，便于读者快速看出差异。

### Keystatic 本地编辑

执行 `pnpm dev` 后访问 <http://127.0.0.1:4321/admin>。生产环境设置了
`SKIP_KEYSTATIC=true`，因此不会暴露管理后台。

## 配置说明

- `src/config.ts`：站点标题、作者、分页数、时区、归档开关等
- `astro.config.ts`：Astro 集成、Markdown 处理、Shiki 高亮、站点地址
- `keystatic.config.ts`：内容模型和可视化编辑字段

可选环境变量：

```bash
PUBLIC_GOOGLE_SITE_VERIFICATION=your-verification-code
SKIP_KEYSTATIC=true
```

## 部署

仓库内置 GitHub Actions：

- CI：在 Pull Request 上执行 `lint`、`format:check` 和 `build`
- Deploy：推送到 `main` 分支后自动部署到 GitHub Pages

## 贡献说明

提交信息使用中文 Conventional Commits，例如：

```text
docs(blog): 添加关于Go测试进阶实战的博客文章
fix(layout): 修复移动端导航栏重叠问题
```

发起 PR 前，至少执行：

```bash
pnpm lint
pnpm format:check
pnpm build
```

同时请保持仓库整洁：不要提交无引用的静态资源、构建产物或长期注释掉的模板代码。

贡献约定见 [AGENTS.md](./AGENTS.md)。
