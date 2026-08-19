import { extractHeadings, serializeMdx } from "../mdx";

describe("extractHeadings", () => {
  it("extracts H2 headings from MDX", () => {
    const mdx = "## First\n\nContent\n\n## Second Section";
    const headings = extractHeadings(mdx);
    expect(headings).toHaveLength(2);
    expect(headings[0]).toEqual({
      id: "first",
      title: "First",
      level: 2,
    });
    expect(headings[1]).toEqual({
      id: "second-section",
      title: "Second Section",
      level: 2,
    });
  });

  it("handles MDX with no headings", () => {
    const mdx = "Just some text without headings";
    const headings = extractHeadings(mdx);
    expect(headings).toHaveLength(0);
  });

  it("ignores H1 and H3 headings", () => {
    const mdx = "# H1\n\n## H2\n\n### H3";
    const headings = extractHeadings(mdx);
    expect(headings).toHaveLength(1);
    expect(headings[0].title).toBe("H2");
  });
});

describe("serializeMdx", () => {
  it("serializes MDX content without errors", async () => {
    const mdx = "## Test\n\nSome content with **bold** text.";
    const result = await serializeMdx(mdx);
    expect(result).toBeDefined();
    expect(result.compiledSource).toBeDefined();
  });

  it("processes GitHub Flavored Markdown tables", async () => {
    const mdx = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
    `;
    const result = await serializeMdx(mdx);
    expect(result).toBeDefined();
    expect(result.compiledSource).toBeDefined();
  });
});
