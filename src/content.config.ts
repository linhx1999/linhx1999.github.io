import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";
import { SITE } from "@/config";
import { statSync } from "node:fs";

export const BLOG_PATH = "src/data/blog";

// 自定义 loader，自动从文件系统获取创建和修改时间
const blogLoader = {
  name: "blog-with-auto-dates",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  load: async (context: any) => {
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

      // 如果 frontmatter 中没有指定日期，从文件系统获取
      if (filePath) {
        try {
          const stats = statSync(filePath);

          // 发布日期：使用文件创建时间
          if (!data.pubDatetime) {
            data.pubDatetime = stats.birthtime;
          }

          // 修改日期：只有当修改时间明显不同于创建时间时才设置
          if (!data.modDatetime) {
            const timeDiff = stats.mtime.getTime() - stats.birthtime.getTime();
            const hasSignificantChange = timeDiff > 60000; // 超过1分钟差异
            data.modDatetime = hasSignificantChange ? stats.mtime : null;
          }
        } catch {
          // 如果无法获取文件状态，保持原值
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
