import { getAgeDisplay } from "../compareUtils";
import type { Dog } from "../types";

const dog = (fields: Partial<Dog>): Dog => ({ id: 1, name: "Rex", ...fields }) as Dog;

describe("getAgeDisplay", () => {
  it("prefers the rescue's own words, but never a literal Unknown", () => {
    expect(getAgeDisplay(dog({ age_text: "2 years" }))).toBe("2 years");
    expect(getAgeDisplay(dog({ age_text: "Unknown" }))).toBeNull();
  });

  it("uses the range, not a birth date given as the age", () => {
    expect(getAgeDisplay(dog({ age_text: "03/01/2025", age_min_months: 20, age_max_months: 21 }))).toBe("1 year");
    expect(getAgeDisplay(dog({ age_text: "03/01/2025" }))).toBeNull();
  });

  it("gives puppies their age in months, including a zero minimum", () => {
    expect(getAgeDisplay(dog({ age_min_months: 0, age_max_months: 6 }))).toBe("Under 6 months");
    expect(getAgeDisplay(dog({ age_min_months: 3, age_max_months: 9 }))).toBe("3-9 months");
  });

  it("keeps a range that starts under a year out of '0-1 years' (#550)", () => {
    expect(getAgeDisplay(dog({ age_min_months: 6, age_max_months: 18 }))).toBe("6-18 months");
    expect(getAgeDisplay(dog({ age_min_months: 0, age_max_months: 12 }))).toBe("Under 12 months");
    expect(getAgeDisplay(dog({ age_min_months: 0, age_max_months: 36 }))).toBe("Under 3 years");
    expect(getAgeDisplay(dog({ age_min_months: 8, age_max_months: 30 }))).toBe("8 months-3 years");
  });

  it("gives older dogs a range in years", () => {
    expect(getAgeDisplay(dog({ age_min_months: 24, age_max_months: 36 }))).toBe("2-3 years");
  });

  it("returns null when nothing is recorded", () => {
    expect(getAgeDisplay(dog({}))).toBeNull();
  });
});
