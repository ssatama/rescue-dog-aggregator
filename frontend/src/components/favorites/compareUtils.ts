import type { Dog } from "./types";

export function getAgeDisplay(dog: Dog): string {
  if (dog.age_text) return dog.age_text;
  if (dog.age_months) {
    const years = Math.floor(dog.age_months / 12);
    const months = dog.age_months % 12;
    if (years === 0) return `${months} month${months !== 1 ? "s" : ""}`;
    if (months === 0) return `${years} year${years !== 1 ? "s" : ""}`;
    return `${years} year${years !== 1 ? "s" : ""}, ${months} month${months !== 1 ? "s" : ""}`;
  }
  if (dog.age_min_months && dog.age_max_months) {
    const minYears = Math.floor(dog.age_min_months / 12);
    const maxYears = Math.floor(dog.age_max_months / 12);
    if (minYears === maxYears) {
      return `${minYears} year${minYears !== 1 ? "s" : ""}`;
    }
    return `${minYears}-${maxYears} years`;
  }
  return "Unknown";
}
