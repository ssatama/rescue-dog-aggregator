/**
 * CRITICAL: Service Separation Validation Tests
 *
 * These tests ensure the service layer properly separates:
 * - getAllAnimals() - for UI/static generation (no sitemap filtering)
 * - getAllAnimalsForSitemap() - for sitemap generation (with quality filtering)
 *
 * This prevents the bug where sitemap filtering broke page generation.
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

describe("Service Layer Separation - Critical Validation", () => {
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

  describe("Function Existence and Independence", () => {
    test("CRITICAL: Both service functions exist and are separate", () => {
      expect(getAllAnimals).toBeDefined();
      expect(typeof getAllAnimals).toBe("function");

      expect(getAllAnimalsForSitemap).toBeDefined();
      expect(typeof getAllAnimalsForSitemap).toBe("function");

      // They should be different functions
      expect(getAllAnimals).not.toBe(getAllAnimalsForSitemap);
    });
  });

  describe("Data Set Differences", () => {
    test("CRITICAL: getAllAnimals returns more animals than sitemap version", async () => {
      const allAnimals = await getAllAnimals({});
      const sitemapAnimals = await getAllAnimalsForSitemap({});

      expect(Array.isArray(allAnimals)).toBe(true);
      expect(Array.isArray(sitemapAnimals)).toBe(true);

      // Critical assertion: sitemap should be subset of all animals
      expect(sitemapAnimals.length).toBeLessThanOrEqual(allAnimals.length);
      expect(allAnimals.length).toBe(3); // All mock animals
      expect(sitemapAnimals.length).toBe(1); // Only Buddy has >200 char description

      console.log(`getAllAnimals returned ${allAnimals.length} animals`);
      console.log(
        `getAllAnimalsForSitemap returned ${sitemapAnimals.length} animals`,
      );
    });

    test("CRITICAL: Sitemap filtering removes low-quality descriptions", async () => {
      const allAnimals = await getAllAnimals({});
      const sitemapAnimals = await getAllAnimalsForSitemap({});

      // Find animals with short descriptions in allAnimals
      const shortDescAnimals = allAnimals.filter((animal) => {
        const description = animal?.properties?.description || "";
        return description.length < 200;
      });

      // Find animals with short descriptions in sitemapAnimals
      const shortDescInSitemap = sitemapAnimals.filter((animal) => {
        const description = animal?.properties?.description || "";
        return description.length < 200;
      });

      // Critical: sitemap should have fewer (or zero) short description animals
      expect(shortDescInSitemap.length).toBeLessThan(shortDescAnimals.length);
      expect(shortDescAnimals.length).toBe(2); // Max and Luna
      expect(shortDescInSitemap.length).toBe(0); // None in sitemap

      console.log(
        `Found ${shortDescAnimals.length} animals with short descriptions in getAllAnimals`,
      );
      console.log(
        `Found ${shortDescInSitemap.length} animals with short descriptions in sitemap`,
      );
    });
  });

  describe("Function Parameters and Behavior", () => {
    test("CRITICAL: getAllAnimals accepts parameters correctly", async () => {
      // Should work with no parameters
      const allAnimals = await getAllAnimals();
      expect(Array.isArray(allAnimals)).toBe(true);

      // Should work with empty object
      const allAnimalsEmpty = await getAllAnimals({});
      expect(Array.isArray(allAnimalsEmpty)).toBe(true);

      // Both calls should return same data (no filtering)
      expect(allAnimals.length).toBe(allAnimalsEmpty.length);
      expect(allAnimals.length).toBe(3);
    });

    test("CRITICAL: getAllAnimalsForSitemap doesn't require parameters", async () => {
      // Should work with no parameters (sitemap has no filter parameters)
      const sitemapAnimals = await getAllAnimalsForSitemap();
      expect(Array.isArray(sitemapAnimals)).toBe(true);
      expect(sitemapAnimals.length).toBe(1); // Only high-quality descriptions
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

  describe("Data Structure Validation", () => {
    test("CRITICAL: Both functions return valid animal objects", async () => {
      const allAnimals = await getAllAnimals({});
      const sitemapAnimals = await getAllAnimalsForSitemap({});

      // Validate structure of animals from getAllAnimals
      if (allAnimals.length > 0) {
        const animal = allAnimals[0];
        expect(animal).toHaveProperty("id");
        expect(animal).toHaveProperty("slug");
        expect(animal).toHaveProperty("name");
        expect(typeof animal.id).toBe("string");
        expect(typeof animal.slug).toBe("string");
        expect(typeof animal.name).toBe("string");
      }

      // Validate structure of animals from getAllAnimalsForSitemap
      if (sitemapAnimals.length > 0) {
        const animal = sitemapAnimals[0];
        expect(animal).toHaveProperty("id");
        expect(animal).toHaveProperty("slug");
        expect(animal).toHaveProperty("name");
        expect(typeof animal.id).toBe("string");
        expect(typeof animal.slug).toBe("string");
        expect(typeof animal.name).toBe("string");
      }
    });
  });

  describe("Quality Filter Logic Validation", () => {
    test("CRITICAL: Sitemap quality filter logic is properly applied", async () => {
      const allAnimals = await getAllAnimals({});
      const sitemapAnimals = await getAllAnimalsForSitemap({});

      // Check that sitemap version has higher quality descriptions on average
      if (allAnimals.length > 0 && sitemapAnimals.length > 0) {
        const avgAllDescLength =
          allAnimals.reduce((sum, animal) => {
            const desc = animal?.properties?.description || "";
            return sum + desc.length;
          }, 0) / allAnimals.length;

        const avgSitemapDescLength =
          sitemapAnimals.reduce((sum, animal) => {
            const desc = animal?.properties?.description || "";
            return sum + desc.length;
          }, 0) / sitemapAnimals.length;

        // Sitemap should have higher average description length (better quality)
        expect(avgSitemapDescLength).toBeGreaterThan(avgAllDescLength);

        console.log(
          `Average description length - All: ${avgAllDescLength.toFixed(1)}, Sitemap: ${avgSitemapDescLength.toFixed(1)}`,
        );
      }
    });

    test("CRITICAL: No placeholder descriptions in sitemap", async () => {
      const sitemapAnimals = await getAllAnimalsForSitemap({});

      // Check for placeholder-like descriptions
      const placeholderPatterns = [
        /^(no description|description not available|please|contact|call)/i,
        /^.{0,50}$/, // Very short descriptions
      ];

      const placeholderAnimals = sitemapAnimals.filter((animal) => {
        const description = animal?.properties?.description || "";
        return placeholderPatterns.some((pattern) => pattern.test(description));
      });

      // Sitemap should have minimal placeholder content
      const placeholderPercentage =
        sitemapAnimals.length > 0
          ? (placeholderAnimals.length / sitemapAnimals.length) * 100
          : 0;

      // With our mock data, sitemap should have no placeholder content
      expect(placeholderPercentage).toBe(0);

      if (placeholderAnimals.length > 0) {
        console.log(
          `Found ${placeholderAnimals.length} potential placeholder descriptions in sitemap (${placeholderPercentage.toFixed(1)}%)`,
        );
      }
    });
  });

  describe("Performance and Error Handling", () => {
    test("CRITICAL: Both functions handle errors gracefully", async () => {
      // Mock API to throw error
      get.mockRejectedValue(new Error("API Error"));

      let allAnimalsError = null;
      let sitemapAnimalsError = null;

      try {
        await getAllAnimals({});
      } catch (error) {
        allAnimalsError = error;
      }

      try {
        await getAllAnimalsForSitemap();
      } catch (error) {
        sitemapAnimalsError = error;
      }

      // Functions should propagate API errors (this is expected behavior)
      expect(allAnimalsError).toBeInstanceOf(Error);
      expect(sitemapAnimalsError).toBeInstanceOf(Error);
    });

    test("CRITICAL: Functions complete within reasonable time", async () => {
      // Reset to successful mock
      get.mockImplementation((endpoint, params) => {
        if (params?.sitemap_quality_filter) {
          return Promise.resolve(
            mockAnimals.filter((animal) => {
              const desc = animal?.properties?.description || "";
              return desc.length >= 200;
            }),
          );
        }
        return Promise.resolve(mockAnimals);
      });

      const startTime = Date.now();

      const [allAnimals, sitemapAnimals] = await Promise.all([
        getAllAnimals({}),
        getAllAnimalsForSitemap(),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly with mocked data
      expect(duration).toBeLessThan(1000);

      console.log(`Service calls completed in ${duration}ms`);
      console.log(`getAllAnimals returned ${allAnimals.length} animals`);
      console.log(
        `getAllAnimalsForSitemap returned ${sitemapAnimals.length} animals`,
      );
    });
  });
});
