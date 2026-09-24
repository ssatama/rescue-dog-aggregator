/**
 * Plain-markdown text of the guides for /llms-full.txt (#446). AI crawlers read raw
 * text, so the MDX components are flattened: stats become bullet lines, callouts are
 * unwrapped, and the live dog grids (which only render with JS) are dropped.
 */
export function mdxToPlainMarkdown(mdx: string): string {
  return mdx
    .replace(/<DogGrid\b[\s\S]*?\/>/g, "")
    .replace(/<Stats\s+value="([^"]*)"\s+label="([^"]*)"\s*\/>/g, "- $2: $1")
    .replace(/<\/?Callout\b[^>]*>/g, "")
    .replace(/<\/?div\b[^>]*>/g, "")
    .replace(/\\</g, "<")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

interface GuideForLlms {
  slug: string;
  frontmatter: { title: string; description: string; lastUpdated?: string };
  content: string;
}

export function buildLlmsFull(llmsTxt: string, guides: GuideForLlms[], baseUrl: string): string {
  const sections = guides.map((guide) =>
    [
      `# ${guide.frontmatter.title}`,
      "",
      `Source: ${baseUrl}/guides/${guide.slug}${guide.frontmatter.lastUpdated ? ` (updated ${guide.frontmatter.lastUpdated})` : ""}`,
      "",
      `> ${guide.frontmatter.description}`,
      "",
      mdxToPlainMarkdown(guide.content),
    ].join("\n"),
  );
  return [llmsTxt.trim(), ...sections].join("\n\n---\n\n") + "\n";
}
