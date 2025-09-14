/**
 * Tests for dogHelpers utility functions
 */

import {
  formatAge,
  getAgeCategory,
  formatBreed,
  formatGender,
  isRecentDog,
  getOrganizationName,
  getShipsToCountries,
  formatSize,
} from "../dogHelpers";

describe("dogHelpers", () => {
  describe("formatAge", () => {
    it("formats age in months for dogs under 1 year", () => {
      expect(formatAge({ age_min_months: 6 })).toBe("6 months");
      expect(formatAge({ age_min_months: 1 })).toBe("1 month");
    });

    it("formats age in years for dogs 1 year and older", () => {
      expect(formatAge({ age_min_months: 12 })).toBe("1 year");
      expect(formatAge({ age_min_months: 24 })).toBe("2 years");
    });

    it("formats age with years and months when applicable", () => {
      expect(formatAge({ age_min_months: 13 })).toBe("1 year, 1 month");
      expect(formatAge({ age_min_months: 26 })).toBe("2 years, 2 months");
    });

    it("falls back to age_text when age_min_months not available", () => {
      expect(formatAge({ age_text: "3 years old" })).toBe("3 years old");
    });

    it('returns "Age unknown" when no age information available', () => {
      expect(formatAge({})).toBe("Age unknown");
      expect(formatAge(null)).toBe("Age unknown");
      expect(formatAge(undefined)).toBe("Age unknown");
    });
  });

  describe("getAgeCategory", () => {
    it("categorizes puppies (under 1 year)", () => {
      expect(getAgeCategory({ age_min_months: 6 })).toBe("Puppy");
      expect(getAgeCategory({ age_min_months: 11 })).toBe("Puppy");
    });

    it("categorizes young dogs (1-3 years)", () => {
      expect(getAgeCategory({ age_min_months: 12 })).toBe("Young");
      expect(getAgeCategory({ age_min_months: 24 })).toBe("Young");
      expect(getAgeCategory({ age_min_months: 35 })).toBe("Young");
    });

    it("categorizes adult dogs (3-8 years)", () => {
      expect(getAgeCategory({ age_min_months: 36 })).toBe("Adult");
      expect(getAgeCategory({ age_min_months: 60 })).toBe("Adult");
      expect(getAgeCategory({ age_min_months: 84 })).toBe("Adult"); // 7 years is still Adult
      expect(getAgeCategory({ age_min_months: 95 })).toBe("Adult"); // Just under 8 years
    });

    it("categorizes senior dogs (8+ years)", () => {
      expect(getAgeCategory({ age_min_months: 96 })).toBe("Senior"); // 8 years = Senior
      expect(getAgeCategory({ age_min_months: 120 })).toBe("Senior");
    });

    it("returns Unknown when no age information available", () => {
      expect(getAgeCategory({})).toBe("Unknown");
      expect(getAgeCategory(null)).toBe("Unknown");
      expect(getAgeCategory(undefined)).toBe("Unknown");
    });

    it("should handle dogs with standardized age_text but no age_min_months", () => {
      // This is the FAILING test case - Cody has age_text="Young" but age_min_months=null
      // Currently returns 'Unknown' but should return 'Young'
      expect(getAgeCategory({ age_text: "Young" })).toBe("Young");
      expect(getAgeCategory({ age_text: "Adult" })).toBe("Adult");
      expect(getAgeCategory({ age_text: "Senior" })).toBe("Senior");
      expect(getAgeCategory({ age_text: "Puppy" })).toBe("Puppy");
    });

    it("prefers age_min_months over age_text when both available", () => {
      const dog = { age_min_months: 6, age_text: "Adult" };
      expect(getAgeCategory(dog)).toBe("Puppy"); // Should use age_min_months
    });
  });

  describe("formatBreed", () => {
    it("prefers primary_breed over all other breed fields", () => {
      const dog = {
        breed: "Mixed Breed",
        standardized_breed: "Mixed Breed",
        primary_breed: "German Shepherd Mix",
      };
      expect(formatBreed(dog)).toBe("German Shepherd Mix");
    });

    it("falls back to standardized_breed when primary_breed not available", () => {
      const dog = {
        breed: "Golden Retriever Mix",
        standardized_breed: "Golden Retriever",
      };
      expect(formatBreed(dog)).toBe("Golden Retriever");
    });

    it("falls back to breed when primary_breed and standardized_breed not available", () => {
      expect(formatBreed({ breed: "Labrador Mix" })).toBe("Labrador Mix");
    });

    it("returns null for unknown breeds", () => {
      expect(formatBreed({ primary_breed: "Unknown" })).toBe(null);
      expect(formatBreed({ primary_breed: "unknown" })).toBe(null);
      expect(formatBreed({ breed: "Unknown" })).toBe(null);
      expect(formatBreed({ breed: "unknown" })).toBe(null);
      expect(formatBreed({ standardized_breed: "Unknown" })).toBe(null);
    });

    it("returns null when no breed information available", () => {
      expect(formatBreed({})).toBe(null);
      expect(formatBreed(null)).toBe(null);
      expect(formatBreed(undefined)).toBe(null);
    });
  });

  describe("formatGender", () => {
    it("formats male gender with icon", () => {
      expect(formatGender({ sex: "Male" })).toEqual({
        text: "Male",
        icon: "♂️",
      });
      expect(formatGender({ sex: "male" })).toEqual({
        text: "Male",
        icon: "♂️",
      });
      expect(formatGender({ sex: "M" })).toEqual({ text: "Male", icon: "♂️" });
      expect(formatGender({ sex: "m" })).toEqual({ text: "Male", icon: "♂️" });
    });

    it("formats female gender with icon", () => {
      expect(formatGender({ sex: "Female" })).toEqual({
        text: "Female",
        icon: "♀️",
      });
      expect(formatGender({ sex: "female" })).toEqual({
        text: "Female",
        icon: "♀️",
      });
      expect(formatGender({ sex: "F" })).toEqual({
        text: "Female",
        icon: "♀️",
      });
      expect(formatGender({ sex: "f" })).toEqual({
        text: "Female",
        icon: "♀️",
      });
    });

    it("handles unknown gender", () => {
      expect(formatGender({ sex: "Unknown" })).toEqual({
        text: "Unknown",
        icon: "❓",
      });
      expect(formatGender({})).toEqual({ text: "Unknown", icon: "❓" });
      expect(formatGender(null)).toEqual({ text: "Unknown", icon: "❓" });
    });
  });

  describe("isRecentDog", () => {
    it("returns true for dogs created within last 7 days", () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3); // 3 days ago

      expect(isRecentDog({ created_at: recentDate.toISOString() })).toBe(true);
    });

    it("returns false for dogs created more than 7 days ago", () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

      expect(isRecentDog({ created_at: oldDate.toISOString() })).toBe(false);
    });

    it("returns false when no created_at date available", () => {
      expect(isRecentDog({})).toBe(false);
      expect(isRecentDog(null)).toBe(false);
      expect(isRecentDog(undefined)).toBe(false);
    });

    it("handles invalid dates gracefully", () => {
      expect(isRecentDog({ created_at: "invalid-date" })).toBe(false);
    });
  });

  describe("getOrganizationName", () => {
    it("returns organization name when available", () => {
      const dog = {
        organization: { name: "Pets in Turkey" },
      };
      expect(getOrganizationName(dog)).toBe("Pets in Turkey");
    });

    it("returns fallback when organization not available", () => {
      expect(getOrganizationName({})).toBe("Unknown Organization");
      expect(getOrganizationName(null)).toBe("Unknown Organization");
      expect(getOrganizationName({ organization: {} })).toBe(
        "Unknown Organization",
      );
    });
  });

  describe("getShipsToCountries", () => {
    it("returns ships_to array when available", () => {
      const dog = {
        organization: { ships_to: ["DE", "NL", "BE"] },
      };
      expect(getShipsToCountries(dog)).toEqual(["DE", "NL", "BE"]);
    });

    it("returns empty array when ships_to not available", () => {
      expect(getShipsToCountries({})).toEqual([]);
      expect(getShipsToCountries(null)).toEqual([]);
      expect(getShipsToCountries({ organization: {} })).toEqual([]);
    });
  });

  describe("formatSize", () => {
    it("prefers standardized_size over size", () => {
      const dog = {
        size: "Large",
        standardized_size: "Medium",
      };
      expect(formatSize(dog)).toBe("Medium");
    });

    it("falls back to size when standardized_size not available", () => {
      expect(formatSize({ size: "Small" })).toBe("Small");
    });

    it("returns null for unknown sizes", () => {
      expect(formatSize({ size: "Unknown" })).toBe(null);
      expect(formatSize({ size: "unknown" })).toBe(null);
      expect(formatSize({ standardized_size: "Unknown" })).toBe(null);
    });

    it("returns null when no size information available", () => {
      expect(formatSize({})).toBe(null);
      expect(formatSize(null)).toBe(null);
      expect(formatSize(undefined)).toBe(null);
    });
  });
});
