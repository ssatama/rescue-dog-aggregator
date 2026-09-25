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

export const SIZE_API_MAPPING = {
  Tiny: "Tiny",
  Small: "Small",
  Medium: "Medium",
  Large: "Large",
  "Extra Large": "XLarge",
} as const

// Display-only overrides for age options. The option string doubles as the
// state value, the URL parameter and the age_category sent to the API, so it
// has to stay exactly what the API expects; only the text shown changes.
// "Unknown" alone reads as a chip with no noun, which is useless out of
// context and worse for a screen reader.
export const AGE_FILTER_LABELS: Record<string, string> = {
  Unknown: "Age Unknown",
}

export function ageFilterLabel(option: string): string {
  return AGE_FILTER_LABELS[option] ?? option
}

const DEFAULT_VALUES = new Set<string>(Object.values(FILTER_DEFAULTS))

export function isDefaultFilterValue(
  value: string | null | undefined,
): boolean {
  if (value == null || value === "") return true
  return DEFAULT_VALUES.has(value)
}
