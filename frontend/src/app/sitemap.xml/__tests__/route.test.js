/**
 * Tests for dynamic sitemap.xml route
 * Following TDD approach for Next.js 15 app router implementation
 */

// Mock the services
jest.mock("../../../services/animalsService", () => ({
  getAllAnimals: jest.fn(),
  getAllAnimalsForSitemap: jest.fn(),
}));

jest.mock("../../../services/organizationsService", () => ({
  getAllOrganizations: jest.fn(),
}));

import {
  getAllAnimals,
  getAllAnimalsForSitemap,
} from "../../../services/animalsService";
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

  const mockDogs = [
    {
      id: 1,
      slug: "buddy-mixed-breed-1",
      name: "Buddy",
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      slug: "luna-labrador-2",
      name: "Luna",
      created_at: "2025-07-13T10:30:15.123Z",
      updated_at: "2025-07-13T10:30:15.123Z",
    },
  ];

  const mockOrganizations = [
    {
      id: 1,
      slug: "happy-paws-rescue-1",
      name: "Happy Paws Rescue",
      updated_at: "2025-07-12T15:22:45.567Z",
    },
    {
      id: 2,
      slug: "city-shelter-2",
      name: "City Animal Shelter",
      updated_at: "2025-07-11T09:15:30.890Z",
    },
  ];

  test("should generate valid XML sitemap with all content", async () => {
    getAllAnimalsForSitemap.mockResolvedValue(mockDogs);
    getAllOrganizations.mockResolvedValue(mockOrganizations);

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

    // Should include organization pages
    expect(response.body).toContain(
      "<loc>https://www.rescuedogs.me/organizations/happy-paws-rescue-1</loc>",
    );
    expect(response.body).toContain(
      "<loc>https://www.rescuedogs.me/organizations/city-shelter-2</loc>",
    );

    // Should include static pages
    expect(response.body).toContain(
      "<loc>https://www.rescuedogs.me/organizations</loc>",
    );

    expect(response.body).toContain("</urlset>");
  });

  test("should use custom base URL from environment", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://staging.rescuedogs.me";

    getAllAnimalsForSitemap.mockResolvedValue(mockDogs);
    getAllOrganizations.mockResolvedValue(mockOrganizations);

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
    getAllAnimalsForSitemap.mockResolvedValue(mockDogs);
    getAllOrganizations.mockResolvedValue(mockOrganizations);

    const { GET } = await import("../route");
    const response = await GET();

    expect(response.headers["Content-Type"]).toBe(
      "application/xml; charset=utf-8",
    );
    expect(response.headers["Cache-Control"]).toBe(
      "public, max-age=3600, s-maxage=86400",
    );
  });

  test("should handle API errors gracefully", async () => {
    getAllAnimals.mockRejectedValue(new Error("Database connection failed"));
    getAllOrganizations.mockRejectedValue(new Error("Service unavailable"));

    const { GET } = await import("../route");
    const response = await GET();

    // Should still return valid XML with static pages
    expect(response.body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(response.body).toContain("<loc>https://www.rescuedogs.me/</loc>");
    expect(response.status).toBe(200);
  });

  test("should include lastmod dates when available", async () => {
    getAllAnimalsForSitemap.mockResolvedValue(mockDogs);
    getAllOrganizations.mockResolvedValue(mockOrganizations);

    const { GET } = await import("../route");
    const response = await GET();

    // Should include formatted lastmod dates for organizations
    expect(response.body).toMatch(
      /<lastmod>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00<\/lastmod>/,
    );
    // Organization dates should be present
    expect(response.body).toContain(
      "<lastmod>2025-07-12T15:22:45+00:00</lastmod>",
    );
  });

  test("should handle empty data gracefully", async () => {
    getAllAnimalsForSitemap.mockResolvedValue([]);
    getAllOrganizations.mockResolvedValue([]);

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

  test("should filter out invalid slugs", async () => {
    const orgsWithInvalidSlugs = [
      { id: 1, slug: "valid-org-1", name: "Valid Org" },
      { id: 2, slug: null, name: "No Slug Org" },
      { id: 3, slug: "", name: "Empty Slug Org" },
    ];

    getAllAnimalsForSitemap.mockResolvedValue([]);
    getAllOrganizations.mockResolvedValue(orgsWithInvalidSlugs);

    const { GET } = await import("../route");
    const response = await GET();

    // Should include valid organization
    expect(response.body).toContain(
      "<loc>https://www.rescuedogs.me/organizations/valid-org-1</loc>",
    );
    // Should NOT include invalid slugs
    expect(response.body).not.toContain(
      "<loc>https://www.rescuedogs.me/organizations/null</loc>",
    );
    expect(response.body).not.toContain(
      "<loc>https://www.rescuedogs.me/organizations/</loc>",
    );
  });

  test("should include priority and changefreq for SEO optimization", async () => {
    getAllAnimalsForSitemap.mockResolvedValue(mockDogs);
    getAllOrganizations.mockResolvedValue(mockOrganizations);

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