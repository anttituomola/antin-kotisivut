import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(), // Use coerce.date() to handle string dates
    updatedDate: z.coerce.date().optional(),
    image: z.string().optional(),
    excerpt: z.string(),
    author: z.string(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };