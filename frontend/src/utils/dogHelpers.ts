import type { Dog } from "@/types/dog";

type DogInput = Partial<Dog>;

export const getAgeCategory = (dog: DogInput | null | undefined): string => {
  // 0 is a real age: "Under 6 months" is recorded as 0-6
  if (typeof dog?.age_min_months === "number" && dog.age_min_months >= 0) {
    const months = dog.age_min_months;

    if (months < 12) {
      return "Puppy";
    } else if (months < 36) {
      return "Young";
    } else if (months < 96) {
      return "Adult";
    } else {
      return "Senior";
    }
  }

  if (dog?.age_text) {
    const ageText = dog.age_text.toLowerCase();

    if (ageText === "puppy") return "Puppy";
    if (ageText === "young") return "Young";
    if (ageText === "adult") return "Adult";
    if (ageText === "senior") return "Senior";

    const rangeMatch = ageText.match(/(\d+)\s*-\s*(\d+)\s*(year|month)s?/i);
    if (rangeMatch) {
      const [, min, max, unit] = rangeMatch;
      const avgAge = Math.round((parseInt(min) + parseInt(max)) / 2);
      const avgMonths = unit.toLowerCase().includes("year")
        ? avgAge * 12
        : avgAge;

      if (avgMonths < 12) {
        return "Puppy";
      } else if (avgMonths < 36) {
        return "Young";
      } else if (avgMonths < 96) {
        return "Adult";
      } else {
        return "Senior";
      }
    }
  }

  return "Unknown";
};

// MAX_DOG_AGE_MONTHS: an open-ended age ("8+ years") is stored up to this
const AGE_CAP_MONTHS = 360;

const count = (n: number, unit: string): string => `${n} ${unit}${n !== 1 ? "s" : ""}`;

/**
 * A dog's current age in words, from the months refreshed after every run
 * (#561), or null when none are recorded. Never the rescue's age_text: most
 * rescues are read once, so it stays the age as first read (#635). The age is
 * the range's lower bound, as the cards' category is: "2 years" is stored as
 * 24-36 months and reads "2 years", a year later "3 years".
 */
export const formatCurrentAge = (
  dog: { age_min_months?: number | null; age_max_months?: number | null } | null | undefined,
): string | null => {
  const min = dog?.age_min_months;
  const max = dog?.age_max_months;
  if (typeof min !== "number" || !max) return null;
  if (min === 0) {
    // "Under 6 months" is stored as 0-6; 0 up to the cap says nothing
    if (max >= AGE_CAP_MONTHS) return null;
    return max < 24 ? `Under ${count(max, "month")}` : `Under ${count(Math.ceil(max / 12), "year")}`;
  }
  if (min < 12) return count(min, "month");
  const years = Math.floor(min / 12);
  return max >= AGE_CAP_MONTHS ? `${years}+ years` : count(years, "year");
};

export const formatBreed = (dog: DogInput | null | undefined): string | null => {
  // standardized_breed is the display label and carries the cross, e.g.
  // "Border Collie Cross" or "Bichon Frise x Maltese". primary_breed is the
  // canonical identity behind breed pages and filters and omits the cross, so
  // preferring it here would hide that the dog is a cross.
  const rawBreed = dog?.standardized_breed || dog?.breed || dog?.primary_breed;
  if (
    !rawBreed ||
    rawBreed === "Unknown" ||
    rawBreed.toLowerCase() === "unknown"
  ) {
    return null;
  }
  return rawBreed;
};

// Sizes on the catalog's one scale (#494): its Small includes Tiny, and
// Giant is the API's XLarge.
const SIZE_SCALE: Record<string, string> = {
  tiny: "Small",
  toy: "Small",
  mini: "Small",
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "Giant",
  xl: "Giant",
  "x-large": "Giant",
  "extra large": "Giant",
  "extra-large": "Giant",
  giant: "Giant",
};

/**
 * The size filters match: Small, Medium, Large or Giant, including a size
 * estimated from the breed, or null when the size is unknown.
 */
export const sizeCategory = (dog: DogInput | null | undefined): string | null => {
  const onScale = (raw: string | undefined) => (raw ? SIZE_SCALE[raw.trim().toLowerCase()] : undefined);
  return onScale(dog?.standardized_size) ?? onScale(dog?.size) ?? null;
};

/**
 * The size shown as a fact about the dog. A size estimated from the breed is
 * left out (#568): it isn't the rescue's, though it still counts for filters.
 */
export const formatSize = (dog: DogInput | null | undefined): string | null =>
  dog?.properties?.size_source === "breed" ? null : sizeCategory(dog);
