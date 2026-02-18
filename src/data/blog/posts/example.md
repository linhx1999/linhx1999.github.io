---
title: 文章标题，必须填写
# description: 文章描述，用于摘要和 SEO 优化。可选

# 时间和作者（可选，有默认值）
# pubDatetime: 发布时间，默认从文件创建时间自动获取
# modDatetime: 修改时间，默认从文件修改时间自动获取（与创建时间差异小于1分钟则为 null）
# author: 作者，默认值为 config.site.author
# timezone: 时区，默认值为 config.site.timezone（Asia/Shanghai）

# 分类和状态（可选，有默认值）
# tags:
#   - 标签1
#   - 标签2
# featured: 是否展示在首页，默认值为 false
# draft: 是否草稿，默认值为 true（新文章默认是草稿，需手动设为 false 发布）

# SEO 相关（可选）
# ogImage: 社交媒体分享图片，默认使用 SITE.ogImage 或自动生成
# canonicalURL: 规范 URL（绝对路径），用于文章已存在于其他来源的情况
# hideEditPost: 是否隐藏"编辑文章"按钮，默认值为 false
---

以下是一些在 AstroPaper 博客主题中创建新文章的规则、建议和技巧。

<figure>
<img
src="https://images.pexels.com/photos/159618/still-life-school-retro-ink-159618.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
alt="带有书写工具、复古时钟和皮包的经典木桌免费库存照片"
/>
<figcaption class="text-center">
照片由 <a href="https://www.pexels.com/photo/brown-wooden-desk-159618/">Pixabay</a> 提供
</figcaption>
</figure>

## 目录

## 创建博客文章

要撰写新的博客文章，请在 `src/data/blog/` 目录下创建一个 markdown 文件。

> 在 AstroPaper v5.1.0 之前，所有博客文章都必须放在 `src/data/blog/` 中，这意味着你不能将它们组织到子目录中。

从 AstroPaper v5.1.0 开始，你现在可以将博客文章组织到子目录中，使内容管理更加便捷。

例如，如果你想将文章分组到 `2025` 下，可以将它们放在 `src/data/blog/2025/`。这也会影响文章 URL，所以 `src/data/blog/2025/example-post.md` 将通过 `/posts/2025/example-post` 访问。

如果你不希望子目录影响文章 URL，只需在文件夹名前加上下划线 `_`。

```bash
# 示例：博客文章结构和 URL
src/data/blog/very-first-post.md          -> mysite.com/posts/very-first-post
src/data/blog/2025/example-post.md        -> mysite.com/posts/2025/example-post
src/data/blog/_2026/another-post.md       -> mysite.com/posts/another-post
src/data/blog/docs/_legacy/how-to.md      -> mysite.com/posts/docs/how-to
src/data/blog/Example Dir/Dummy Post.md   -> mysite.com/posts/example-dir/dummy-post
```

> 💡 提示：你也可以在 frontmatter 中覆盖博客文章的 slug。详情请参见下一节。

如果子目录 URL 没有出现在构建输出中，请删除 node_modules，重新安装包，然后重新构建。

## Frontmatter

