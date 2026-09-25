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

/** Rescue pages list one rescue, so "Recommended" (which mixes rescues) is left out. */
export const RESCUE_PAGE_SORTS = CATALOG_SORTS.filter((sort) => sort.value !== "recommended")

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
