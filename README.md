## 💻 博客

本[博客](https://linhx1999.github.io/)部署在 GitHub Pages 上.

## 📐 配置文件

- **src/data/site.config.ts**: 基本的博客元数据.
- **astro.config.mjs** : 网站域名信息.
- **/public**:
  - favicon
  - robots.txt
  - open-graph -> 在分享博客链接时显示的图像。对于帖子，预览图像是帖子的封面。
- **src/components/Header.astro**: 顶部导航栏，包含社交网络

## 🗂️ 添加分类

**src/data/categories.ts**

Example:

```ts
export  const  CATEGORIES  =  [
'JavaScript',
'React',
'new category here'  <---
]  as  const
```

> 🚨 Zod 将会检查类别是否未正确编写。**如果有错它将在构建应用程序时抛出错误。** 🚨

## 📄 新建帖子

- **src/content/blog**: 在此文件夹中添加帖子。
- 文件名将用于创建页面的 slug/URL。
- Example :

```mk
---
heroImage: /src/assets/4jhau2076uhb1.png
category: 学习
description: test
pubDate: 2024-12-19
draft: false
tags:
  - tag_test1
  - tag_test2
title: test
---

test

![](<../../assets/屏幕截图 2024-08-02 140056.png>)


```

## 🧞 命令

| Command                 | Action                                                                                                                           |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`          | Installs dependencies                                                                                                            |
| `pnpm run dev`          | Starts local dev server at `localhost:4321`                                                                                      |
| `pnpm run build`        | Build your production site to `./dist/`                                                                                          |
| `pnpm run preview`      | Preview your build locally, before deploying                                                                                     |
| `pnpm run format:check` | Check code format with Prettier                                                                                                  |
| `pnpm run format`       | Format codes with Prettier                                                                                                       |
| `pnpm run sync`         | Generates TypeScript types for all Astro modules. [Learn more](https://docs.astro.build/en/reference/cli-reference/#astro-sync). |
| `pnpm run lint`         | Lint with ESLint                                                                                                                 |
