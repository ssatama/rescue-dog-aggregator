import { GET } from "../route";
import { getAllGuides } from "@/lib/guides";

// Mock guides utilities
jest.mock("@/lib/guides", () => ({
  getAllGuides: jest.fn(() =>
    Promise.resolve([
      {
        slug: "test-guide-1",
        frontmatter: { lastUpdated: "2025-06-15" },
        content: "",
      },
      {
        slug: "test-guide-2",
        frontmatter: { lastUpdated: "2025-07-01" },
        content: "",
      },
      {
        slug: "european-rescue-guide",
        frontmatter: { lastUpdated: "2025-08-10" },
        content: "",
      },
    ]),
  ),
}));

const mockGetAllGuides = getAllGuides as jest.MockedFunction<typeof getAllGuides>;

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

  it("does not include changefreq or priority tags (Google ignores both)", async () => {
    const response = await getTestResponse();
    const text = getResponseText(response);

    expect(text).not.toContain("<changefreq>");
    expect(text).not.toContain("<priority>");
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

  it("uses most recent guide lastUpdated for /guides listing page", async () => {
    const response = await getTestResponse();
    const text = getResponseText(response);

    // 2025-08-10 is the most recent lastUpdated in mock data
    expect(text).toMatch(
      /<url>[\s\S]*?<loc>https:\/\/www\.rescuedogs\.me\/guides<\/loc>[\s\S]*?<lastmod>2025-08-10T00:00:00\+00:00<\/lastmod>/,
    );
  });

  it("returns empty sitemap on getAllGuides failure", async () => {
    mockGetAllGuides.mockRejectedValueOnce(new Error("Filesystem error"));

    const response = await getTestResponse();
    const text = getResponseText(response);

    expect(text).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(text).toContain("</urlset>");
    // Should have no <url> entries
    expect(text).not.toContain("<url>");
  });
});
