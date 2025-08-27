import type { Dog } from "./types";
import {
  formatEnergyLevel as formatEnergyLevelUtil,
  formatExperienceLevel as formatExperienceLevelUtil,
} from "../../utils/dogProfilerFormatters";

export function getCompatibilityScore(
  value: string | boolean | undefined,
): number {
  if (value === true || value === "yes") return 5;
  if (value === "maybe") return 3;
  if (value === false || value === "no") return 1;
  return 0;
}

export function formatEnergyLevel(level: string | undefined): string {
  const formatted = formatEnergyLevelUtil(level);
  if (!formatted) return "Energy Unknown";

  // Add "Energy" suffix for CompareCard context
  return `${formatted} Energy`;
}

export function formatExperienceLevel(level: string | undefined): string {
  const formatted = formatExperienceLevelUtil(level);
  if (!formatted) return "";

  return formatted;
}

export function getLifestyleMatches(dog: Dog): string[] {
  const matches: string[] = [];
  const energy = dog.dog_profiler_data?.energy_level;
  const exerciseNeeds = dog.dog_profiler_data?.exercise_needs;
  const size = dog.standardized_size || dog.size;

  if (energy === "low" || exerciseNeeds === "minimal") {
    if (!size || size === "Small" || size === "Medium") {
      matches.push("Apartment living");
    }
    matches.push("Seniors");
  }

  if (energy === "high" || energy === "very_high") {
    matches.push("Active families");
    matches.push("Runners");
  }

  if (dog.dog_profiler_data?.good_with_children === "yes") {
    matches.push("Families with kids");
  }

  if (dog.dog_profiler_data?.experience_level === "first_time_ok") {
    matches.push("First-time owners");
  }

  return matches.slice(0, 3);
}
