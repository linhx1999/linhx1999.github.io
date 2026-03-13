# Repository Guidelines

## 文档更新政策

**关键：每次代码更改后必须更新 README.md 和 AGENTS.md，确保文档与代码库同步。**

- 面向用户的更改（功能、设置、使用说明）→ 更新 `README.md`
- 开发相关的更改（架构、命令、工作流、内部系统）→ 更新 `AGENTS.md`

## 项目结构与模块组织

本仓库是一个基于 Astro 的博客项目。源码位于 `src/`：页面在
`src/pages`，可复用 UI 在 `src/components`，布局在 `src/layouts`，工具函数在
`src/utils`。博客内容存放于 `src/data/blog/**/*.md`，并由
`src/content.config.ts` 校验。维护脚本放在 `scripts/`。静态资源放在 `public/`；
不要手动修改 `public/pagefind/`，因为它会在构建时自动生成。

## 构建、测试与开发命令

- `pnpm dev`：在 `localhost:4321` 启动本地开发服务器。
- `pnpm build`：执行 `astro check`，构建站点，并生成 Pagefind 搜索资源。
- `pnpm preview`：本地预览生产构建结果。
- `pnpm backfill:post-dates`：dry-run 预览缺失文章时间的回填结果。
- `pnpm lint`：运行 ESLint 检查整个仓库。
- `pnpm format` / `pnpm format:check`：写入或校验 Prettier 格式。

## 代码风格与命名规范

使用 TypeScript 严格模式，并通过 `@/*` 引用 `src/*`。遵循仓库中的
Prettier 约定：2 空格缩进、双引号、保留分号、80 列换行、箭头函数尽量省略括号。
Astro 组件使用 PascalCase，例如 `Card.astro`；工具函数使用 camelCase，例如
`slugify.ts`；Astro props 接口统一命名为 `Props`。ESLint 禁止
`console.log`，提交前请移除调试日志。不要保留注释掉的模板占位代码，也不要提交
未被引用的静态资源。

## 测试指南

当前仓库尚未配置专门的测试框架。提交 PR 前，至少执行 `pnpm lint`、
`pnpm format:check` 和 `pnpm build`。如果改动了内容或页面，请在 `pnpm dev`
下检查对应路由，重点确认搜索、标签、归档和文章详情页是否正常。若调整了文章
时间逻辑，还应执行 `pnpm backfill:post-dates` 检查回填结果是否符合预期。

## Commit 与 Pull Request 规范

近期提交遵循中文 Conventional Commits，例如
`docs(blog): 添加关于Go测试进阶实战的博客文章` 或
`fix(layout): 修复移动端导航栏重叠问题`。提交信息的 scope 应尽量精确反映改动范围。
PR 应包含简短说明、受影响的路由或文件；如有对应 issue 请附上链接；涉及可见 UI 或内容变化时请附截图。

## 文档维护

当行为、工作流或贡献约定发生变化时，请在同一次改动中同步更新本文件和
`README.md`，确保仓库文档保持一致。

新增综述类文章时，可参考 `src/data/blog/2026/http-to-quic-primer.md` 的写法：
先用一条主线串联概念，再分节解释术语、流程和协议差异，避免把问答原样平铺为碎片化小节。
