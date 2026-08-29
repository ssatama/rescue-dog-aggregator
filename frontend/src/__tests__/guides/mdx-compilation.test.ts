import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getAllGuides, getGuide } from "@/lib/guides";

interface GuideFile {
  file: string;
  data: Record<string, unknown>;
  body: string;
}

function readGuideFiles(): GuideFile[] {
  const guidesDir = path.join(process.cwd(), "content", "guides");

  return fs
    .readdirSync(guidesDir)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const { data, content } = matter(
        fs.readFileSync(path.join(guidesDir, file), "utf-8"),
      );
      return { file, data, body: content };
    });
}

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
    const offenders: string[] = [];

    readGuideFiles().forEach(({ file, body }) => {
      let inCodeFence = false;

      body.split("\n").forEach((line: string, index: number) => {
        if (/^\s*```/.test(line)) {
          inCodeFence = !inCodeFence;
          return;
        }
        if (inCodeFence) return;

        if (/^# /.test(line)) {
          offenders.push(`${file}:${index + 1} - ${line.trim()}`);
        }
      });
    });

    expect(offenders).toEqual([]);
  });

  it("should not declare a dead seoMeta block in frontmatter", async () => {
    const offenders = readGuideFiles()
      .filter(({ data }) => "seoMeta" in data)
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it("should declare datePublished for all guides", async () => {
    const guides = await getAllGuides();

    guides.forEach((guide) => {
      expect(guide.frontmatter.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it("should not mix currency symbols within a single range", async () => {
    const offenders: string[] = [];

    readGuideFiles().forEach(({ file, body }) => {
      body.split("\n").forEach((line: string, index: number) => {
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

  it("should convert £ to € at a consistent rate", async () => {
    // Wrong symbols are one failure mode; a wrong converted value behind the
    // right symbol is the other, and it reads as authoritative. Every guide
    // quotes euro alongside sterling at roughly 1.17, so an implied rate far
    // outside that band is an arithmetic slip, not a rounding choice.
    const AMOUNT = "[\\d,]+(?:\\.\\d+)?";
    const RANGE = new RegExp(
      `£(${AMOUNT})\\s*[-–]\\s*£?(${AMOUNT})\\+?\\s*[(/]\\s*€(${AMOUNT})\\s*[-–]\\s*€?(${AMOUNT})`,
      "g",
    );
    const SINGLE = new RegExp(`£(${AMOUNT})\\+?\\s*[(/]\\s*€(${AMOUNT})`, "g");

    // Below this, rounding to whole euros dominates (£3 → €4 is 1.33 and fine).
    const ROUNDING_FLOOR_GBP = 10;
    const MIN_RATE = 1.1;
    const MAX_RATE = 1.25;

    const toNumber = (raw: string): number => Number(raw.replace(/,/g, ""));
    const offenders: string[] = [];

    readGuideFiles().forEach(({ file, body }) => {
      body.split("\n").forEach((line: string, index: number) => {
        const pairs: Array<[number, number]> = [];
        const consumed: Array<[number, number]> = [];

        for (const m of line.matchAll(RANGE)) {
          consumed.push([m.index, m.index + m[0].length]);
          pairs.push([toNumber(m[1]), toNumber(m[3])]);
          pairs.push([toNumber(m[2]), toNumber(m[4])]);
        }

        for (const m of line.matchAll(SINGLE)) {
          const insideRange = consumed.some(
            ([start, end]) => m.index >= start && m.index < end,
          );
          if (!insideRange) pairs.push([toNumber(m[1]), toNumber(m[2])]);
        }

        pairs.forEach(([gbp, eur]) => {
          if (gbp < ROUNDING_FLOOR_GBP) return;
          const rate = eur / gbp;
          if (rate < MIN_RATE || rate > MAX_RATE) {
            offenders.push(
              `${file}:${index + 1} - £${gbp} → €${eur} implies ${rate.toFixed(2)}`,
            );
          }
        });
      });
    });

    expect(offenders).toEqual([]);
  });

  it("should not reintroduce claims removed as unsupported or repealed", async () => {
    // Each pattern is a claim deleted in the unsupported-claims pass, either
    // because no primary source could be found for it or because the
    // instrument it names was repealed. This is a speed bump, not a ban: if a
    // primary source turns up, update this list in the same commit that cites
    // it. A revert on its own should fail. See
    // docs/audits/guides-regulatory-audit.md.
    const REMOVED: Array<[string, RegExp]> = [
      ["Balai Directive (repealed 21 April 2021)", /Balai/i],
      ["89% of imports using the wrong rules", /89%/],
      ["14.8% Leishmania positive rate", /14\.8%/],
      ["Romania exported 33,725 dogs", /33,725/],
      ["Turkish shelter capacity figures", /105,000/],
      ["2.7% public support poll", /2\.7% public support/],
      ["Romanian Law 258/2013", /258\/2013/],
      ["98% of owners underestimate costs", /98% of pet owners/],
      ["100% adjusted well at six months", /100% of owners/],
      ["unnamed PMC adjustment study", /published in PMC shows/],
      ["CareCredit emergency figures", /CareCredit/],
      ["Cesar's Way surrender research", /Cesar's Way/],
      ["Walkin' Pets senior-dog recommendation", /Walkin' Pets/],
      ["Minnesota Greyhound Rescue", /Minnesota Greyhound/],
      ["University of Pennsylvania lifetime range", /University of Pennsylvania/],
      ["FDA drug dosing", /mg\/kg/],
      ["car restraints as a legal requirement", /restraints?[^.]*legally required|legally required[^.]*restraint/i],
    ];

    const offenders: string[] = [];

    // Scoped per line: a body-wide test lets `[^.]*` in a pattern run across
    // newlines and match two unrelated sentences.
    readGuideFiles().forEach(({ file, body }) => {
      body.split("\n").forEach((line, index) => {
        REMOVED.forEach(([label, pattern]) => {
          if (pattern.test(line)) {
            offenders.push(`${file}:${index + 1} - ${label}`);
          }
        });
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
