import { renderHook, act } from "@testing-library/react";
import useSwipeFilters from "../useSwipeFilters";

describe("useSwipeFilters", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("Initial State", () => {
    it("should return default filters when localStorage is empty", () => {
      const { result } = renderHook(() => useSwipeFilters());

      expect(result.current.filters).toEqual({
        country: "",
        sizes: [],
        ages: [],
      });
    });

    it("should load filters from localStorage on mount", () => {
      const savedFilters = {
        country: "DE",
        sizes: ["small", "medium"],
        ages: [],
      };
      localStorage.setItem("swipeFilters", JSON.stringify(savedFilters));

      const { result } = renderHook(() => useSwipeFilters());

      expect(result.current.filters).toEqual(savedFilters);
    });

    it("should handle invalid localStorage data gracefully", () => {
      localStorage.setItem("swipeFilters", "invalid json");

      const { result } = renderHook(() => useSwipeFilters());

      expect(result.current.filters).toEqual({
        country: "",
        sizes: [],
        ages: [],
      });
    });
  });

  describe("Filter Updates", () => {
    it("should update country filter", () => {
      const { result } = renderHook(() => useSwipeFilters());

      act(() => {
        result.current.setCountry("United Kingdom");
      });

      expect(result.current.filters.country).toBe("United Kingdom");
    });

    it("should update size filters", () => {
      const { result } = renderHook(() => useSwipeFilters());

      act(() => {
        result.current.setSizes(["large", "giant"]);
      });

      expect(result.current.filters.sizes).toEqual(["large", "giant"]);
    });

    it("should toggle individual size", () => {
      const { result } = renderHook(() => useSwipeFilters());

      // Add size
      act(() => {
        result.current.toggleSize("small");
      });
      expect(result.current.filters.sizes).toContain("small");

      // Remove size
      act(() => {
        result.current.toggleSize("small");
      });
      expect(result.current.filters.sizes).not.toContain("small");
    });

    it("should update all filters at once", () => {
      const { result } = renderHook(() => useSwipeFilters());

      const newFilters = { country: "United States", sizes: ["medium"] };

      act(() => {
        result.current.setFilters(newFilters);
      });

      expect(result.current.filters).toEqual(newFilters);
    });
  });

  describe("Persistence", () => {
    it("should save filters to localStorage on update", () => {
      const { result } = renderHook(() => useSwipeFilters());

      act(() => {
        result.current.setCountry("Germany");
        result.current.setSizes(["small"]);
      });

      const stored = JSON.parse(localStorage.getItem("swipeFilters") || "{}");
      expect(stored).toEqual({
        country: "Germany",
        sizes: ["small"],
        ages: [],
      });
    });

    it("should debounce localStorage writes", async () => {
      const { result } = renderHook(() => useSwipeFilters());

      const setItemSpy = jest.spyOn(Storage.prototype, "setItem");

      act(() => {
        result.current.setCountry("Germany");
        result.current.setCountry("United Kingdom");
        result.current.setCountry("United States");
      });

      // Should only write once after debounce
      expect(setItemSpy).toHaveBeenCalledTimes(1);

      setItemSpy.mockRestore();
    });
  });

  describe("Validation", () => {
    it("should validate country is required", () => {
      const { result } = renderHook(() => useSwipeFilters());

      expect(result.current.isValid).toBe(false);

      act(() => {
        result.current.setCountry("Germany");
      });

      expect(result.current.isValid).toBe(true);
    });

    it("should allow empty size selection", () => {
      const { result } = renderHook(() => useSwipeFilters());

      act(() => {
        result.current.setCountry("Germany");
      });

      expect(result.current.isValid).toBe(true);
      expect(result.current.filters.sizes).toEqual([]);
    });
  });

  describe("Reset", () => {
    it("should reset filters to default", () => {
      const { result } = renderHook(() => useSwipeFilters());

      act(() => {
        result.current.setCountry("Germany");
        result.current.setSizes(["small", "medium"]);
      });

      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.filters).toEqual({
        country: "",
        sizes: [],
        ages: [],
      });
    });

    it("should clear localStorage on reset", () => {
      const { result } = renderHook(() => useSwipeFilters());

      act(() => {
        result.current.setCountry("Germany");
      });

      expect(localStorage.getItem("swipeFilters")).not.toBeNull();

      act(() => {
        result.current.resetFilters();
      });

      expect(localStorage.getItem("swipeFilters")).toBeNull();
    });
  });

  describe("Query String Generation", () => {
    it("should generate query string for API calls", () => {
      const { result } = renderHook(() => useSwipeFilters());

      act(() => {
        result.current.setCountry("Germany");
        result.current.setSizes(["small", "medium"]);
      });

      expect(result.current.toQueryString()).toBe(
        "adoptable_to_country=Germany&size%5B%5D=small&size%5B%5D=medium",
      );
    });

    it("should handle special characters in country names", () => {
      const { result } = renderHook(() => useSwipeFilters());

      act(() => {
        result.current.setCountry("United Kingdom");
      });

      expect(result.current.toQueryString()).toBe(
        "adoptable_to_country=United+Kingdom",
      );
    });

    it("should omit empty values from query string", () => {
      const { result } = renderHook(() => useSwipeFilters());

      act(() => {
        result.current.setCountry("Germany");
        // No sizes selected
      });

      expect(result.current.toQueryString()).toBe(
        "adoptable_to_country=Germany",
      );
    });
  });

  describe("Onboarding Status", () => {
    it("should track if onboarding is needed", () => {
      const { result } = renderHook(() => useSwipeFilters());

      expect(result.current.needsOnboarding).toBe(true);

      localStorage.setItem("swipeOnboardingComplete", "true");
      localStorage.setItem(
        "swipeFilters",
        JSON.stringify({ country: "Germany", sizes: [] }),
      );

      const { result: result2 } = renderHook(() => useSwipeFilters());
      expect(result2.current.needsOnboarding).toBe(false);
    });

    it("should mark onboarding complete", () => {
      const { result } = renderHook(() => useSwipeFilters());

      act(() => {
        result.current.completeOnboarding({
          country: "Germany",
          sizes: ["small"],
        });
      });

      expect(localStorage.getItem("swipeOnboardingComplete")).toBe("true");
      expect(result.current.filters).toEqual({
        country: "Germany",
        sizes: ["small"],
      });
      expect(result.current.needsOnboarding).toBe(false);
    });
  });
});
