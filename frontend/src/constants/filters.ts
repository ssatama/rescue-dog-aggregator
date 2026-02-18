export const FILTER_DEFAULTS = {
  BREED: "Any breed",
  SIZE: "Any size",
  AGE: "Any age",
  SEX: "Any",
  COUNTRY: "Any country",
  REGION: "Any region",
  ORGANIZATION: "any",
  ORGANIZATION_LABEL: "All Organizations",
  ALL: "All",
  GROUP: "Any group",
} as const

export const SIZE_API_MAPPING: Record<string, string> = {
  Tiny: "Tiny",
  Small: "Small",
  Medium: "Medium",
  Large: "Large",
  "Extra Large": "XLarge",
}

const DEFAULT_VALUES = new Set<string>(Object.values(FILTER_DEFAULTS))

export function isDefaultFilterValue(
  value: string | null | undefined,
): boolean {
  if (value == null || value === "") return true
  return DEFAULT_VALUES.has(value)
}
