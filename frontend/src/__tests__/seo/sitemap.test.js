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
    test("should format basic sitemap entry with URL and lastmod", () => {
      const entry = formatSitemapEntry({
        url: "https://www.rescuedogs.me/dogs/1",
        lastmod: "2024-01-15T10:00:00Z",
      });

      expect(entry).toEqual({
        url: "https://www.rescuedogs.me/dogs/1",
        lastmod: "2024-01-15T10:00:00Z",
      });
    });

    test("should handle entry with minimal data", () => {
      const entry = formatSitemapEntry({
        url: "https://www.rescuedogs.me/about",
      });

      expect(entry.url).toBe("https://www.rescuedogs.me/about");
      expect(entry.lastmod).toBeUndefined();
    });

    test("should validate URL format", () => {
      expect(() => formatSitemapEntry({ url: "invalid-url" })).toThrow();
      expect(() => formatSitemapEntry({ url: "" })).toThrow();
      expect(() => formatSitemapEntry({})).toThrow();
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

    test("should not include priority or changefreq tags", async () => {
      const sitemap = await generateSitemap();

      expect(sitemap).not.toContain("<priority>");
      expect(sitemap).not.toContain("<changefreq>");
    });

    test("should include static pages", async () => {
      const sitemap = await generateSitemap();

      expect(sitemap).toContain("<loc>https://www.rescuedogs.me/</loc>");
      expect(sitemap).toContain("<loc>https://www.rescuedogs.me/dogs</loc>");
      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/organizations</loc>",
      );
      expect(sitemap).toContain("<loc>https://www.rescuedogs.me/about</loc>");
      expect(sitemap).toContain("<loc>https://www.rescuedogs.me/privacy</loc>");
    });

    test("should NOT include /search route (non-existent page)", async () => {
      const sitemap = await generateSitemap();

      expect(sitemap).not.toContain(
        "<loc>https://www.rescuedogs.me/search</loc>",
      );
    });

    test("should NOT include individual dog pages (to avoid duplication with sitemap-dogs.xml)", async () => {
      const sitemap = await generateSitemap();

      expect(sitemap).not.toContain(
        "<loc>https://www.rescuedogs.me/dogs/buddy-mixed-breed-1</loc>",
      );
      expect(sitemap).not.toContain(
        "<loc>https://www.rescuedogs.me/dogs/luna-labrador-retriever-2</loc>",
      );

      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/dogs</loc>",
      );
    });

    test("should NOT include organization pages (they belong in sitemap-organizations.xml)", async () => {
      getAllAnimalsForSitemap.mockResolvedValue([]);
      getAllOrganizations.mockResolvedValue(mockOrganizations);

      const sitemap = await generateSitemap();

      expect(sitemap).not.toContain(
        "<loc>https://www.rescuedogs.me/organizations/happy-paws-rescue-1</loc>",
      );
      expect(sitemap).not.toContain(
        "<loc>https://www.rescuedogs.me/organizations/city-animal-shelter-2</loc>",
      );

      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/organizations</loc>",
      );
    });

    test("should handle empty data gracefully", async () => {
      const sitemap = await generateSitemap();

      expect(sitemap).toContain("<loc>https://www.rescuedogs.me/</loc>");
      expect(sitemap).toContain("<loc>https://www.rescuedogs.me/dogs</loc>");
      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/organizations</loc>",
      );

      expect(sitemap).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(sitemap).toContain("</urlset>");
    });

    test("should generate sitemap with static pages only (no API calls)", async () => {
      const sitemap = await generateSitemap();

      expect(sitemap).toContain("<loc>https://www.rescuedogs.me/</loc>");
      expect(sitemap).toContain("</urlset>");

      expect(getAllAnimalsForSitemap).not.toHaveBeenCalled();
      expect(getAllOrganizations).not.toHaveBeenCalled();
    });

    test("should validate generated XML format", async () => {
      const sitemap = await generateSitemap();

      expect(sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(
        true,
      );
      expect(sitemap).toContain(
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      );
      expect(sitemap.endsWith("</urlset>")).toBe(true);

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

      const urlCount = (sitemap.match(/<url>/g) || []).length;
      expect(urlCount).toBeLessThanOrEqual(50000);
    });

    test("should include /faq page", async () => {
      const sitemap = await generateSitemap();

      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/faq</loc>",
      );
    });
  });

  describe("generateDogSitemap", () => {
    test("should include ALL dog pages", async () => {
      getAllAnimalsForSitemap.mockResolvedValue(mockDogs);

      const sitemap = await generateDogSitemap();

      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/dogs/buddy-mixed-breed-1</loc>",
      );
      expect(sitemap).toContain(
        "<loc>https://www.rescuedogs.me/dogs/luna-labrador-retriever-2</loc>",
      );
    });

    test("should include dog pages regardless of data quality", async () => {
      const mockDogsAllQualities = [
        {
          id: 1,
          slug: "buddy-with-description",
          name: "Buddy",
          created_at: "2024-01-15T10:00:00Z",
        },
        {
          id: 2,
          slug: "luna-short-description",
          name: "Luna",
          created_at: "2024-01-16T11:00:00Z",
        },
        {
          id: 3,
          slug: "max-no-description",
          name: "Max",
          created_at: "2024-01-17T12:00:00Z",
        },
      ];

      getAllAnimalsForSitemap.mockResolvedValue(mockDogsAllQualities);

      const sitemap = await generateDogSitemap();

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

    test("should not include priority or changefreq tags", async () => {
      getAllAnimalsForSitemap.mockResolvedValue(mockDogs);

      const sitemap = await generateDogSitemap();

      expect(sitemap).not.toContain("<priority>");
      expect(sitemap).not.toContain("<changefreq>");
    });

    test("should include lastmod dates from dog data", async () => {
      getAllAnimalsForSitemap.mockResolvedValue(mockDogs);

      const sitemap = await generateDogSitemap();

      expect(sitemap).toContain("<lastmod>2024-01-15T10:00:00+00:00</lastmod>");
      expect(sitemap).toContain("<lastmod>2024-01-16T11:00:00+00:00</lastmod>");
    });
  });

  describe("formatDateForSitemap", () => {
    test("should format API date with microseconds to W3C datetime format", () => {
      const apiDate = "2025-07-14T08:58:28.426257";
      const result = formatDateForSitemap(apiDate);

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
      const mockDogsWithRealDates = [
        {
          id: 1,
          slug: "buddy-1",
          name: "Buddy",
          created_at: "2025-07-14T08:58:28.426257",
          updated_at: "2025-07-15T10:00:00.000000",
          organization: { name: "Happy Paws" },
        },
        {
          id: 2,
          slug: "luna-2",
          name: "Luna",
          created_at: "2025-07-11T20:13:59.641485",
          updated_at: "2025-07-12T12:00:00.000000",
          organization: { name: "City Shelter" },
        },
      ];

      getAllAnimalsForSitemap.mockResolvedValue(mockDogsWithRealDates);

      const sitemap = await generateDogSitemap();

      expect(sitemap).toContain("<lastmod>2025-07-14T08:58:28+00:00</lastmod>");
      expect(sitemap).toContain("<lastmod>2025-07-11T20:13:59+00:00</lastmod>");

      expect(sitemap).not.toContain("2025-07-14T08:58:28.426257");
      expect(sitemap).not.toContain("2025-07-11T20:13:59.641485");
      expect(sitemap).not.toContain("2025-07-15T10:00:00+00:00");
      expect(sitemap).not.toContain("2025-07-12T12:00:00+00:00");
    });
  });

  describe("breed slug deduplication", () => {
    test("should deduplicate breed slugs in generateBreedPages", async () => {
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

      expect(sitemapIndex).toContain(
        "<loc>https://www.rescuedogs.me/sitemap.xml</loc>",
      );

      expect(sitemapIndex).toContain(
        "<loc>https://www.rescuedogs.me/sitemap-dogs.xml</loc>",
      );

      expect(sitemapIndex).toContain(
        "<loc>https://www.rescuedogs.me/sitemap-organizations.xml</loc>",
      );

      expect(sitemapIndex).toContain(
        "<loc>https://www.rescuedogs.me/sitemap-images.xml</loc>",
      );
    });

    test("should include lastmod dates for all sitemaps", () => {
      const { generateSitemapIndex } = require("../../utils/sitemap");
      const sitemapIndex = generateSitemapIndex();

      const lastmodCount = (sitemapIndex.match(/<lastmod>/g) || []).length;
      expect(lastmodCount).toBe(7);

      expect(sitemapIndex).toMatch(
        /<lastmod>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00<\/lastmod>/,
      );
    });

    test("should have matching opening and closing tags", () => {
      const { generateSitemapIndex } = require("../../utils/sitemap");
      const sitemapIndex = generateSitemapIndex();

      const openSitemapTags = (sitemapIndex.match(/<sitemap>/g) || []).length;
      const closeSitemapTags = (sitemapIndex.match(/<\/sitemap>/g) || [])
        .length;
      expect(openSitemapTags).toBe(7);
      expect(closeSitemapTags).toBe(7);
      expect(openSitemapTags).toBe(closeSitemapTags);
    });
  });
});
