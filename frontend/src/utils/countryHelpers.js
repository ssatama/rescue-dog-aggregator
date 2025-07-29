/**
 * Country code to name mapping utilities
 */

const COUNTRY_NAMES = {
  'TR': 'Turkey',
  'DE': 'Germany', 
  'US': 'United States',
  'CA': 'Canada',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'FR': 'France',
  'UK': 'United Kingdom',
  'AT': 'Austria', 
  'CH': 'Switzerland',
  'IT': 'Italy',
  'ES': 'Spain',
  'PT': 'Portugal',
  'RO': 'Romania',
  'BG': 'Bulgaria',
  'GR': 'Greece',
  'PL': 'Poland',
  'CZ': 'Czech Republic',
  'HU': 'Hungary',
  'SK': 'Slovakia',
  'SI': 'Slovenia',
  'HR': 'Croatia',
  'RS': 'Serbia',
  'BA': 'Bosnia and Herzegovina',
  'ME': 'Montenegro',
  'AL': 'Albania',
  'MK': 'North Macedonia',
  'XK': 'Kosovo',
  'MD': 'Moldova',
  'UA': 'Ukraine',
  'BY': 'Belarus',
  'LT': 'Lithuania',
  'LV': 'Latvia',
  'EE': 'Estonia',
  'FI': 'Finland',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'IS': 'Iceland',
  'IE': 'Ireland',
  'LU': 'Luxembourg',
  'MT': 'Malta',
  'CY': 'Cyprus',
  'MX': 'Mexico'
};

/**
 * Get country name from country code
 * @param {string} countryCode - Two-letter country code
 * @returns {string} Country name or the code if not found
 */
export const getCountryName = (countryCode) => {
  if (!countryCode || typeof countryCode !== 'string') {
    return countryCode || 'Unknown';
  }
  
  const upperCode = countryCode.toUpperCase();
  return COUNTRY_NAMES[upperCode] || countryCode;
};

/**
 * Get all available country mappings
 * @returns {Object} Object with country code keys and name values
 */
export const getAllCountryMappings = () => {
  return { ...COUNTRY_NAMES };
};

/**
 * Check if a country code is valid
 * @param {string} countryCode - Two-letter country code
 * @returns {boolean} True if the country code is recognized
 */
export const isValidCountryCode = (countryCode) => {
  if (!countryCode || typeof countryCode !== 'string') {
    return false;
  }
  
  const upperCode = countryCode.toUpperCase();
  return upperCode in COUNTRY_NAMES;
};