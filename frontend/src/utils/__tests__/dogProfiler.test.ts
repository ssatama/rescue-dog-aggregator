/**
 * The personality section must not render as a shell of empty headings.
 *
 * Production, 2026-08-27 to 2026-08-31: LLM profiling failed for 123 dogs and
 * the API rendered a NULL dog_profiler_data column as `{}`. The section guard
 * was `dog.dog_profiler_data && (...)`, and `{}` is truthy, so those dogs showed
 * "Personality", "Energy & Training", "Good With" and "Activities & Quirks"
 * with no content under any of them.
 *
 * `hasAnyProfileSection` composes the four per-section predicates, so the
 * wrapper cannot outlive its contents even for a profile that carries only
 * fields the model was not confident about.
 */

import { hasAnyProfileSection } from "../dogProfiler";

describe("hasAnyProfileSection", () => {
  describe("nothing to show", () => {
    it("rejects null", () => {
      expect(hasAnyProfileSection(null)).toBe(false);
    });

    it("rejects undefined", () => {
      expect(hasAnyProfileSection(undefined)).toBe(false);
    });

    it("rejects the empty object the API used to send for an unprofiled dog", () => {
      expect(hasAnyProfileSection({})).toBe(false);
    });

    it("rejects a profile carrying only metadata", () => {
      expect(
        hasAnyProfileSection({
          model_used: "google/gemini-3.7-flash",
          profiled_at: "2026-08-29T15:15:26.363983+00:00",
          prompt_version: "1.0.0",
          quality_score: 80,
        }),
      ).toBe(false);
    });

    it("rejects a profile whose every field is low-confidence", () => {
      expect(
        hasAnyProfileSection({
          personality_traits: ["gentle"],
          energy_level: "medium",
          trainability: "moderate",
          good_with_dogs: "yes",
          favorite_activities: ["fetch"],
          unique_quirk: "sleeps upside down",
          confidence_scores: {
            personality_traits: 0.4,
            energy_level: 0.3,
            trainability: 0.2,
            good_with_dogs: 0.4,
            favorite_activities: 0.1,
            unique_quirk: 0.5,
          },
        }),
      ).toBe(false);
    });
  });

  describe("something to show", () => {
    it.each([
      ["personality traits", { personality_traits: ["gentle", "shy"] }],
      ["energy level", { energy_level: "medium" as const }],
      ["trainability", { trainability: "moderate" as const }],
      ["a compatibility answer", { good_with_dogs: "yes" as const }],
      ["favorite activities", { favorite_activities: ["fetch"] }],
      ["a unique quirk", { unique_quirk: "sleeps upside down" }],
    ])("accepts %s alone", (_name, profile) => {
      expect(hasAnyProfileSection(profile)).toBe(true);
    });

    it("accepts a profile where only one field cleared the confidence floor", () => {
      expect(
        hasAnyProfileSection({
          personality_traits: ["gentle"],
          energy_level: "medium",
          confidence_scores: { personality_traits: 0.4, energy_level: 0.9 },
        }),
      ).toBe(true);
    });
  });
});
