import React from 'react';
import CountryFlag from '../components/ui/CountryFlag';

// Country code to name mapping for common countries used in the app
export const COUNTRY_NAMES = {
  'TR': 'Turkey',
  'DE': 'Germany', 
  'US': 'United States',
  'GB': 'United Kingdom',
  'FR': 'France',
  'IT': 'Italy',
  'ES': 'Spain',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'RO': 'Romania',
  'GR': 'Greece',
  'AT': 'Austria',
  'CH': 'Switzerland',
  'PL': 'Poland',
  'CZ': 'Czech Republic',
  'HU': 'Hungary',
  'PT': 'Portugal',
  'IE': 'Ireland',
  'DK': 'Denmark',
  'SE': 'Sweden',
  'NO': 'Norway',
  'FI': 'Finland',
  'LU': 'Luxembourg',
  'SK': 'Slovakia',
  'SI': 'Slovenia',
  'HR': 'Croatia',
  'BG': 'Bulgaria',
  'EE': 'Estonia',
  'LV': 'Latvia',
  'LT': 'Lithuania',
  'MT': 'Malta',
  'CY': 'Cyprus'
};

/**
 * Get country name from country code with fallback
 * @param {string} code - ISO 2-letter country code
 * @returns {string} Country name or code if unknown
 */
export function getCountryName(code) {
  if (!code || typeof code !== 'string') return 'Unknown';
  
  const normalizedCode = code.toUpperCase().trim();
  return COUNTRY_NAMES[normalizedCode] || normalizedCode;
}

/**
 * Format ships-to countries list with flags
 * @param {string[]} countries - Array of country codes
 * @param {number} limit - Maximum number of countries to show before "+X more"
 * @returns {JSX.Element|string} Formatted list with flags
 */
export function formatShipsToList(countries, limit = 3) {
  if (!countries || !Array.isArray(countries) || countries.length === 0) {
    return '';
  }

  const visibleCountries = countries.slice(0, limit);
  const remainingCount = countries.length - limit;

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {visibleCountries.map((countryCode, index) => (
        <span key={countryCode} className="inline-flex items-center gap-1">
          <CountryFlag 
            countryCode={countryCode} 
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

/**
 * Format service regions (array of countries) for display
 * @param {string[]} serviceRegions - Array of country codes where organization has dogs
 * @param {boolean} showFlags - Whether to show flag icons
 * @param {boolean} mobile - Whether this is mobile view (limits display)
 * @returns {JSX.Element|string} Formatted service regions
 */
export function formatServiceRegions(serviceRegions, showFlags = true, mobile = false) {
  if (!serviceRegions || !Array.isArray(serviceRegions) || serviceRegions.length === 0) {
    return '';
  }

  const limit = mobile ? 2 : serviceRegions.length;
  const visibleRegions = serviceRegions.slice(0, limit);
  const remainingCount = serviceRegions.length - limit;

  if (!showFlags) {
    const names = visibleRegions.map(code => getCountryName(code));
    const result = names.join(', ');
    return remainingCount > 0 ? `${result} +${remainingCount} more` : result;
  }

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      {visibleRegions.map((countryCode, index) => (
        <span key={countryCode} className="inline-flex items-center gap-1">
          <CountryFlag 
            countryCode={countryCode} 
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

/**
 * Format "Based in" location with flag
 * @param {string} country - Country code
 * @param {string} city - City name (optional)
 * @param {boolean} mobile - Whether this is mobile view
 * @returns {JSX.Element} Formatted location with flag
 */
export function formatBasedIn(country, city = null, mobile = false) {
  if (!country) return '';

  return (
    <span className="inline-flex items-center gap-1">
      <CountryFlag 
        countryCode={country} 
        countryName={getCountryName(country)}
        size="small"
      />
      <span className="text-sm">
        {city && !mobile ? `${city}, ${getCountryName(country)}` : getCountryName(country)}
      </span>
    </span>
  );
}

/**
 * Legacy function for backward compatibility with existing OrganizationCard
 * @param {string} countryCode - Country code
 * @returns {JSX.Element} Country flag component
 */
export function getCountryFlag(countryCode) {
  return (
    <CountryFlag 
      countryCode={countryCode} 
      countryName={getCountryName(countryCode)}
      size="small"
    />
  );
}