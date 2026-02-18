import type { Dog } from "@/types/dog";

type DogInput = Partial<Dog>;

export const formatAge = (dog: DogInput | null | undefined): string => {
  if (
    dog?.age_min_months &&
    dog?.age_max_months &&
    dog.age_min_months !== dog.age_max_months
  ) {
    const minYears = Math.floor(dog.age_min_months / 12);
    const maxYears = Math.floor(dog.age_max_months / 12);

    if (minYears === maxYears) {
      return `~${minYears} year${minYears === 1 ? "" : "s"} (est.)`;
    } else {
      const avgMonths = Math.round(
        (dog.age_min_months + dog.age_max_months) / 2,
      );
      const avgYears = Math.floor(avgMonths / 12);
      return `~${avgYears} year${avgYears === 1 ? "" : "s"} (est.)`;
    }
  }

  if (dog?.age_min_months) {
    if (dog.age_min_months < 12) {
      return `${dog.age_min_months} month${dog.age_min_months === 1 ? "" : "s"}`;
    } else {
      const years = Math.floor(dog.age_min_months / 12);
      const months = dog.age_min_months % 12;
      if (months === 0) {
        return `${years} year${years === 1 ? "" : "s"}`;
      } else {
        return `${years} year${years === 1 ? "" : "s"}, ${months} month${months === 1 ? "" : "s"}`;
      }
    }
  }

  if (dog?.age_text) {
    const ageText = dog.age_text.trim();
    const rangeMatch = ageText.match(/(\d+)\s*-\s*(\d+)\s*(year|month)s?/i);
    if (rangeMatch) {
      const [, min, max, unit] = rangeMatch;
      const avgAge = Math.round((parseInt(min) + parseInt(max)) / 2);
      return `~${avgAge} ${unit}${avgAge === 1 ? "" : "s"} (est.)`;
    }
    return ageText;
  }

  return "Age unknown";
};

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
  const rawBreed = dog?.primary_breed || dog?.standardized_breed || dog?.breed;
  if (
    !rawBreed ||
    rawBreed === "Unknown" ||
    rawBreed.toLowerCase() === "unknown"
  ) {
    return null;
  }
  return rawBreed;
};

export const formatGender = (dog: DogInput | null | undefined): { text: string; icon: string } => {
  const sex = dog?.sex?.toLowerCase();

  switch (sex) {
    case "male":
    case "m":
      return { text: "Male", icon: "♂️" };
    case "female":
    case "f":
      return { text: "Female", icon: "♀️" };
    default:
      return { text: "Unknown", icon: "❓" };
  }
};

export const isRecentDog = (dog: DogInput | null | undefined): boolean => {
  if (!dog?.created_at) return false;

  try {
    const createdDate = new Date(dog.created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return createdDate > sevenDaysAgo;
  } catch {
    return false;
  }
};

export const getOrganizationName = (dog: DogInput | null | undefined): string => {
  return dog?.organization?.name || "Unknown Organization";
};

export const getShipsToCountries = (dog: DogInput | null | undefined): string[] => {
  return dog?.organization?.ships_to || [];
};

export const formatSize = (dog: DogInput | null | undefined): string | null => {
  const size = dog?.standardized_size || dog?.size;
  if (!size || size === "Unknown" || size.toLowerCase() === "unknown") {
    return null;
  }
  return size;
};

export const formatExperienceLevel = (dog: DogInput | null | undefined): string | null => {
  const experienceLevel = dog?.dog_profiler_data?.experience_level;

  switch (experienceLevel) {
    case "first_time_ok":
      return "Great for first-time owners";
    case "some_experience":
      return "Some experience helpful";
    case "experienced_only":
      return "Experienced owners needed";
    default:
      return null;
  }
};

interface CompatibilityDisplay {
  icon: string;
  text: string;
  color: string;
}

export const formatCompatibility = (dog: DogInput | null | undefined): {
  withDogs: CompatibilityDisplay;
  withCats: CompatibilityDisplay;
  withChildren: CompatibilityDisplay;
} => {
  const profilerData = dog?.dog_profiler_data;
  const props = dog?.properties || {};

  const getCompatibilityDisplay = (value: string): CompatibilityDisplay => {
    switch (value) {
      case "yes":
        return { icon: "✓", text: "Good", color: "text-green-600" };
      case "maybe":
        return { icon: "?", text: "Maybe", color: "text-yellow-600" };
      case "no":
        return { icon: "✗", text: "No", color: "text-red-600" };
      default:
        return { icon: "", text: "Not yet assessed", color: "text-gray-400" };
    }
  };

  const getCompatValue = (profilerKey: string, propKey: string): string => {
    if (profilerData && (profilerData as Record<string, unknown>)[profilerKey]) {
      return (profilerData as Record<string, unknown>)[profilerKey] as string;
    }
    if (props[propKey] === true || props[propKey] === "yes") return "yes";
    if (props[propKey] === false || props[propKey] === "no") return "no";
    if (props[propKey] === "maybe") return "maybe";
    return "unknown";
  };

  return {
    withDogs: getCompatibilityDisplay(
      getCompatValue("good_with_dogs", "good_with_dogs"),
    ),
    withCats: getCompatibilityDisplay(
      getCompatValue("good_with_cats", "good_with_cats"),
    ),
    withChildren: getCompatibilityDisplay(
      getCompatValue("good_with_children", "good_with_children"),
    ),
  };
};

export const getPersonalityTraits = (dog: DogInput | null | undefined): string[] => {
  if (dog?.dog_profiler_data?.personality_traits) {
    return dog.dog_profiler_data.personality_traits.slice(0, 3);
  }
  return [];
};
