import type { Dog } from "@/types/dog";

type DogInput = Partial<Dog>;

export const getAgeCategory = (dog: DogInput | null | undefined): string => {
  if (dog?.age_min_months && dog.age_min_months > 0) {
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
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "Giant",
  "extra large": "Giant",
  giant: "Giant",
};

/** Small, Medium, Large or Giant, or null when the size is unknown. */
export const formatSize = (dog: DogInput | null | undefined): string | null => {
  const raw = dog?.standardized_size || dog?.size;
  return raw ? (SIZE_SCALE[raw.toLowerCase()] ?? null) : null;
};
