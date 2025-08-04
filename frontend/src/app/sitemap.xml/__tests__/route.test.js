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
      updated_at: "2025-07-14T08:58:28.474Z",
    },
    {
      id: 2,
      slug: "luna-labrador-2",
      name: "Luna",
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
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    );

    // Should include homepage
    expect(response.body).toContain("<loc>https://rescuedogs.me/</loc>");

    // Should include dog pages
    expect(response.body).toContain(
      "<loc>https://rescuedogs.me/dogs/buddy-mixed-breed-1</loc>",
    );
    expect(response.body).toContain(
      "<loc>https://rescuedogs.me/dogs/luna-labrador-2</loc>",
    );

    // Should include organization pages
    expect(response.body).toContain(
      "<loc>https://rescuedogs.me/organizations/happy-paws-rescue-1</loc>",
    );
    expect(response.body).toContain(
      "<loc>https://rescuedogs.me/organizations/city-shelter-2</loc>",
    );

    // Should include static pages
    expect(response.body).toContain("<loc>https://rescuedogs.me/dogs</loc>");
    expect(response.body).toContain(
      "<loc>https://rescuedogs.me/organizations</loc>",
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
    expect(response.body).toContain(
      "<loc>https://staging.rescuedogs.me/dogs/buddy-mixed-breed-1</loc>",
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
      "no-cache, no-store, must-revalidate",
    );
  });

  test("should handle API errors gracefully", async () => {
    getAllAnimals.mockRejectedValue(new Error("Database connection failed"));
    getAllOrganizations.mockRejectedValue(new Error("Service unavailable"));

    const { GET } = await import("../route");
    const response = await GET();

    // Should still return valid XML with static pages
    expect(response.body).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(response.body).toContain("<loc>https://rescuedogs.me/</loc>");
    expect(response.status).toBe(200);
  });

  test("should include lastmod dates when available", async () => {
    getAllAnimalsForSitemap.mockResolvedValue(mockDogs);
    getAllOrganizations.mockResolvedValue(mockOrganizations);

    const { GET } = await import("../route");
    const response = await GET();

    // Should include formatted lastmod dates
    expect(response.body).toContain(
      "<lastmod>2025-07-14T08:58:28+00:00</lastmod>",
    );
    expect(response.body).toContain(
      "<lastmod>2025-07-13T10:30:15+00:00</lastmod>",
    );
  });

  test("should handle empty data gracefully", async () => {
    getAllAnimalsForSitemap.mockResolvedValue([]);
    getAllOrganizations.mockResolvedValue([]);

    const { GET } = await import("../route");
    const response = await GET();

    // Should still include static pages
    expect(response.body).toContain("<loc>https://rescuedogs.me/</loc>");
    expect(response.body).toContain("<loc>https://rescuedogs.me/dogs</loc>");
    expect(response.body).toContain(
      "<loc>https://rescuedogs.me/organizations</loc>",
    );
  });

  test("should filter out invalid slugs", async () => {
    const dogsWithInvalidSlugs = [
      { id: 1, slug: "valid-dog-1", name: "Valid Dog" },
      { id: 2, slug: null, name: "No Slug Dog" },
      { id: 3, slug: "", name: "Empty Slug Dog" },
    ];

    getAllAnimalsForSitemap.mockResolvedValue(dogsWithInvalidSlugs);
    getAllOrganizations.mockResolvedValue([]);

    const { GET } = await import("../route");
    const response = await GET();

    expect(response.body).toContain(
      "<loc>https://rescuedogs.me/dogs/valid-dog-1</loc>",
    );
    expect(response.body).not.toContain(
      "<loc>https://rescuedogs.me/dogs/null</loc>",
    );
    expect(response.body).not.toContain(
      "<loc>https://rescuedogs.me/dogs/</loc>",
    );
  });

  test("should include priority and changefreq for SEO optimization", async () => {
    getAllAnimalsForSitemap.mockResolvedValue(mockDogs);
    getAllOrganizations.mockResolvedValue(mockOrganizations);

    const { GET } = await import("../route");
    const response = await GET();

    // Homepage should have highest priority
    expect(response.body).toMatch(
      /<url>[\s\S]*?<loc>https:\/\/rescuedogs\.me\/<\/loc>[\s\S]*?<priority>1<\/priority>[\s\S]*?<\/url>/,
    );

    // Dog pages should have appropriate priority
    expect(response.body).toMatch(
      /<url>[\s\S]*?<loc>https:\/\/rescuedogs\.me\/dogs\/buddy-mixed-breed-1<\/loc>[\s\S]*?<priority>0\.8<\/priority>[\s\S]*?<\/url>/,
    );

    // Should include changefreq
    expect(response.body).toContain("<changefreq>daily</changefreq>");
    expect(response.body).toContain("<changefreq>monthly</changefreq>");
    expect(response.body).toContain("<changefreq>weekly</changefreq>");
  });
});
