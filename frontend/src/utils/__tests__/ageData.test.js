import {
  AGE_CATEGORIES,
  getAgeCategoryBySlug,
  getAllAgeSlugs,
  getAgeCategoriesArray,
  getOtherAgeCategory,
} from "../ageData";

describe("ageData", () => {
  describe("AGE_CATEGORIES constant", () => {
    it("contains puppies and senior categories", () => {
      expect(AGE_CATEGORIES).toHaveProperty("puppies");
      expect(AGE_CATEGORIES).toHaveProperty("senior");
    });

    it("puppies category has correct properties", () => {
      const puppies = AGE_CATEGORIES.puppies;
      expect(puppies.slug).toBe("puppies");
      expect(puppies.name).toBe("Puppies");
      expect(puppies.apiValue).toBe("Puppy");
      expect(puppies.ageRange).toBe("Under 1 year");
      expect(puppies.gradient).toContain("pink");
    });

    it("senior category has correct properties", () => {
      const senior = AGE_CATEGORIES.senior;
      expect(senior.slug).toBe("senior");
      expect(senior.name).toBe("Senior Dogs");
      expect(senior.apiValue).toBe("Senior");
      expect(senior.ageRange).toBe("8+ years");
      expect(senior.gradient).toContain("amber");
    });

    it("each category has required fields", () => {
      Object.values(AGE_CATEGORIES).forEach((category) => {
        expect(category).toHaveProperty("slug");
        expect(category).toHaveProperty("name");
        expect(category).toHaveProperty("shortName");
        expect(category).toHaveProperty("apiValue");
        expect(category).toHaveProperty("gradient");
        expect(category).toHaveProperty("tagline");
        expect(category).toHaveProperty("description");
        expect(category).toHaveProperty("ageRange");
        expect(category).toHaveProperty("seoKeywords");
      });
    });
  });

  describe("getAgeCategoryBySlug", () => {
    it("returns puppies category for puppies slug", () => {
      const result = getAgeCategoryBySlug("puppies");
      expect(result).toBe(AGE_CATEGORIES.puppies);
    });

    it("returns senior category for senior slug", () => {
      const result = getAgeCategoryBySlug("senior");
      expect(result).toBe(AGE_CATEGORIES.senior);
    });

    it("handles uppercase slugs", () => {
      expect(getAgeCategoryBySlug("PUPPIES")).toBe(AGE_CATEGORIES.puppies);
      expect(getAgeCategoryBySlug("SENIOR")).toBe(AGE_CATEGORIES.senior);
    });

    it("handles mixed case slugs", () => {
      expect(getAgeCategoryBySlug("Puppies")).toBe(AGE_CATEGORIES.puppies);
      expect(getAgeCategoryBySlug("Senior")).toBe(AGE_CATEGORIES.senior);
    });

    it("returns null for invalid slug", () => {
      expect(getAgeCategoryBySlug("invalid")).toBeNull();
      expect(getAgeCategoryBySlug("adult")).toBeNull();
      expect(getAgeCategoryBySlug("young")).toBeNull();
    });

    it("returns null for null or undefined", () => {
      expect(getAgeCategoryBySlug(null)).toBeNull();
      expect(getAgeCategoryBySlug(undefined)).toBeNull();
    });
  });

  describe("getAllAgeSlugs", () => {
    it("returns array of all slugs", () => {
      const slugs = getAllAgeSlugs();
      expect(slugs).toEqual(["puppies", "senior"]);
    });

    it("returns correct number of slugs", () => {
      expect(getAllAgeSlugs()).toHaveLength(2);
    });
  });

  describe("getAgeCategoriesArray", () => {
    it("returns array of all category objects", () => {
      const categories = getAgeCategoriesArray();
      expect(categories).toHaveLength(2);
      expect(categories).toContain(AGE_CATEGORIES.puppies);
      expect(categories).toContain(AGE_CATEGORIES.senior);
    });
  });

  describe("getOtherAgeCategory", () => {
    it("returns senior when current is puppies", () => {
      const other = getOtherAgeCategory("puppies");
      expect(other).toBe(AGE_CATEGORIES.senior);
    });

    it("returns puppies when current is senior", () => {
      const other = getOtherAgeCategory("senior");
      expect(other).toBe(AGE_CATEGORIES.puppies);
    });

    it("handles uppercase slugs", () => {
      expect(getOtherAgeCategory("PUPPIES")).toBe(AGE_CATEGORIES.senior);
    });

    it("returns null for invalid slug", () => {
      expect(getOtherAgeCategory("invalid")).toBeNull();
    });
  });
});
