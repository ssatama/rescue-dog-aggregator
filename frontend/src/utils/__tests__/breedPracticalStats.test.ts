import { buildPracticalStats, hasPracticalStats, MIN_SAMPLE } from "../breedPracticalStats";
import type { FilterCountsResponse } from "@/schemas/common";

const none = { count: 0, known: 0 };

function counts(overrides: Partial<FilterCountsResponse> = {}): FilterCountsResponse {
  return {
    total: 40,
    size_options: [],
    age_options: [],
    lifestyle: {
      good_with_kids: none,
      good_with_dogs: none,
      good_with_cats: none,
      first_time_friendly: none,
      energy_low: none,
      energy_medium: none,
      energy_high: none,
    },
    ...overrides,
  };
}

describe("buildPracticalStats (#500)", () => {
  it("gives each compatibility stat as a share of the dogs with the info", () => {
    const stats = buildPracticalStats(
      counts({
        lifestyle: {
          good_with_kids: { count: 18, known: 23 },
          good_with_dogs: { count: 10, known: 10 },
          good_with_cats: { count: 3, known: 12 },
          first_time_friendly: { count: 6, known: 20 },
          energy_low: none,
          energy_medium: none,
          energy_high: none,
        },
      }),
    );
    expect(stats.compatibility).toEqual([
      { key: "good_with_kids", label: "Good with children", count: 18, known: 23, percent: 78 },
      { key: "good_with_cats", label: "Good with cats", count: 3, known: 12, percent: 25 },
      { key: "good_with_dogs", label: "Good with other dogs", count: 10, known: 10, percent: 100 },
      { key: "first_time_friendly", label: "Suits first-time owners", count: 6, known: 20, percent: 30 },
    ]);
  });

  it("leaves out a stat fewer than five dogs have, even when all of them are a yes", () => {
    const stats = buildPracticalStats(
      counts({
        lifestyle: {
          good_with_kids: { count: 4, known: MIN_SAMPLE - 1 },
          good_with_dogs: { count: 0, known: 0 },
          good_with_cats: { count: 2, known: MIN_SAMPLE },
          first_time_friendly: none,
          energy_low: { count: 1, known: 3 },
          energy_medium: { count: 2, known: 3 },
          energy_high: { count: 0, known: 3 },
        },
      }),
    );
    expect(stats.compatibility.map((stat) => stat.key)).toEqual(["good_with_cats"]);
    expect(stats.energy).toBeNull();
  });

  it("returns nothing for a breed with no profiles at all", () => {
    const stats = buildPracticalStats(counts({ lifestyle: null }));
    expect(stats.compatibility).toEqual([]);
    expect(stats.energy).toBeNull();
    expect(hasPracticalStats(stats)).toBe(false);
    expect(hasPracticalStats(buildPracticalStats(null))).toBe(false);
  });

  it("splits energy over the dogs with a known energy level, skipping empty bands", () => {
    const stats = buildPracticalStats(
      counts({
        lifestyle: {
          good_with_kids: none,
          good_with_dogs: none,
          good_with_cats: none,
          first_time_friendly: none,
          energy_low: { count: 0, known: 8 },
          energy_medium: { count: 2, known: 8 },
          energy_high: { count: 6, known: 8 },
        },
      }),
    );
    expect(stats.energy).toEqual({
      known: 8,
      parts: [
        { label: "Medium", count: 2, percent: 25 },
        { label: "High", count: 6, percent: 75 },
      ],
    });
  });

  it("orders sizes on the catalog's scale and shares them over dogs with a size", () => {
    const stats = buildPracticalStats(
      counts({
        size_options: [
          { value: "XLarge", label: "Giant", count: 1 },
          { value: "Small", label: "Small", count: 3 },
          { value: "Large", label: "Large", count: 6 },
        ],
      }),
    );
    expect(stats.size).toEqual({
      known: 10,
      parts: [
        { label: "Small", count: 3, percent: 30 },
        { label: "Large", count: 6, percent: 60 },
        { label: "Giant", count: 1, percent: 10 },
      ],
    });
    expect(buildPracticalStats(counts({ size_options: [{ value: "Small", label: "Small", count: 4 }] })).size).toBeNull();
  });

  it("keeps age as counts and needs one group of five, since groups overlap", () => {
    const ages = [
      { value: "Adult", label: "Adult", count: 7 },
      { value: "Puppy", label: "Puppy", count: 2 },
    ];
    expect(buildPracticalStats(counts({ age_options: ages })).age).toEqual([
      { label: "Puppy", count: 2 },
      { label: "Adult", count: 7 },
    ]);
    // 3 + 3 could be as few as three dogs spanning both groups
    const spread = [
      { value: "Young", label: "Young", count: 3 },
      { value: "Adult", label: "Adult", count: 3 },
    ];
    expect(buildPracticalStats(counts({ age_options: spread })).age).toBeNull();
  });
});
