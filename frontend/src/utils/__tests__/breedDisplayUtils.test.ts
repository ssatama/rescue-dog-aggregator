import { capitalizeFirst, BREED_PASTEL_COLORS } from "../breedDisplayUtils";

describe("capitalizeFirst", () => {
  it("capitalizes the first letter of a lowercase string", () => {
    expect(capitalizeFirst("hello")).toBe("Hello");
  });

  it("preserves casing of remaining characters", () => {
    expect(capitalizeFirst("hELLO")).toBe("HELLO");
  });

  it("handles single character strings", () => {
    expect(capitalizeFirst("a")).toBe("A");
  });

  it("returns empty string for empty input", () => {
    expect(capitalizeFirst("")).toBe("");
  });

  it("handles already capitalized strings", () => {
    expect(capitalizeFirst("Playful")).toBe("Playful");
  });

  it("handles all-uppercase strings without lowering the rest", () => {
    expect(capitalizeFirst("RESERVED")).toBe("RESERVED");
  });
});

describe("BREED_PASTEL_COLORS", () => {
  it("has exactly 5 color entries", () => {
    expect(BREED_PASTEL_COLORS).toHaveLength(5);
  });

  it("each entry has bg and text properties", () => {
    for (const color of BREED_PASTEL_COLORS) {
      expect(color).toHaveProperty("bg");
      expect(color).toHaveProperty("text");
      expect(typeof color.bg).toBe("string");
      expect(typeof color.text).toBe("string");
    }
  });

  it("includes dark mode variants in class names", () => {
    for (const color of BREED_PASTEL_COLORS) {
      expect(color.bg).toContain("dark:");
      expect(color.text).toContain("dark:");
    }
  });
});
