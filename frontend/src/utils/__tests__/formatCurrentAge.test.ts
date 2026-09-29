import { formatCurrentAge } from "../dogHelpers";
import type { Dog } from "@/types/dog";

const dog = (fields: Partial<Dog>): Partial<Dog> => ({ id: 1, name: "Rex", ...fields });

// How the parser stores an age (#561): a stated age N is N to N+12 months, an
// exact date of birth a single month, a stated range its ends, "Under N" 0 to N,
// and an open-ended "8+" runs to the 360-month cap. The refresh moves both ends.
describe("formatCurrentAge", () => {
  it("reads the refreshed months, not the text as first read (#635)", () => {
    expect(formatCurrentAge(dog({ age_text: "3 months", age_min_months: 15, age_max_months: 27 }))).toBe("1 year");
  });

  it("gives a stated age as said, not the top of its year", () => {
    expect(formatCurrentAge(dog({ age_min_months: 24, age_max_months: 36 }))).toBe("2 years");
    expect(formatCurrentAge(dog({ age_min_months: 60, age_max_months: 72 }))).toBe("5 years");
  });

  it("gives an exact date of birth one age, not '6-6 months'", () => {
    expect(formatCurrentAge(dog({ age_min_months: 6, age_max_months: 6 }))).toBe("6 months");
    expect(formatCurrentAge(dog({ age_min_months: 1, age_max_months: 1 }))).toBe("1 month");
    expect(formatCurrentAge(dog({ age_min_months: 30, age_max_months: 30 }))).toBe("2 years");
  });

  it("keeps a stated range a range, not its lower end (round 2)", () => {
    expect(formatCurrentAge(dog({ age_min_months: 24, age_max_months: 60 }))).toBe("2-5 years");
    expect(formatCurrentAge(dog({ age_min_months: 36, age_max_months: 96 }))).toBe("3-8 years");
    expect(formatCurrentAge(dog({ age_min_months: 1, age_max_months: 7 }))).toBe("1-7 months"); // "Under 6 months", a month on
  });

  it("gives '8+' dogs a floor, not the 360-month cap as an age", () => {
    expect(formatCurrentAge(dog({ age_min_months: 96, age_max_months: 360 }))).toBe("8+ years");
  });

  it("gives 'Under' a range that starts at 0", () => {
    expect(formatCurrentAge(dog({ age_min_months: 0, age_max_months: 6 }))).toBe("Under 6 months");
    expect(formatCurrentAge(dog({ age_min_months: 0, age_max_months: 36 }))).toBe("Under 3 years");
    expect(formatCurrentAge(dog({ age_min_months: 0, age_max_months: 0 }))).toBe("Under 1 month");
  });

  it("leaves the age out when only text is recorded, or nothing is", () => {
    expect(formatCurrentAge(dog({ age_text: "2 years" }))).toBeNull();
    expect(formatCurrentAge(dog({}))).toBeNull();
    expect(formatCurrentAge(null)).toBeNull();
    expect(formatCurrentAge(dog({ age_min_months: 0, age_max_months: 360 }))).toBeNull();
  });
});
