import type { FilterCountsResponse } from "@/schemas/common";

/** A stat shows only when at least this many dogs have the value (#500) */
export const MIN_SAMPLE = 5;

export interface ShareStat {
  key: string;
  label: string;
  /** Dogs with a positive value */
  count: number;
  /** Dogs whose profile records the value at all: the sample */
  known: number;
  percent: number;
}

export interface MixPart {
  label: string;
  count: number;
  percent: number;
}

export interface MixStat {
  known: number;
  parts: MixPart[];
}

export interface BreedPracticalStats {
  compatibility: ShareStat[];
  energy: MixStat | null;
  size: MixStat | null;
  /** Dogs per age group. A dog whose estimated age spans two groups counts in
   * both, so these are counts, never shares of a whole. */
  age: AgeGroup[] | null;
}

export interface AgeGroup {
  label: string;
  count: number;
}

const COMPATIBILITY = [
  ["good_with_kids", "Good with children"],
  ["good_with_cats", "Good with cats"],
  ["good_with_dogs", "Good with other dogs"],
  ["first_time_friendly", "Suits first-time owners"],
] as const;

const SIZE_ORDER = ["Small", "Medium", "Large", "Giant"];
const AGE_ORDER = ["Puppy", "Young", "Adult", "Senior"];

function percent(count: number, total: number): number {
  return Math.round((count / total) * 100);
}

/** Shares of `known` dogs; null below the sample threshold */
function mix(parts: AgeGroup[], known = parts.reduce((sum, part) => sum + part.count, 0)): MixStat | null {
  if (known < MIN_SAMPLE) return null;
  return {
    known,
    parts: parts.filter((part) => part.count > 0).map((part) => ({ ...part, percent: percent(part.count, known) })),
  };
}

function ordered(options: { value: unknown; label?: string; count: number }[] | undefined, order: string[]) {
  const byLabel = new Map((options ?? []).map((option) => [String(option.label ?? option.value), option.count]));
  return order.map((label) => ({ label, count: byLabel.get(label) ?? 0 }));
}

/**
 * What adopters ask about a breed, from the dogs whose profile records it.
 * Every stat carries its sample, and one with fewer than MIN_SAMPLE dogs is
 * left out rather than shown on a handful of dogs.
 */
export function buildPracticalStats(counts: FilterCountsResponse | null | undefined): BreedPracticalStats {
  const lifestyle = counts?.lifestyle;

  const compatibility: ShareStat[] = lifestyle
    ? COMPATIBILITY.flatMap(([key, label]) => {
        const { count, known } = lifestyle[key];
        return known >= MIN_SAMPLE ? [{ key, label, count, known, percent: percent(count, known) }] : [];
      })
    : [];

  // The three bands read one profile key, so they share one known count
  const energy = lifestyle
    ? mix(
        [
          { label: "Low", count: lifestyle.energy_low.count },
          { label: "Medium", count: lifestyle.energy_medium.count },
          { label: "High", count: lifestyle.energy_high.count },
        ],
        lifestyle.energy_low.known,
      )
    : null;

  // Overlapping groups can't be summed into a sample, so the largest group
  // alone must reach it: that many dogs certainly have a known age
  const ages = ordered(counts?.age_options, AGE_ORDER).filter((part) => part.count > 0);
  const largestGroup = Math.max(0, ...ages.map((part) => part.count));

  return {
    compatibility,
    energy,
    size: mix(ordered(counts?.size_options, SIZE_ORDER)),
    age: largestGroup >= MIN_SAMPLE ? ages : null,
  };
}

export function hasPracticalStats(stats: BreedPracticalStats): boolean {
  return stats.compatibility.length > 0 || Boolean(stats.energy || stats.size || stats.age);
}
