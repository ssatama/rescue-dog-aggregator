export const FILTER_DEFAULTS = {
  BREED: "Any breed",
  SIZE: "Any size",
  AGE: "Any age",
  SEX: "Any",
  COUNTRY: "Any country",
  REGION: "Any region",
  ORGANIZATION: "any",
  ALL: "All",
  GROUP: "Any group",
  SORT: "recommended",
} as const

/** Sorts the catalog offers, in menu order; values are the API's `sort`. */
export const CATALOG_SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Waiting longest" },
  { value: "age-asc", label: "Youngest" },
  { value: "age-desc", label: "Oldest" },
] as const

export function isCatalogSort(value: string | null | undefined): boolean {
  return CATALOG_SORTS.some((sort) => sort.value === value)
}

/** One size scale everywhere, catalog and swipe alike (#494). */
export const SIZE_OPTIONS = [FILTER_DEFAULTS.SIZE, "Small", "Medium", "Large", "Giant"]

/** Dogs with no recorded age appear under every age, so there is no "Age Unknown" (#494). */
export const AGE_OPTIONS = [FILTER_DEFAULTS.AGE, "Puppy", "Young", "Adult", "Senior"]

/** Size names to the API's standardized_size; the API's Small includes Tiny. */
export const SIZE_API_MAPPING: Record<string, string> = {
  Small: "Small",
  Medium: "Medium",
  Large: "Large",
  Giant: "XLarge",
}

/** Size and age values links from before #494 can still carry. */
const LEGACY_FILTER_VALUES: Record<string, string> = { Tiny: "Small", "Extra Large": "Giant" }

/** A size or age from the URL, on today's scale; anything else is the default. */
export function scaleValue(value: string | null, options: readonly string[], fallback: string): string {
  const current = value ? (LEGACY_FILTER_VALUES[value] ?? value) : null
  return current && options.includes(current) ? current : fallback
}

const DEFAULT_VALUES = new Set<string>(Object.values(FILTER_DEFAULTS))

export function isDefaultFilterValue(
  value: string | null | undefined,
): boolean {
  if (value == null || value === "") return true
  return DEFAULT_VALUES.has(value)
}

/** Lifestyle filters (#495). Each is on ("true", or an energy band) or off
 * (""), and matches only dogs whose profile records a positive value. `url`
 * is the catalog URL key, `count` the key in filter_counts' `lifestyle`. */
export const LIVES_WELL_WITH = [
  { key: "goodWithKidsFilter", url: "good_with_kids", count: "good_with_kids", label: "Children", chip: "Good with children" },
  { key: "goodWithDogsFilter", url: "good_with_dogs", count: "good_with_dogs", label: "Other dogs", chip: "Good with other dogs" },
  { key: "goodWithCatsFilter", url: "good_with_cats", count: "good_with_cats", label: "Cats", chip: "Good with cats" },
] as const

export const FIRST_TIME_FRIENDLY = {
  key: "firstTimeFriendlyFilter",
  url: "first_time_friendly",
  count: "first_time_friendly",
  label: "First-time owners",
  chip: "Suits first-time owners",
} as const

/** Energy bands, in order; the API's high includes very high. */
export const ENERGY_BANDS = [
  { value: "low", label: "Low", count: "energy_low" },
  { value: "medium", label: "Medium", count: "energy_medium" },
  { value: "high", label: "High", count: "energy_high" },
] as const

export type LifestyleFilterKey =
  | (typeof LIVES_WELL_WITH)[number]["key"]
  | typeof FIRST_TIME_FRIENDLY.key
  | "energyFilter"

export function isEnergyBand(value: string | null): value is (typeof ENERGY_BANDS)[number]["value"] {
  return ENERGY_BANDS.some((band) => band.value === value)
}
