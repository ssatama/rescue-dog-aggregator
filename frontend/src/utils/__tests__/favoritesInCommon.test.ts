import { favoritesInCommon } from "../favoritesInCommon";
import type { Dog } from "@/types/dog";
import type { DogProfilerData } from "@/types/dogProfiler";

const dog = (id: number, profile: DogProfilerData = {}, extra: Partial<Dog> = {}): Dog => ({
  id,
  name: `Dog ${id}`,
  dog_profiler_data: profile,
  ...extra,
});

describe("favoritesInCommon (#498)", () => {
  test("says nothing about a single dog", () => {
    expect(favoritesInCommon([dog(1, { home_type: "apartment_ok" })])).toEqual([]);
  });

  test("keeps a line only when every dog backs it", () => {
    const apartment = dog(1, { home_type: "apartment_ok", energy_level: "low" });
    const fenceClimber = dog(2, { home_type: "house_required", energy_level: "low" });
    const lines = favoritesInCommon([apartment, fenceClimber]);
    expect(lines).toContain("All low energy");
    expect(lines).not.toContain("All fine in an apartment");
  });

  test("a dog with the value missing drops the line instead of being skipped", () => {
    const lines = favoritesInCommon([
      dog(1, { experience_level: "first_time_ok", energy_level: "high" }),
      dog(2, { experience_level: "first_time_ok", energy_level: "high" }),
      dog(3),
    ]);
    expect(lines).toEqual([]);
  });

  test("shared rescue, size, age, companions and traits", () => {
    const shared: Partial<Dog> = {
      organization: { name: "Dogs Trust" },
      standardized_size: "Medium",
      age_min_months: 36,
      age_max_months: 48,
    };
    const lines = favoritesInCommon([
      dog(1, { good_with_cats: "yes", personality_traits: ["Gentle", "Loyal"] }, shared),
      dog(2, { good_with_cats: "yes", personality_traits: ["loyal", "gentle", "shy"] }, shared),
    ]);
    expect(lines).toEqual([
      "All at Dogs Trust",
      "All medium-sized dogs",
      "All adult dogs",
      "All good with cats",
      "All described as gentle, loyal",
    ]);
  });
});
