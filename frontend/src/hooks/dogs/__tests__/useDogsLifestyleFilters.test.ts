import { renderHook, act } from "@testing-library/react";
import { useRouter } from "next/navigation";
import useDogsFilters, { buildAPIParams } from "../useDogsFilters";
import type { Filters } from "../../../types/dogsPage";

// Lifestyle filters (#495): their catalog URL keys and the API params they send

jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));
jest.mock("../../../services/animalsService", () => ({
  getAvailableRegions: jest.fn().mockResolvedValue([]),
}));
jest.mock("../../../utils/logger", () => ({ reportError: jest.fn() }));

const push = jest.fn();

function filtersFrom(query: string) {
  const { result } = renderHook(() =>
    useDogsFilters({
      metadata: {},
      initialParams: {},
      searchParams: new URLSearchParams(query),
      pathname: "/dogs",
      scrollPositionRef: { current: 0 },
    }),
  );
  return result;
}

describe("lifestyle filters in the catalog URL", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push, replace: jest.fn() });
  });

  it("reads each lifestyle key", () => {
    const result = filtersFrom(
      "good_with_kids=true&good_with_dogs=true&good_with_cats=true&first_time_friendly=true&energy=high",
    );
    expect(result.current.filters).toMatchObject({
      goodWithKidsFilter: "true",
      goodWithDogsFilter: "true",
      goodWithCatsFilter: "true",
      firstTimeFriendlyFilter: "true",
      energyFilter: "high",
    });
    expect(result.current.activeFilterCount).toBe(5);
  });

  it("ignores values it does not know", () => {
    const result = filtersFrom("good_with_cats=yes&energy=very_high");
    expect(result.current.filters).toMatchObject({ goodWithCatsFilter: "", energyFilter: "" });
    expect(result.current.activeFilterCount).toBe(0);
  });

  it("writes the same keys back", () => {
    jest.useFakeTimers();
    const result = filtersFrom("");
    act(() => {
      result.current.updateURL({ ...result.current.filters, goodWithCatsFilter: "true", energyFilter: "low" });
      jest.advanceTimersByTime(500);
    });
    expect(push).toHaveBeenCalledWith("/dogs?good_with_cats=true&energy=low", { scroll: false });
    jest.useRealTimers();
  });

  it("sends the API's params, first-time friendly as an experience level", () => {
    const result = filtersFrom("good_with_kids=true&first_time_friendly=true&energy=medium");
    expect(buildAPIParams(result.current.filters as Filters)).toEqual({
      sort: "recommended",
      good_with_kids: "true",
      experience_level: "first_time_ok",
      energy: "medium",
    });
  });
});
