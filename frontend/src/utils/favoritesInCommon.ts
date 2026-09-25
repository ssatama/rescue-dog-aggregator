import type { Dog } from "@/types/dog";
import { getAgeCategory } from "./dogHelpers";
import { companionAnswer } from "./dogFacts";

/**
 * What every saved dog has in common, one line each (#498). A line appears
 * only when the data backs it for every dog in the list: nothing is averaged,
 * and a dog with the value missing drops the line. Averages are how the old
 * panel said "Great for apartment living" beside a dog that climbs fences.
 */

const SIZES: Record<string, string> = {
  Tiny: "All tiny dogs",
  Small: "All small dogs",
  Medium: "All medium-sized dogs",
  Large: "All large dogs",
  XLarge: "All extra-large dogs",
};

const AGES: Record<string, string> = {
  Puppy: "All puppies",
  Young: "All young dogs",
  Adult: "All adult dogs",
  Senior: "All seniors",
};

const ENERGY: Record<string, string> = {
  low: "All low energy",
  medium: "All medium energy",
  high: "All high energy",
  very_high: "All very high energy",
};

const COMPANIONS = [
  ["good_with_children", "All good with children"],
  ["good_with_dogs", "All good with other dogs"],
  ["good_with_cats", "All good with cats"],
] as const;

/** The value every dog shares, or null if any differs or is missing. */
function shared<T>(dogs: Dog[], value: (dog: Dog) => T | null | undefined): T | null {
  const first = value(dogs[0]);
  if (first == null) return null;
  return dogs.every((dog) => value(dog) === first) ? first : null;
}

export function favoritesInCommon(dogs: Dog[]): string[] {
  if (dogs.length < 2) return [];
  const lines: string[] = [];

  const rescue = shared(dogs, (dog) => dog.organization?.name);
  if (rescue) lines.push(`All at ${rescue}`);

  const size = shared(dogs, (dog) => SIZES[dog.standardized_size ?? ""]);
  if (size) lines.push(size);

  const age = shared(dogs, (dog) => AGES[getAgeCategory(dog)]);
  if (age) lines.push(age);

  for (const [field, line] of COMPANIONS) {
    if (dogs.every((dog) => companionAnswer(dog, field) === "yes")) lines.push(line);
  }

  if (dogs.every((dog) => dog.dog_profiler_data?.experience_level === "first_time_ok")) {
    lines.push("All suit first-time owners");
  }
  if (dogs.every((dog) => dog.dog_profiler_data?.home_type === "apartment_ok")) {
    lines.push("All fine in an apartment");
  }

  const energy = shared(dogs, (dog) => ENERGY[dog.dog_profiler_data?.energy_level ?? ""]);
  if (energy) lines.push(energy);

  const traitSets = dogs.map(
    (dog) => new Set((dog.dog_profiler_data?.personality_traits ?? []).map((t) => t.toLowerCase().trim())),
  );
  const traits = [...traitSets[0]].filter((trait) => trait && traitSets.every((set) => set.has(trait)));
  if (traits.length > 0) lines.push(`All described as ${traits.slice(0, 3).join(", ")}`);

  return lines;
}