Frontmatter 是存储博客文章（文章）一些重要信息的主要位置。Frontmatter 位于文章顶部，采用 YAML 格式编写。了解更多关于 frontmatter 及其用法的信息，请参阅 [astro 文档](https://docs.astro.build/en/guides/markdown-content/)。

以下是每篇文章的 frontmatter 属性列表。

### 必需字段

这些字段在每篇博客文章中**必须**指定：

{% table %}
- 属性
- 说明
- 示例
---
- ***title***
- 文章标题（h1，所以正文标题建议从 h2 开始）
- `title: 我的文章标题`
---
- ***description***
- 文章描述，用于文章摘要和 SEO 描述
- `description: 文章简介...`
---
- ***pubDatetime***
- ISO 8601 格式的发布日期时间
- `pubDatetime: 2024-01-15T10:30:00Z`
{% /table %}

### 可选字段

这些字段为可选，如不指定将使用默认值：

{% table %}
- 属性
- 说明
- 默认值
---
- ***author***
- 文章作者
- `SITE.author`
---
- ***modDatetime***
- ISO 8601 格式的修改日期时间（仅在文章被修改时添加）
- `null`（不显示）
---
- ***featured***
- 是否在首页精选部分显示此文章
- `false`
---
- ***draft***
- 标记为"未发布"，草稿文章不会出现在生产构建中
- `false`
---
- ***tags***
- 文章相关标签，以 YAML 数组格式编写
- `["others"]`
---
- ***ogImage***
- 文章的 OG 图片，用于社交媒体分享和 SEO。可以是远程 URL 或相对于当前文件夹的图片路径
- `SITE.ogImage` 或自动生成
---
- ***canonicalURL***
- 规范 URL（绝对路径），用于文章已存在于其他来源的情况
- 自动生成
---
- ***hideEditPost***
- 在博客标题下隐藏"编辑文章"按钮
- `false`
---
- ***timezone***
- IANA 格式时区（如 "Asia/Shanghai"），覆盖当前文章的 SITE.timezone 配置
- `SITE.timezone`
---
- ***slug***
- 文章 URL 的自定义 slug，如不指定则从文件名自动生成
- 文件名 slug 化
{% /table %}

> **提示！** 你可以在浏览器控制台中运行 `new Date().toISOString()` 来获取 ISO 8601 日期时间。不过，请确保移除引号。

> **注意：** 只有 `title`、`description` 和 `pubDatetime` 字段是必需的。所有其他字段都是可选的，将使用其默认值。

标题和描述（摘要）对搜索引擎优化（SEO）很重要，因此 AstroPaper 鼓励在博客文章中包含这些内容。

`slug` 是 URL 的唯一标识符。因此，`slug` 必须唯一且与其他文章不同。`slug` 中的空格应使用 `-` 或 `_` 分隔，但推荐使用 `-`。Slug 会自动使用博客文章文件名生成。但是，你可以在博客文章的 frontmatter 中定义你的 `slug`。

例如，如果博客文件名是 `adding-new-post.md`，而你没有在 frontmatter 中指定 slug，Astro 将自动使用文件名创建博客文章的 slug。因此，slug 将是 `adding-new-post`。但如果你在 frontmatter 中指定了 `slug`，这将覆盖默认的 slug。你可以在 [Astro 文档](https://docs.astro.build/en/guides/content-collections/#defining-custom-slugs) 中阅读更多相关内容。

如果你在博客文章中省略了 `tags`（换句话说，如果没有指定标签），默认标签 `others` 将被用作该文章的标签。你可以在 `content.config.ts` 文件中设置默认标签。

```ts
export const blogSchema = z.object({
  // ...
  draft: z.boolean().optional(),
  // [!code highlight:1]
  tags: z.array(z.string()).default(["others"]), // 将 "others" 替换为你想要的任何内容
  // ...
});
```

### Frontmatter 示例

以下是博客文章的两种 frontmatter 示例：

#### 最简示例（仅必需字段）

```yaml
---
title: 我的博客文章标题
description: 这篇博客文章内容的简要描述。
pubDatetime: 2024-01-15T10:30:00Z
---
```

#### 完整示例（全部字段）

```yaml
---
# 必需字段
title: 文章标题
description: 这是示例文章的示例描述。
pubDatetime: 2022-09-21T05:17:19Z

# 可选字段
author: 你的名字                              # 默认: SITE.author
slug: the-title-of-the-post                   # 默认: 自动生成
featured: true                                # 默认: false
draft: false                                  # 默认: false
modDatetime: 2022-09-22T08:00:00Z             # 默认: null
tags:                                         # 默认: ["others"]
  - some
  - example
  - tags
ogImage: ../../assets/images/example.png      # 默认: SITE.ogImage 或自动生成
# ogImage: "https://example.org/remote-image.png"  # 远程 URL 也可
canonicalURL: https://example.org/my-article-was-already-posted-here  # 默认: 自动生成
hideEditPost: false                           # 默认: false
timezone: Asia/Shanghai                       # 默认: SITE.timezone
---
```

## 添加目录

默认情况下，文章不包含任何目录（toc）。要包含目录，你必须以特定方式指定它。

以 h2 格式（markdown 中的 ##）编写 `目录`，并将其放在你希望它出现在文章中的位置。

例如，如果你想将目录放在介绍段落下方（就像我通常做的那样），你可以按以下方式操作。

<!-- prettier-ignore-start -->

```md
---
# frontmatter
---

以下是一些在 AstroPaper 博客主题中创建新文章的建议、技巧和窍门。

<!-- [!code ++] -->
## 目录

<!-- 文章的其余部分 -->
```

<!-- prettier-ignore-end -->

## 标题

关于标题有一点需要注意。AstroPaper 博客文章使用 title（frontmatter 中的 title）作为文章的主标题。因此，文章中的其他标题应使用 h2 ~ h6。

这条规则不是强制性的，但强烈建议用于视觉、可访问性和 SEO 目的。

## 语法高亮

AstroPaper 使用 [Shiki](https://shiki.style/) 作为默认语法高亮。从 AstroPaper v5.4 开始，使用 [@shikijs/transformers](https://shiki.style/packages/transformers) 来增强围栏代码块。如果你不想使用它，可以像这样简单地移除它

```bash
pnpm remove @shikijs/transformers
```

```js
// ...
// [!code --:5]
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";

export default defineConfig({
  // ...
  markdown: {
    remarkPlugins: [remarkToc, [remarkCollapse, { test: "目录" }]],
    shikiConfig: {
      // 更多主题请访问 https://shiki.style/themes
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName(),
      // [!code --:3]
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  // ...
}
```

## 存储博客内容的图片

以下是在 markdown 文件中存储和显示图片的两种方法。

> 注意！如果需要在 markdown 中设置优化后的图片样式，你应该 [使用 MDX](https://docs.astro.build/en/guides/images/#images-in-mdx-files)。

### 在 `src/assets/` 目录中（推荐）

你可以将图片存储在 `src/assets/` 目录中。这些图片将通过 [Image Service API](https://docs.astro.build/en/reference/image-service-reference/) 自动由 Astro 优化。

你可以使用相对路径或别名路径（`@/assets/`）来引用这些图片。

示例：假设你想显示路径为 `/src/assets/images/example.jpg` 的 `example.jpg`。

```md
![something](@/assets/images/example.jpg)

<!-- 或者 -->

![something](../../assets/images/example.jpg)

<!-- 使用 img 标签或 Image 组件不会生效 ❌ -->
<img src="@/assets/images/example.jpg" alt="something">
<!-- ^^ 这是错误的 -->
```

> 从技术上讲，你可以将图片存储在 `src` 下的任何目录中。在这里，`src/assets` 只是一个建议。

### 在 `public` 目录中

你可以将图片存储在 `public` 目录中。请记住，存储在 `public` 目录中的图片不会被 Astro 处理，这意味着它们不会被优化，你需要自己处理图片优化。

对于这些图片，你应该使用绝对路径；这些图片可以使用 [markdown 注释](https://www.markdownguide.org/basic-syntax/#images-1) 或 [HTML img 标签](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img) 显示。

示例：假设 `example.jpg` 位于 `/public/assets/images/example.jpg`。

```md
![something](/assets/images/example.jpg)

<!-- 或者 -->

<img src="/assets/images/example.jpg" alt="something">
```

## 额外提示

### 图片压缩

当你在博客文章中放入图片时（特别是 `public` 目录下的图片），建议对图片进行压缩。这会影响网站的整体性能。

我推荐的图片压缩网站：

- [TinyPng](https://tinypng.com/)
- [TinyJPG](https://tinyjpg.com/)

### OG 图片

如果文章未指定 OG 图片，将放置默认的 OG 图片。虽然不是必需的，但应该在 frontmatter 中指定与文章相关的 OG 图片。OG 图片的推荐尺寸是 ***1200 X 640*** 像素。

> 从 AstroPaper v1.4.0 开始，如果未指定 OG 图片，将自动生成。查看 [公告](https://astro-paper.pages.dev/posts/dynamic-og-image-generation-in-astropaper-blog-posts/)。
