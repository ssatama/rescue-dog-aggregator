/**
 * Tests for static robots.txt file
 * Verifies the static robots.txt properly allows crawlers
 */

const fs = require("fs");
const path = require("path");

describe("Static Robots.txt File", () => {
  let robotsTxtContent;

  beforeAll(() => {
    // Read the static robots.txt file
    const robotsTxtPath = path.join(__dirname, "../../../public/robots.txt");
    robotsTxtContent = fs.readFileSync(robotsTxtPath, "utf8");
  });

  test("should allow all crawlers by default", () => {
    expect(robotsTxtContent).toContain("User-agent: *");
    expect(robotsTxtContent).toContain("Allow: /");
  });

  test("should include search engine crawlers", () => {
    expect(robotsTxtContent).toContain("User-agent: Googlebot");
    expect(robotsTxtContent).toContain("User-agent: Bingbot");
    expect(robotsTxtContent).toContain("User-agent: DuckDuckBot");
  });

  test("should include social media crawlers", () => {
    expect(robotsTxtContent).toContain("User-agent: facebookexternalhit");
    expect(robotsTxtContent).toContain("User-agent: Twitterbot");
    expect(robotsTxtContent).toContain("User-agent: LinkedInBot");
    expect(robotsTxtContent).toContain("User-agent: WhatsApp");
  });

  test("should include AI and LLM crawlers", () => {
    expect(robotsTxtContent).toContain("User-agent: GPTBot");
    expect(robotsTxtContent).toContain("User-agent: ChatGPT-User");
    expect(robotsTxtContent).toContain("User-agent: anthropic-ai");
    expect(robotsTxtContent).toContain("User-agent: Claude-Web");
    expect(robotsTxtContent).toContain("User-agent: PerplexityBot");
    expect(robotsTxtContent).toContain("User-agent: CCBot");
  });

  test("should block only sensitive paths", () => {
    expect(robotsTxtContent).toContain("Disallow: /admin/");
    expect(robotsTxtContent).toContain("Disallow: /api/internal/");
    expect(robotsTxtContent).toContain("Disallow: /_next/data/");
    expect(robotsTxtContent).toContain("Disallow: /.git/");
    expect(robotsTxtContent).toContain("Disallow: /config/");
    expect(robotsTxtContent).toContain("Disallow: /private/");
  });

  test("should include all sitemaps", () => {
    expect(robotsTxtContent).toContain(
      "Sitemap: https://www.rescuedogs.me/sitemap.xml",
    );
    expect(robotsTxtContent).toContain(
      "Sitemap: https://www.rescuedogs.me/sitemap-dogs.xml",
    );
    expect(robotsTxtContent).toContain(
      "Sitemap: https://www.rescuedogs.me/sitemap-organizations.xml",
    );
    expect(robotsTxtContent).toContain(
      "Sitemap: https://www.rescuedogs.me/sitemap-images.xml",
    );
  });

  test("should block aggressive bots", () => {
    expect(robotsTxtContent).toContain("User-agent: AhrefsBot");
    expect(robotsTxtContent).toContain("User-agent: SemrushBot");
    expect(robotsTxtContent).toContain("User-agent: DotBot");
    expect(robotsTxtContent).toContain("User-agent: MJ12bot");

    // These aggressive bots should be disallowed
    const lines = robotsTxtContent.split("\n");
    const ahrefsIndex = lines.findIndex((line) =>
      line.includes("User-agent: AhrefsBot"),
    );
    const ahrefsDisallow = lines
      .slice(ahrefsIndex, ahrefsIndex + 3)
      .some((line) => line.includes("Disallow: /"));
    expect(ahrefsDisallow).toBe(true);
  });

  test("should have proper format without syntax errors", () => {
    const lines = robotsTxtContent.split("\n");

    // Check for valid directive format
    const directivePattern =
      /^(User-agent:|Allow:|Disallow:|Sitemap:|Crawl-delay:|#|$)/;
    const invalidLines = lines.filter(
      (line) => !directivePattern.test(line.trim()),
    );

    expect(invalidLines).toEqual([]);
  });

  test("should not have overly restrictive rate limits", () => {
    // Should not have a global crawl-delay that affects all bots
    const lines = robotsTxtContent.split("\n");
    let currentUserAgent = null;
    let hasGlobalCrawlDelay = false;

    for (const line of lines) {
      if (line.startsWith("User-agent:")) {
        currentUserAgent = line.split(":")[1].trim();
      } else if (
        line.startsWith("Crawl-delay:") &&
        currentUserAgent === "*"
      ) {
        hasGlobalCrawlDelay = true;
      }
    }

    expect(hasGlobalCrawlDelay).toBe(false);
  });

  test("should allow access to all non-sensitive paths", () => {
    // The default "Allow: /" for User-agent: * should permit everything except explicitly disallowed paths
    const lines = robotsTxtContent.split("\n");
    const defaultSection = [];
    let inDefaultSection = false;

    for (const line of lines) {
      if (line.trim() === "User-agent: *") {
        inDefaultSection = true;
      } else if (line.startsWith("User-agent:") && inDefaultSection) {
        break;
      } else if (inDefaultSection) {
        defaultSection.push(line);
      }
    }

    // Should have Allow: / for general access
    const hasAllowAll = defaultSection.some(
      (line) => line.trim() === "Allow: /",
    );
    expect(hasAllowAll).toBe(true);

    // Should only disallow truly sensitive paths
    const disallowedPaths = defaultSection
      .filter((line) => line.startsWith("Disallow:"))
      .map((line) => line.split(":")[1].trim());

    const expectedDisallowed = [
      "/admin/",
      "/api/internal/",
      "/_next/data/",
      "/.git/",
      "/config/",
      "/private/",
    ];

    expectedDisallowed.forEach((path) => {
      expect(disallowedPaths).toContain(path);
    });
  });
});