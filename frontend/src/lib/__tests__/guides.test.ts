import { getGuide, getAllGuideSlugs, getAllGuides } from "../guides";
import type { Guide } from "@/types/guide";

async function requireGuide(slug: string): Promise<Guide> {
  const guide = await getGuide(slug);
  if (!guide) {
    throw new Error(`Expected guide ${slug} to exist`);
  }
  return guide;
}

describe("guides utilities", () => {
  it("lists all guide slugs", () => {
    const slugs = getAllGuideSlugs();
    expect(slugs.length).toBeGreaterThan(0);
    expect(slugs).toContain("european-rescue-guide");
    expect(slugs).toContain("first-time-owner-guide");
    expect(slugs).toContain("costs-and-preparation");
  });

  it("fetches guide by slug", async () => {
    const guide = await requireGuide("european-rescue-guide");
    expect(guide.frontmatter.title).toBeDefined();
    expect(guide.frontmatter.slug).toBe("european-rescue-guide");
    expect(guide.content).toBeDefined();
  });

  it("parses frontmatter correctly", async () => {
    const guide = await requireGuide("european-rescue-guide");
    expect(guide.frontmatter).toHaveProperty("title");
    expect(guide.frontmatter).toHaveProperty("description");
    expect(guide.frontmatter).toHaveProperty("heroImage");
    expect(guide.frontmatter).toHaveProperty("readTime");
    expect(guide.frontmatter).toHaveProperty("category");
    expect(guide.frontmatter).toHaveProperty("keywords");
    expect(guide.frontmatter).toHaveProperty("lastUpdated");
    expect(guide.frontmatter).toHaveProperty("author");
  });

  it("fetches all guides", async () => {
    const guides = await getAllGuides();
    expect(guides.length).toBe(3);
    guides.forEach((guide) => {
      expect(guide.frontmatter.title).toBeDefined();
      expect(guide.content).toBeDefined();
      // serializedContent is undefined for performance (only serialized for individual guides)
    });
  });

  it("returns null for non-existent guide", async () => {
    await expect(getGuide("non-existent-guide")).resolves.toBeNull();
  });
});
