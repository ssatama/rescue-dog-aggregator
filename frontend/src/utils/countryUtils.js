// src/utils/countryUtils.js

/**
 * Country code to flag emoji mapping for enhanced organization cards
 */
export const COUNTRY_FLAGS = {
  TR: "🇹🇷",
  DE: "🇩🇪",
  NL: "🇳🇱",
  BE: "🇧🇪",
  FR: "🇫🇷",
  UK: "🇬🇧",
  GB: "🇬🇧", // Alternative for UK
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

/**
 * Country code to full name mapping
 */
export const COUNTRY_NAMES = {
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

/**
 * Get flag emoji for a country code
 * @param {string} countryCode - ISO country code
 * @returns {string} Flag emoji or country code if no flag available
 */
export function getCountryFlag(countryCode) {
  if (!countryCode) return "";
  return COUNTRY_FLAGS[countryCode.toUpperCase()] || countryCode;
}

/**
 * Get country name for a country code
 * @param {string} countryCode - ISO country code
 * @returns {string} Country name or country code if no name available
 */
export function getCountryName(countryCode) {
  if (!countryCode) return "";
  return COUNTRY_NAMES[countryCode.toUpperCase()] || countryCode;
}

/**
 * Format ships-to countries with flags and overflow handling
 * @param {string[]} countries - Array of country codes
 * @param {number} maxShow - Maximum number of flags to show before "+X more"
 * @returns {string} Formatted string with flags and overflow
 */
export function formatShipsTo(countries, maxShow = 3) {
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

/**
 * Format service regions (where dogs are located) with flags and names
 * @param {string[]} countries - Array of country codes
 * @param {boolean} showNames - Whether to include country names
 * @param {boolean} abbreviate - Whether to use abbreviated format for mobile
 * @returns {string} Formatted string with flags and optionally names
 */
export function formatServiceRegions(
  countries,
  showNames = true,
  abbreviate = false,
) {
  if (!countries || !Array.isArray(countries) || countries.length === 0) {
    return "";
  }

  if (abbreviate) {
    // Mobile format: flags + abbreviated codes
    return countries
      .map((code) => `${getCountryFlag(code)} ${code}`)
      .join(", ");
  }

  if (showNames) {
    // Desktop format: flags + full names
    return countries
      .map((code) => `${getCountryFlag(code)} ${getCountryName(code)}`)
      .join(", ");
  }

  // Flags only
  return countries.map((code) => getCountryFlag(code)).join(" ");
}

/**
 * Format based-in location with flag and country name
 * @param {string} countryCode - ISO country code
 * @param {string} cityName - City name (optional)
 * @param {boolean} abbreviate - Whether to use abbreviated format for mobile
 * @returns {string} Formatted location string
 */
export function formatBasedIn(
  countryCode,
  cityName = null,
  abbreviate = false,
) {
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

/**
 * Validate if a country code exists in our mapping
 * @param {string} countryCode - ISO country code to validate
 * @returns {boolean} True if country code is recognized
 */
export function isValidCountryCode(countryCode) {
  if (!countryCode) return false;
  return countryCode.toUpperCase() in COUNTRY_FLAGS;
}

/**
 * Get all supported country codes
 * @returns {string[]} Array of all supported country codes
 */
export function getSupportedCountryCodes() {
  return Object.keys(COUNTRY_FLAGS);
}
