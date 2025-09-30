import {
  analyzePersonalityPatterns,
  calculateLifestyleCompatibility,
  assessExperienceRequirements,
  discoverHiddenGems,
  calculateCareComplexity,
  getEnhancedInsights,
} from "../dogProfilerAnalyzer";
import type { DogWithProfiler } from "../../types/dogProfiler";

describe("dogProfilerAnalyzer", () => {
  const createMockDog = (
    overrides?: Partial<DogWithProfiler>,
  ): DogWithProfiler => ({
    id: 1,
    name: "Test Dog",
    breed: "Mixed",
    age_months: 24,
    size: "medium",
    organization_name: "Test Org",
    url: "https://example.com",
    dog_profiler_data: undefined,
    ...overrides,
  });

  describe("analyzePersonalityPatterns", () => {
    it("returns null for dogs without profiler data", () => {
      const dogs = [createMockDog(), createMockDog()];
      expect(analyzePersonalityPatterns(dogs)).toBeNull();
    });

    it("identifies common traits appearing in >50% of dogs", () => {
      const dogs = [
        createMockDog({
          dog_profiler_data: { personality_traits: ["gentle", "calm"] },
        }),
        createMockDog({
          dog_profiler_data: { personality_traits: ["gentle", "playful"] },
        }),
        createMockDog({
          dog_profiler_data: { personality_traits: ["gentle", "loyal"] },
        }),
      ];

      const result = analyzePersonalityPatterns(dogs);
      expect(result?.commonTraits).toContain("gentle");
      expect(result?.traitFrequency["gentle"]).toBe(3);
    });

    it("determines personality theme based on common traits", () => {
      const dogs = [
        createMockDog({
          dog_profiler_data: { personality_traits: ["calm", "gentle"] },
        }),
        createMockDog({
          dog_profiler_data: { personality_traits: ["calm", "relaxed"] },
        }),
      ];

      const result = analyzePersonalityPatterns(dogs);
      expect(result?.personalityTheme).toBe(
        "You prefer calm, gentle companions",
      );
    });

    it("identifies dominant traits (top 5 most common)", () => {
      const dogs = [
        createMockDog({
          dog_profiler_data: {
            personality_traits: ["playful", "energetic", "friendly", "loyal"],
          },
        }),
        createMockDog({
          dog_profiler_data: {
            personality_traits: ["playful", "energetic", "smart"],
          },
        }),
      ];

      const result = analyzePersonalityPatterns(dogs);
      expect(result?.dominantTraits).toContain("playful");
      expect(result?.dominantTraits).toContain("energetic");
      expect(result?.dominantTraits.length).toBeLessThanOrEqual(5);
    });
  });

  describe("calculateLifestyleCompatibility", () => {
    it("returns null for dogs without profiler data", () => {
      const dogs = [createMockDog()];
      expect(calculateLifestyleCompatibility(dogs)).toBeNull();
    });

    it("calculates apartment suitability score", () => {
      const dogs = [
        createMockDog({
          dog_profiler_data: {
            home_type: "apartment_ok",
            energy_level: "low",
            yard_required: false,
          },
        }),
      ];

      const result = calculateLifestyleCompatibility(dogs);
      expect(result?.apartmentSuitability).toBeGreaterThan(70);
      expect(result?.messages).toContain("Great for apartment living");
    });

    it("calculates active family suitability", () => {
      const dogs = [
        createMockDog({
          dog_profiler_data: {
            energy_level: "high",
            exercise_needs: "high",
            favorite_activities: ["hiking", "running"],
          },
        }),
      ];

      const result = calculateLifestyleCompatibility(dogs);
      expect(result?.activeFamilySuitability).toBeGreaterThan(70);
      expect(result?.messages).toContain("Perfect for active families");
    });

    it("calculates first-time owner suitability", () => {
      const dogs = [
        createMockDog({
          dog_profiler_data: {
            experience_level: "first_time_ok",
            trainability: "easy",
            confidence: "confident",
          },
        }),
      ];

      const result = calculateLifestyleCompatibility(dogs);
      expect(result?.firstTimeOwnerSuitability).toBeGreaterThan(70);
      expect(result?.messages).toContain("Suitable for first-time owners");
    });

    it("normalizes scores across multiple dogs", () => {
      const dogs = [
        createMockDog({
          dog_profiler_data: { home_type: "apartment_ok", energy_level: "low" },
        }),
        createMockDog({
          dog_profiler_data: {
            home_type: "house_preferred",
            energy_level: "high",
          },
        }),
      ];

      const result = calculateLifestyleCompatibility(dogs);
      expect(result?.apartmentSuitability).toBeLessThanOrEqual(100);
      expect(result?.activeFamilySuitability).toBeLessThanOrEqual(100);
    });
  });

  describe("assessExperienceRequirements", () => {
    it("returns null for dogs without experience level data", () => {
      const dogs = [createMockDog({ dog_profiler_data: {} })];
      expect(assessExperienceRequirements(dogs)).toBeNull();
    });

    it("determines beginner_friendly for majority first-time-ok dogs", () => {
      const dogs = [
        createMockDog({
          dog_profiler_data: { experience_level: "first_time_ok" },
        }),
        createMockDog({
          dog_profiler_data: { experience_level: "first_time_ok" },
        }),
        createMockDog({
          dog_profiler_data: { experience_level: "some_experience" },
        }),
      ];

      const result = assessExperienceRequirements(dogs);
      expect(result?.overallLevel).toBe("beginner_friendly");
      expect(result?.recommendation).toContain("Perfect for first-time");
    });

    it("determines experienced_only for majority experienced dogs", () => {
      const dogs = [
        createMockDog({
          dog_profiler_data: { experience_level: "experienced_only" },
        }),
        createMockDog({
          dog_profiler_data: { experience_level: "experienced_only" },
        }),
      ];

      const result = assessExperienceRequirements(dogs);
      expect(result?.overallLevel).toBe("experienced_only");
      expect(result?.recommendation).toContain("experienced handlers");
    });

    it("tracks distribution of experience levels", () => {
      const dogs = [
        createMockDog({
          dog_profiler_data: { experience_level: "first_time_ok" },
        }),
        createMockDog({
          dog_profiler_data: { experience_level: "some_experience" },
        }),
        createMockDog({
          dog_profiler_data: { experience_level: "experienced_only" },
        }),
      ];

      const result = assessExperienceRequirements(dogs);
      expect(result?.distribution.first_time_ok).toBe(1);
      expect(result?.distribution.some_experience).toBe(1);
      expect(result?.distribution.experienced_only).toBe(1);
    });
  });

  describe("discoverHiddenGems", () => {
    it("returns null for dogs without profiler data", () => {
      const dogs = [createMockDog()];
      expect(discoverHiddenGems(dogs)).toBeNull();
    });

    it("collects unique quirks from dogs", () => {
      const dogs = [
        createMockDog({
          name: "Buddy",
          dog_profiler_data: { unique_quirk: "loves wearing sweaters" },
        }),
        createMockDog({
          name: "Luna",
          dog_profiler_data: { unique_quirk: "tilts head when listening" },
        }),
      ];

      const result = discoverHiddenGems(dogs);
      expect(result?.uniqueQuirks).toHaveLength(2);
      expect(result?.uniqueQuirks[0]).toEqual({
        dogName: "Buddy",
        quirk: "loves wearing sweaters",
      });
    });

    it("finds shared activities appearing in >50% of dogs", () => {
      const dogs = [
        createMockDog({
          dog_profiler_data: { favorite_activities: ["walking", "playing"] },
        }),
        createMockDog({
          dog_profiler_data: { favorite_activities: ["walking", "swimming"] },
        }),
        createMockDog({
          dog_profiler_data: { favorite_activities: ["walking", "running"] },
        }),
      ];

      const result = discoverHiddenGems(dogs);
      expect(result?.sharedActivities).toContain("walking");
      expect(result?.sharedActivities).not.toContain("swimming");
      expect(result?.sharedActivities).not.toContain("playing");
    });

    it("identifies unexpected commonalities", () => {
      const dogs = [
        createMockDog({ dog_profiler_data: { confidence: "confident" } }),
        createMockDog({ dog_profiler_data: { confidence: "confident" } }),
      ];

      const result = discoverHiddenGems(dogs);
      expect(result?.unexpectedCommonalities).toContain(
        "All your favorites are confident dogs",
      );
    });

    it("limits unique quirks to top 3", () => {
      const dogs = Array.from({ length: 5 }, (_, i) =>
        createMockDog({
          name: `Dog${i}`,
          dog_profiler_data: { unique_quirk: `quirk${i}` },
        }),
      );

      const result = discoverHiddenGems(dogs);
      expect(result?.uniqueQuirks).toHaveLength(3);
    });
  });

  describe("calculateCareComplexity", () => {
    it("returns null for dogs without profiler data", () => {
      const dogs = [createMockDog()];
      expect(calculateCareComplexity(dogs)).toBeNull();
    });

    it("calculates low complexity for easy care dogs", () => {
      const dogs = [
        createMockDog({
          dog_profiler_data: {
            trainability: "easy",
            grooming_needs: "minimal",
            exercise_needs: "minimal",
            medical_needs: "",
            special_needs: "",
          },
        }),
      ];

      const result = calculateCareComplexity(dogs);
      expect(result?.overallScore).toBe("low");
      expect(result?.description).toContain("Low maintenance");
    });

    it("calculates high complexity for demanding dogs", () => {
      const dogs = [
        createMockDog({
          dog_profiler_data: {
            trainability: "challenging",
            grooming_needs: "frequent",
            exercise_needs: "high",
            medical_needs: "Requires medication",
            special_needs: "Needs special care",
          },
        }),
      ];

      const result = calculateCareComplexity(dogs);
      expect(result?.overallScore).toBe("high");
      expect(result?.description).toContain("Higher care needs");
    });

    it("averages complexity factors across multiple dogs", () => {
      const dogs = [
        createMockDog({
          dog_profiler_data: {
            trainability: "easy",
            grooming_needs: "minimal",
            exercise_needs: "minimal",
          },
        }),
        createMockDog({
          dog_profiler_data: {
            trainability: "challenging",
            grooming_needs: "frequent",
            exercise_needs: "high",
          },
        }),
      ];

      const result = calculateCareComplexity(dogs);
      expect(result?.overallScore).toBe("moderate");
      expect(result?.factors.training).toBeCloseTo(2);
      expect(result?.factors.grooming).toBeCloseTo(2);
      expect(result?.factors.exercise).toBeCloseTo(2);
    });
  });

  describe("getEnhancedInsights", () => {
    it("returns all null values for dogs without profiler data", () => {
      const dogs = [createMockDog()];
      const result = getEnhancedInsights(dogs);

      expect(result.personalityPattern).toBeNull();
      expect(result.lifestyleCompatibility).toBeNull();
      expect(result.experienceRequirements).toBeNull();
      expect(result.hiddenGems).toBeNull();
      expect(result.careComplexity).toBeNull();
      expect(result.energyProfile).toBeNull();
      expect(result.compatibilityMatrix).toBeNull();
    });

    it("calculates energy profile for dogs with energy data", () => {
      const dogs = [
        createMockDog({ dog_profiler_data: { energy_level: "low" } }),
        createMockDog({ dog_profiler_data: { energy_level: "medium" } }),
        createMockDog({ dog_profiler_data: { energy_level: "high" } }),
      ];

      const result = getEnhancedInsights(dogs);
      expect(result.energyProfile).not.toBeNull();
      expect(result.energyProfile?.averageLevel).toBe("medium");
      expect(result.energyProfile?.distribution.low).toBe(1);
      expect(result.energyProfile?.distribution.medium).toBe(1);
      expect(result.energyProfile?.distribution.high).toBe(1);
    });

    it("calculates compatibility matrix", () => {
      const dogs = [
        createMockDog({
          dog_profiler_data: {
            good_with_dogs: "yes",
            good_with_cats: "no",
            good_with_children: "maybe",
          },
        }),
        createMockDog({
          dog_profiler_data: {
            good_with_dogs: "yes",
            good_with_cats: "unknown",
            good_with_children: "yes",
          },
        }),
      ];

      const result = getEnhancedInsights(dogs);
      expect(result.compatibilityMatrix).not.toBeNull();
      expect(result.compatibilityMatrix?.withDogs.yes).toBe(2);
      expect(result.compatibilityMatrix?.withCats.no).toBe(1);
      expect(result.compatibilityMatrix?.withCats.unknown).toBe(1);
      expect(result.compatibilityMatrix?.withChildren.maybe).toBe(1);
      expect(result.compatibilityMatrix?.withChildren.yes).toBe(1);
    });

    it("combines all analysis functions", () => {
      const dogs = [
        createMockDog({
          dog_profiler_data: {
            personality_traits: ["gentle", "calm"],
            home_type: "apartment_ok",
            experience_level: "first_time_ok",
            unique_quirk: "loves belly rubs",
            trainability: "easy",
            energy_level: "low",
            good_with_dogs: "yes",
          },
        }),
      ];

      const result = getEnhancedInsights(dogs);
      expect(result.personalityPattern).not.toBeNull();
      expect(result.lifestyleCompatibility).not.toBeNull();
      expect(result.experienceRequirements).not.toBeNull();
      expect(result.hiddenGems).not.toBeNull();
      expect(result.careComplexity).not.toBeNull();
      expect(result.energyProfile).not.toBeNull();
      expect(result.compatibilityMatrix).not.toBeNull();
    });

    it("handles very high energy levels correctly", () => {
      const dogs = [
        createMockDog({ dog_profiler_data: { energy_level: "very_high" } }),
        createMockDog({ dog_profiler_data: { energy_level: "very_high" } }),
      ];

      const result = getEnhancedInsights(dogs);
      expect(result.energyProfile?.averageLevel).toBe("very_high");
      expect(result.energyProfile?.recommendation).toContain(
        "very active lifestyle",
      );
    });
  });
});
