import {
  getAnimals,
  getAllMetadata,
  getFilterCounts,
  getStatistics,
  getCountryStats,
  getAvailableRegions,
  clearCache,
} from "../serverAnimalsService";

jest.mock("../../utils/logger", () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
  reportError: jest.fn(),
}));

global.fetch = jest.fn();

describe("Server Animals Service", () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    clearCache();
  });

  it("should fetch animals with correct parameters", async () => {
    const mockResponse = [{ id: 1, name: "Test Dog" }];
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const params = { limit: 20, search: "test" };
    const result = await getAnimals(params);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/animals/?limit=20&search=test"),
      expect.objectContaining({
        next: { revalidate: 300, tags: ["animals"] },
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("should handle API errors gracefully with empty array fallback", async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error("API Error"));

    const result = await getAnimals();
    expect(result).toEqual([]);
  });

  it("should handle malformed API response via validation fallback", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => "not an array",
    });

    const result = await getAnimals();
    expect(result).toEqual([]);
  });

  it("should fetch all metadata successfully", async () => {
    const mockResponses = [
      ["breed1", "breed2"],
      ["country1", "country2"],
      ["country1", "country2"],
      [{ id: 1, name: "Org 1" }],
    ];

    (fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses[0] })
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses[1] })
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses[2] })
      .mockResolvedValueOnce({ ok: true, json: async () => mockResponses[3] });

    const result = await getAllMetadata();

    expect(result).toEqual({
      standardizedBreeds: ["Any breed", "breed1", "breed2"],
      locationCountries: ["Any country", "country1", "country2"],
      availableCountries: ["Any country", "country1", "country2"],
      organizations: [
        { id: null, name: "Any organization" },
        { id: 1, name: "Org 1" },
      ],
    });
  });

  describe("getFilterCounts", () => {
    it("should use underscore URL for filter_counts", async () => {
      const mockResponse = {
        sex_options: [{ value: "Male", count: 100 }],
        size_options: [{ value: "Large", count: 50 }],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getFilterCounts();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/animals/meta/filter_counts"),
        expect.anything(),
      );
      expect(fetch).not.toHaveBeenCalledWith(
        expect.stringContaining("filter-counts"),
        expect.anything(),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should return null on error", async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      const result = await getFilterCounts();
      expect(result).toBeNull();
    });
  });

  describe("getStatistics", () => {
    it("should validate and return statistics", async () => {
      const mockResponse = {
        total_dogs: 1500,
        total_organizations: 12,
        countries: [{ country: "Finland", count: 500 }],
        organizations: [{ id: 1, name: "Org" }],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getStatistics();
      expect(result.total_dogs).toBe(1500);
      expect(result.total_organizations).toBe(12);
    });

    it("should return fallback on error", async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Fail"));

      const result = await getStatistics();
      expect(result).toEqual({
        total_dogs: 0,
        total_organizations: 0,
        countries: [],
        organizations: [],
      });
    });
  });

  describe("getCountryStats", () => {
    it("should validate country stats response", async () => {
      const mockResponse = {
        total: 1500,
        countries: [
          { code: "FI", name: "Finland", count: 500, organizations: 3 },
        ],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await getCountryStats();
      expect(result.total).toBe(1500);
      expect(result.countries).toHaveLength(1);
      expect(result.countries[0].code).toBe("FI");
    });

    it("should return fallback on error", async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Fail"));

      const result = await getCountryStats();
      expect(result).toEqual({ total: 0, countries: [] });
    });
  });

  describe("getAvailableRegions", () => {
    it("should use underscore URL for available_regions", async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ["Uusimaa", "Helsinki"],
      });

      const result = await getAvailableRegions("Finland");

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/animals/meta/available_regions"),
        expect.anything(),
      );
      expect(fetch).not.toHaveBeenCalledWith(
        expect.stringContaining("available-regions"),
        expect.anything(),
      );
      expect(result).toEqual(["Uusimaa", "Helsinki"]);
    });

    it("should return empty array for 'Any country'", async () => {
      const result = await getAvailableRegions("Any country");
      expect(result).toEqual([]);
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
