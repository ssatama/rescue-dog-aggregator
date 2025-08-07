/**
 * Tests for dynamic robots.txt route
 * Following TDD approach for Next.js 15 app router implementation
 */

// Mock Next.js Response
global.Response = jest.fn().mockImplementation((body, init) => ({
  body,
  headers: init?.headers || {},
  status: init?.status || 200,
}));

describe("Dynamic Robots.txt Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  test("should generate robots.txt for production environment", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.rescuedogs.me";

    const { GET } = await import("../route");
    const response = await GET();

    expect(response.body).toContain("User-agent: *");
    expect(response.body).toContain("Allow: /");
    expect(response.body).toContain("Allow: /dogs/");
    expect(response.body).toContain("Allow: /organizations/");
    expect(response.body).toContain(
      "Sitemap: https://www.rescuedogs.me/sitemap.xml",
    );

    // Should include AI crawler directives
    expect(response.body).toContain("User-agent: GPTBot");
    expect(response.body).toContain("User-agent: Claude-Web");
    expect(response.body).toContain("User-agent: anthropic-ai");

    // Should include disallow rules
    expect(response.body).toContain("Disallow: /admin/");
    expect(response.body).toContain("Disallow: /_next/");
  });

  test("should generate robots.txt for development environment", async () => {
    process.env.NODE_ENV = "development";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

    const { GET } = await import("../route");
    const response = await GET();

    expect(response.body).toContain("User-agent: *");
    expect(response.body).toContain("Disallow: /");
    expect(response.body).toContain(
      "Sitemap: http://localhost:3000/sitemap.xml",
    );

    // Should still allow certain paths for development testing
    expect(response.body).toContain("Allow: /dogs/");
    expect(response.body).toContain("Allow: /organizations/");
  });

  test("should use custom base URL from environment", async () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.rescuedogs.me";

    const { GET } = await import("../route");
    const response = await GET();

    expect(response.body).toContain(
      "Sitemap: https://staging.rescuedogs.me/sitemap.xml",
    );
  });

  test("should include proper HTTP headers", async () => {
    process.env.NODE_ENV = "production";

    const { GET } = await import("../route");
    const response = await GET();

    expect(response.headers["Content-Type"]).toBe("text/plain");
    expect(response.headers["Cache-Control"]).toBe("public, max-age=86400");
  });

  test("should handle missing environment variables gracefully", async () => {
    // Don't set any environment variables

    const { GET } = await import("../route");
    const response = await GET();

    // Should default to production-like behavior with default URL
    expect(response.body).toContain("User-agent: *");
    expect(response.body).toContain(
      "Sitemap: https://www.rescuedogs.me/sitemap.xml",
    );
    expect(response.status).toBe(200);
  });

  test("should include crawl delay for respectful crawling", async () => {
    process.env.NODE_ENV = "production";

    const { GET } = await import("../route");
    const response = await GET();

    expect(response.body).toContain("Crawl-delay: 1");
  });

  test("should allow API endpoints for structured data", async () => {
    process.env.NODE_ENV = "production";

    const { GET } = await import("../route");
    const response = await GET();

    expect(response.body).toContain("Allow: /api/v1/dogs");
    expect(response.body).toContain("Allow: /api/v1/organizations");
    expect(response.body).toContain("Allow: /api/v1/search");
  });

  test("should prioritize LLM and AI crawlers in production", async () => {
    process.env.NODE_ENV = "production";

    const { GET } = await import("../route");
    const response = await GET();

    // Should have specific sections for AI crawlers
    expect(response.body).toMatch(/User-agent: GPTBot[\s\S]*?Allow: \//);
    expect(response.body).toMatch(/User-agent: Claude-Web[\s\S]*?Allow: \//);
    expect(response.body).toMatch(/User-agent: anthropic-ai[\s\S]*?Allow: \//);
    expect(response.body).toMatch(/User-agent: ChatGPT-User[\s\S]*?Allow: \//);
    expect(response.body).toMatch(/User-agent: CCBot[\s\S]*?Allow: \//);
  });

  test("should allow Next.js Image Optimization API for Google Rich Results", async () => {
    process.env.NODE_ENV = "production";

    const { GET } = await import("../route");
    const response = await GET();

    // Should allow Next.js Image Optimization API
    expect(response.body).toContain("Allow: /_next/image");

    // Ensure proper order: static assets first, then image optimization
    expect(response.body).toContain("Allow: /_next/static/");

    // Should still disallow general _next/ directory
    expect(response.body).toContain("Disallow: /_next/");

    // Verify the specific pattern that Google Rich Results needs
    const lines = response.body.split("\n");
    const staticIndex = lines.findIndex((line) =>
      line.includes("Allow: /_next/static/"),
    );
    const imageIndex = lines.findIndex((line) =>
      line.includes("Allow: /_next/image"),
    );
    const disallowIndex = lines.findIndex((line) =>
      line.includes("Disallow: /_next/"),
    );

    // Image optimization should be allowed before general _next/ is disallowed
    expect(staticIndex).toBeGreaterThan(-1);
    expect(imageIndex).toBeGreaterThan(-1);
    expect(disallowIndex).toBeGreaterThan(-1);
    expect(imageIndex).toBeGreaterThan(staticIndex);
    expect(imageIndex).toBeLessThan(disallowIndex);
  });

  test("should allow Google Rich Results flag image optimization URLs", async () => {
    process.env.NODE_ENV = "production";

    const { GET } = await import("../route");
    const response = await GET();

    // Verify that the robots.txt would allow the specific pattern Google Rich Results uses
    // Example: /_next/image?url=https%3A%2F%2Fflagcdn.com%2F20x15%2Fch.png&w=48&q=75
    expect(response.body).toContain("Allow: /_next/image");

    // Parse the robots.txt to simulate how search engines would interpret it
    const lines = response.body
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    // Find all Allow and Disallow rules for _next paths
    const nextRules = lines.filter(
      (line) =>
        line.startsWith("Allow: /_next/") ||
        line.startsWith("Disallow: /_next/"),
    );

    // Should have both specific allows and general disallow
    expect(nextRules).toContain("Allow: /_next/static/");
    expect(nextRules).toContain("Allow: /_next/image");
    expect(nextRules).toContain("Disallow: /_next/");

    // Verify order - specific allows should come before general disallow
    const staticIndex = nextRules.indexOf("Allow: /_next/static/");
    const imageIndex = nextRules.indexOf("Allow: /_next/image");
    const disallowIndex = nextRules.indexOf("Disallow: /_next/");

    expect(staticIndex).toBeLessThan(disallowIndex);
    expect(imageIndex).toBeLessThan(disallowIndex);
  });
});
