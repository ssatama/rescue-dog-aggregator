/**
 * CRITICAL: Core Service Integration Tests
 *
 * Simplified tests that focus on the core service separation issue
 * that caused pages to break. These tests validate that:
 * 1. getAllAnimals returns all animals
 * 2. getAllAnimalsForSitemap applies filtering
 * 3. Functions are properly separated
 */

import {
  getAllAnimals,
  getAllAnimalsForSitemap,
} from "../../services/animalsService";

// Mock the API layer to return test data
jest.mock("../../utils/api", () => ({
  get: jest.fn(),
}));

// Mock logger to avoid console noise
jest.mock("../../utils/logger", () => ({
  logger: {
    log: jest.fn(),
  },
}));

const { get } = require("../../utils/api");

describe("Core Service Integration - Critical Validation", () => {
  const mockAnimals = [
    {
      id: "1",
      slug: "buddy-golden-retriever",
      name: "Buddy",
      properties: {
        description:
          "This is a long, detailed description of Buddy that contains more than 200 characters. Buddy is a wonderful golden retriever who loves to play fetch, go for long walks, and snuggle with his humans. He would make a perfect addition to any family.",
      },
    },
    {
      id: "2",
      slug: "max-short-desc",
      name: "Max",
      properties: {
        description: "Short description", // Less than 200 chars - should be filtered in sitemap
      },
    },
    {
      id: "3",
      slug: "luna-no-desc",
      name: "Luna",
      properties: {
        description: "", // Empty description - should be filtered in sitemap
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock - getAllAnimals returns all animals
    get.mockImplementation((endpoint, params) => {
      if (params?.sitemap_quality_filter) {
        // Simulate sitemap filtering - only return animals with descriptions >200 chars
        return Promise.resolve(
          mockAnimals.filter((animal) => {
            const desc = animal?.properties?.description || "";
            return desc.length >= 200;
          }),
        );
      }
      // Return all animals for regular getAllAnimals calls
      return Promise.resolve(mockAnimals);
    });
  });

  test("CRITICAL: Service functions exist and are separate", () => {
    expect(getAllAnimals).toBeDefined();
    expect(typeof getAllAnimals).toBe("function");

    expect(getAllAnimalsForSitemap).toBeDefined();
    expect(typeof getAllAnimalsForSitemap).toBe("function");

    // They should be different functions
    expect(getAllAnimals).not.toBe(getAllAnimalsForSitemap);
  });

  test("CRITICAL: getAllAnimals returns all animals (no filtering)", async () => {
    const allAnimals = await getAllAnimals({});

    expect(Array.isArray(allAnimals)).toBe(true);
    expect(allAnimals.length).toBe(3); // All mock animals

    // Should include animals with short descriptions
    const shortDescAnimals = allAnimals.filter((animal) => {
      const desc = animal?.properties?.description || "";
      return desc.length < 200;
    });
    expect(shortDescAnimals.length).toBe(2); // Max and Luna
  });

  test("CRITICAL: getAllAnimalsForSitemap applies quality filtering", async () => {
    const sitemapAnimals = await getAllAnimalsForSitemap({});

    expect(Array.isArray(sitemapAnimals)).toBe(true);
    expect(sitemapAnimals.length).toBe(1); // Only Buddy has >200 char description

    // Should NOT include animals with short descriptions
    const shortDescAnimals = sitemapAnimals.filter((animal) => {
      const desc = animal?.properties?.description || "";
      return desc.length < 200;
    });
    expect(shortDescAnimals.length).toBe(0); // None in sitemap
  });

  test("CRITICAL: Service separation prevents page generation bugs", async () => {
    const allAnimals = await getAllAnimals({});
    const sitemapAnimals = await getAllAnimalsForSitemap({});

    // Critical assertion: sitemap should be subset of all animals
    expect(sitemapAnimals.length).toBeLessThanOrEqual(allAnimals.length);
    expect(allAnimals.length).toBeGreaterThan(sitemapAnimals.length);

    // All sitemap animals should exist in all animals
    sitemapAnimals.forEach((sitemapAnimal) => {
      const existsInAll = allAnimals.some(
        (animal) => animal.id === sitemapAnimal.id,
      );
      expect(existsInAll).toBe(true);
    });
  });

  test("CRITICAL: Functions call API with correct parameters", async () => {
    await getAllAnimals({});
    expect(get).toHaveBeenCalledWith(
      "/api/animals",
      expect.objectContaining({
        limit: 10000,
        animal_type: "dog",
        status: "available",
      }),
    );
    expect(get).toHaveBeenCalledWith(
      "/api/animals",
      expect.not.objectContaining({
        sitemap_quality_filter: true,
      }),
    );

    jest.clearAllMocks();

    await getAllAnimalsForSitemap({});
    expect(get).toHaveBeenCalledWith(
      "/api/animals",
      expect.objectContaining({
        limit: 10000,
        animal_type: "dog",
        status: "available",
        sitemap_quality_filter: true,
      }),
    );
  });
});
