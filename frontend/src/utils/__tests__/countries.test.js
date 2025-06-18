import React from 'react';
import { render, screen } from '@testing-library/react';
import { 
  COUNTRY_NAMES, 
  getCountryName, 
  formatShipsToList, 
  formatServiceRegions 
} from '../countries';

describe('countries utility', () => {
  describe('COUNTRY_NAMES', () => {
    test('contains common country codes', () => {
      expect(COUNTRY_NAMES.TR).toBe('Turkey');
      expect(COUNTRY_NAMES.DE).toBe('Germany');
      expect(COUNTRY_NAMES.US).toBe('United States');
      expect(COUNTRY_NAMES.GB).toBe('United Kingdom');
      expect(COUNTRY_NAMES.FR).toBe('France');
      expect(COUNTRY_NAMES.IT).toBe('Italy');
      expect(COUNTRY_NAMES.ES).toBe('Spain');
      expect(COUNTRY_NAMES.NL).toBe('Netherlands');
      expect(COUNTRY_NAMES.BE).toBe('Belgium');
      expect(COUNTRY_NAMES.RO).toBe('Romania');
    });
  });

  describe('getCountryName', () => {
    test('returns correct country name for valid code', () => {
      expect(getCountryName('TR')).toBe('Turkey');
      expect(getCountryName('DE')).toBe('Germany');
    });

    test('returns country code for unknown code', () => {
      expect(getCountryName('XX')).toBe('XX');
      expect(getCountryName('ZZ')).toBe('ZZ');
    });

    test('handles lowercase country codes', () => {
      expect(getCountryName('tr')).toBe('Turkey');
      expect(getCountryName('de')).toBe('Germany');
    });

    test('handles null and undefined', () => {
      expect(getCountryName(null)).toBe('Unknown');
      expect(getCountryName(undefined)).toBe('Unknown');
      expect(getCountryName('')).toBe('Unknown');
    });
  });

  describe('formatShipsToList', () => {
    test('shows all countries when ≤3 countries', () => {
      const countries = ['DE', 'FR', 'IT'];
      const result = formatShipsToList(countries);
      
      render(<div>{result}</div>);
      
      expect(screen.getByText('Germany')).toBeInTheDocument();
      expect(screen.getByText('France')).toBeInTheDocument();
      expect(screen.getByText('Italy')).toBeInTheDocument();
      expect(screen.queryByText(/more/)).not.toBeInTheDocument();
    });

    test('shows first 3 + "more" when >3 countries', () => {
      const countries = ['DE', 'FR', 'IT', 'ES', 'NL'];
      const result = formatShipsToList(countries);
      
      render(<div>{result}</div>);
      
      expect(screen.getByText('Germany')).toBeInTheDocument();
      expect(screen.getByText('France')).toBeInTheDocument();
      expect(screen.getByText('Italy')).toBeInTheDocument();
      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    test('handles custom limit', () => {
      const countries = ['DE', 'FR', 'IT', 'ES'];
      const result = formatShipsToList(countries, 2);
      
      render(<div>{result}</div>);
      
      expect(screen.getByText('Germany')).toBeInTheDocument();
      expect(screen.getByText('France')).toBeInTheDocument();
      expect(screen.getByText('+2 more')).toBeInTheDocument();
      expect(screen.queryByText('Italy')).not.toBeInTheDocument();
    });

    test('handles empty array', () => {
      const result = formatShipsToList([]);
      expect(result).toBe('');
    });

    test('handles single country', () => {
      const result = formatShipsToList(['TR']);
      
      render(<div>{result}</div>);
      
      expect(screen.getByText('Turkey')).toBeInTheDocument();
      expect(screen.queryByText(/more/)).not.toBeInTheDocument();
    });

    test('renders with flags by default', () => {
      const countries = ['TR', 'DE'];
      const result = formatShipsToList(countries);
      
      render(<div>{result}</div>);
      
      // Should render flag images
      const flags = screen.getAllByRole('img');
      expect(flags.length).toBeGreaterThan(0);
    });
  });

  describe('formatServiceRegions', () => {
    test('formats service regions array correctly', () => {
      const serviceRegions = ['TR', 'RO'];
      const result = formatServiceRegions(serviceRegions);
      
      render(<div>{result}</div>);
      
      expect(screen.getByText('Turkey')).toBeInTheDocument();
      expect(screen.getByText('Romania')).toBeInTheDocument();
    });

    test('handles empty service regions', () => {
      const result = formatServiceRegions([]);
      expect(result).toBe('');
    });

    test('handles single service region', () => {
      const result = formatServiceRegions(['DE']);
      
      render(<div>{result}</div>);
      
      expect(screen.getByText('Germany')).toBeInTheDocument();
    });

    test('shows all regions when mobile=false', () => {
      const serviceRegions = ['TR', 'DE', 'FR', 'IT'];
      const result = formatServiceRegions(serviceRegions, true, false);
      
      render(<div>{result}</div>);
      
      expect(screen.getByText('Turkey')).toBeInTheDocument();
      expect(screen.getByText('Germany')).toBeInTheDocument();
      expect(screen.getByText('France')).toBeInTheDocument();
      expect(screen.getByText('Italy')).toBeInTheDocument();
    });

    test('limits regions when mobile=true', () => {
      const serviceRegions = ['TR', 'DE', 'FR', 'IT'];
      const result = formatServiceRegions(serviceRegions, false, true);
      
      // When showFlags=false, function returns a string
      expect(result).toContain('Turkey');
      expect(result).toContain('Germany');
      expect(result).toContain('+2 more');
    });
  });
});