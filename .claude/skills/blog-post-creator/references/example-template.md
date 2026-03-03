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

以下是一些在该博客主题中创建新文章的规则、建议和技巧。

## 创建博客文章

要撰写新的博客文章，请在 `src/data/blog/posts/[year]/` 目录下创建一个 markdown 文件。

例如，如果你想将文章分组到 `2025` 下，可以将它们放在 `src/data/blog/posts/2025/`。这也会影响文章 URL，所以 `src/data/blog/posts/2025/example-post.md` 将通过 `/posts/2025/example-post` 访问。

如果你不希望子目录影响文章 URL，只需在文件夹名前加上下划线 `_`。

```bash
# 示例：博客文章结构和 URL
src/data/blog/very-first-post.md          -> mysite.com/posts/very-first-post
src/data/blog/2025/example-post.md        -> mysite.com/posts/2025/example-post
src/data/blog/_2026/another-post.md       -> mysite.com/posts/another-post
src/data/blog/docs/_legacy/how-to.md      -> mysite.com/posts/docs/how-to
"src/data/blog/Example Dir/Dummy Post.md"   -> mysite.com/posts/example-dir/dummy-post
```

## Frontmatter

Frontmatter 是存储博客文章（文章）一些重要信息的主要位置。Frontmatter 位于文章顶部，采用 YAML 格式编写。
创建新文件的时候，请参考该文章的 frontmatter 格式。

## 内容

### 标题

关于标题有一点需要注意。该博客文章使用 title（frontmatter 中的 title）作为文章的主标题。因此，文章中的其他标题应使用 h2 ~ h6。

这条规则不是强制性的，但强烈建议用于视觉、可访问性和 SEO 目的。

### 文本

使用 markdown 格式编写文章内容。

### 图片

在 markdown 中插入图片时，使用别名路径（`@/assets/images/`）。

示例：假设你想显示路径为 `src/assets/images/posts/examples/frontmatter.png` 的 `frontmatter.png`。

![frontmatter](@/assets/images/posts/examples/frontmatter.png)
