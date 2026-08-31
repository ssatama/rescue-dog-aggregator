import type { DogProfilerData } from "../types/dogProfiler";

/**
 * Fields the personality section actually renders. Metadata such as
 * `model_used` or `quality_score` is deliberately absent: it is present on
 * every generated profile but produces no visible content.
 */
const COMPATIBILITY_FIELDS = [
  "good_with_dogs",
  "good_with_cats",
  "good_with_children",
] as const satisfies readonly (keyof DogProfilerData)[];

const DISPLAYED_FIELDS = [
  "personality_traits",
  "favorite_activities",
  "unique_quirk",
  "energy_level",
  "trainability",
  ...COMPATIBILITY_FIELDS,
] as const satisfies readonly (keyof DogProfilerData)[];

function hasAnyOf(
  profilerData: DogProfilerData | null | undefined,
  fields: readonly (keyof DogProfilerData)[],
): boolean {
  if (!profilerData) return false;

  return fields.some((field) => {
    const value = profilerData[field];
    return Array.isArray(value) ? value.length > 0 : value != null;
  });
}

/**
 * Whether a profile has anything the personality section can show.
 *
 * A truthiness check is not enough: the API sends `{}` for a dog whose LLM
 * profiling failed, and `{}` is truthy, which renders the section as four
 * headings with nothing under them.
 */
export function hasDisplayableProfile(
  profilerData: DogProfilerData | null | undefined,
): profilerData is DogProfilerData {
  return hasAnyOf(profilerData, DISPLAYED_FIELDS);
}

/**
 * Whether the profile answered any compatibility question.
 *
 * The "Good With" block draws a dash for every answer that is not "yes", so an
 * absent answer reads as a negative one. It must stay hidden until at least one
 * question has a real answer.
 */
export function hasCompatibilityData(
  profilerData: DogProfilerData | null | undefined,
): profilerData is DogProfilerData {
  return hasAnyOf(profilerData, COMPATIBILITY_FIELDS);
}
