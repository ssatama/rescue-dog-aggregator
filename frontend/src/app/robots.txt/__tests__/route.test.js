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
});
