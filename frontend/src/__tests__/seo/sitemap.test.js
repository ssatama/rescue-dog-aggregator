/**
 * Tests for dynamic sitemap.xml generation
 * Following TDD approach for SEO implementation
 */

// Mock the services
jest.mock("../../services/animalsService", () => ({
  getAllAnimals: jest.fn(),
  getAllAnimalsForSitemap: jest.fn(),
}));

jest.mock("../../services/organizationsService", () => ({
  getAllOrganizations: jest.fn(),
}));

import { getAllAnimalsForSitemap } from "../../services/animalsService";
import { getAllOrganizations } from "../../services/organizationsService";

// Import the sitemap generation function (to be implemented)
import {
  generateSitemap,
  generateDogSitemap,
  formatSitemapEntry,
  formatDateForSitemap,
} from "../../utils/sitemap";

describe("Dynamic Sitemap Generation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDogs = [
    {
      id: 1,
      slug: "buddy-mixed-breed-1",
      name: "Buddy",
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z",
      organization: { name: "Happy Paws" },
    },
    {
      id: 2,
      slug: "luna-labrador-retriever-2",
      name: "Luna",
      created_at: "2024-01-16T11:00:00Z",
      updated_at: "2024-01-16T11:00:00Z",
      organization: { name: "City Shelter" },
    },
  ];

  const mockOrganizations = [
    {
      id: 1,
      slug: "happy-paws-rescue-1",
      name: "Happy Paws Rescue",
      updated_at: "2024-01-10T09:00:00Z",
    },
    {
      id: 2,
      slug: "city-animal-shelter-2",
      name: "City Animal Shelter",
      updated_at: "2024-01-12T14:00:00Z",
    },
  ];

  describe("formatSitemapEntry", () => {
    test("should format basic sitemap entry with required fields", () => {
      const entry = formatSitemapEntry({
        url: "https://www.rescuedogs.me/dogs/1",
        lastmod: "2024-01-15T10:00:00Z",
        changefreq: "daily",
        priority: 0.8,
      });

      expect(entry).toEqual({
        url: "https://www.rescuedogs.me/dogs/1",
        lastmod: "2024-01-15T10:00:00Z",
        changefreq: "daily",
        priority: 0.8,
      });
    });

    test("should handle entry with minimal data", () => {
      const entry = formatSitemapEntry({
        url: "https://www.rescuedogs.me/about",
      });

      expect(entry.url).toBe("https://www.rescuedogs.me/about");
      expect(entry.lastmod).toBeUndefined();
      expect(entry.changefreq).toBeUndefined();
      expect(entry.priority).toBeUndefined();
    });

    test("should validate URL format", () => {
      expect(() => formatSitemapEntry({ url: "invalid-url" })).toThrow();
      expect(() => formatSitemapEntry({ url: "" })).toThrow();
      expect(() => formatSitemapEntry({})).toThrow();
    });

    test("should validate priority range", () => {
      expect(() =>
        formatSitemapEntry({
          url: "https://www.rescuedogs.me/test",
          priority: 1.5,
        }),
      ).toThrow();

      expect(() =>
        formatSitemapEntry({
          url: "https://www.rescuedogs.me/test",
          priority: -0.1,
        }),
      ).toThrow();
    });

    test("should validate changefreq values", () => {
      const validFreqs = [
        "always",
        "hourly",
        "daily",
        "weekly",
        "monthly",
        "yearly",
        "never",
      ];

      validFreqs.forEach((freq) => {
        expect(() =>
          formatSitemapEntry({
            url: "https://www.rescuedogs.me/test",
            changefreq: freq,
          }),
        ).not.toThrow();
      });

      expect(() =>
        formatSitemapEntry({
          url: "https://www.rescuedogs.me/test",
          changefreq: "invalid",
        }),
      ).toThrow();
    });
  });

  describe("generateSitemap", () => {
    test("should generate complete sitemap with static pages", async () => {
      const sitemap = await generateSitemap();

      expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(sitemap).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      );
      expect(sitemap).toContain("</urlset>");
    });

    test("should NOT include individual dog pages (dogs are in sitemap-dogs.xml)", async () => {
      const sitemap = await generateSitemap();

      // Static filter pages like /dogs/age, /dogs/puppies, /dogs/senior are expected
      // But individual dog detail pages (with slugs like buddy-mixed-breed-1) should NOT appear
      expect(sitemap).not.toContain("/dogs/buddy-mixed-breed-1");
      expect(sitemap).not.toContain("/dogs/luna-labrador-retriever-2");

      // But /dogs listing page should be included
      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/dogs</loc>",
      );
    });

    test("should have appropriate priorities for different page types", async () => {
      const sitemap = await generateSitemap();

      // Homepage should have highest priority
      expect(sitemap).toMatch(
        /<url>[\s\S]*?<loc>https:\/\/www\.rescuedogs\.me\/<\/loc>[\s\S]*?<priority>1\.0<\/priority>/
      );

      // Main sections should have high priority
      expect(sitemap).toMatch(
        /<url>[\s\S]*?<loc>https:\/\/www\.rescuedogs\.me\/dogs<\/loc>[\s\S]*?<priority>0\.9<\/priority>/
      );

      // Informational pages should have lower priority
      expect(sitemap).toMatch(
        /<url>[\s\S]*?<loc>https:\/\/www\.rescuedogs\.me\/about<\/loc>[\s\S]*?<priority>0\.[0-9]<\/priority>/
      );
    });

    test("should include static pages with correct priorities", async () => {
      const sitemap = await generateSitemap();

      // Homepage should have highest priority
      expect(sitemap).toContain("<loc>https://www.rescuedogs.me/</loc>");
      expect(sitemap).toContain("<priority>1.0</priority>");

      // Main sections should have high priority
      expect(sitemap).toContain("<loc>https://www.rescuedogs.me/dogs</loc>");
      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/organizations</loc>",
      );

      // Informational pages should have medium priority
      expect(sitemap).toContain("<loc>https://www.rescuedogs.me/about</loc>");
      expect(sitemap).toContain("<loc>https://www.rescuedogs.me/privacy</loc>");
    });

    test("should NOT include /search route (non-existent page)", async () => {
      const sitemap = await generateSitemap();

      // /search route should not be in sitemap as it doesn't exist in app structure
      expect(sitemap).not.toContain(
        "<loc>https://www.rescuedogs.me/search</loc>",
      );
    });

    test("should NOT include individual dog pages (to avoid duplication with sitemap-dogs.xml)", async () => {
      const sitemap = await generateSitemap();

      // Should NOT include individual dog pages in main sitemap
      expect(sitemap).not.toContain(
        "<loc>https://www.rescuedogs.me/dogs/buddy-mixed-breed-1</loc>",
      );
      expect(sitemap).not.toContain(
        "<loc>https://www.rescuedogs.me/dogs/luna-labrador-retriever-2</loc>",
      );

      // Should include the /dogs listing page
      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/dogs</loc>",
      );
    });

    test("should NOT include organization pages (they belong in sitemap-organizations.xml)", async () => {
      getAllAnimalsForSitemap.mockResolvedValue([]);
      getAllOrganizations.mockResolvedValue(mockOrganizations);

      const sitemap = await generateSitemap();

      // Individual organization pages should NOT be in main sitemap
      expect(sitemap).not.toContain(
        "<loc>https://www.rescuedogs.me/organizations/happy-paws-rescue-1</loc>",
      );
      expect(sitemap).not.toContain(
        "<loc>https://www.rescuedogs.me/organizations/city-animal-shelter-2</loc>",
      );

      // The /organizations listing page should still be present
      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/organizations</loc>",
      );
    });

    test("should handle empty data gracefully", async () => {
      const sitemap = await generateSitemap();

      // Should still include static pages
      expect(sitemap).toContain("<loc>https://www.rescuedogs.me/</loc>");
      expect(sitemap).toContain("<loc>https://www.rescuedogs.me/dogs</loc>");
      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/organizations</loc>",
      );

      // Should be valid XML
      expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(sitemap).toContain("</urlset>");
    });

    test("should generate sitemap with static pages only (no API calls)", async () => {
      const sitemap = await generateSitemap();

      // Should generate sitemap with static pages
      expect(sitemap).toContain("<loc>https://www.rescuedogs.me/</loc>");
      expect(sitemap).toContain("</urlset>");

      // generateSitemap should not call any APIs
      expect(getAllAnimalsForSitemap).not.toHaveBeenCalled();
      expect(getAllOrganizations).not.toHaveBeenCalled();
    });

    test("should validate generated XML format", async () => {
      const sitemap = await generateSitemap();

      // Basic XML structure validation
      expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(
        true,
      );
      expect(sitemap).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      );
      expect(sitemap.endsWith("</urlset>")).toBe(true);

      // Count opening and closing url tags should match
      const openTags = (sitemap.match(/<url>/g) || []).length;
      const closeTags = (sitemap.match(/<\/url>/g) || []).length;
      expect(openTags).toBe(closeTags);
      expect(openTags).toBeGreaterThan(0);
    });

    test("should respect URL limits for large datasets", async () => {
      const largeDogList = Array.from({ length: 60000 }, (_, i) => ({
        id: i + 1,
        name: `Dog ${i + 1}`,
        updated_at: "2024-01-15T10:00:00Z",
      }));

      getAllAnimalsForSitemap.mockResolvedValue(largeDogList);

      const sitemap = await generateDogSitemap();

      // Should limit URLs to 50,000 (sitemap standard limit)
      const urlCount = (sitemap.match(/<url>/g) || []).length;
      expect(urlCount).toBeLessThanOrEqual(50000);
    });

    test("should include /faq page", async () => {
      const sitemap = await generateSitemap();

      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/faq</loc>",
      );
      expect(sitemap).toMatch(
        /<url>[\s\S]*?<loc>https:\/\/www\.rescuedogs\.me\/faq<\/loc>[\s\S]*?<priority>0\.7<\/priority>/
      );
    });
  });

  describe("generateDogSitemap", () => {
    test("should include ALL dog pages", async () => {
      getAllAnimalsForSitemap.mockResolvedValue(mockDogs);

      const sitemap = await generateDogSitemap();

      // Should include individual dog pages
      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/dogs/buddy-mixed-breed-1</loc>",
      );
      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/dogs/luna-labrador-retriever-2</loc>",
      );
    });

    test("should include dog pages with all quality levels", async () => {
      const mockDogsAllQualities = [
        {
          id: 1,
          slug: "buddy-with-description",
          name: "Buddy",
          created_at: "2024-01-15T10:00:00Z",
          properties: {
            description: "Detailed description",
          },
        },
        {
          id: 2,
          slug: "luna-short-description",
          name: "Luna",
          created_at: "2024-01-16T11:00:00Z",
          properties: {
            description: "Short.",
          },
        },
        {
          id: 3,
          slug: "max-no-description",
          name: "Max",
          created_at: "2024-01-17T12:00:00Z",
          properties: {},
        },
      ];

      getAllAnimalsForSitemap.mockResolvedValue(mockDogsAllQualities);

      const sitemap = await generateDogSitemap();

      // All dogs should be included regardless of description quality
      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/dogs/buddy-with-description</loc>",
      );
      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/dogs/luna-short-description</loc>",
      );
      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/dogs/max-no-description</loc>",
      );
    });

    test("should calculate dynamic priorities based on dog attributes", async () => {
      const mockDogsForPriority = [
        {
          id: 1,
          slug: "high-priority-dog",
          name: "Premium Dog",
          created_at: "2024-01-15T10:00:00Z",
          primary_image_url: "https://example.com/dog1.jpg",
          properties: {
            description: "Detailed description for high priority dog.",
          },
        },
        {
          id: 2,
          slug: "low-priority-dog",
          name: "Basic Dog",
          created_at: "2024-01-05T12:00:00Z",
          properties: {},
        },
      ];

      getAllAnimalsForSitemap.mockResolvedValue(mockDogsForPriority);

      const sitemap = await generateDogSitemap();

      // Should have different priority values for different dogs
      const priorityRegex = /<priority>0\.[0-9]+<\/priority>/g;
      const priorities = sitemap.match(priorityRegex);

      expect(priorities).toBeTruthy();
      expect(priorities.length).toBe(2);
      // Priorities should be different
      expect(new Set(priorities).size).toBeGreaterThan(1);
    });

    test("should include lastmod dates from dog data", async () => {
      getAllAnimalsForSitemap.mockResolvedValue(mockDogs);

      const sitemap = await generateDogSitemap();

      // Should include lastmod dates formatted for XML sitemap
      expect(sitemap).toContain("<lastmod>2024-01-15T10:00:00+00:00</lastmod>");
      expect(sitemap).toContain("<lastmod>2024-01-16T11:00:00+00:00</lastmod>");
    });
  });

  describe("formatDateForSitemap", () => {
    test("should format API date with microseconds to W3C datetime format", () => {
      const apiDate = "2025-07-14T08:58:28.426257";
      const result = formatDateForSitemap(apiDate);

      // Should be in W3C datetime format (ISO 8601 with timezone)
      expect(result).toBe("2025-07-14T08:58:28+00:00");
    });

    test("should handle API date without microseconds", () => {
      const apiDate = "2025-07-14T08:58:28";
      const result = formatDateForSitemap(apiDate);

      expect(result).toBe("2025-07-14T08:58:28+00:00");
    });

    test("should handle API date with timezone already present", () => {
      const apiDate = "2025-07-14T08:58:28Z";
      const result = formatDateForSitemap(apiDate);

      expect(result).toBe("2025-07-14T08:58:28+00:00");
    });

    test("should return null for invalid date strings", () => {
      expect(formatDateForSitemap("invalid-date")).toBeNull();
      expect(formatDateForSitemap("2025-13-40T99:99:99")).toBeNull();
    });

    test("should return null for null or undefined input", () => {
      expect(formatDateForSitemap(null)).toBeNull();
      expect(formatDateForSitemap(undefined)).toBeNull();
      expect(formatDateForSitemap("")).toBeNull();
    });

    test("should handle edge case of future dates", () => {
      const futureDate = "2030-12-31T23:59:59.999999";
      const result = formatDateForSitemap(futureDate);

      expect(result).toBe("2030-12-31T23:59:59+00:00");
    });

    test("should handle edge case of very old dates", () => {
      const oldDate = "1970-01-01T00:00:00.000000";
      const result = formatDateForSitemap(oldDate);

      expect(result).toBe("1970-01-01T00:00:00+00:00");
    });
  });

  describe("generateDogPages with real API date format", () => {
    test("should format dog dates correctly with real API microsecond format", async () => {
      // Mock dogs with the actual API date format (microseconds, no timezone)
      const mockDogsWithRealDates = [
        {
          id: 1,
          slug: "buddy-1",
          name: "Buddy",
          created_at: "2025-07-14T08:58:28.426257", // Real API format - should use created_at
          updated_at: "2025-07-15T10:00:00.000000", // Different from created_at
          organization: { name: "Happy Paws" },
        },
        {
          id: 2,
          slug: "luna-2",
          name: "Luna",
          created_at: "2025-07-11T20:13:59.641485", // Real API format - should use created_at
          updated_at: "2025-07-12T12:00:00.000000", // Different from created_at
          organization: { name: "City Shelter" },
        },
      ];

      getAllAnimalsForSitemap.mockResolvedValue(mockDogsWithRealDates);

      const sitemap = await generateDogSitemap();

      // Should contain properly formatted lastmod dates using created_at (not updated_at)
      expect(sitemap).toContain("<lastmod>2025-07-14T08:58:28+00:00</lastmod>");
      expect(sitemap).toContain("<lastmod>2025-07-11T20:13:59+00:00</lastmod>");

      // Should not contain the raw API date format or updated_at dates
      expect(sitemap).not.toContain("2025-07-14T08:58:28.426257");
      expect(sitemap).not.toContain("2025-07-11T20:13:59.641485");
      expect(sitemap).not.toContain("2025-07-15T10:00:00+00:00"); // updated_at should not be used
      expect(sitemap).not.toContain("2025-07-12T12:00:00+00:00"); // updated_at should not be used
    });
  });

  describe("breed slug deduplication", () => {
    test("should deduplicate breed slugs in generateBreedPages", async () => {
      // Mock fetch to return duplicate breed slugs
      const mockBreedStats = {
        qualifying_breeds: [
          { breed_slug: "labrador-retriever", breed_type: "purebred", count: 50, last_updated: "2025-01-01T00:00:00Z" },
          { breed_slug: "labrador-retriever", breed_type: "purebred", breed_group: "Sporting", count: 30, last_updated: "2025-01-02T00:00:00Z" },
          { breed_slug: "german-shepherd", breed_type: "purebred", count: 40, last_updated: "2025-01-01T00:00:00Z" },
          { breed_slug: "german-shepherd", breed_type: "purebred", breed_group: "Herding", count: 20, last_updated: "2025-01-02T00:00:00Z" },
          { breed_slug: "golden-retriever", breed_type: "purebred", count: 35, last_updated: "2025-01-01T00:00:00Z" },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBreedStats),
      });

      const { generateBreedPages } = require("../../utils/sitemap");
      const pages = await generateBreedPages();

      const breedUrls = pages
        .map((p) => p.url)
        .filter((url) => url !== "https://www.rescuedogs.me/breeds" && url !== "https://www.rescuedogs.me/breeds/mixed");

      // Should have 3 unique breeds, not 5
      expect(breedUrls).toHaveLength(3);
      expect(breedUrls).toContain("https://www.rescuedogs.me/breeds/labrador-retriever");
      expect(breedUrls).toContain("https://www.rescuedogs.me/breeds/german-shepherd");
      expect(breedUrls).toContain("https://www.rescuedogs.me/breeds/golden-retriever");

      delete global.fetch;
    });
  });

  describe("generateSitemapIndex", () => {
    test("should generate valid sitemap index XML", () => {
      const { generateSitemapIndex } = require("../../utils/sitemap");
      const sitemapIndex = generateSitemapIndex();

      // Should have proper XML structure
      expect(
        sitemapIndex.startsWith('<?xml version="1.0" encoding="UTF-8"?>'),
      ).toBe(true);
      expect(sitemapIndex).toContain(
        '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      );
      expect(sitemapIndex).toContain("</sitemapindex>");
    });

    test("should include all 4 sitemaps", () => {
      const { generateSitemapIndex } = require("../../utils/sitemap");
      const sitemapIndex = generateSitemapIndex();

      // Should include main sitemap
      expect(sitemapIndex).toContain(
        "<loc>https://www.rescuedogs.me/sitemap.xml</loc>",
      );

      // Should include dogs sitemap
      expect(sitemapIndex).toContain(
        "<loc>https://www.rescuedogs.me/sitemap-dogs.xml</loc>",
      );

      // Should include organizations sitemap
      expect(sitemapIndex).toContain(
        "<loc>https://www.rescuedogs.me/sitemap-organizations.xml</loc>",
      );

      // Should include images sitemap
      expect(sitemapIndex).toContain(
        "<loc>https://www.rescuedogs.me/sitemap-images.xml</loc>",
      );
    });

    test("should include lastmod dates for all sitemaps", () => {
      const { generateSitemapIndex } = require("../../utils/sitemap");
      const sitemapIndex = generateSitemapIndex();

      // Should have lastmod tags
      const lastmodCount = (sitemapIndex.match(/<lastmod>/g) || []).length;
      expect(lastmodCount).toBe(7); // One for each sitemap (including countries)

      // Should have proper date format (W3C datetime)
      expect(sitemapIndex).toMatch(
        /<lastmod>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00<\/lastmod>/,
      );
    });

    test("should have matching opening and closing tags", () => {
      const { generateSitemapIndex } = require("../../utils/sitemap");
      const sitemapIndex = generateSitemapIndex();

      // Count sitemap tags
      const openSitemapTags = (sitemapIndex.match(/<sitemap>/g) || []).length;
      const closeSitemapTags = (sitemapIndex.match(/<\/sitemap>/g) || [])
        .length;
      expect(openSitemapTags).toBe(7);
      expect(closeSitemapTags).toBe(7);
      expect(openSitemapTags).toBe(closeSitemapTags);
    });
  });
});