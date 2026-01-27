# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是基于 AstroPaper 主题的个人技术博客,部署在 GitHub Pages (linhx1999.github.io)。博客内容主要为中文,涵盖编程、系统配置和技术教程等主题。

## 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器 (localhost:4321)

# 构建
npm run build           # 类型检查 → 构建 → 生成搜索索引
                        # 注意:构建后会将 pagefind 复制到 public/

# 预览
npm run preview         # 预览生产构建

# 代码质量
npm run format:check    # 检查代码格式 (Prettier)
npm run format          # 格式化代码
npm run lint            # 运行 ESLint
npm run sync            # 生成 Astro 模块的 TypeScript 类型
```

## 核心架构

### 技术栈
- **框架**: Astro 5.16.15 - 静态站点生成器
- **语言**: TypeScript (严格模式)
- **样式**: TailwindCSS v4
- **内容**: Markdown 文件 (Zod schema 验证)
- **搜索**: Pagefind (静态搜索)
- **代码高亮**: Shiki + 自定义 transformers

### 目录结构

```
src/
├── components/          # 可复用的 UI 组件
├── data/blog/          # 博客文章 Markdown (按年份组织)
├── layouts/            # 页面布局模板
├── pages/              # 路由定义
├── styles/             # 全局样式
├── utils/              # 工具函数和 transformers
├── config.ts           # 站点配置 (SEO、元数据、显示设置)
├── constants.ts        # 社交链接、分享链接
└── content.config.ts   # 内容集合配置 (Zod schemas)
```

### 关键配置文件

**`src/config.ts`** - 站点核心配置
- 站点元数据 (标题、作者、描述)
- 显示设置 (每页文章数、归档可见性)
- 语言设置: `lang: "zh"`
- 时区: `Asia/Shanghai`

**`src/content.config.ts`** - 内容架构
- 定义博客文章的 Zod schema
- 必需字段: `title`, `pubDatetime`, `description`, `author`
- 可选字段: `draft`, `featured`, `tags`, `ogImage`, `modDatetime`

**`astro.config.ts`** - Astro 框架配置
- Markdown 插件: remark-toc, remark-collapse
- Shiki 代码高亮配置
- Sitemap 和图片优化设置

## 开发注意事项

### 添加新文章

1. 在 `src/data/blog/` 中创建 Markdown 文件
2. 必需的 frontmatter 字段:
   ```yaml
   ---
   title: 文章标题
   description: 文章描述
   pubDatetime: 2025-01-27T12:00:00+08:00
   author: lhx
   tags: ["技术", "教程"]
   ---
   ```
3. 将 `draft: true` 添加到 frontmatter 以保存草稿 (不会发布)

### 内容特性

- **代码高亮**: Shiki 支持语法高亮、diff 标记、行高亮
- **TOC**: 使用 "Table of contents" 标题自动生成可折叠目录
- **图片**: 使用 `src/content/config.ts` 中定义的 image() schema
- **OG 图片**: 支持为文章动态生成 Open Graph 图片

### Git 提交规范

项目使用 Conventional Commits 规范:
- `feat:` 新功能
- `fix:` 问题修复
- `doc:` 文档更新
- `refactor:` 代码重构

### SEO 和社交

- 自动生成 sitemap.xml (除非禁用 `SITE.showArchives`)
- RSS feed 通过 @astrojs/rss 生成
- 支持自定义 OG 图片
- 可选: 通过 `PUBLIC_GOOGLE_SITE_VERIFICATION` 环境变量添加 Google 站点验证

## 重要约定

1. **时区处理**: 文章日期使用 `Asia/Shanghai` 时区
2. **语言**: 博客主要内容为中文,HTML lang 设置为 "zh"
3. **编辑链接**: 启用了编辑页面功能,链接到 GitHub 仓库
4. **搜索**: 构建后运行 Pagefind 生成搜索索引
5. **类型安全**: 所有内容都通过 Zod schema 验证
