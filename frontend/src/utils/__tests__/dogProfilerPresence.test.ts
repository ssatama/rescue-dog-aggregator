/**
 * The personality section must not render as a shell of empty headings.
 *
 * Production, 2026-08-27 to 2026-08-31: LLM profiling failed for 156 active
 * dogs, and the API rendered a NULL dog_profiler_data column as `{}`. The
 * section guard was `dog.dog_profiler_data && (...)`, and `{}` is truthy, so
 * every one of those dogs showed "Personality", "Energy & Training",
 * "Good With" and "Activities & Quirks" with no content under any of them.
 */

import { hasCompatibilityData, hasDisplayableProfile } from "../dogProfiler";

describe("hasDisplayableProfile", () => {
  describe("nothing to show", () => {
    it("rejects null", () => {
      expect(hasDisplayableProfile(null)).toBe(false);
    });

    it("rejects undefined", () => {
      expect(hasDisplayableProfile(undefined)).toBe(false);
    });

    it("rejects the empty object the API used to send for an unprofiled dog", () => {
      expect(hasDisplayableProfile({})).toBe(false);
    });

    it("rejects a profile carrying only metadata", () => {
      expect(
        hasDisplayableProfile({
          model_used: "google/gemini-3.7-flash",
          profiled_at: "2026-08-29T15:15:26.363983+00:00",
          prompt_version: "1.0.0",
          quality_score: 80,
        }),
      ).toBe(false);
    });

    it("rejects a profile whose only trait list is empty", () => {
      expect(hasDisplayableProfile({ personality_traits: [], favorite_activities: [] })).toBe(false);
    });
  });

  describe("something to show", () => {
    it("accepts personality traits alone", () => {
      expect(hasDisplayableProfile({ personality_traits: ["gentle", "shy"] })).toBe(true);
    });

    it("accepts energy level alone", () => {
      expect(hasDisplayableProfile({ energy_level: "medium" })).toBe(true);
    });

    it("accepts trainability alone", () => {
      expect(hasDisplayableProfile({ trainability: "moderate" })).toBe(true);
    });

    it("accepts a compatibility answer alone", () => {
      expect(hasDisplayableProfile({ good_with_dogs: "yes" })).toBe(true);
    });

    it("accepts favorite activities alone", () => {
      expect(hasDisplayableProfile({ favorite_activities: ["fetch"] })).toBe(true);
    });

    it("accepts a unique quirk alone", () => {
      expect(hasDisplayableProfile({ unique_quirk: "sleeps upside down" })).toBe(true);
    });

    it("accepts a full profile", () => {
      expect(
        hasDisplayableProfile({
          personality_traits: ["gentle", "shy", "playful"],
          energy_level: "medium",
          trainability: "moderate",
          good_with_dogs: "yes",
          favorite_activities: ["fetch", "sniffy walks"],
          unique_quirk: "sleeps upside down",
        }),
      ).toBe(true);
    });
  });
});

describe("hasCompatibilityData", () => {
  /**
   * The "Good With" block draws a filled dot for "yes" and a dash for anything
   * else, so an absent answer reads as "not good with dogs". It may only render
   * when the profile actually answered at least one of those questions.
   */
  it("rejects null", () => {
    expect(hasCompatibilityData(null)).toBe(false);
  });

  it("rejects the empty object", () => {
    expect(hasCompatibilityData({})).toBe(false);
  });

  it("does not draw dashes for a profile that only knows the energy level", () => {
    expect(hasCompatibilityData({ energy_level: "medium", personality_traits: ["shy"] })).toBe(false);
  });

  it("accepts a dog answer", () => {
    expect(hasCompatibilityData({ good_with_dogs: "yes" })).toBe(true);
  });

  it("accepts a cat answer", () => {
    expect(hasCompatibilityData({ good_with_cats: "unknown" })).toBe(true);
  });

  it("accepts a children answer", () => {
    expect(hasCompatibilityData({ good_with_children: "no" })).toBe(true);
  });
});
