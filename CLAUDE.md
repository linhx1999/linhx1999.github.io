# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

AstroPaper 博客项目，使用 Astro v5 + TypeScript + Tailwind CSS v4 + React JSX。

## 重要开发指南

### 文档更新政策
**关键：每次代码更改后必须更新 README.md 和 AGENTS.md**

- 面向用户的更改（功能、设置、使用说明）→ 更新 `README.md`
- 开发相关的更改（架构、命令、工作流、内部系统）→ 更新 `AGENTS.md`
- 必须确保文档与代码库同步

## 常用命令

```bash
pnpm dev          # 启动开发服务器 (localhost:4321)
pnpm build        # 生产构建（含类型检查和 pagefind 搜索索引）
pnpm preview      # 预览构建结果
pnpm lint         # ESLint 检查
pnpm format       # Prettier 格式化
pnpm format:check # 检查格式化
```

**注意**：项目未配置测试框架。

## 核心架构

### 文件路由
- `src/pages/**/*.astro` → 基于文件路径自动生成路由
- 博客文章路由：`src/pages/posts/[...slug]/index.astro`

### 内容集合
- 博客文章位置：`src/data/blog/`
- Schema 定义：`src/content.config.ts`（使用 Zod 验证）
- 自定义 loader 会自动从文件系统获取 `pubDatetime` 和 `modDatetime`

### 博客文章路径规则
```
src/data/blog/2025/article.md  → /posts/2025/article
src/data/blog/article.md       → /posts/article
src/data/blog/_dir/article.md  → /posts/article（下划线前缀不影响 URL）
```

### 站点配置
- 主配置：`src/config.ts`（站点信息、每页文章数、时区等）
- Astro 配置：`astro.config.ts`

## 代码规范

### TypeScript
- 严格模式（继承 `astro/tsconfigs/strict`）
- 路径别名：`@/*` → `./src/*`
- 对象用 `interface`，联合类型用 `type`

### 格式化（Prettier）
- 双引号、分号必需、2空格缩进、80字符宽度
- JSX 引号：双引号
- 箭头函数括号：尽可能避免

### 命名规范
- 组件：PascalCase（`Card.astro`）
- 工具函数：camelCase（`slugify.ts`）
- Astro props 接口：命名为 `Props`

### ESLint 规则
- **禁止 `console.log`** - 提交前必须移除所有调试日志

## 博客文章 Frontmatter

```yaml
---
title: 文章标题（必填）
description: 文章描述（可选，用于摘要和 SEO）
pubDatetime: 2025-01-15T10:00:00Z  # 可选，默认为文件创建时间
modDatetime: 2025-01-15T12:00:00Z  # 可选，默认为文件修改时间
tags: [标签1, 标签2]
featured: false  # 是否展示在首页
draft: true      # 草稿状态，发布时改为 false
---
```

### ASCII 图表规范
在博客中使用代码块绘制 ASCII 图表时，**必须使用英文文字**，避免中英文混排导致的对齐问题。

## Keystatic 编辑器

本地可通过 `/admin` 访问 Keystatic 可视化编辑器（生产环境自动禁用）。

## Git Commit 规范

使用中文编写 commit 信息，遵循 Conventional Commits：
- `feat(blog): 添加文章搜索功能`
- `fix(layout): 修复移动端导航栏重叠问题`
- `docs(readme): 更新安装说明`
