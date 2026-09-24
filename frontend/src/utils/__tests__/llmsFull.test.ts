import { buildLlmsFull, mdxToPlainMarkdown } from "../llmsFull";

describe("llms-full.txt (#446)", () => {
  it("flattens the guide MDX components to plain markdown", () => {
    const mdx = [
      '<div className="grid">',
      '  <Stats value="£380-£750" label="UK adoption + transport range" />',
      "</div>",
      "",
      '<Callout type="info">',
      "**Quick Summary:** Costs vary.",
      "</Callout>",
      "",
      "<DogGrid",
      '  location_country="RS"',
      "  limit={4}",
      "/>",
      "",
      "Small dogs (\\<25 lbs) are cheaper; large dogs (\\>60 lbs) cost more.",
    ].join("\n");

    const out = mdxToPlainMarkdown(mdx);

    expect(out).toContain("- UK adoption + transport range: £380-£750");
    expect(out).toContain("**Quick Summary:** Costs vary.");
    expect(out).toContain("Small dogs (<25 lbs)");
    expect(out).toContain("large dogs (>60 lbs)");
    expect(out).not.toMatch(/<\/?(Callout|DogGrid|Stats|div)\b/);
  });

  it("appends each guide with its title and source URL after llms.txt", () => {
    const full = buildLlmsFull(
      "# Rescue Dog Aggregator\n",
      [{ slug: "costs", frontmatter: { title: "Costs", description: "What it costs." }, content: "Body." }],
      "https://www.rescuedogs.me",
    );

    expect(full.startsWith("# Rescue Dog Aggregator")).toBe(true);
    expect(full).toContain("# Costs\n\nSource: https://www.rescuedogs.me/guides/costs");
    expect(full).toContain("Body.");
  });
});
