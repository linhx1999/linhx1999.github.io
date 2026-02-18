# AGENTS.md - AstroPaper 编码规范

## 项目概述
这是一个使用 TypeScript、Tailwind CSS v4 和 React JSX 的 Astro v5 博客项目（AstroPaper）。

## 构建命令

```bash
# 开发环境
pnpm dev

# 生产构建（包含类型检查、构建和 pagefind）
pnpm build

# 预览生产构建
pnpm preview

# 同步 Astro 类型
pnpm sync
```

## 代码检查与格式化命令

```bash
# 运行 ESLint
pnpm lint

# 检查格式化
pnpm format:check

# 修复格式化
pnpm format
```

**注意：** 未配置测试框架，没有单独的测试命令。

## 代码风格规范

### TypeScript
- **启用严格模式** - 继承 `astro/tsconfigs/strict`
- 所有新文件使用 TypeScript
- 为函数参数和返回值定义显式类型
- 对象形状使用 `interface`，联合类型/复杂类型使用 `type`
- 路径别名：`@/*` 映射到 `./src/*`

### 导入规范
- 使用 ES 模块（`"type": "module"`）
- 分组导入顺序：外部库优先，然后是内部别名（`@/`），最后是相对路径
- 示例：
  ```typescript
  import { defineConfig } from "astro/config";
  import { SITE } from "@/config";
  import { slugifyStr } from "./slugify";
  ```

### 格式化（Prettier）
- Tab 宽度：2 个空格
- 打印宽度：80 个字符
- 分号：**必需**
- 引号：**双引号**（`"`）
- JSX 引号：双引号
- 尾随逗号：**ES5 风格**（在有效位置）
- 箭头函数括号：尽可能**避免**
- 换行符：LF

### 命名规范
- 组件：PascalCase（例如：`Card.astro`、`PostDetails.astro`）
- 工具函数：camelCase（例如：`slugify.ts`、`getPath.ts`）
- 常量：UPPER_SNAKE_CASE 或使用 `as const` 的 camelCase
- 接口/类型：PascalCase
- Astro props 接口：命名为 `Props`

### 文件结构
- 组件：`src/components/*.astro`
- 布局：`src/layouts/*.astro`
- 页面：`src/pages/**/*.astro`（基于文件的路由）
- 工具函数：`src/utils/*.ts`
- 配置：`src/config.ts`
- 常量：`src/constants.ts`
- 资源：`src/assets/`
- 样式：`src/styles/`

### Astro 组件
- 使用 frontmatter（`---`）编写 TypeScript 代码
- 为组件 props 导出 `Props` 接口
- 在顶部解构 `Astro.props`
- 使用 React JSX 语法（`jsx: "react-jsx"`）
- 使用 Tailwind 类进行样式设置

### 错误处理与日志记录
- **不允许使用 `console.log`** - ESLint 会报错
- 提交前移除所有调试日志
- 在需要的地方使用 try/catch 进行适当的错误处理

### Tailwind CSS
- 使用 Tailwind v4 工具类
- 全局样式位于 `src/styles/global.css`
- Prettier 插件会自动排序类名

### 内容集合
- 博客文章位于 `src/data/blog/`
- 模式定义在 `src/content.config.ts`
- 使用 Zod 进行类型验证

## 博客文章编写规范

参考 `src/data/blog/posts/example.md`：

## 环境变量
- 在 `astro.config.ts` 中定义 env schema
- 客户端变量使用 `PUBLIC_` 前缀

## Git
- 使用 pnpm（lockfile: `pnpm-lock.yaml`）
- 不要提交 `dist/` 或 `.astro/`

### Commit 规范
- **使用中文**编写 commit 信息
- 遵循约定式提交（Conventional Commits）规范
- 格式：`<类型>(<作用域>): <描述>`
- 常用类型：
  - `feat`: 新功能
  - `fix`: 修复
  - `docs`: 文档
  - `style`: 代码风格（格式化、缺失分号等，不影响代码逻辑）
  - `refactor`: 重构（非 feat/fix 的代码更改）
  - `perf`: 性能优化
  - `test`: 测试
  - `chore`: 构建过程或辅助工具变动
- 示例：
  - `feat(blog): 添加文章搜索功能`
  - `fix(layout): 修复移动端导航栏重叠问题`
  - `docs(readme): 更新安装说明`
