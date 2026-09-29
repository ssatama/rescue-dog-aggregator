import { formatCurrentAge } from "../dogHelpers";
import type { Dog } from "@/types/dog";

const dog = (fields: Partial<Dog>): Partial<Dog> => ({ id: 1, name: "Rex", ...fields });

describe("formatCurrentAge", () => {
  it("reads the refreshed months, not the text as first read (#635)", () => {
    // Listed at "3 months" a year ago; the months have kept up since #561
    expect(formatCurrentAge(dog({ age_text: "3 months", age_min_months: 15, age_max_months: 27 }))).toBe("1 year");
  });

  it("is the age the rescue gave, not the top of the parser's range", () => {
    // "2 years" is stored as 24-36: the dog is 2, not "2-3 years"
    expect(formatCurrentAge(dog({ age_min_months: 24, age_max_months: 36 }))).toBe("2 years");
    expect(formatCurrentAge(dog({ age_min_months: 60, age_max_months: 72 }))).toBe("5 years");
  });

  it("gives an exact date of birth one age, not '6-6 months'", () => {
    expect(formatCurrentAge(dog({ age_min_months: 6, age_max_months: 6 }))).toBe("6 months");
    expect(formatCurrentAge(dog({ age_min_months: 1, age_max_months: 1 }))).toBe("1 month");
  });

  it("gives '8+' dogs a floor, not the 360-month cap as an age", () => {
    expect(formatCurrentAge(dog({ age_min_months: 96, age_max_months: 360 }))).toBe("8+ years");
  });

  it("gives puppies their age in months, and 'Under' a range that starts at 0", () => {
    expect(formatCurrentAge(dog({ age_min_months: 0, age_max_months: 6 }))).toBe("Under 6 months");
    expect(formatCurrentAge(dog({ age_min_months: 3, age_max_months: 9 }))).toBe("3 months");
    expect(formatCurrentAge(dog({ age_min_months: 0, age_max_months: 36 }))).toBe("Under 3 years");
  });

  it("leaves the age out when only text is recorded, or nothing is", () => {
    expect(formatCurrentAge(dog({ age_text: "2 years" }))).toBeNull();
    expect(formatCurrentAge(dog({}))).toBeNull();
    expect(formatCurrentAge(null)).toBeNull();
    expect(formatCurrentAge(dog({ age_min_months: 0, age_max_months: 360 }))).toBeNull();
  });
});
