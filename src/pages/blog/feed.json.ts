import { getCollection } from "astro:content";

// Static JSON feed of published blog posts, consumed by the mailing-list
// service to detect new posts.
export const prerender = true;

export async function GET() {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  const site = import.meta.env.SITE;

  const items = posts
    .map((post) => {
      const slug = post.id.replace(/\.(md|mdx)$/, "");
      return {
        id: slug,
        url: new URL(`/blog/${slug}`, site).href,
        title: post.data.title,
        excerpt: post.data.excerpt,
        pubDate: post.data.pubDate.toISOString().slice(0, 10),
        language: post.data.language,
        translationUrl: post.data.translationUrl
          ? new URL(post.data.translationUrl, site).href
          : null,
      };
    })
    .sort((a, b) => (a.pubDate < b.pubDate ? 1 : -1));

  return new Response(JSON.stringify({ posts: items }), {
    headers: { "Content-Type": "application/json" },
  });
}
