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

export function getCompatibility(dog: Dog) {
  const props = dog.properties || {};
  const profilerData = dog.dog_profiler_data;
  
  const compatibility: any = {
    dogs: "unknown",
    cats: "unknown",
    children: "unknown",
  };

  if (profilerData) {
    compatibility.dogs = profilerData.good_with_dogs || "unknown";
    compatibility.cats = profilerData.good_with_cats || "unknown";
    compatibility.children = profilerData.good_with_children || "unknown";
  } else if (props) {
    compatibility.dogs = props.good_with_dogs === true || props.good_with_dogs === "yes"
      ? "yes"
      : props.good_with_dogs === false || props.good_with_dogs === "no"
      ? "no"
      : props.good_with_dogs === "maybe"
      ? "maybe"
      : "unknown";
    compatibility.cats = props.good_with_cats === true || props.good_with_cats === "yes"
      ? "yes"
      : props.good_with_cats === false || props.good_with_cats === "no"
      ? "no"
      : props.good_with_cats === "maybe"
      ? "maybe"
      : "unknown";
    compatibility.children = props.good_with_children === true || props.good_with_children === "yes"
      ? "yes"
      : props.good_with_children === false || props.good_with_children === "no"
      ? "no"
      : props.good_with_children === "maybe"
      ? "maybe"
      : "unknown";
  }

  return compatibility;
}

export function getCompatibilityIcon(value: string) {
  switch (value) {
    case "yes":
      return "✓";
    case "no":
      return "✗";
    case "maybe":
      return "?";
    default:
      return "-";
  }
}

export function formatEnergyLevel(level: string): string {
  switch (level) {
    case "very_high":
      return "Very High";
    case "high":
      return "High";
    case "medium":
    case "moderate":
      return "Moderate";
    case "low":
    case "minimal":
      return "Low";
    default:
      return level;
  }
}

export function formatExperienceLevel(level: string): string {
  switch (level) {
    case "first_time_owner":
      return "First Timer";
    case "some_experience":
      return "Some Exp";
    case "experienced":
      return "Experienced";
    case "very_experienced":
      return "Expert";
    default:
      return level;
  }
}

export function getPersonalityTraits(dog: Dog): string[] {
  if (dog.dog_profiler_data?.personality_traits) {
    return dog.dog_profiler_data.personality_traits;
  }
  if (!dog.properties?.personality) return [];
  
  return dog.properties.personality
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length < 20);
}

export function getPersonalityTraitColor(trait: string): string {
  const lowerTrait = trait.toLowerCase();
  if (lowerTrait.includes("friendly") || lowerTrait.includes("social")) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
  }
  if (lowerTrait.includes("playful") || lowerTrait.includes("energetic")) {
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300";
  }
  if (lowerTrait.includes("calm") || lowerTrait.includes("gentle")) {
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
  }
  if (lowerTrait.includes("smart") || lowerTrait.includes("intelligent")) {
    return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
  }
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}