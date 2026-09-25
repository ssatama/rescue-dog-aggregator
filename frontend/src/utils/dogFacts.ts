import type { Dog } from "../types/dog";
import { getAgeCategory } from "./dogHelpers";

/**
 * Facts some rescues publish in `properties` (#489). Each rescue names and
 * words them differently, so every reader here returns null (or false) unless
 * the rescue actually says so. Unknown is left out, never guessed.
 */

function prop(dog: Dog, key: string): string | null {
  const value = dog.properties?.[key];
  if (typeof value === "boolean") return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Where the dog is, when that differs from the rescue's address.
 * Dogs Trust: "Evesham (Worcestershire) (Evesham)" → "Evesham (Worcestershire)",
 * where the last group repeats the town or is empty.
 */
export function dogLocation(dog: Dog): string | null {
  const dogsTrust = prop(dog, "location");
  if (dogsTrust) {
    const groups = dogsTrust.match(/\([^)]*\)/g) ?? [];
    const cleaned =
      groups.length > 1 || /\(\s*\)\s*$/.test(dogsTrust)
        ? dogsTrust.replace(/\s*\([^)]*\)\s*$/, "")
        : dogsTrust;
    return cleaned.trim() || null;
  }
  return prop(dog, "current_location_translated") ?? prop(dog, "current_location");
}

const NEUTERED_TEXT = /\b(i am|i'm|i have been|i've been)\s+(spayed|neutered)\b/i;

export function isNeutered(dog: Dog): boolean {
  const flag = prop(dog, "neutered_spayed") ?? prop(dog, "spayed_neutered");
  if (flag && /^(yes|true)$/i.test(flag)) return true;
  if (/\bneutered\b/i.test(prop(dog, "medical_status") ?? "")) return true;
  return NEUTERED_TEXT.test(prop(dog, "medical_issues") ?? "");
}

export function isVaccinated(dog: Dog): boolean {
  if (/\bvaccinated\b/i.test(prop(dog, "medical_status") ?? "")) return true;
  return /\bfully vaccinated\b/i.test(prop(dog, "medical_issues") ?? "");
}

// Many Tears writes neuter and vaccination status into the medical field, which
// the chips above already cover. A note is routine only when nothing is left once
// those words are gone: "I have a heart murmur & I will be spayed" is still real.
const ROUTINE_WORDS = new Set(
  (
    "i i'm im i've ive am have has had been will be being and before after going to my " +
    "a the for find finding ready forever new home adoption already started fully " +
    "spayed neutered vaccinated vaccinations please read below more info information"
  ).split(" "),
);

function isRoutineMedical(text: string): boolean {
  const words = text.toLowerCase().replace(/[’]/g, "'").match(/[a-z']+/g) ?? [];
  return words.every((w) => ROUTINE_WORDS.has(w));
}

/** A real medical note, e.g. "I have Grade 3 bilateral luxating patellas." */
export function medicalNote(dog: Dog): string | null {
  const manyTears = prop(dog, "medical_issues");
  if (manyTears && !isRoutineMedical(manyTears)) return manyTears;
  // Dogs Trust only flags that the dog has ongoing medical care
  if (prop(dog, "medical_care")) return "Has ongoing medical care";
  return null;
}

function answerOf(value: unknown): string | null {
  if (value === true || value === "yes" || value === "true") return "yes";
  if (value === false || value === "no" || value === "false") return "no";
  if (typeof value !== "string" || !value.trim() || value.toLowerCase() === "unknown") return null;
  return value.replace(/_/g, " ");
}

/**
 * Whether the dog lives with children, dogs or cats: "yes", "no", a qualifier
 * ("selective", "older children"), or null when not assessed. The AI profile
 * wins, and scraped properties only fill in when it has no value: Dogs Trust's
 * scraped good_with_dogs is true for almost every dog, even "only dog" ones.
 */
export function companionAnswer(
  dog: Dog,
  field: "good_with_children" | "good_with_dogs" | "good_with_cats",
): string | null {
  return answerOf(dog.dog_profiler_data?.[field] ?? dog.properties?.[field]);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "listed 3 weeks ago", from when the dog first appeared on the site. */
export function listedAgo(createdAt: string | undefined, now: Date = new Date()): string | null {
  if (!createdAt) return null;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return null;
  const days = Math.max(0, Math.floor((now.getTime() - created) / DAY_MS));
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  if (days === 0) return "listed today";
  if (days < 7) return `listed ${plural(days, "day")} ago`;
  if (days < 31) return `listed ${plural(Math.floor(days / 7), "week")} ago`;
  if (days < 365) return `listed ${plural(Math.floor(days / 30), "month")} ago`;
  return "listed over a year ago";
}

/** The rescue's site as people know it: "dogstrust.org.uk". */
export function adoptionDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Filters for "Similar dogs" (#489): the same size and age group, from any
 * rescue. Null when neither is known, since that would match every dog.
 */
export function similarDogsQuery(
  dog: Dog,
): { standardized_size?: string; age_category?: string; age_known?: boolean } | null {
  const size = dog.standardized_size && dog.standardized_size !== "Unknown" ? dog.standardized_size : null;
  const age = getAgeCategory(dog);
  if (!size && age === "Unknown") return null;
  return {
    ...(size && { standardized_size: size }),
    // Same age group means a known age: dogs without one match every group
    ...(age !== "Unknown" && { age_category: age, age_known: true }),
  };
}

/** How many candidates to fetch: the newest few are usually all from one rescue. */
export const SIMILAR_CANDIDATES = 20;

/**
 * Three of the candidates, one per rescue first and other rescues before this
 * dog's own, so "Similar dogs" is not just "More from {rescue}" again.
 */
export function pickSimilarDogs(dog: Dog, candidates: Dog[]): Dog[] {
  const seen = new Set([dog.organization_id]);
  const spread: Dog[] = [];
  const rest: Dog[] = [];
  for (const other of candidates) {
    if (other.id === dog.id) continue;
    if (seen.has(other.organization_id)) {
      rest.push(other);
    } else {
      seen.add(other.organization_id);
      spread.push(other);
    }
  }
  return [...spread, ...rest].slice(0, 3);
}
