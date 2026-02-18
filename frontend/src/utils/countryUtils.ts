export const COUNTRY_FLAGS: Record<string, string> = {
  TR: "🇹🇷",
  DE: "🇩🇪",
  NL: "🇳🇱",
  BE: "🇧🇪",
  FR: "🇫🇷",
  UK: "🇬🇧",
  GB: "🇬🇧",
  AT: "🇦🇹",
  CH: "🇨🇭",
  RO: "🇷🇴",
  ES: "🇪🇸",
  IT: "🇮🇹",
  SE: "🇸🇪",
  DK: "🇩🇰",
  NO: "🇳🇴",
  FI: "🇫🇮",
  GR: "🇬🇷",
  PT: "🇵🇹",
  PL: "🇵🇱",
  CZ: "🇨🇿",
  HU: "🇭🇺",
  SK: "🇸🇰",
};

export const COUNTRY_NAMES: Record<string, string> = {
  TR: "Turkey",
  DE: "Germany",
  NL: "Netherlands",
  BE: "Belgium",
  FR: "France",
  UK: "United Kingdom",
  GB: "United Kingdom",
  AT: "Austria",
  CH: "Switzerland",
  RO: "Romania",
  ES: "Spain",
  IT: "Italy",
  SE: "Sweden",
  DK: "Denmark",
  NO: "Norway",
  FI: "Finland",
  GR: "Greece",
  PT: "Portugal",
  PL: "Poland",
  CZ: "Czech Republic",
  HU: "Hungary",
  SK: "Slovakia",
};

export function getCountryFlag(countryCode: string | null | undefined): string {
  if (!countryCode) return "";
  return COUNTRY_FLAGS[countryCode.toUpperCase()] || countryCode;
}

export function getCountryName(countryCode: string | null | undefined): string {
  if (!countryCode) return "";
  return COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode;
}

export function formatShipsTo(countries: string[] | null | undefined, maxShow = 3): string {
  if (!countries || !Array.isArray(countries) || countries.length === 0) {
    return "";
  }

  if (countries.length <= maxShow) {
    return countries.map((code) => getCountryFlag(code)).join(" ");
  }

  const shown = countries.slice(0, maxShow);
  const remaining = countries.length - maxShow;
  const flags = shown.map((code) => getCountryFlag(code)).join(" ");

  return `${flags} +${remaining} more`;
}

export function formatServiceRegions(
  countries: string[] | null | undefined,
  showNames = true,
  abbreviate = false,
): string {
  if (!countries || !Array.isArray(countries) || countries.length === 0) {
    return "";
  }

  if (abbreviate) {
    return countries
      .map((code) => `${getCountryFlag(code)} ${code}`)
      .join(", ");
  }

  if (showNames) {
    return countries
      .map((code) => `${getCountryFlag(code)} ${getCountryName(code)}`)
      .join(", ");
  }

  return countries.map((code) => getCountryFlag(code)).join(" ");
}

export function formatBasedIn(
  countryCode: string | null | undefined,
  cityName: string | null = null,
  abbreviate = false,
): string {
  if (!countryCode) return "";

  const flag = getCountryFlag(countryCode);

  if (abbreviate) {
    return cityName
      ? `${flag} ${cityName}, ${countryCode}`
      : `${flag} ${countryCode}`;
  }

  const countryName = getCountryName(countryCode);
  return cityName
    ? `${flag} ${cityName}, ${countryName}`
    : `${flag} ${countryName}`;
}

export function isValidCountryCode(countryCode: string | null | undefined): boolean {
  if (!countryCode) return false;
  return countryCode.toUpperCase() in COUNTRY_FLAGS;
}

export function getSupportedCountryCodes(): string[] {
  return Object.keys(COUNTRY_FLAGS);
}
