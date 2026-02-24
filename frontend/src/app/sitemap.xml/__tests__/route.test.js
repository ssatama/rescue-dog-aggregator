/**
 * Tests for dynamic sitemap.xml route
 * Following TDD approach for Next.js 15 app router implementation
 */

// Mock the services (generateSitemap is now static-only, but mocks verify no API calls are made)
jest.mock("../../../services/animalsService", () => ({
  getAllAnimalsForSitemap: jest.fn(),
}));

jest.mock("../../../services/organizationsService", () => ({
  getAllOrganizations: jest.fn(),
}));

import { getAllAnimalsForSitemap } from "../../../services/animalsService";
import { getAllOrganizations } from "../../../services/organizationsService";

// Mock Next.js Response
global.Response = jest.fn().mockImplementation((body, init) => ({
  body,
  headers: init?.headers || {},
  status: init?.status || 200,
}));

describe("Dynamic Sitemap Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  test("should generate valid XML sitemap with static pages", async () => {
    const { GET } = await import("../route");
    const response = await GET();

    expect(response.body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(response.body).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    );

    // Should include homepage
    expect(response.body).toContain("<loc>https://www.rescuedogs.me/</loc>");

    // Should NOT include individual dog pages (they're in sitemap-dogs.xml to avoid duplication)
    expect(response.body).not.toContain(
      "<loc>https://www.rescuedogs.me/dogs/buddy-mixed-breed-1</loc>",
    );
    expect(response.body).not.toContain(
      "<loc>https://www.rescuedogs.me/dogs/luna-labrador-2</loc>",
    );
    
    // But SHOULD include the /dogs listing page
    expect(response.body).toContain(
      "<loc>https://www.rescuedogs.me/dogs</loc>",
    );

    // Should NOT include individual organization pages (they're in sitemap-organizations.xml)
    expect(response.body).not.toContain(
      "<loc>https://www.rescuedogs.me/organizations/happy-paws-rescue-1</loc>",
    );
    expect(response.body).not.toContain(
      "<loc>https://www.rescuedogs.me/organizations/city-shelter-2</loc>",
    );

    // Should include the /organizations listing page
    expect(response.body).toContain(
      "<loc>https://www.rescuedogs.me/organizations</loc>",
    );

    expect(response.body).toContain("</urlset>");
  });

  test("should use custom base URL from environment", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.rescuedogs.me";

    const { GET } = await import("../route");
    const response = await GET();

    expect(response.body).toContain(
      "<loc>https://staging.rescuedogs.me/</loc>",
    );
    // Individual dog pages are in sitemap-dogs.xml, not main sitemap
    expect(response.body).toContain(
      "<loc>https://staging.rescuedogs.me/dogs</loc>",
    );
  });

  test("should include proper HTTP headers", async () => {
    const { GET } = await import("../route");
    const response = await GET();

    expect(response.headers["Content-Type"]).toBe(
      "application/xml; charset=utf-8",
    );
    expect(response.headers["Cache-Control"]).toBe(
      "public, max-age=3600, s-maxage=86400",
    );
  });

  test("should generate sitemap without any API dependency", async () => {
    const { GET } = await import("../route");
    const response = await GET();

    // Main sitemap is purely static — no API calls needed
    expect(response.body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(response.body).toContain("<loc>https://www.rescuedogs.me/</loc>");
    expect(response.status).toBe(200);
    expect(getAllAnimalsForSitemap).not.toHaveBeenCalled();
    expect(getAllOrganizations).not.toHaveBeenCalled();
  });

  test("should contain only static pages (no lastmod from dynamic data)", async () => {
    const { GET } = await import("../route");
    const response = await GET();

    // Main sitemap now contains only static pages, which have no lastmod
    expect(response.body).not.toContain("<lastmod>");

    // Should include /faq page
    expect(response.body).toContain(
      "<loc>https://www.rescuedogs.me/faq</loc>",
    );
  });

  test("should handle empty data gracefully", async () => {
    const { GET } = await import("../route");
    const response = await GET();

    // Should still include static pages
    expect(response.body).toContain("<loc>https://www.rescuedogs.me/</loc>");
    expect(response.body).toContain(
      "<loc>https://www.rescuedogs.me/dogs</loc>",
    );
    expect(response.body).toContain(
      "<loc>https://www.rescuedogs.me/organizations</loc>",
    );
  });

  test("should not make API calls (static pages only)", async () => {
    const { GET } = await import("../route");
    const response = await GET();

    // Should return valid XML with static pages
    expect(response.body).toContain("<loc>https://www.rescuedogs.me/</loc>");
    expect(response.body).toContain("<loc>https://www.rescuedogs.me/dogs</loc>");

    // Should not have called any API services
    expect(getAllAnimalsForSitemap).not.toHaveBeenCalled();
    expect(getAllOrganizations).not.toHaveBeenCalled();
  });

  test("should include priority and changefreq for SEO optimization", async () => {
    const { GET } = await import("../route");
    const response = await GET();

    // Homepage should have highest priority
    expect(response.body).toMatch(
      /<url>[\s\S]*?<loc>https:\/\/www\.rescuedogs\.me\/<\/loc>[\s\S]*?<priority>1\.0<\/priority>[\s\S]*?<\/url>/,
    );

    // /dogs listing page should have high priority
    expect(response.body).toMatch(
      /<url>[\s\S]*?<loc>https:\/\/www\.rescuedogs\.me\/dogs<\/loc>[\s\S]*?<priority>0\.9<\/priority>[\s\S]*?<\/url>/,
    );

    // Should include updated realistic changefreq values
    expect(response.body).toContain("<changefreq>weekly</changefreq>");
    expect(response.body).toContain("<changefreq>monthly</changefreq>");
    // No more daily frequency - removed for realistic SEO
  });
});