## 💻 Demo

Check out the [Blog](https://linhx1999.github.io/), hosted on GitHub Pages.

## 📐 Configure

- Edit the configuration file **src/data/site.config.ts** for the basic blog metadata.
- Update the **astro.config.mjs** file at the root of the project with your own domain.
- Modify the files in the **/public** folder:
  - favicon
  - robots.txt -> update the Sitemap url to your own domain
  - open-graph -> the open-graph is the image that will be displayed when sharing the blog link. For posts, the preview image is the post cover.
- Edit the social networks in the Header component - **src/components/Header.astro**, change the URL to your social network.

## 🗂️ Adding a category

To add a new category to your blog, simply go to the src/data/categories.ts file and add it to the array.

Example:

```ts
export  const  CATEGORIES  =  [
'JavaScript',
'React',
'new category here'  <---
]  as  const
```

> 🚨 Zod checks whether the category is not correctly written or does not exist in the properties of the markdown document. **It will throw an error when building the application.** 🚨

## 📄 Adding a post

Adding a post is as simple as adding a .md or .mdx file to the blog folder at the path **src/content/blog**. The filename will be used to create the slug/URL of the page.

For example, if you have a file named **jsx-and-react.md**, it will be transformed into: **http://yourdomain.com/post/jsx-and-react/**

Example :

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

## ⚡️ Frontmatter

### Required properties:

- Title
- Description
- pubDate
- heroImage (post cover)
- category (Choose a category from src/data/categories.ts)

### Optional properties:

- draft (no need to include it, by default it's false)
- tags

> The schema for posts is located at src/content/config.ts. You can modify any parameter, for example, by adding a maximum of 80 characters for titles: title: z.string().max(80).
> For more information, refer to the zod documentation.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                 | Action                                                                                                                           |
| :---------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`          | Installs dependencies                                                                                                            |
| `pnpm run dev`          | Starts local dev server at `localhost:3000`                                                                                      |
| `pnpm run build`        | Build your production site to `./dist/`                                                                                          |
| `pnpm run preview`      | Preview your build locally, before deploying                                                                                     |
| `pnpm run format:check` | Check code format with Prettier                                                                                                  |
| `pnpm run format`       | Format codes with Prettier                                                                                                       |
| `pnpm run sync`         | Generates TypeScript types for all Astro modules. [Learn more](https://docs.astro.build/en/reference/cli-reference/#astro-sync). |
| `pnpm run lint`         | Lint with ESLint                                                                                                                 |
