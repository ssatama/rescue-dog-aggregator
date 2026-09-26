export interface CountryConfig {
  code: string;
  name: string;
  shortName: string;
  /** How a sentence names it ("the UK"), when that isn't the name */
  placeName?: string;
  flag: string;
  description: string;
}

export const COUNTRIES: Record<string, CountryConfig> = {
  UK: {
    code: "UK",
    name: "United Kingdom",
    shortName: "UK",
    placeName: "the UK",
    flag: "\u{1F1EC}\u{1F1E7}",
    description:
      "Rescue dogs from UK-based organizations including Dogs Trust and Many Tears",
  },
  DE: {
    code: "DE",
    name: "Germany",
    shortName: "Germany",
    flag: "\u{1F1E9}\u{1F1EA}",
    description:
      "Dogs rescued by Tierschutzverein Europa and other German organizations",
  },
  RS: {
    code: "RS",
    name: "Serbia",
    shortName: "Serbia",
    flag: "\u{1F1F7}\u{1F1F8}",
    description: "Street dogs and shelter rescues seeking homes abroad",
  },
  BA: {
    code: "BA",
    name: "Bosnia & Herzegovina",
    shortName: "Bosnia",
    flag: "\u{1F1E7}\u{1F1E6}",
    description: "Dogs rescued from Bosnian streets and shelters",
  },
  BG: {
    code: "BG",
    name: "Bulgaria",
    shortName: "Bulgaria",
    flag: "\u{1F1E7}\u{1F1EC}",
    description: "Rescued by Santer Paws and Bulgarian organizations",
  },
  IT: {
    code: "IT",
    name: "Italy",
    shortName: "Italy",
    flag: "\u{1F1EE}\u{1F1F9}",
    description: "Italian rescue dogs seeking loving homes",
  },
  TR: {
    code: "TR",
    name: "Turkey",
    shortName: "Turkey",
    flag: "\u{1F1F9}\u{1F1F7}",
    description: "Dogs from Turkish rescues and street dog programs",
  },
  CY: {
    code: "CY",
    name: "Cyprus",
    shortName: "Cyprus",
    flag: "\u{1F1E8}\u{1F1FE}",
    description: "Island rescues seeking new beginnings",
  },
};

export const getCountryByCode = (code: string | null | undefined): CountryConfig | null =>
  COUNTRIES[code?.toUpperCase() ?? ""] || null;

export const getAllCountryCodes = (): string[] => Object.keys(COUNTRIES);

export const getCountriesArray = (): CountryConfig[] => Object.values(COUNTRIES);

/**
 * Configured country pages that currently have dogs, from the /stats/by-country
 * response. A country with none (e.g. Italy while its only rescue is inactive) gets
 * no sitemap entry, no chip and a 404 page (#442).
 */
export const getCountriesWithDogs = (
  stats: { countries?: Array<{ code: string; count: number }> } | null | undefined,
): CountryConfig[] => {
  const counts = new Map((stats?.countries ?? []).map((c) => [c.code.toUpperCase(), c.count]));
  return getCountriesArray().filter((country) => (counts.get(country.code) ?? 0) > 0);
};
