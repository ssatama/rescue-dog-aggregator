const COUNTRY_NAMES: Record<string, string> = {
  TR: "Turkey",
  DE: "Germany",
  US: "United States",
  CA: "Canada",
  NL: "Netherlands",
  BE: "Belgium",
  FR: "France",
  UK: "United Kingdom",
  AT: "Austria",
  CH: "Switzerland",
  IT: "Italy",
  ES: "Spain",
  PT: "Portugal",
  RO: "Romania",
  BG: "Bulgaria",
  GR: "Greece",
  PL: "Poland",
  CZ: "Czech Republic",
  HU: "Hungary",
  SK: "Slovakia",
  SI: "Slovenia",
  HR: "Croatia",
  RS: "Serbia",
  BA: "Bosnia and Herzegovina",
  ME: "Montenegro",
  AL: "Albania",
  MK: "North Macedonia",
  XK: "Kosovo",
  MD: "Moldova",
  UA: "Ukraine",
  BY: "Belarus",
  LT: "Lithuania",
  LV: "Latvia",
  EE: "Estonia",
  FI: "Finland",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  IS: "Iceland",
  IE: "Ireland",
  LU: "Luxembourg",
  MT: "Malta",
  CY: "Cyprus",
  MX: "Mexico",
};

export const getCountryName = (countryCode: string | null | undefined): string => {
  if (!countryCode || typeof countryCode !== "string") {
    return countryCode || "Unknown";
  }

  const upperCode = countryCode.toUpperCase();
  return COUNTRY_NAMES[upperCode] || countryCode;
};
