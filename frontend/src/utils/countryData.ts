export interface CountryConfig {
  code: string;
  name: string;
  shortName: string;
  /** How a sentence names it ("the UK"), when that isn't the name */
  placeName?: string;
  flag: string;
  description: string;
}

// Where the dogs are, not where their rescue is based (#702)
export const COUNTRIES: Record<string, CountryConfig> = {
  UK: {
    code: "UK",
    name: "United Kingdom",
    shortName: "UK",
    placeName: "the UK",
    flag: "\u{1F1EC}\u{1F1E7}",
    description:
      "Dogs in rescue centres and foster homes across the UK, from Dogs Trust, Many Tears and smaller rescues",
  },
  DE: {
    code: "DE",
    name: "Germany",
    shortName: "Germany",
    flag: "\u{1F1E9}\u{1F1EA}",
    description:
      "Dogs in foster homes and shelters in Germany, from Tierschutzverein Europa, Hunderettung Europa and Daisy Family Rescue",
  },
  RO: {
    code: "RO",
    name: "Romania",
    shortName: "Romania",
    flag: "\u{1F1F7}\u{1F1F4}",
    description: "Dogs in Romanian shelters, waiting for homes across Europe",
  },
  ES: {
    code: "ES",
    name: "Spain",
    shortName: "Spain",
    flag: "\u{1F1EA}\u{1F1F8}",
    description: "Dogs in Spanish partner shelters, from Andalusia to Aragón, waiting for homes abroad",
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
  MK: {
    code: "MK",
    name: "North Macedonia",
    shortName: "North Macedonia",
    flag: "\u{1F1F2}\u{1F1F0}",
    description: "Dogs in North Macedonia, rehomed by Daisy Family Rescue",
  },
  PT: {
    code: "PT",
    name: "Portugal",
    shortName: "Portugal",
    flag: "\u{1F1F5}\u{1F1F9}",
    description: "Dogs at a partner shelter in Mafra, waiting for homes abroad",
  },
};

export const getCountryByCode = (code: string | null | undefined): CountryConfig | null =>
  COUNTRIES[code?.toUpperCase() ?? ""] || null;

export const getAllCountryCodes = (): string[] => Object.keys(COUNTRIES);

export const getCountriesArray = (): CountryConfig[] => Object.values(COUNTRIES);

/** Enough dogs to fill a page; a country with fewer gets none (#702) */
export const MIN_DOGS_FOR_COUNTRY_PAGE = 10;

/**
 * Configured country pages with at least MIN_DOGS_FOR_COUNTRY_PAGE dogs, from the
 * /stats/by-country response, which counts each dog where it is (#702). Any other
 * country gets no sitemap entry, no chip and a 404 page (#442).
 */
export const getCountriesWithDogs = (
  stats: { countries?: Array<{ code: string; count: number }> } | null | undefined,
): CountryConfig[] => {
  const counts = new Map((stats?.countries ?? []).map((c) => [c.code.toUpperCase(), c.count]));
  return getCountriesArray().filter((country) => (counts.get(country.code) ?? 0) >= MIN_DOGS_FOR_COUNTRY_PAGE);
};

/**
 * /stats/by-country cut down to the country pages that exist: config names, and a
 * total of only their dogs, for the hub's title, list and structured data.
 */
export const getCountryPageStats = (
  stats: { countries?: Array<{ code: string; count: number }> } | null | undefined,
): { total: number; countries: Array<{ code: string; name: string; count: number }> } => {
  const counts = new Map((stats?.countries ?? []).map((c) => [c.code.toUpperCase(), c.count]));
  const countries = getCountriesWithDogs(stats)
    .map((country) => ({ code: country.code, name: country.name, count: counts.get(country.code) ?? 0 }))
    .sort((a, b) => b.count - a.count);
  return { total: countries.reduce((sum, country) => sum + country.count, 0), countries };
};
