/**
 * Dog-related helper functions and utilities
 */

/**
 * Format dog age from age_min_months or age_text with uncertainty indicators
 * @param {Object} dog - Dog object with age_min_months, age_max_months, or age_text
 * @returns {string} Formatted age string with uncertainty indicators where appropriate
 */
export const formatAge = (dog) => {
  // Handle age ranges (age_min_months + age_max_months) - show as estimated
  if (
    dog?.age_min_months &&
    dog?.age_max_months &&
    dog.age_min_months !== dog.age_max_months
  ) {
    const minYears = Math.floor(dog.age_min_months / 12);
    const maxYears = Math.floor(dog.age_max_months / 12);

    if (minYears === maxYears) {
      // Same year range, show as estimated
      return `~${minYears} year${minYears === 1 ? "" : "s"} (est.)`;
    } else {
      // Different years, show average as estimated
      const avgMonths = Math.round(
        (dog.age_min_months + dog.age_max_months) / 2,
      );
      const avgYears = Math.floor(avgMonths / 12);
      return `~${avgYears} year${avgYears === 1 ? "" : "s"} (est.)`;
    }
  }

  // Handle exact age from age_min_months (more precise)
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

  // Handle age_text - add uncertainty indicator for ranges
  if (dog?.age_text) {
    const ageText = dog.age_text.trim();
    // Check if it's a range like "5-7 years" or "2-3 months"
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

/**
 * Categorize dog age into life stages
 * @param {Object} dog - Dog object with age_min_months or age_text
 * @returns {string} Age category: 'Puppy', 'Young', 'Adult', 'Senior', or 'Unknown'
 */
export const getAgeCategory = (dog) => {
  // Prefer age_min_months when available (most accurate)
  if (dog?.age_min_months) {
    const months = dog.age_min_months;

    if (months < 12) {
      return "Puppy";
    } else if (months < 36) {
      // Less than 3 years
      return "Young";
    } else if (months < 96) {
      // Less than 8 years (matches backend standardization)
      return "Adult";
    } else {
      return "Senior";
    }
  }

  // Fall back to standardized age_text when age_min_months not available
  if (dog?.age_text) {
    const ageText = dog.age_text.toLowerCase();

    // Handle standardized age categories
    if (ageText === "puppy") return "Puppy";
    if (ageText === "young") return "Young";
    if (ageText === "adult") return "Adult";
    if (ageText === "senior") return "Senior";

    // Handle age ranges like "5-7 years" or "2-3 months"
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

/**
 * Format dog breed, preferring primary_breed over standardized_breed over breed
 * @param {Object} dog - Dog object with breed information
 * @returns {string|null} Formatted breed or null if unknown
 */
export const formatBreed = (dog) => {
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

/**
 * Format dog gender with appropriate icon
 * @param {Object} dog - Dog object with sex field
 * @returns {Object} Object with text and icon for gender
 */
export const formatGender = (dog) => {
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

/**
 * Check if dog was added recently (within last 7 days)
 * @param {Object} dog - Dog object with created_at field
 * @returns {boolean} True if dog is recent
 */
export const isRecentDog = (dog) => {
  if (!dog?.created_at) return false;

  try {
    const createdDate = new Date(dog.created_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return createdDate > sevenDaysAgo;
  } catch {
    return false; // Invalid date
  }
};

/**
 * Get organization name from dog object
 * @param {Object} dog - Dog object with nested organization
 * @returns {string} Organization name or fallback
 */
export const getOrganizationName = (dog) => {
  return dog?.organization?.name || "Unknown Organization";
};

/**
 * Get shipping countries from dog's organization
 * @param {Object} dog - Dog object with nested organization
 * @returns {Array} Array of country codes the organization ships to
 */
export const getShipsToCountries = (dog) => {
  return dog?.organization?.ships_to || [];
};

/**
 * Format size display for dog cards
 * @param {Object} dog - Dog object with size information
 * @returns {string|null} Formatted size or null if unknown
 */
export const formatSize = (dog) => {
  const size = dog?.standardized_size || dog?.size;
  if (!size || size === "Unknown" || size.toLowerCase() === "unknown") {
    return null;
  }
  return size;
};

/**
 * Format experience level with more specificity
 * @param {Object} dog - Dog object with dog_profiler_data
 * @returns {string|null} Formatted experience level or null if not available
 */
export const formatExperienceLevel = (dog) => {
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

/**
 * Format compatibility display for dog cards
 * @param {Object} dog - Dog object with dog_profiler_data
 * @returns {Object} Compatibility object with formatted displays
 */
export const formatCompatibility = (dog) => {
  const profilerData = dog?.dog_profiler_data;
  const props = dog?.properties || {};

  const getCompatibilityDisplay = (value) => {
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

  // Get compatibility from profiler data first, then fallback to properties
  const getCompatValue = (profilerKey, propKey) => {
    if (profilerData && profilerData[profilerKey]) {
      return profilerData[profilerKey];
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

/**
 * Get formatted personality traits for display
 * @param {Object} dog - Dog object with dog_profiler_data
 * @returns {Array} Array of personality traits or empty array
 */
export const getPersonalityTraits = (dog) => {
  if (dog?.dog_profiler_data?.personality_traits) {
    return dog.dog_profiler_data.personality_traits.slice(0, 3); // Limit to first 3 for display
  }
  return [];
};
