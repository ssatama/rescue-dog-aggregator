import React from "react";
import CountryFlag from "../components/ui/CountryFlag";

export const COUNTRY_CODE_ALIASES: Record<string, string> = {
  UK: "GB",
  EN: "GB",
};

export const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  Turkey: "TR",
  Germany: "DE",
  "United States": "US",
  "United Kingdom": "GB",
  France: "FR",
  Italy: "IT",
  Spain: "ES",
  Netherlands: "NL",
  Belgium: "BE",
  Romania: "RO",
  Greece: "GR",
  Austria: "AT",
  Switzerland: "CH",
  Poland: "PL",
  "Czech Republic": "CZ",
  Hungary: "HU",
  Portugal: "PT",
  Ireland: "IE",
  Denmark: "DK",
  Sweden: "SE",
  Norway: "NO",
  Finland: "FI",
  Luxembourg: "LU",
  Slovakia: "SK",
  Slovenia: "SI",
  Croatia: "HR",
  Bulgaria: "BG",
  Estonia: "EE",
  Latvia: "LV",
  Lithuania: "LT",
  Malta: "MT",
  Cyprus: "CY",
};

export const COUNTRY_NAMES: Record<string, string> = {
  TR: "Turkey",
  DE: "Germany",
  US: "United States",
  GB: "United Kingdom",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  BE: "Belgium",
  RO: "Romania",
  GR: "Greece",
  AT: "Austria",
  CH: "Switzerland",
  PL: "Poland",
  CZ: "Czech Republic",
  HU: "Hungary",
  PT: "Portugal",
  IE: "Ireland",
  DK: "Denmark",
  SE: "Sweden",
  NO: "Norway",
  FI: "Finland",
  LU: "Luxembourg",
  SK: "Slovakia",
  SI: "Slovenia",
  HR: "Croatia",
  BG: "Bulgaria",
  EE: "Estonia",
  LV: "Latvia",
  LT: "Lithuania",
  MT: "Malta",
  CY: "Cyprus",
};

export function normalizeCountryCode(input: string | null | undefined): string {
  if (!input || typeof input !== "string") return "";

  const trimmedInput = input.trim();

  const upperCode = trimmedInput.toUpperCase();
  if (COUNTRY_CODE_ALIASES[upperCode]) {
    return COUNTRY_CODE_ALIASES[upperCode];
  }

  if (upperCode.length === 2 && COUNTRY_NAMES[upperCode]) {
    return upperCode;
  }

  const properCaseName =
    trimmedInput.charAt(0).toUpperCase() + trimmedInput.slice(1).toLowerCase();
  if (COUNTRY_NAME_TO_CODE[properCaseName]) {
    return COUNTRY_NAME_TO_CODE[properCaseName];
  }

  const foundName = Object.keys(COUNTRY_NAME_TO_CODE).find(
    (name) => name.toLowerCase() === trimmedInput.toLowerCase(),
  );
  if (foundName) {
    return COUNTRY_NAME_TO_CODE[foundName];
  }

  return upperCode;
}

export function getCountryName(code: string | null | undefined): string {
  if (!code || typeof code !== "string") return "Unknown";

  const normalizedCode = normalizeCountryCode(code);
  return COUNTRY_NAMES[normalizedCode] || normalizedCode;
}

export function formatShipsToList(countries: string[] | null | undefined, limit = 3): React.ReactElement | string {
  if (!countries || !Array.isArray(countries) || countries.length === 0) {
    return "";
  }

  const visibleCountries = countries.slice(0, limit);
  const remainingCount = countries.length - limit;

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {visibleCountries.map((countryCode, index) => (
        <span key={countryCode} className="inline-flex items-center gap-1">
          <CountryFlag
            countryCode={normalizeCountryCode(countryCode)}
            countryName={getCountryName(countryCode)}
            size="small"
          />
          <span className="text-sm">{getCountryName(countryCode)}</span>
          {index < visibleCountries.length - 1 && remainingCount <= 0 && (
            <span className="text-gray-400 mx-1">,</span>
          )}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="text-sm text-gray-600 ml-1">
          +{remainingCount} more
        </span>
      )}
    </span>
  );
}

export function formatServiceRegions(
  serviceRegions: string[] | null | undefined,
  showFlags = true,
  mobile = false,
): React.ReactElement | string {
  if (
    !serviceRegions ||
    !Array.isArray(serviceRegions) ||
    serviceRegions.length === 0
  ) {
    return "";
  }

  const limit = mobile ? 2 : serviceRegions.length;
  const visibleRegions = serviceRegions.slice(0, limit);
  const remainingCount = serviceRegions.length - limit;

  if (!showFlags) {
    const names = visibleRegions.map((code) => getCountryName(code));
    const result = names.join(", ");
    return remainingCount > 0 ? `${result} +${remainingCount} more` : result;
  }

  return (
    <span
      className="inline-flex items-center gap-1 flex-wrap"
      data-testid="ships-to-flags"
    >
      {visibleRegions.map((countryCode, index) => (
        <span key={countryCode} className="inline-flex items-center gap-1">
          <CountryFlag
            countryCode={normalizeCountryCode(countryCode)}
            countryName={getCountryName(countryCode)}
            size="small"
          />
          <span className="text-sm">{getCountryName(countryCode)}</span>
          {index < visibleRegions.length - 1 && remainingCount <= 0 && (
            <span className="text-gray-400 mx-1">,</span>
          )}
        </span>
      ))}
      {remainingCount > 0 && (
        <span className="text-sm text-gray-600 ml-1">
          +{remainingCount} more
        </span>
      )}
    </span>
  );
}

export function formatBasedIn(country: string | null | undefined, city: string | null = null, mobile = false): React.ReactElement | string {
  if (!country) return "";

  return (
    <span className="inline-flex items-center gap-1">
      <CountryFlag
        countryCode={normalizeCountryCode(country)}
        countryName={getCountryName(country)}
        size="small"
      />
      <span className="text-sm">
        {city && !mobile
          ? `${city}, ${getCountryName(country)}`
          : getCountryName(country)}
      </span>
    </span>
  );
}

export function getCountryFlag(countryCode: string | null | undefined): React.ReactElement {
  return (
    <CountryFlag
      countryCode={normalizeCountryCode(countryCode)}
      countryName={getCountryName(countryCode)}
      size="small"
    />
  );
}
