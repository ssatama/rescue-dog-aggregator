import { GET } from "../route";

// Mock guides utilities
jest.mock("@/lib/guides", () => ({
  getAllGuideSlugs: jest.fn(() => [
    "test-guide-1",
    "test-guide-2",
    "european-rescue-guide",
  ]),
}));

// Test response type that has body as string (as returned by GET in test env)
interface TestResponse {
  body: string;
  headers: Headers;
}

// Helper function to read Response body
function getResponseText(response: TestResponse): string {
  // In test environment, body is directly accessible as string
  return response.body || "";
}

// Helper to cast GET response to test response type
async function getTestResponse(): Promise<TestResponse> {
  return (await GET()) as unknown as TestResponse;
}

describe("Sitemap Guides Route", () => {
  it("returns XML response", async () => {
    const response = await getTestResponse();
    const contentType = response.headers.get("Content-Type");

    expect(contentType).toBe("application/xml");
  });

  it("includes XML declaration", async () => {
    const response = await getTestResponse();
    const text = getResponseText(response);

    expect(text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
  });

  it("includes urlset with correct namespace", async () => {
    const response = await getTestResponse();
    const text = getResponseText(response);

    expect(text).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );
    expect(text).toContain("</urlset>");
  });

  it("includes guides listing page", async () => {
    const response = await getTestResponse();
    const text = getResponseText(response);

    expect(text).toContain("<loc>https://www.rescuedogs.me/guides</loc>");
  });

  it("includes all guide slugs as URLs", async () => {
    const response = await getTestResponse();
    const text = getResponseText(response);

    expect(text).toContain(
      "<loc>https://www.rescuedogs.me/guides/test-guide-1</loc>",
    );
    expect(text).toContain(
      "<loc>https://www.rescuedogs.me/guides/test-guide-2</loc>",
    );
    expect(text).toContain(
      "<loc>https://www.rescuedogs.me/guides/european-rescue-guide</loc>",
    );
  });

  it("includes lastmod dates for all URLs", async () => {
    const response = await getTestResponse();
    const text = getResponseText(response);

    // Should have at least 4 lastmod tags (1 for /guides + 3 guide pages)
    const lastmodCount = (text.match(/<lastmod>/g) || []).length;
    expect(lastmodCount).toBeGreaterThanOrEqual(4);
  });

  it("includes changefreq for guides listing", async () => {
    const response = await getTestResponse();
    const text = getResponseText(response);

    expect(text).toContain("<changefreq>monthly</changefreq>");
  });

  it("includes changefreq for guide pages", async () => {
    const response = await getTestResponse();
    const text = getResponseText(response);

    expect(text).toContain("<changefreq>monthly</changefreq>");
  });

  it("includes priority for guides listing (0.9)", async () => {
    const response = await getTestResponse();
    const text = getResponseText(response);

    expect(text).toContain("<priority>0.9</priority>");
  });

  it("includes priority for guide pages (0.8)", async () => {
    const response = await getTestResponse();
    const text = getResponseText(response);

    expect(text).toContain("<priority>0.8</priority>");
  });

  it("returns well-formed XML", async () => {
    const response = await getTestResponse();
    const text = getResponseText(response);

    // Basic XML validation - should have matching opening and closing tags
    const urlCount = (text.match(/<url>/g) || []).length;
    const urlCloseCount = (text.match(/<\/url>/g) || []).length;

    expect(urlCount).toBe(urlCloseCount);
    expect(urlCount).toBeGreaterThanOrEqual(4); // /guides + 3 guide pages
  });
});
