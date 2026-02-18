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
          },
          slug: {
            label: "Slug",
          },
        }),
        description: fields.text({
          label: "摘要",
          multiline: true,
        }),
        pubDatetime: fields.date({
          label: "发布日期",
        }),
        modDatetime: fields.date({
          label: "修改日期",
        }),
        draft: fields.checkbox({
          label: "草稿",
          defaultValue: false,
        }),
        featured: fields.checkbox({
          label: "置顶",
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
        }),
        hideEditPost: fields.checkbox({
          label: "隐藏编辑按钮",
          defaultValue: false,
        }),
        timezone: fields.text({
          label: "时区",
          defaultValue: SITE.timezone,
        }),
        ogImage: fields.image({
          label: "OG 图片",
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
