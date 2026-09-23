import React from "react";
import CountryFlag from "../components/ui/CountryFlag";
import { getCountryName, normalizeCountryCode } from "./countryNames";

export { getCountryName, normalizeCountryCode };

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
