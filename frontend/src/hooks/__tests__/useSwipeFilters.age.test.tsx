import { renderHook, act } from "@testing-library/react";
import useSwipeFilters from "../useSwipeFilters";

describe("useSwipeFilters - Age Filter", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should initialize with empty ages array", () => {
    const { result } = renderHook(() => useSwipeFilters());
    expect(result.current.filters.ages).toEqual([]);
  });

  it("should set ages", () => {
    const { result } = renderHook(() => useSwipeFilters());

    act(() => {
      result.current.setAges(["puppy", "young"]);
    });

    expect(result.current.filters.ages).toEqual(["puppy", "young"]);
  });

  it("should toggle individual age", () => {
    const { result } = renderHook(() => useSwipeFilters());

    // Add age
    act(() => {
      result.current.toggleAge("adult");
    });
    expect(result.current.filters.ages).toEqual(["adult"]);

    // Add another age
    act(() => {
      result.current.toggleAge("senior");
    });
    expect(result.current.filters.ages).toEqual(["adult", "senior"]);

    // Remove age
    act(() => {
      result.current.toggleAge("adult");
    });
    expect(result.current.filters.ages).toEqual(["senior"]);
  });

  it("should persist ages to localStorage", () => {
    const { result } = renderHook(() => useSwipeFilters());

    act(() => {
      result.current.setAges(["puppy", "young"]);
      result.current.setCountry("DE");
    });

    const stored = JSON.parse(localStorage.getItem("swipeFilters") || "{}");
    expect(stored.ages).toEqual(["puppy", "young"]);
    expect(stored.country).toBe("DE");
  });

  it("should include ages in query string", () => {
    const { result } = renderHook(() => useSwipeFilters());

    act(() => {
      result.current.setCountry("GB");
      result.current.setAges(["puppy", "adult"]);
      result.current.setSizes(["small"]);
    });

    const queryString = result.current.toQueryString();
    expect(queryString).toContain("adoptable_to_country=GB");
    expect(queryString).toContain("age%5B%5D=puppy");
    expect(queryString).toContain("age%5B%5D=adult");
    expect(queryString).toContain("size%5B%5D=small");
  });

  it("should reset ages when resetFilters is called", () => {
    const { result } = renderHook(() => useSwipeFilters());

    act(() => {
      result.current.setCountry("US");
      result.current.setAges(["young", "adult"]);
      result.current.setSizes(["medium", "large"]);
    });

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filters.ages).toEqual([]);
    expect(result.current.filters.sizes).toEqual([]);
    expect(result.current.filters.country).toBe("");
  });

  it("should complete onboarding with ages", () => {
    const { result } = renderHook(() => useSwipeFilters());

    act(() => {
      result.current.completeOnboarding({
        country: "DE",
        sizes: ["small"],
        ages: ["puppy", "young"],
      });
    });

    expect(result.current.filters.ages).toEqual(["puppy", "young"]);
    expect(result.current.needsOnboarding).toBe(false);
    expect(localStorage.getItem("swipeOnboardingComplete")).toBe("true");
  });
});
