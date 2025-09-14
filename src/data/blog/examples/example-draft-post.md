---
title: 博文草稿模板
author: linhx
pubDatetime: 2024-09-14T12:00:00Z
slug: post-draft-template
featured: false
draft: false
tags:
  - tag1
  - tag2
description:
  博文草稿模板，用于留档一些模板格式和用法（比如图片插入等）.
---

## 1 Frontmatter

Frontmatter 是存储博客文章一些重要信息的主要地方，位于文章顶部，采用 YAML 格式编写（如下图）。有关 Frontmatter 及其用法的更多信息，请参阅 [Astro 文档](https://docs.astro.build/en/guides/markdown-content/)。
![Frontmatter](@/assets/images/examples/frontmatter.png)

该博客框架所使用的 Frontmatter 属性有如下几个：

| Property           | Description                                                                                                                           | Remark                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **_title_**        | 文章的标题(h1，所以博文内容的标题最好以h2开始，即`##`)                                                                                    | 必填<sup>\*</sup>                          |
| **_description_**  | 文章的描述，用于文章摘要和该文章的网站描述                                                                                            | 必填<sup>\*</sup>                          |
| **_pubDatetime_**  | ISO 8601 格式的发布日期时间                                                                                                             | 必填<sup>\*</sup>                          |
| **_modDatetime_**  | ISO 8601 格式的修改日期时间（仅在博客文章被修改时添加此属性）                                                                            | optional                                       |
| **_author_**       | 文章的作者 | 默认值是 `SITE.author` |
| **_slug_**         | 文章的 slug（URL 路径片段），此字段可选                                                                                           | 默认是 slugified file name                  |
| **_featured_**     | 是否在首页的精选部分显示此文章                                                                     | 默认值是 `false`                                |
| **_draft_**        | 将此文章标记为“未发布”                                                                                                        | 默认值是 `false`                                |
| **_tags_**         | 此文章的相关关键词，以 YAML 数组格式编写                                                                         | 默认值是 `others`                               |
| **_ogImage_**      | 文章的 OG 图片，对社交媒体分享和 SEO 有用。这可以是一个远程 URL 或相对于当前文件夹的图片路径。  | 默认值是 `SITE.ogImage` or generated OG image |
| **_canonicalURL_** | 规范 URL（绝对路径），用于文章已存在于其他来源的情况。                                                         | 默认值是 `Astro.site` + `Astro.url.pathname`  |
| **_hideEditPost_** | 在博客标题下隐藏“编辑文章”按钮，这仅适用于当前博客文章                                                    | 默认值是 `false`                                |
| **_timezone_**     | 为当前博客文章指定一个 IANA 格式的时区，这将覆盖当前文章的 SITE.timezone 配置 | 默认值是 `SITE.timezone`                      |

> 可以在浏览器控制台中运行 `new Date().toISOString()` 来获取 ISO 8601 格式的日期时间。不过，请确保移除引号。


## 2 常用的Markdown语法

### 2.1 图片插入

使用感叹号 `!` 添加图片, 然后在方括号增加替代文本`alt`。  
图片链接放在圆括号里，括号里的链接后可以增加一个可选的图片标题文本`title`。

```markdown
![图片替代文本alt](@/assets/images/example.jpg "图片标题title")
```

替代文本`alt`和标题文本`title`的区别如下：

| 特性           | `alt` 属性                     | `title` 属性                   |
|----------------|--------------------------------|--------------------------------|
| 主要用途       | 图片无法显示时的替代文本       | 鼠标悬停时的提示信息           |
| 无障碍支持     | ✅ 屏幕阅读器会朗读             | ❌ 通常不朗读（不可靠）         |
| SEO 作用       | ✅ 有助于搜索引擎理解图片       | ❌ 基本无影响                  |
| 显示时机       | 图片加载失败时                 | 鼠标悬停时                     |
| 是否必需       | ✅ 推荐始终设置（即使为空）     | ❌ 可选（通常不用加）                        |
| 移动端支持     | ✅ 始终有效                     | ⚠️ 通常无效（无悬停）          |



样例渲染效果如下：
![震惊](@/assets/images/amaze.jpg "耄耋和懒懒")

### 2.2 链接插入
链接文本放在中括号内，链接地址放在后面的括号中，链接title可选。 
链接title是当鼠标悬停在链接上时会出现的文字，这个title是可选的，它放在圆括号中链接地址后面，跟链接地址之间以空格分隔。  
```markdown 
[我的个人博客](https://linhx1999.github.io "我的博客地址")
```

渲染效果：  
欢迎访问[我的个人博客](https://linhx1999.github.io "个人博客地址")

### 围栏代码块插入
````markdown
```javascript
// 也可以插入代码块 (You can also insert code blocks)
function helloWorld() {
  console.log("Hello, World!");
}
```
````

### 换行

在一行的末尾添加两个或多个空格，然后按回车键,即可创建一个换行。
```markdown
This is the first line.  
And this is the second line.
```

### 引用
> 在段落前添加一个 `>` 符号
