import { clampDescription, clampTitle } from "../seoMeta";

describe("seoMeta (#444)", () => {
  it("leaves short text alone but collapses whitespace and line breaks", () => {
    expect(clampDescription("  Since 1891,\n\nwe rescue   dogs. ")).toBe("Since 1891, we rescue dogs.");
  });

  it("cuts descriptions at a word boundary to 160 characters", () => {
    const text = "word ".repeat(60);
    const out = clampDescription(text);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("word…")).toBe(true);
  });

  it("cuts titles to 65 characters without a dangling separator", () => {
    const out = clampTitle("REAN (Rescuing European Animals in Need) - Dog Rescue Organization in the UK");
    expect(out.length).toBeLessThanOrEqual(65);
    expect(out).not.toMatch(/[-–,]\s*…$/);
  });
});
