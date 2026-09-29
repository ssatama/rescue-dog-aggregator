import { formatAgeRange } from "../dogHelpers";
import type { Dog } from "@/types/dog";

const dog = (fields: Partial<Dog>): Partial<Dog> => ({ id: 1, name: "Rex", ...fields });

describe("formatAgeRange", () => {
  it("reads the refreshed months, not the text as first read (#635)", () => {
    // Listed at "3 months" a year ago; the months have kept up since #561
    expect(formatAgeRange(dog({ age_text: "3 months", age_min_months: 15, age_max_months: 16 }))).toBe("1 year");
    expect(formatAgeRange(dog({ age_text: "2 years", age_min_months: 36, age_max_months: 48 }))).toBe("3-4 years");
  });

  it("leaves the age out when only text is recorded", () => {
    expect(formatAgeRange(dog({ age_text: "2 years" }))).toBeNull();
    expect(formatAgeRange(dog({ age_text: "03/01/2025" }))).toBeNull();
  });

  it("gives puppies their age in months, including a zero minimum", () => {
    expect(formatAgeRange(dog({ age_min_months: 0, age_max_months: 6 }))).toBe("Under 6 months");
    expect(formatAgeRange(dog({ age_min_months: 3, age_max_months: 9 }))).toBe("3-9 months");
  });

  it("keeps a range that starts under a year out of '0-1 years' (#550)", () => {
    expect(formatAgeRange(dog({ age_min_months: 6, age_max_months: 18 }))).toBe("6-18 months");
    expect(formatAgeRange(dog({ age_min_months: 0, age_max_months: 12 }))).toBe("Under 12 months");
    expect(formatAgeRange(dog({ age_min_months: 0, age_max_months: 36 }))).toBe("Under 3 years");
    expect(formatAgeRange(dog({ age_min_months: 8, age_max_months: 30 }))).toBe("8 months-3 years");
  });

  it("gives older dogs a range in years", () => {
    expect(formatAgeRange(dog({ age_min_months: 24, age_max_months: 36 }))).toBe("2-3 years");
    expect(formatAgeRange(dog({ age_min_months: 20, age_max_months: 21 }))).toBe("1 year");
  });

  it("returns null when nothing is recorded", () => {
    expect(formatAgeRange(dog({}))).toBeNull();
    expect(formatAgeRange(null)).toBeNull();
  });
});
