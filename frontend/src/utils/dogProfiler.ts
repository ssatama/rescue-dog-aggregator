import type { DogProfilerData } from "../types/dogProfiler";
import {
  hasPersonalitySection,
  hasEnergyTrainabilitySection,
  hasCompatibilitySection,
  hasActivitiesSection,
} from "../components/dogs/detail";

/**
 * Whether the personality section would render anything at all.
 *
 * Composed of the same four predicates the individual sections use, so the
 * wrapper cannot outlive its contents. A truthiness check on the profile is
 * not enough: the API sends `{}` for a dog whose LLM profiling failed, and a
 * profile can also carry only fields the model was not confident about.
 */
export function hasAnyProfileSection(
  profilerData: DogProfilerData | null | undefined,
): boolean {
  return (
    hasPersonalitySection(profilerData) ||
    hasEnergyTrainabilitySection(profilerData) ||
    hasCompatibilitySection(profilerData) ||
    hasActivitiesSection(profilerData)
  );
}
