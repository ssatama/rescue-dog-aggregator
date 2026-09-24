import type { Dog } from "../types/dog";

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

// Many Tears writes neuter and vaccination status into the medical field;
// those sentences are covered by the chips above, not a medical note.
const ROUTINE_MEDICAL =
  /spayed|neutered|vaccinat|please read|forever home|ready for adoption/i;

/** A real medical note, e.g. "I have Grade 3 bilateral luxating patellas." */
export function medicalNote(dog: Dog): string | null {
  const manyTears = prop(dog, "medical_issues");
  if (manyTears && !ROUTINE_MEDICAL.test(manyTears)) return manyTears;
  // Dogs Trust only flags that the dog has ongoing medical care
  if (prop(dog, "medical_care")) return "Has ongoing medical care";
  return null;
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
