// src/utils/__tests__/countryUtils.test.js

import {
  COUNTRY_FLAGS,
  COUNTRY_NAMES,
  getCountryFlag,
  getCountryName,
  formatShipsTo,
  formatServiceRegions,
  formatBasedIn,
  isValidCountryCode,
  getSupportedCountryCodes
} from '../countryUtils';

describe('countryUtils', () => {
  describe('COUNTRY_FLAGS constant', () => {
    test('contains major European countries', () => {
      expect(COUNTRY_FLAGS.TR).toBe('🇹🇷');
      expect(COUNTRY_FLAGS.DE).toBe('🇩🇪');
      expect(COUNTRY_FLAGS.NL).toBe('🇳🇱');
      expect(COUNTRY_FLAGS.FR).toBe('🇫🇷');
    });

    test('handles UK variants', () => {
      expect(COUNTRY_FLAGS.UK).toBe('🇬🇧');
      expect(COUNTRY_FLAGS.GB).toBe('🇬🇧');
    });
  });

  describe('COUNTRY_NAMES constant', () => {
    test('contains correct country names', () => {
      expect(COUNTRY_NAMES.TR).toBe('Turkey');
      expect(COUNTRY_NAMES.DE).toBe('Germany');
      expect(COUNTRY_NAMES.NL).toBe('Netherlands');
      expect(COUNTRY_NAMES.CH).toBe('Switzerland');
    });

    test('handles UK variants', () => {
      expect(COUNTRY_NAMES.UK).toBe('United Kingdom');
      expect(COUNTRY_NAMES.GB).toBe('United Kingdom');
    });
  });

  describe('getCountryFlag', () => {
    test('returns correct flag for valid country codes', () => {
      expect(getCountryFlag('TR')).toBe('🇹🇷');
      expect(getCountryFlag('DE')).toBe('🇩🇪');
      expect(getCountryFlag('tr')).toBe('🇹🇷'); // lowercase
    });

    test('returns country code for unknown countries', () => {
      expect(getCountryFlag('XX')).toBe('XX');
      expect(getCountryFlag('ZZ')).toBe('ZZ');
    });

    test('handles empty or null input', () => {
      expect(getCountryFlag('')).toBe('');
      expect(getCountryFlag(null)).toBe('');
      expect(getCountryFlag(undefined)).toBe('');
    });
  });

  describe('getCountryName', () => {
    test('returns correct name for valid country codes', () => {
      expect(getCountryName('TR')).toBe('Turkey');
      expect(getCountryName('DE')).toBe('Germany');
      expect(getCountryName('tr')).toBe('Turkey'); // lowercase
    });

    test('returns country code for unknown countries', () => {
      expect(getCountryName('XX')).toBe('XX');
      expect(getCountryName('ZZ')).toBe('ZZ');
    });

    test('handles empty or null input', () => {
      expect(getCountryName('')).toBe('');
      expect(getCountryName(null)).toBe('');
      expect(getCountryName(undefined)).toBe('');
    });
  });

  describe('formatShipsTo', () => {
    test('formats countries within limit', () => {
      const countries = ['TR', 'DE', 'NL'];
      const result = formatShipsTo(countries, 3);
      expect(result).toBe('🇹🇷 🇩🇪 🇳🇱');
    });

    test('formats countries with overflow', () => {
      const countries = ['TR', 'DE', 'NL', 'FR', 'ES'];
      const result = formatShipsTo(countries, 3);
      expect(result).toBe('🇹🇷 🇩🇪 🇳🇱 +2 more');
    });

    test('uses default maxShow of 3', () => {
      const countries = ['TR', 'DE', 'NL', 'FR'];
      const result = formatShipsTo(countries);
      expect(result).toBe('🇹🇷 🇩🇪 🇳🇱 +1 more');
    });

    test('handles empty or invalid input', () => {
      expect(formatShipsTo([])).toBe('');
      expect(formatShipsTo(null)).toBe('');
      expect(formatShipsTo(undefined)).toBe('');
      expect(formatShipsTo('not-array')).toBe('');
    });

    test('handles single country', () => {
      const result = formatShipsTo(['TR']);
      expect(result).toBe('🇹🇷');
    });
  });

  describe('formatServiceRegions', () => {
    test('formats with flags and names by default', () => {
      const countries = ['TR', 'DE'];
      const result = formatServiceRegions(countries);
      expect(result).toBe('🇹🇷 Turkey, 🇩🇪 Germany');
    });

    test('formats flags only when showNames is false', () => {
      const countries = ['TR', 'DE'];
      const result = formatServiceRegions(countries, false);
      expect(result).toBe('🇹🇷 🇩🇪');
    });

    test('formats abbreviated for mobile', () => {
      const countries = ['TR', 'DE'];
      const result = formatServiceRegions(countries, true, true);
      expect(result).toBe('🇹🇷 TR, 🇩🇪 DE');
    });

    test('handles empty input', () => {
      expect(formatServiceRegions([])).toBe('');
      expect(formatServiceRegions(null)).toBe('');
      expect(formatServiceRegions(undefined)).toBe('');
    });
  });

  describe('formatBasedIn', () => {
    test('formats country without city', () => {
      const result = formatBasedIn('TR');
      expect(result).toBe('🇹🇷 Turkey');
    });

    test('formats country with city', () => {
      const result = formatBasedIn('TR', 'Istanbul');
      expect(result).toBe('🇹🇷 Istanbul, Turkey');
    });

    test('formats abbreviated for mobile', () => {
      const result = formatBasedIn('TR', 'Istanbul', true);
      expect(result).toBe('🇹🇷 Istanbul, TR');
    });

    test('handles empty country code', () => {
      expect(formatBasedIn('')).toBe('');
      expect(formatBasedIn(null)).toBe('');
      expect(formatBasedIn(undefined)).toBe('');
    });
  });

  describe('isValidCountryCode', () => {
    test('returns true for valid country codes', () => {
      expect(isValidCountryCode('TR')).toBe(true);
      expect(isValidCountryCode('DE')).toBe(true);
      expect(isValidCountryCode('tr')).toBe(true); // lowercase
    });

    test('returns false for invalid country codes', () => {
      expect(isValidCountryCode('XX')).toBe(false);
      expect(isValidCountryCode('ZZ')).toBe(false);
    });

    test('returns false for empty input', () => {
      expect(isValidCountryCode('')).toBe(false);
      expect(isValidCountryCode(null)).toBe(false);
      expect(isValidCountryCode(undefined)).toBe(false);
    });
  });

  describe('getSupportedCountryCodes', () => {
    test('returns array of supported country codes', () => {
      const codes = getSupportedCountryCodes();
      expect(Array.isArray(codes)).toBe(true);
      expect(codes.length).toBeGreaterThan(0);
      expect(codes).toContain('TR');
      expect(codes).toContain('DE');
      expect(codes).toContain('NL');
    });

    test('returned codes match COUNTRY_FLAGS keys', () => {
      const codes = getSupportedCountryCodes();
      const flagKeys = Object.keys(COUNTRY_FLAGS);
      expect(codes.sort()).toEqual(flagKeys.sort());
    });
  });

  describe('Edge cases and error handling', () => {
    test('handles unknown country codes gracefully', () => {
      expect(formatShipsTo(['XX', 'YY'])).toBe('XX YY');
      expect(formatServiceRegions(['XX'])).toBe('XX XX');
      expect(formatBasedIn('XX')).toBe('XX XX');
    });

    test('handles mixed valid and invalid country codes', () => {
      const result = formatShipsTo(['TR', 'XX', 'DE']);
      expect(result).toBe('🇹🇷 XX 🇩🇪');
    });

    test('handles case sensitivity consistently', () => {
      expect(getCountryFlag('tr')).toBe(getCountryFlag('TR'));
      expect(getCountryName('de')).toBe(getCountryName('DE'));
      expect(isValidCountryCode('nl')).toBe(isValidCountryCode('NL'));
    });
  });
});