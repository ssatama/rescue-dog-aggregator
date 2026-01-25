import {
  searchParamsToFilters,
  filtersToSearchParams,
} from "../serverSwipeService";

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
});
