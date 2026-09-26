/**
 * Tests for dogHelpers utility functions
 */

import { getAgeCategory, formatBreed, formatSize } from "../dogHelpers";

describe("dogHelpers", () => {
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
    it("shows the display label rather than the grouping key", () => {
      // primary_breed is the canonical identity used for breed pages and
      // filters; it deliberately omits the cross, so showing it would hide
      // that this dog is a cross.
      const dog = {
        breed: "Border Collie Cross",
        standardized_breed: "Border Collie Cross",
        primary_breed: "Border Collie",
      };
      expect(formatBreed(dog)).toBe("Border Collie Cross");
    });

    it("shows both parents of a two-breed cross", () => {
      const dog = {
        breed: "Bichon Frise x Maltese",
        standardized_breed: "Bichon Frise x Maltese",
        primary_breed: "Bichon Frise",
        secondary_breed: "Maltese",
      };
      expect(formatBreed(dog)).toBe("Bichon Frise x Maltese");
    });

    it("shows a designer breed by its own name", () => {
      const dog = {
        breed: "Cockapoo",
        standardized_breed: "Cockapoo",
        primary_breed: "Cockapoo",
      };
      expect(formatBreed(dog)).toBe("Cockapoo");
    });

    it("falls back to primary_breed when no display label is present", () => {
      expect(formatBreed({ primary_breed: "Golden Retriever" })).toBe(
        "Golden Retriever",
      );
    });

    it("falls back to breed when standardized_breed is absent", () => {
      const dog = { breed: "Golden Retriever Mix", primary_breed: "Golden Retriever" };
      expect(formatBreed(dog)).toBe("Golden Retriever Mix");
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

  describe("formatSize", () => {
    it("puts sizes on the catalog's scale", () => {
      expect(formatSize({ standardized_size: "Tiny" })).toBe("Small");
      expect(formatSize({ standardized_size: "Medium" })).toBe("Medium");
      expect(formatSize({ standardized_size: "XLarge" })).toBe("Giant");
      expect(formatSize({ size: "large" })).toBe("Large");
      expect(formatSize({ size: "X-Large" })).toBe("Giant");
      expect(formatSize({ size: "Toy" })).toBe("Small");
    });

    it("returns null for unknown or off-scale sizes", () => {
      expect(formatSize({ standardized_size: "Unknown" })).toBe(null);
      expect(formatSize({})).toBe(null);
      expect(formatSize(null)).toBe(null);
    });
  });
});
