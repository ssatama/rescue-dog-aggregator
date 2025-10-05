import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";

export async function serializeMdx(source: string) {
  return await serialize(source, {
    mdxOptions: {
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: "wrap" }],
        rehypeHighlight,
      ],
    },
  });
}

export function extractHeadings(mdxContent: string) {
  const headingRegex = /^##\s+(.+)$/gm;
  const headings: Array<{ id: string; title: string; level: number }> = [];

  let match;
  while ((match = headingRegex.exec(mdxContent)) !== null) {
    const title = match[1];
    const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    headings.push({ id, title, level: 2 });
  }

  return headings;
}
