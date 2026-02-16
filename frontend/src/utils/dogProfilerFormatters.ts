/**
 * Comprehensive formatters for dog profiler data fields
 * Converts raw enum values into human-readable display text
 */

/**
 * Formats experience level from raw enum to display text
 */
export function formatExperienceLevel(
  level: string | undefined | null,
): string | null {
  if (!level) return null;

  switch (level.toLowerCase()) {
    case "first_time_ok":
    case "first_time_owner":
      return "First-time owners";
    case "some_experience":
      return "Some Experience";
    case "experienced_only":
    case "experienced":
      return "Experienced owners";
    case "very_experienced":
      return "Expert owners";
    default:
      // Capitalize first letter for unknown values
      return level.charAt(0).toUpperCase() + level.slice(1).replace(/_/g, " ");
  }
}

/**
 * Formats energy level from raw enum to display text
 */
export function formatEnergyLevel(
  level: string | undefined | null,
): string | null {
  if (!level) return null;

  switch (level.toLowerCase()) {
    case "low":
    case "minimal":
      return "Low";
    case "medium":
    case "moderate":
      return "Medium";
    case "high":
      return "High";
    case "very_high":
      return "Very High";
    default:
      // Capitalize first letter and handle underscores
      return level.charAt(0).toUpperCase() + level.slice(1).replace(/_/g, " ");
  }
}

/**
 * Formats trainability from raw enum to display text
 */
export function formatTrainability(
  level: string | undefined | null,
): string | null {
  if (!level) return null;

  switch (level.toLowerCase()) {
    case "easy":
      return "Easy";
    case "moderate":
      return "Moderate";
    case "challenging":
      return "Challenging";
    case "very_challenging":
      return "Very Challenging";
    default:
      return level.charAt(0).toUpperCase() + level.slice(1).replace(/_/g, " ");
  }
}

/**
 * Formats home type from raw enum to display text
 */
export function formatHomeType(type: string | undefined | null): string | null {
  if (!type) return null;

  switch (type.toLowerCase()) {
    case "apartment_ok":
      return "Apartment OK";
    case "house_preferred":
      return "House Preferred";
    case "house_required":
      return "House Required";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
  }
}

/**
 * Formats compatibility from raw enum to display text
 */
export function formatCompatibility(
  value: string | undefined | null,
): string | null {
  if (!value) return null;

  switch (value.toLowerCase()) {
    case "yes":
      return "Yes";
    case "no":
      return "No";
    case "maybe":
      return "Maybe";
    case "unknown":
      return "Unknown";
    default:
      return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
  }
}

/**
 * Formats sociability from raw enum to display text
 */
export function formatSociability(
  level: string | undefined | null,
): string | null {
  if (!level) return null;

  switch (level.toLowerCase()) {
    case "reserved":
      return "Reserved";
    case "moderate":
      return "Moderate";
    case "social":
      return "Social";
    case "very_social":
      return "Very Social";
    case "independent":
      return "Independent";
    case "needs_work":
      return "Needs Work";
    case "selective":
      return "Selective";
    default:
      return level.charAt(0).toUpperCase() + level.slice(1).replace(/_/g, " ");
  }
}

/**
 * Formats confidence from raw enum to display text
 */
export function formatConfidence(
  level: string | undefined | null,
): string | null {
  if (!level) return null;

  switch (level.toLowerCase()) {
    case "shy":
      return "Shy";
    case "moderate":
      return "Moderate";
    case "confident":
      return "Confident";
    case "very_confident":
      return "Very Confident";
    case "very_shy":
      return "Very Shy";
    default:
      return level.charAt(0).toUpperCase() + level.slice(1).replace(/_/g, " ");
  }
}

/**
 * Formats exercise needs from raw enum to display text
 */
export function formatExerciseNeeds(
  needs: string | undefined | null,
): string | null {
  if (!needs) return null;

  switch (needs.toLowerCase()) {
    case "minimal":
      return "Minimal";
    case "moderate":
      return "Moderate";
    case "high":
      return "High";
    default:
      return needs.charAt(0).toUpperCase() + needs.slice(1).replace(/_/g, " ");
  }
}

/**
 * Formats grooming needs from raw enum to display text
 */
export function formatGroomingNeeds(
  needs: string | undefined | null,
): string | null {
  if (!needs) return null;

  switch (needs.toLowerCase()) {
    case "minimal":
      return "Minimal";
    case "weekly":
      return "Weekly";
    case "frequent":
      return "Frequent";
    case "daily":
      return "Daily";
    default:
      return needs.charAt(0).toUpperCase() + needs.slice(1).replace(/_/g, " ");
  }
}

/**
 * Formats boolean values to Yes/No
 */
export function formatBoolean(
  value: boolean | undefined | null,
): string | null {
  if (value === null || value === undefined) return null;
  return value ? "Yes" : "No";
}

/**
 * Generic formatter for any profiler enum field
 * Handles common patterns: underscores to spaces, proper capitalization
 */
export function formatProfilerField(
  value: string | undefined | null,
): string | null {
  if (!value) return null;

  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
