import type { Dog } from "./types";

// Santer Paws gives a birth date as its age ("03/01/2025"); its range is derived from it
const DATE_ONLY = /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/;

/** A dog's age in words, or null when nothing is recorded (left out, #484). */
export function getAgeDisplay(dog: Dog): string | null {
  const text = dog.age_text?.trim();
  if (text && text.toLowerCase() !== "unknown" && !DATE_ONLY.test(text)) return text;
  if (dog.age_months) {
    const years = Math.floor(dog.age_months / 12);
    const months = dog.age_months % 12;
    if (years === 0) return `${months} month${months !== 1 ? "s" : ""}`;
    if (months === 0) return `${years} year${years !== 1 ? "s" : ""}`;
    return `${years} year${years !== 1 ? "s" : ""}, ${months} month${months !== 1 ? "s" : ""}`;
  }
  if (dog.age_min_months != null && dog.age_max_months) {
    // Puppies in months: "Under 6 months" is stored as 0-6. A range that
    // starts under a year stays in months up to two years, not "0-1 years"
    if (dog.age_max_months < 12 || (dog.age_min_months < 12 && dog.age_max_months < 24)) {
      return dog.age_min_months === 0
        ? `Under ${dog.age_max_months} months`
        : `${dog.age_min_months}-${dog.age_max_months} months`;
    }
    if (dog.age_min_months < 12) {
      const upTo = Math.ceil(dog.age_max_months / 12);
      return dog.age_min_months === 0 ? `Under ${upTo} years` : `${dog.age_min_months} months-${upTo} years`;
    }
    const minYears = Math.floor(dog.age_min_months / 12);
    const maxYears = Math.floor(dog.age_max_months / 12);
    if (minYears === maxYears) {
      return `${minYears} year${minYears !== 1 ? "s" : ""}`;
    }
    return `${minYears}-${maxYears} years`;
  }
  return null;
}
