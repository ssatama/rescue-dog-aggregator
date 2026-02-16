// src/services/__tests__/enhancedOrganizationsService.test.js

import {
  getOrganizationStatistics,
  getOrganizationRecentDogs,
  getEnhancedOrganizations,
} from "../organizationsService";
import * as api from "../../utils/api";

// Mock the API utility, preserving stripNulls
jest.mock("../../utils/api", () => ({
  ...jest.requireActual("../../utils/api"),
  get: jest.fn(),
  post: jest.fn(),
  fetchApi: jest.fn(),
}));

// Mock fetch for getEnhancedOrganizations since it uses fetch directly
global.fetch = jest.fn();

describe("Enhanced Organizations Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe("getOrganizationStatistics", () => {
    test("fetches statistics for a specific organization", async () => {
      const mockStats = {
        total_dogs: 25,
        new_this_week: 3,
        new_this_month: 8,
      };

      api.get.mockResolvedValueOnce(mockStats);

      const result = await getOrganizationStatistics(1);

      expect(api.get).toHaveBeenCalledWith(
        "/api/organizations/1/statistics",
        {},
        expect.objectContaining({ schema: expect.anything() }),
      );
      expect(result).toEqual(mockStats);
    });

    test("handles API errors gracefully", async () => {
      const mockError = new Error("API Error");
      api.get.mockRejectedValueOnce(mockError);

      await expect(getOrganizationStatistics(1)).rejects.toThrow("API Error");
    });

    test("works with string organization ID", async () => {
      const mockStats = { total_dogs: 10, new_this_week: 1 };
      api.get.mockResolvedValueOnce(mockStats);

      await getOrganizationStatistics("2");

      expect(api.get).toHaveBeenCalledWith(
        "/api/organizations/2/statistics",
        {},
        expect.objectContaining({ schema: expect.anything() }),
      );
    });
  });

  describe("getOrganizationRecentDogs", () => {
    test("fetches recent dogs with default limit", async () => {
      const mockDogs = [
        { id: 1, name: "Buddy", thumbnail_url: "https://example.com/dog1.jpg" },
        { id: 2, name: "Max", thumbnail_url: "https://example.com/dog2.jpg" },
      ];

      api.get.mockResolvedValueOnce(mockDogs);

      const result = await getOrganizationRecentDogs(1);

      expect(api.get).toHaveBeenCalledWith("/api/organizations/1/recent-dogs", {
        limit: 3,
      });
      expect(result).toEqual(mockDogs);
    });

    test("fetches recent dogs with custom limit", async () => {
      const mockDogs = [
        { id: 1, name: "Buddy", thumbnail_url: "https://example.com/dog1.jpg" },
      ];

      api.get.mockResolvedValueOnce(mockDogs);

      const result = await getOrganizationRecentDogs(1, 1);

      expect(api.get).toHaveBeenCalledWith("/api/organizations/1/recent-dogs", {
        limit: 1,
      });
      expect(result).toEqual(mockDogs);
    });

    test("handles empty results", async () => {
      api.get.mockResolvedValueOnce([]);

      const result = await getOrganizationRecentDogs(1);

      expect(result).toEqual([]);
    });

    test("handles API errors gracefully", async () => {
      const mockError = new Error("Recent dogs API Error");
      api.get.mockRejectedValueOnce(mockError);

      await expect(getOrganizationRecentDogs(1)).rejects.toThrow(
        "Recent dogs API Error",
      );
    });
  });

  describe("getEnhancedOrganizations", () => {
    const mockOrganizations = [
      {
        id: 1,
        name: "Pets in Turkey",
        total_dogs: 25,
        new_this_week: 3,
        service_regions: ["TR", "RO"],
        ships_to: ["DE", "NL", "BE"],
      },
      {
        id: 2,
        name: "REAN",
        total_dogs: 15,
        new_this_week: 1,
        service_regions: ["DE"],
        ships_to: ["DE", "AT"],
      },
    ];

    const mockRecentDogs = [
      { id: 1, name: "Buddy", thumbnail_url: "https://example.com/dog1.jpg" },
      { id: 2, name: "Max", thumbnail_url: "https://example.com/dog2.jpg" },
    ];

    test("fetches enhanced organizations data successfully", async () => {
      // Mock enhanced organizations with recent dogs already included
      const enhancedOrgs = [
        {
          ...mockOrganizations[0],
          recent_dogs: mockRecentDogs,
        },
        {
          ...mockOrganizations[1],
          recent_dogs: mockRecentDogs,
        },
      ];

      // Mock fetch for the enhanced endpoint
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(enhancedOrgs),
      });

      const result = await getEnhancedOrganizations();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/organizations/enhanced"),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        ...mockOrganizations[0],
        recent_dogs: mockRecentDogs,
      });
      expect(result[1]).toMatchObject({
        ...mockOrganizations[1],
        recent_dogs: mockRecentDogs,
      });
    });

    test("handles organizations with zero dogs", async () => {
      const orgsWithZeroDogs = [
        {
          id: 1,
          name: "New Org",
          total_dogs: 0,
          recent_dogs: [],
        },
      ];

      // Mock fetch response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(orgsWithZeroDogs),
      });

      const result = await getEnhancedOrganizations();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        name: "New Org",
        total_dogs: 0,
        recent_dogs: [],
      });

      // Should call the enhanced endpoint
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test("handles partial failures gracefully", async () => {
      // Mock organizations where one has recent dogs and one doesn't
      const partialEnhancedOrgs = [
        {
          ...mockOrganizations[0],
          recent_dogs: mockRecentDogs,
        },
        {
          ...mockOrganizations[1],
          recent_dogs: [], // No recent dogs for this org
        },
      ];

      // Mock fetch response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(partialEnhancedOrgs),
      });

      const result = await getEnhancedOrganizations();

      expect(result).toHaveLength(2);

      // First organization should have recent dogs
      expect(result[0]).toMatchObject({
        ...mockOrganizations[0],
        recent_dogs: mockRecentDogs,
      });

      // Second organization should have empty recent dogs
      expect(result[1]).toMatchObject({
        ...mockOrganizations[1],
        recent_dogs: [],
      });
    });

    test("handles complete failure of main organizations call", async () => {
      const mainError = new Error("Failed to fetch organizations: 500");

      // Mock fetch to return a failed response
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(getEnhancedOrganizations()).rejects.toThrow(
        "Failed to fetch organizations: 500",
      );
    });

    test("handles empty organizations list", async () => {
      // Mock fetch to return empty array
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await getEnhancedOrganizations();

      expect(result).toEqual([]);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    test("includes proper error handling and logging", async () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const errorSpy = jest.spyOn(console, "error").mockImplementation();

      // Mock fetch to throw an error
      fetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(getEnhancedOrganizations()).rejects.toThrow("Network error");

      // Should have logged error
      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to fetch enhanced organizations:",
        expect.any(Error),
      );

      errorSpy.mockRestore();
      process.env.NODE_ENV = originalNodeEnv;
    });

    test("maintains organization order from API", async () => {
      const orderedOrgs = [
        { id: 3, name: "Alpha Rescue", total_dogs: 5, recent_dogs: [] },
        { id: 1, name: "Beta Rescue", total_dogs: 10, recent_dogs: [] },
        { id: 2, name: "Gamma Rescue", total_dogs: 15, recent_dogs: [] },
      ];

      // Mock fetch response
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(orderedOrgs),
      });

      const result = await getEnhancedOrganizations();

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(3);
      expect(result[1].id).toBe(1);
      expect(result[2].id).toBe(2);
    });
  });

  describe("Performance and Error Resilience", () => {
    test("handles network timeouts gracefully", async () => {
      const timeoutError = new Error("Network timeout");
      timeoutError.code = "TIMEOUT";

      api.get.mockRejectedValueOnce(timeoutError);

      await expect(getOrganizationStatistics(1)).rejects.toThrow(
        "Network timeout",
      );
    });

    test("handles malformed API responses", async () => {
      api.get.mockResolvedValueOnce(null);

      const result = await getOrganizationRecentDogs(1);
      expect(result).toBeNull();
    });

    test("concurrent recent dogs fetching works correctly", async () => {
      const orgs = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Org ${i + 1}`,
        total_dogs: 5,
        recent_dogs: [{ id: i + 1, name: `Dog ${i + 1}` }],
      }));

      // Mock fetch response with all organizations and their recent dogs
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(orgs),
      });

      const result = await getEnhancedOrganizations();

      expect(result).toHaveLength(10);

      // Each organization should have unique recent dogs
      result.forEach((org, index) => {
        expect(org.recent_dogs).toHaveLength(1);
        expect(org.recent_dogs[0].name).toBe(`Dog ${index + 1}`);
      });
    });
  });
});
