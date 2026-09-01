/**
 * A heading must never outlive the content underneath it.
 *
 * The four personality sub-components each hide themselves when their field is
 * missing or its confidence score is <= 0.5, but their <h3> headings lived in
 * DogDetailClient behind a single section-level guard that ignored confidence
 * entirely. Of 1,332 profiled production dogs, 239 rendered at least one
 * heading with nothing under it - 213 of those "Energy & Training".
 *
 * Each section now exports the predicate its component already used, so the
 * heading and the body cannot disagree.
 */

import {
  hasPersonalitySection,
  hasEnergyTrainabilitySection,
  hasCompatibilitySection,
  hasActivitiesSection,
} from "../index";

const LOW = 0.4;
const HIGH = 0.9;

describe("profile section predicates", () => {
  describe("empty input", () => {
    it.each([
      ["personality", hasPersonalitySection],
      ["energy & training", hasEnergyTrainabilitySection],
      ["good with", hasCompatibilitySection],
      ["activities & quirks", hasActivitiesSection],
    ])("%s hides for null, undefined and {}", (_name, predicate) => {
      expect(predicate(null)).toBe(false);
      expect(predicate(undefined)).toBe(false);
      expect(predicate({})).toBe(false);
    });
  });

  describe("hasPersonalitySection", () => {
    it("shows when traits are present", () => {
      expect(hasPersonalitySection({ personality_traits: ["gentle"] })).toBe(true);
    });

    it("hides an empty trait list", () => {
      expect(hasPersonalitySection({ personality_traits: [] })).toBe(false);
    });

    it("hides traits the model was not confident about", () => {
      expect(
        hasPersonalitySection({
          personality_traits: ["gentle"],
          confidence_scores: { personality_traits: LOW },
        }),
      ).toBe(false);
    });

    it("shows traits with a high confidence score", () => {
      expect(
        hasPersonalitySection({
          personality_traits: ["gentle"],
          confidence_scores: { personality_traits: HIGH },
        }),
      ).toBe(true);
    });
  });

  describe("hasEnergyTrainabilitySection", () => {
    it("shows for energy alone", () => {
      expect(hasEnergyTrainabilitySection({ energy_level: "medium" })).toBe(true);
    });

    it("shows for trainability alone", () => {
      expect(hasEnergyTrainabilitySection({ trainability: "moderate" })).toBe(true);
    });

    it("hides when both are low-confidence - the 213-dog case", () => {
      expect(
        hasEnergyTrainabilitySection({
          energy_level: "medium",
          trainability: "moderate",
          confidence_scores: { energy_level: LOW, trainability: LOW },
        }),
      ).toBe(false);
    });

    it("still shows when only one of the two is low-confidence", () => {
      expect(
        hasEnergyTrainabilitySection({
          energy_level: "medium",
          trainability: "moderate",
          confidence_scores: { energy_level: LOW, trainability: HIGH },
        }),
      ).toBe(true);
    });
  });

  describe("hasCompatibilitySection", () => {
    it("shows for any single answer", () => {
      expect(hasCompatibilitySection({ good_with_dogs: "yes" })).toBe(true);
    });

    it("hides when every answer is low-confidence", () => {
      expect(
        hasCompatibilitySection({
          good_with_dogs: "yes",
          good_with_cats: "no",
          confidence_scores: { good_with_dogs: LOW, good_with_cats: LOW },
        }),
      ).toBe(false);
    });
  });

  describe("hasActivitiesSection", () => {
    it("shows for activities alone", () => {
      expect(hasActivitiesSection({ favorite_activities: ["fetch"] })).toBe(true);
    });

    it("shows for a quirk alone", () => {
      expect(hasActivitiesSection({ unique_quirk: "sleeps upside down" })).toBe(true);
    });

    it("hides a blank quirk", () => {
      expect(hasActivitiesSection({ unique_quirk: "   " })).toBe(false);
    });

    it("hides when both are low-confidence", () => {
      expect(
        hasActivitiesSection({
          favorite_activities: ["fetch"],
          unique_quirk: "sleeps upside down",
          confidence_scores: { favorite_activities: LOW, unique_quirk: LOW },
        }),
      ).toBe(false);
    });
  });
});
