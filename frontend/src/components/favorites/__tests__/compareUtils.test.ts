import { getAgeDisplay } from "../compareUtils";
import type { Dog } from "../types";

const dog = (fields: Partial<Dog>): Dog => ({ id: 1, name: "Rex", ...fields }) as Dog;

describe("getAgeDisplay", () => {
  it("prefers the rescue's own words, but never a literal Unknown", () => {
    expect(getAgeDisplay(dog({ age_text: "2 years" }))).toBe("2 years");
    expect(getAgeDisplay(dog({ age_text: "Unknown" }))).toBeNull();
  });

  it("gives puppies their age in months, including a zero minimum", () => {
    expect(getAgeDisplay(dog({ age_min_months: 0, age_max_months: 6 }))).toBe("Under 6 months");
    expect(getAgeDisplay(dog({ age_min_months: 3, age_max_months: 9 }))).toBe("3-9 months");
  });

  it("gives older dogs a range in years", () => {
    expect(getAgeDisplay(dog({ age_min_months: 24, age_max_months: 36 }))).toBe("2-3 years");
  });

  it("returns null when nothing is recorded", () => {
    expect(getAgeDisplay(dog({}))).toBeNull();
  });
});
