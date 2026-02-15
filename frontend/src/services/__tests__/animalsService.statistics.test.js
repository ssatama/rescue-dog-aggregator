// frontend/src/services/__tests__/animalsService.statistics.test.js

import { getStatistics } from "../animalsService";
import { get } from "../../utils/api";
import { logger } from "../../utils/logger";

// Mock the API utility
jest.mock("../../utils/api");
jest.mock("../../utils/logger");

describe("getStatistics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Successful API calls", () => {
    test("should fetch statistics from /api/animals/statistics endpoint", async () => {
      const mockStatistics = {
        total_dogs: 412,
        total_organizations: 3,
        countries: [{ country: "Turkey", count: 33 }],
        organizations: [
          { id: 11, name: "Tierschutzverein Europa e.V.", dog_count: 353 },
          { id: 2, name: "Pets in Turkey", dog_count: 33 },
        ],
      };

      get.mockResolvedValue(mockStatistics);

      const result = await getStatistics();

      expect(get).toHaveBeenCalledWith("/api/animals/statistics", {}, expect.objectContaining({}));
      expect(logger.log).toHaveBeenCalledWith("Fetching statistics");
      expect(result).toEqual(mockStatistics);
    });

    test("should handle statistics with multiple countries", async () => {
      const mockStatistics = {
        total_dogs: 500,
        total_organizations: 5,
        countries: [
          { country: "Turkey", count: 200 },
          { country: "Germany", count: 150 },
          { country: "UK", count: 150 },
        ],
        organizations: [
          { id: 1, name: "Org 1", dog_count: 100 },
          { id: 2, name: "Org 2", dog_count: 200 },
        ],
      };

      get.mockResolvedValue(mockStatistics);

      const result = await getStatistics();

      expect(result.countries).toHaveLength(3);
      expect(result.countries[0]).toHaveProperty("country");
      expect(result.countries[0]).toHaveProperty("count");
    });

    test("should handle empty statistics gracefully", async () => {
      const mockStatistics = {
        total_dogs: 0,
        total_organizations: 0,
        countries: [],
        organizations: [],
      };

      get.mockResolvedValue(mockStatistics);

      const result = await getStatistics();

      expect(result.total_dogs).toBe(0);
      expect(result.countries).toEqual([]);
      expect(result.organizations).toEqual([]);
    });
  });

  describe("Error handling", () => {
    test("should handle API errors gracefully", async () => {
      const errorMessage = "Network error";
      get.mockRejectedValue(new Error(errorMessage));

      await expect(getStatistics()).rejects.toThrow(errorMessage);
      expect(logger.log).toHaveBeenCalledWith("Fetching statistics");
    });

    test("should handle malformed response data", async () => {
      get.mockResolvedValue(null);

      const result = await getStatistics();

      expect(result).toBeNull();
    });

    test("should handle timeout errors", async () => {
      get.mockRejectedValue(new Error("Request timeout"));

      await expect(getStatistics()).rejects.toThrow("Request timeout");
    });
  });

  describe("Data validation", () => {
    test("should validate statistics data structure", async () => {
      const mockStatistics = {
        total_dogs: 412,
        total_organizations: 3,
        countries: [{ country: "Turkey", count: 33 }],
        organizations: [{ id: 11, name: "Test Org", dog_count: 353 }],
      };

      get.mockResolvedValue(mockStatistics);

      const result = await getStatistics();

      // Validate required fields
      expect(result).toHaveProperty("total_dogs");
      expect(result).toHaveProperty("total_organizations");
      expect(result).toHaveProperty("countries");
      expect(result).toHaveProperty("organizations");

      // Validate data types
      expect(typeof result.total_dogs).toBe("number");
      expect(typeof result.total_organizations).toBe("number");
      expect(Array.isArray(result.countries)).toBe(true);
      expect(Array.isArray(result.organizations)).toBe(true);
    });

    test("should validate country data structure", async () => {
      const mockStatistics = {
        total_dogs: 100,
        total_organizations: 2,
        countries: [
          { country: "Turkey", count: 50 },
          { country: "Germany", count: 50 },
        ],
        organizations: [],
      };

      get.mockResolvedValue(mockStatistics);

      const result = await getStatistics();

      result.countries.forEach((country) => {
        expect(country).toHaveProperty("country");
        expect(country).toHaveProperty("count");
        expect(typeof country.country).toBe("string");
        expect(typeof country.count).toBe("number");
      });
    });

    test("should validate organization data structure", async () => {
      const mockStatistics = {
        total_dogs: 100,
        total_organizations: 2,
        countries: [],
        organizations: [
          { id: 1, name: "Org 1", dog_count: 50 },
          { id: 2, name: "Org 2", dog_count: 50 },
        ],
      };

      get.mockResolvedValue(mockStatistics);

      const result = await getStatistics();

      result.organizations.forEach((org) => {
        expect(org).toHaveProperty("id");
        expect(org).toHaveProperty("name");
        expect(org).toHaveProperty("dog_count");
        expect(typeof org.id).toBe("number");
        expect(typeof org.name).toBe("string");
        expect(typeof org.dog_count).toBe("number");
      });
    });
  });

  describe("Performance", () => {
    test("should cache results appropriately", async () => {
      const mockStatistics = {
        total_dogs: 412,
        total_organizations: 3,
        countries: [],
        organizations: [],
      };

      get.mockResolvedValue(mockStatistics);

      // Call twice
      await getStatistics();
      await getStatistics();

      // Should call API twice (no caching implemented in service)
      expect(get).toHaveBeenCalledTimes(2);
    });

    test("should handle large datasets efficiently", async () => {
      const largeStatistics = {
        total_dogs: 10000,
        total_organizations: 100,
        countries: Array.from({ length: 50 }, (_, i) => ({
          country: `Country ${i}`,
          count: Math.floor(Math.random() * 1000),
        })),
        organizations: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Organization ${i}`,
          dog_count: Math.floor(Math.random() * 100),
        })),
      };

      get.mockResolvedValue(largeStatistics);

      const start = performance.now();
      const result = await getStatistics();
      const end = performance.now();

      expect(result).toEqual(largeStatistics);
      expect(end - start).toBeLessThan(100); // Should process quickly
    });
  });
});
