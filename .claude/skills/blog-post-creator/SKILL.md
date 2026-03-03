---
name: blog-post-creator
description: 创建符合 AstroPaper 规范的博客文章。用于在 src/data/blog/posts/ 目录下创建新的 markdown 博客文章，包括正确的 frontmatter 格式、文件路径规划和内容结构指导。
---

# AstroPaper 博客文章创建

## 何时使用此 Skill

当用户需要创建新的博客文章时，使用此 skill 来：
- 生成正确的 frontmatter 格式
- 确定文章文件路径
- 遵循项目约定的文章结构

## 文章文件位置

文章存放在 `src/data/blog/posts/` 目录下：

```
src/data/blog/posts/[year]/article.md       -> /posts/[year]/article
src/data/blog/posts/article.md              -> /posts/article
src/data/blog/posts/_folder/article.md      -> /posts/article (下划线前缀不影响 URL)
```

## Frontmatter 模板

创建新文章时，复制此模板并根据需要填写：

```yaml
---
title: 文章标题（必填）
description: 文章描述，用于摘要和 SEO（可选）

# 时间和作者（可选，有默认值）
pubDatetime: 2025-01-15T10:00:00Z
modDatetime: 2025-01-15T12:00:00Z
author: 作者名
timezone: Asia/Shanghai

# 分类和状态（可选，有默认值）
tags:
  - 标签1
  - 标签2
featured: false    # 是否展示在首页
draft: true        # 是否草稿（新文章建议设为 true，发布时改为 false）

# SEO 相关（可选）
ogImage: /images/og-image.png
canonicalURL: https://example.com/original-post
hideEditPost: false
---
```

### 默认值说明

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `pubDatetime` | 文件创建时间 | 自动获取 |
| `modDatetime` | 文件修改时间 | 与创建时间差异小于1分钟则为 null |
| `author` | `config.site.author` | 站点配置中的作者 |
| `timezone` | `Asia/Shanghai` | 站点配置的时区 |
| `featured` | `false` | 不在首页展示 |
| `draft` | `true` | 新文章默认为草稿 |

## 内容编写规范

### 标题层级
- 文章主标题使用 frontmatter 中的 `title`
- 正文标题从 `##` (h2) 开始使用，不要使用 `#`

### 图片引用
使用别名路径 `@/assets/images/`：

```markdown
![图片描述](@/assets/images/posts/2025/example.png)
```

### 标签建议
查看 `src/data/blog/posts/` 现有文章，保持标签一致性。

## 完整示例

参考：[references/example-template.md](references/example-template.md)
