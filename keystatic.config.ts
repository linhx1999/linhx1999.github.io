import { collection, config, fields } from "@keystatic/core";
import { SITE } from "./src/config";

const BLOG_IMAGE_DIRECTORY = "src/assets/images";
const BLOG_IMAGE_PUBLIC_PATH = "@/assets/images/";

export default config({
  storage: {
    kind: "local",
  },
  ui: {
    brand: {
      name: `${SITE.title} Admin`,
    },
  },
  collections: {
    blog: collection({
      label: "博客文章",
      slugField: "title",
      path: "src/data/blog/**",
      format: {
        contentField: "body",
      },
      entryLayout: "content",
      columns: ["title", "pubDatetime", "draft"],
      schema: {
        title: fields.slug({
          name: {
            label: "标题",
            validation: { isRequired: true },
          },
          slug: {
            label: "Slug",
          },
        }),
        description: fields.text({
          label: "摘要",
          description: "文章描述，用于摘要和 SEO 优化",
          multiline: true,
        }),
        pubDatetime: fields.datetime({
          label: "发布日期",
          description: "默认从 Git 首次提交时间自动获取",
        }),
        modDatetime: fields.datetime({
          label: "修改日期",
          description: "默认从 Git 最后一次修改时间自动获取（无后续修改则为空）",
        }),
        draft: fields.checkbox({
          label: "草稿",
          description: "新文章默认是草稿，需手动取消勾选以发布",
          defaultValue: true,
        }),
        featured: fields.checkbox({
          label: "首页展示",
          description: "是否展示在首页",
          defaultValue: false,
        }),
        tags: fields.array(
          fields.text({
            label: "标签",
          }),
          {
            label: "标签",
            itemLabel: props => props.value || "新标签",
          }
        ),
        author: fields.text({
          label: "作者",
          defaultValue: SITE.author,
        }),
        canonicalURL: fields.url({
          label: "Canonical URL",
          description: "规范 URL（绝对路径），用于文章已存在于其他来源的情况",
        }),
        hideEditPost: fields.checkbox({
          label: "隐藏编辑按钮",
          description: "是否隐藏编辑文章按钮",
          defaultValue: false,
        }),
        timezone: fields.text({
          label: "时区",
          defaultValue: SITE.timezone,
        }),
        ogImage: fields.image({
          label: "OG 图片",
          description: "社交媒体分享图片，默认使用站点配置或自动生成",
          directory: BLOG_IMAGE_DIRECTORY,
          publicPath: BLOG_IMAGE_PUBLIC_PATH,
        }),
        body: fields.markdoc({
          label: "正文",
          extension: "md",
          options: {
            image: {
              directory: BLOG_IMAGE_DIRECTORY,
              publicPath: BLOG_IMAGE_PUBLIC_PATH,
            },
          },
        }),
      },
    }),
  },
});
