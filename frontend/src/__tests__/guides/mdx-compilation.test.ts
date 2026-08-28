import { getAllGuides, getGuide } from "@/lib/guides";

describe("MDX Guide Compilation", () => {
  it("should compile all guide MDX files without errors", async () => {
    // Get all guides (this triggers MDX compilation)
    const guides = await getAllGuides();

    // Should have all 4 guides
    expect(guides).toHaveLength(4);

    // All guides should have basic structure
    guides.forEach((guide) => {
      expect(guide.frontmatter).toBeDefined();
      expect(guide.slug).toBeDefined();
    });

    // Test that each guide can be serialized without errors
    for (const guide of guides) {
      const fullGuide = await getGuide(guide.slug);
      expect(fullGuide.serializedContent).toBeDefined();
    }
  });

  it("should have valid frontmatter for all guides", async () => {
    const guides = await getAllGuides();

    guides.forEach((guide) => {
      const { frontmatter } = guide;

      // Required fields
      expect(frontmatter.title).toBeDefined();
      expect(frontmatter.slug).toBeDefined();
      expect(frontmatter.description).toBeDefined();
      expect(frontmatter.heroImage).toBeDefined();
      expect(frontmatter.readTime).toBeGreaterThan(0);
      expect(frontmatter.category).toBeDefined();
      expect(frontmatter.lastUpdated).toBeDefined();
    });
  });

  it("should not have text immediately after closing JSX tags", async () => {
    const fs = require("fs");
    const path = require("path");

    const guidesDir = path.join(process.cwd(), "content", "guides");
    const files = fs
      .readdirSync(guidesDir)
      .filter((f: string) => f.endsWith(".mdx"));

    files.forEach((file: string) => {
      const content = fs.readFileSync(path.join(guidesDir, file), "utf-8");
      const lines = content.split("\n");

      lines.forEach((line: string, index: number) => {
        // Check for </div> followed by text on the same line
        if (
          line.includes("</div>") &&
          line.split("</div>")[1]?.trim().length > 0
        ) {
          const textAfter = line.split("</div>")[1].trim();
          if (textAfter && !textAfter.startsWith("<")) {
            throw new Error(
              `${file}:${index + 1} - Text after closing tag: "${line.substring(0, 80)}..."`,
            );
          }
        }
      });
    });
  });

  it("should not declare a top-level H1 in MDX body (page H1 comes from frontmatter.title)", async () => {
    const fs = require("fs");
    const path = require("path");

    const guidesDir = path.join(process.cwd(), "content", "guides");
    const files = fs
      .readdirSync(guidesDir)
      .filter((f: string) => f.endsWith(".mdx"));

    const offenders: string[] = [];

    files.forEach((file: string) => {
      const content = fs.readFileSync(path.join(guidesDir, file), "utf-8");
      const lines = content.split("\n");
      let frontmatterDelimiters = 0;

      lines.forEach((line: string, index: number) => {
        if (line.trim() === "---" && frontmatterDelimiters < 2) {
          frontmatterDelimiters += 1;
          return;
        }
        if (frontmatterDelimiters < 2) return;

        if (/^# /.test(line)) {
          offenders.push(`${file}:${index + 1} - ${line.trim()}`);
        }
      });
    });

    expect(offenders).toEqual([]);
  });

  it("should not declare a dead seoMeta block in frontmatter", async () => {
    const fs = require("fs");
    const path = require("path");

    const guidesDir = path.join(process.cwd(), "content", "guides");
    const files = fs
      .readdirSync(guidesDir)
      .filter((f: string) => f.endsWith(".mdx"));

    const offenders = files.filter((file: string) => {
      const content = fs.readFileSync(path.join(guidesDir, file), "utf-8");
      return /^seoMeta:/m.test(content.split("---")[1] || "");
    });

    expect(offenders).toEqual([]);
  });

  it("should declare datePublished for all guides", async () => {
    const guides = await getAllGuides();

    guides.forEach((guide) => {
      expect(guide.frontmatter.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it("should not mix currency symbols within a single range", async () => {
    const fs = require("fs");
    const path = require("path");

    const guidesDir = path.join(process.cwd(), "content", "guides");
    const files = fs
      .readdirSync(guidesDir)
      .filter((f: string) => f.endsWith(".mdx"));

    const offenders: string[] = [];

    files.forEach((file: string) => {
      const content = fs.readFileSync(path.join(guidesDir, file), "utf-8");
      content.split("\n").forEach((line: string, index: number) => {
        // A range that opens in one currency and closes in the other,
        // e.g. "£18,478-€55,132" or "£17-€83".
        const mixedRange = /([£€])[\d,.]+\s*[-–]\s*([£€])[\d,.]+/g;

        for (const match of line.matchAll(mixedRange)) {
          if (match[1] !== match[2]) {
            offenders.push(`${file}:${index + 1} - ${match[0]}`);
          }
        }
      });
    });

    expect(offenders).toEqual([]);
  });

  it("should have unique slugs", async () => {
    const guides = await getAllGuides();
    const slugs = guides.map((g) => g.slug);
    const uniqueSlugs = new Set(slugs);

    expect(slugs.length).toBe(uniqueSlugs.size);
  });

  it("should not have unescaped < followed by digits (invalid JSX)", async () => {
    const fs = require("fs");
    const path = require("path");

    const guidesDir = path.join(process.cwd(), "content", "guides");
    const files = fs
      .readdirSync(guidesDir)
      .filter((f: string) => f.endsWith(".mdx"));

    files.forEach((file: string) => {
      const content = fs.readFileSync(path.join(guidesDir, file), "utf-8");
      const lines = content.split("\n");
      let inFrontmatter = false;
      let inCodeBlock = false;

      lines.forEach((line: string, index: number) => {
        // Track frontmatter boundaries
        if (line.trim() === "---") {
          inFrontmatter = !inFrontmatter;
          return;
        }

        // Track code block boundaries (both ``` and `)
        if (line.trim().startsWith("```") || line.includes("`")) {
          // Skip lines with inline code or code blocks
          return;
        }

        // Skip lines inside frontmatter
        if (inFrontmatter) return;

        // Check for < followed by digit (e.g., p<0.001)
        // This causes MDX to try parsing <0 as JSX tag
        const hasUnescapedLessThanDigit = /<\d/.test(line);

        if (hasUnescapedLessThanDigit) {
          throw new Error(
            `${file}:${index + 1} - Unescaped '<' followed by digit (invalid JSX): "${line.substring(0, 80)}..."\n` +
              `Wrap in code backticks or use &lt; instead`,
          );
        }
      });
    });
  });
});
