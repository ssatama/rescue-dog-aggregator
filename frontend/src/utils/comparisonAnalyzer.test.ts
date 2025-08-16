import { analyzeComparison, ComparisonResult } from "./comparisonAnalyzer";

describe("comparisonAnalyzer", () => {
  const mockDogs = [
    {
      id: 1,
      name: "Morris",
      age_months: 0,
      age_text: "0 months",
      sex: "Male",
      standardized_size: "Medium",
      standardized_breed: "Mixed Breed",
      location: "Italy",
      organization_name: "Furry Rescue Italy",
      properties: {
        good_with_dogs: true,
        good_with_cats: true,
        good_with_children: true,
      },
    },
    {
      id: 2,
      name: "Cristy",
      age_months: 0,
      age_text: "0 months",
      sex: "Female",
      standardized_size: "Medium",
      standardized_breed: "Mixed Breed",
      location: "Italy",
      organization_name: "Furry Rescue Italy",
      properties: {
        good_with_dogs: true,
        good_with_cats: true,
        good_with_children: true,
      },
    },
    {
      id: 3,
      name: "Trilly",
      age_months: 48,
      age_text: "4 years",
      sex: "Female",
      standardized_size: "Medium",
      standardized_breed: "Hound Dog",
      location: "Italy",
      organization_name: "Furry Rescue Italy",
      properties: {
        good_with_dogs: true,
        good_with_cats: true,
        good_with_children: true,
      },
    },
  ];

  describe("analyzeComparison", () => {
    it("should identify matching values as similar", () => {
      const result = analyzeComparison(mockDogs);

      expect(result.size.allSame).toBe(true);
      expect(result.size.values).toEqual(["Medium", "Medium", "Medium"]);
      expect(result.size.highlight).toEqual([false, false, false]);
    });

    it("should identify differing values and highlight them", () => {
      const result = analyzeComparison(mockDogs);

      expect(result.sex.allSame).toBe(false);
      expect(result.sex.values).toEqual(["Male", "Female", "Female"]);
      expect(result.sex.highlight).toEqual([true, false, false]); // Male is different
    });

    it("should highlight youngest dogs for age comparison", () => {
      const result = analyzeComparison(mockDogs);

      expect(result.age.allSame).toBe(false);
      expect(result.age.values).toEqual(["0 months", "0 months", "4 years"]);
      expect(result.age.highlight).toEqual([true, true, false]); // Both 0 months are youngest
    });

    it("should highlight different breeds", () => {
      const result = analyzeComparison(mockDogs);

      expect(result.breed.allSame).toBe(false);
      expect(result.breed.values).toEqual([
        "Mixed Breed",
        "Mixed Breed",
        "Hound Dog",
      ]);
      expect(result.breed.highlight).toEqual([false, false, true]); // Hound Dog is different
    });

    it("should handle missing data gracefully", () => {
      const dogsWithMissing = [
        { ...mockDogs[0], standardized_size: undefined },
        mockDogs[1],
        mockDogs[2],
      ];

      const result = analyzeComparison(dogsWithMissing);

      expect(result.size.values).toEqual([undefined, "Medium", "Medium"]);
      expect(result.size.allSame).toBe(false);
    });

    it("should analyze good_with properties correctly", () => {
      const result = analyzeComparison(mockDogs);

      expect(result.good_with_dogs.allSame).toBe(true);
      expect(result.good_with_dogs.values).toEqual([true, true, true]);
      expect(result.good_with_dogs.highlight).toEqual([false, false, false]);
    });

    it("should handle dogs with different good_with values", () => {
      const dogsWithDifferentCompatibility = [
        {
          ...mockDogs[0],
          properties: { ...mockDogs[0].properties, good_with_cats: false },
        },
        mockDogs[1],
        mockDogs[2],
      ];

      const result = analyzeComparison(dogsWithDifferentCompatibility);

      expect(result.good_with_cats.allSame).toBe(false);
      expect(result.good_with_cats.values).toEqual([false, true, true]);
      expect(result.good_with_cats.highlight).toEqual([true, false, false]);
    });

    it("should return empty result for empty array", () => {
      const result = analyzeComparison([]);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it("should handle single dog", () => {
      const result = analyzeComparison([mockDogs[0]]);

      expect(result.age.allSame).toBe(true);
      expect(result.age.highlight).toEqual([false]);
    });

    it("should identify all same organizations", () => {
      const result = analyzeComparison(mockDogs);

      expect(result.organization.allSame).toBe(true);
      expect(result.organization.values).toEqual([
        "Furry Rescue Italy",
        "Furry Rescue Italy",
        "Furry Rescue Italy",
      ]);
      expect(result.organization.highlight).toEqual([false, false, false]);
    });
  });
});
