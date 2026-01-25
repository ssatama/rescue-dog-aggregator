import {
  searchParamsToFilters,
  filtersToSearchParams,
  getSwipeDogs,
  getAvailableCountries,
} from "../serverSwipeService";

jest.mock("@sentry/nextjs", () => ({
  withScope: jest.fn((callback) => callback({ setTag: jest.fn(), setContext: jest.fn() })),
  captureException: jest.fn(),
}));

jest.mock("../../utils/dogTransformer", () => ({
  transformApiDogsToDogs: jest.fn((dogs) => dogs),
}));

describe("serverSwipeService", () => {
  describe("searchParamsToFilters", () => {
    it("should parse country from search params", () => {
      const params = { country: "GB" };
      const filters = searchParamsToFilters(params);

      expect(filters.country).toBe("GB");
      expect(filters.sizes).toEqual([]);
      expect(filters.ages).toEqual([]);
    });

    it("should parse single size value", () => {
      const params = { country: "GB", size: "small" };
      const filters = searchParamsToFilters(params);

      expect(filters.sizes).toEqual(["small"]);
    });

    it("should parse multiple size values", () => {
      const params = { country: "GB", size: ["small", "medium"] };
      const filters = searchParamsToFilters(params);

      expect(filters.sizes).toEqual(["small", "medium"]);
    });

    it("should parse single age value", () => {
      const params = { country: "GB", age: "puppy" };
      const filters = searchParamsToFilters(params);

      expect(filters.ages).toEqual(["puppy"]);
    });

    it("should parse multiple age values", () => {
      const params = { country: "GB", age: ["puppy", "young"] };
      const filters = searchParamsToFilters(params);

      expect(filters.ages).toEqual(["puppy", "young"]);
    });

    it("should handle empty params", () => {
      const params = {};
      const filters = searchParamsToFilters(params);

      expect(filters.country).toBe("");
      expect(filters.sizes).toEqual([]);
      expect(filters.ages).toEqual([]);
    });

    it("should handle undefined values", () => {
      const params = { country: undefined, size: undefined };
      const filters = searchParamsToFilters(params);

      expect(filters.country).toBe("");
      expect(filters.sizes).toEqual([]);
    });
  });

  describe("filtersToSearchParams", () => {
    it("should convert country to search params", () => {
      const filters = { country: "GB", sizes: [], ages: [] };
      const params = filtersToSearchParams(filters);

      expect(params).toBe("country=GB");
    });

    it("should convert sizes to search params", () => {
      const filters = { country: "GB", sizes: ["small", "medium"], ages: [] };
      const params = filtersToSearchParams(filters);

      expect(params).toBe("country=GB&size=small&size=medium");
    });

    it("should convert ages to search params", () => {
      const filters = { country: "GB", sizes: [], ages: ["puppy", "young"] };
      const params = filtersToSearchParams(filters);

      expect(params).toBe("country=GB&age=puppy&age=young");
    });

    it("should convert all filters to search params", () => {
      const filters = {
        country: "GB",
        sizes: ["small"],
        ages: ["puppy"],
      };
      const params = filtersToSearchParams(filters);

      expect(params).toBe("country=GB&size=small&age=puppy");
    });

    it("should handle empty filters", () => {
      const filters = { country: "", sizes: [], ages: [] };
      const params = filtersToSearchParams(filters);

      expect(params).toBe("");
    });
  });

  describe("round-trip conversion", () => {
    it("should preserve filter values through conversion", () => {
      const original = {
        country: "GB",
        sizes: ["small", "medium"],
        ages: ["puppy"],
      };

      const searchParams = filtersToSearchParams(original);
      const urlParams = new URLSearchParams(searchParams);
      const paramsObject: Record<string, string | string[]> = {};

      urlParams.forEach((value, key) => {
        if (paramsObject[key]) {
          if (Array.isArray(paramsObject[key])) {
            (paramsObject[key] as string[]).push(value);
          } else {
            paramsObject[key] = [paramsObject[key] as string, value];
          }
        } else {
          paramsObject[key] = value;
        }
      });

      const restored = searchParamsToFilters(paramsObject);

      expect(restored.country).toBe(original.country);
      expect(restored.sizes).toEqual(original.sizes);
      expect(restored.ages).toEqual(original.ages);
    });
  });

  describe("getSwipeDogs", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("should fetch and transform dogs successfully", async () => {
      const mockDogs = [
        { id: 1, name: "Buddy", breed: "Labrador" },
        { id: 2, name: "Max", breed: "Poodle" },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ dogs: mockDogs, total: 2 }),
      });

      const result = await getSwipeDogs({ country: "GB" });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/dogs/swipe"),
        expect.objectContaining({
          headers: { "Content-Type": "application/json" },
        }),
      );
      expect(result.dogs).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should construct URL with all filter params", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ dogs: [], total: 0 }),
      });

      await getSwipeDogs({
        country: "DE",
        sizes: ["small", "medium"],
        ages: ["puppy"],
      });

      const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(calledUrl).toContain("adoptable_to_country=DE");
      expect(calledUrl).toContain("size%5B%5D=small");
      expect(calledUrl).toContain("size%5B%5D=medium");
      expect(calledUrl).toContain("age%5B%5D=puppy");
    });

    it("should return empty array on HTTP error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      });

      const result = await getSwipeDogs({ country: "GB" });

      expect(result.dogs).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should return empty array on network failure", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const result = await getSwipeDogs({ country: "GB" });

      expect(result.dogs).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("should handle missing dogs array in response", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total: 0 }),
      });

      const result = await getSwipeDogs({ country: "GB" });

      expect(result.dogs).toEqual([]);
    });
  });

  describe("getAvailableCountries", () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it("should fetch countries with countries wrapper", async () => {
      const mockCountries = [
        { code: "GB", name: "United Kingdom", dog_count: 100 },
        { code: "DE", name: "Germany", dog_count: 50 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ countries: mockCountries }),
      });

      const result = await getAvailableCountries();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        value: "GB",
        label: "United Kingdom",
        flag: expect.any(String),
        count: 100,
      });
    });

    it("should fetch countries with direct array format", async () => {
      const mockCountries = [
        { code: "FR", name: "France", dogCount: 75 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCountries,
      });

      const result = await getAvailableCountries();

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("FR");
      expect(result[0].count).toBe(75);
    });

    it("should use fallback flag for unknown country code", async () => {
      const mockCountries = [
        { code: "XX", name: "Unknown Country", dog_count: 10 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ countries: mockCountries }),
      });

      const result = await getAvailableCountries();

      expect(result[0].flag).toBeDefined();
    });

    it("should return empty array on HTTP error", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Service Unavailable",
      });

      const result = await getAvailableCountries();

      expect(result).toEqual([]);
    });

    it("should return empty array on network failure", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error"),
      );

      const result = await getAvailableCountries();

      expect(result).toEqual([]);
    });
  });
});
