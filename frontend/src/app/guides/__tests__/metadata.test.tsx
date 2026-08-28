import type { Metadata } from "next";
import { generateMetadata } from "@/app/guides/[slug]/page";

// Metadata["openGraph"] is a union whose non-article members have no `type`
// key at all, so narrowing needs `in` before the discriminant is reachable.
type ArticleOpenGraph = Extract<
  NonNullable<Metadata["openGraph"]>,
  { type: "article" }
>;

async function articleOpenGraph(slug: string): Promise<ArticleOpenGraph> {
  const metadata = await generateMetadata({
    params: Promise.resolve({ slug }),
  });
  const openGraph = metadata.openGraph;

  if (!openGraph || !("type" in openGraph) || openGraph.type !== "article") {
    throw new Error(`Expected article openGraph for ${slug}`);
  }

  return openGraph;
}

describe("guide page metadata", () => {
  it("takes openGraph.publishedTime from datePublished, not lastUpdated", async () => {
    const openGraph = await articleOpenGraph("european-rescue-guide");

    expect(openGraph.publishedTime).toBe("2025-10-04");
  });

  it("exposes lastUpdated as openGraph.modifiedTime", async () => {
    const openGraph = await articleOpenGraph("european-rescue-guide");

    expect(openGraph.modifiedTime).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(openGraph.modifiedTime).not.toBe(openGraph.publishedTime);
  });
});
