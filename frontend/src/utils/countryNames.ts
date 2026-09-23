// The one country map. Keyed by ISO 3166-1 alpha-2; "UK" is accepted as an
// alias for GB because organization configs use it.
export const COUNTRY_NAMES: Record<string, string> = {
  AL: "Albania",
  AT: "Austria",
  BA: "Bosnia and Herzegovina",
  BE: "Belgium",
  BG: "Bulgaria",
  BY: "Belarus",
  CA: "Canada",
  CH: "Switzerland",
  CY: "Cyprus",
  CZ: "Czech Republic",
  DE: "Germany",
  DK: "Denmark",
  EE: "Estonia",
  ES: "Spain",
  FI: "Finland",
  FR: "France",
  GB: "United Kingdom",
  GR: "Greece",
  HR: "Croatia",
  HU: "Hungary",
  IE: "Ireland",
  IS: "Iceland",
  IT: "Italy",
  LT: "Lithuania",
  LU: "Luxembourg",
  LV: "Latvia",
  MD: "Moldova",
  ME: "Montenegro",
  MK: "North Macedonia",
  MT: "Malta",
  MX: "Mexico",
  NL: "Netherlands",
  NO: "Norway",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  RS: "Serbia",
  SE: "Sweden",
  SI: "Slovenia",
  SK: "Slovakia",
  TR: "Turkey",
  UA: "Ukraine",
  US: "United States",
  XK: "Kosovo",
};

export const COUNTRY_CODE_ALIASES: Record<string, string> = {
  UK: "GB",
  EN: "GB",
};

const COUNTRY_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(COUNTRY_NAMES).map(([code, name]) => [name.toLowerCase(), code]),
);

/** Accepts a code, an alias ("UK") or a full name and returns the ISO code. */
export function normalizeCountryCode(input: string | null | undefined): string {
  if (!input || typeof input !== "string") return "";

  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();
  if (COUNTRY_CODE_ALIASES[upper]) return COUNTRY_CODE_ALIASES[upper];
  if (COUNTRY_NAMES[upper]) return upper;
  return COUNTRY_NAME_TO_CODE[trimmed.toLowerCase()] || upper;
}

export function getCountryName(code: string | null | undefined): string {
  if (!code || typeof code !== "string") return "Unknown";

  const normalized = normalizeCountryCode(code);
  return COUNTRY_NAMES[normalized] || normalized;
}

/** Emoji flag built from the code's regional indicator symbols; "" if not a two-letter code. */
export function getFlagEmoji(code: string | null | undefined): string {
  const normalized = normalizeCountryCode(code);
  if (!/^[A-Z]{2}$/.test(normalized)) return "";
  return String.fromCodePoint(...[...normalized].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
