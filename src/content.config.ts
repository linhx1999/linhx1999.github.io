import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { SITE } from "@/config";
import { getGitPostDates } from "@/utils/getGitPostDates";

export const BLOG_PATH = "src/data/blog";

// 自定义 loader，自动从 Git 历史补全创建和修改时间
const blogLoader = {
  name: "blog-with-auto-dates",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  load: async (context: any) => {
    context.store.clear();

    // 使用 glob loader 先加载所有文件
    const baseLoader = glob({
      pattern: "**/[^_]*.md",
      base: `./${BLOG_PATH}`,
    });

    // 创建拦截 parseData 来在验证前修改数据
    const originalParseData = context.parseData;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const interceptedParseData = async (options: any) => {
      const { filePath, data } = options;

      // 如果 frontmatter 中没有指定日期，从 Git 历史获取
      if (filePath) {
        const { pubDatetime, modDatetime } = getGitPostDates(filePath);

        if (!data.pubDatetime) {
          data.pubDatetime = pubDatetime;
        }

        if (!data.modDatetime) {
          data.modDatetime = modDatetime;
        }
      }

      // 调用原始的 parseData 进行验证
      return originalParseData(options);
    };

    await baseLoader.load({
      ...context,
      parseData: interceptedParseData,
    });
  },
};

const blog = defineCollection({
  loader: blogLoader,
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().optional().nullable(),

      // 时间和作者
      pubDatetime: z.date().optional().nullable(),
      modDatetime: z.date().optional().nullable(),
      author: z.string().default(SITE.author),
      timezone: z.string().default(SITE.timezone),

      // 分类和状态
      tags: z.array(z.string()).default(["others"]),
      featured: z.boolean().optional(),
      draft: z.boolean().default(true),

      // SEO 相关
      ogImage: image().or(z.string()).optional(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
    }),
});

export const collections = { blog };
