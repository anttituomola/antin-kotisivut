import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    image: z.string().optional(),
    excerpt: z.string(),
    author: z.string(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
    language: z.enum(["en", "fi"]),
    translationUrl: z.string().optional(),
  }),
});

export const collections = { blog };
