// src/components/organizations/__tests__/OrganizationHero.dark-mode.test.jsx
// TDD Phase 1: RED - Tests for OrganizationHero dark mode functionality

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrganizationHero from '../OrganizationHero';

// Mock the ui components
jest.mock('../../ui/StyledLink', () => {
  return function MockStyledLink({ children, href }) {
    return <a href={href} data-testid="styled-link">{children}</a>;
  };
});

jest.mock('../../ui/CountryFlag', () => {
  return function MockCountryFlag() {
    return <span data-testid="country-flag">Flag</span>;
  };
});

jest.mock('../../ui/SocialMediaLinks', () => {
  return function MockSocialMediaLinks() {
    return <div data-testid="social-media-links">Social Links</div>;
  };
});

jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }) {
    return <img src={src} alt={alt} {...props} data-testid="next-image" />;
  };
});

jest.mock('../../../utils/countries', () => ({
  formatBasedIn: jest.fn(() => <span>Germany</span>),
  formatServiceRegions: jest.fn(() => <span>Europe</span>),
  formatShipsToList: jest.fn(() => <span>EU, US</span>),
  getCountryName: jest.fn(() => 'Germany')
}));

describe('OrganizationHero Dark Mode', () => {
  const mockOrganization = {
    id: 'test-org-1',
    name: 'Happy Tails Rescue',
    website_url: 'https://happytails.org',
    logo_url: 'https://example.com/logo.jpg',
    country: 'DE',
    city: 'Berlin',
    service_regions: ['DE', 'AT'],
    ships_to: ['DE', 'AT', 'CH'],
    description: 'A wonderful rescue organization helping dogs find homes.',
    total_dogs: 25,
    new_this_week: 3,
    social_media: {
      facebook: 'happytails',
      instagram: 'happytails_rescue'
    }
  };

  describe('Hero Background Dark Mode', () => {
    test('hero section has dark mode gradient background', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const heroSection = screen.getByTestId('organization-hero');
      expect(heroSection).toHaveClass('bg-gradient-to-br');
      expect(heroSection).toHaveClass('from-amber-100');
      expect(heroSection).toHaveClass('dark:from-gray-800');
      expect(heroSection).toHaveClass('to-orange-200');
      expect(heroSection).toHaveClass('dark:to-gray-700');
    });

    test('no organization state has dark mode styling', () => {
      render(<OrganizationHero organization={null} />);
      
      const fallbackSection = screen.getByText('Organization not found').closest('.bg-gradient-to-br');
      expect(fallbackSection).toHaveClass('from-amber-100');
      expect(fallbackSection).toHaveClass('dark:from-gray-800');
      expect(fallbackSection).toHaveClass('to-orange-200');
      expect(fallbackSection).toHaveClass('dark:to-gray-700');
      
      const fallbackHeading = screen.getByText('Organization not found');
      expect(fallbackHeading).toHaveClass('text-gray-900');
      expect(fallbackHeading).toHaveClass('dark:text-gray-100');
    });
  });

  describe('Breadcrumb Dark Mode', () => {
    test('breadcrumb links have dark mode styling', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const breadcrumbLink = screen.getByText('← Organizations');
      expect(breadcrumbLink).toHaveClass('text-gray-600');
      expect(breadcrumbLink).toHaveClass('dark:text-gray-300');
      expect(breadcrumbLink).toHaveClass('hover:text-gray-900');
      expect(breadcrumbLink).toHaveClass('dark:hover:text-gray-100');
    });

    test('breadcrumb separator has dark mode styling', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const separator = screen.getByText('/');
      expect(separator).toHaveClass('text-gray-500');
      expect(separator).toHaveClass('dark:text-gray-400');
    });

    test('breadcrumb current page has dark mode styling', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const breadcrumbNav = screen.getByRole('navigation', { name: /breadcrumb/i });
      const currentPageSpan = breadcrumbNav.querySelector('span[class*="text-gray-900"]');
      expect(currentPageSpan).toHaveClass('text-gray-900');
      expect(currentPageSpan).toHaveClass('dark:text-gray-100');
    });
  });

  describe('Logo Section Dark Mode', () => {
    test('logo container has dark mode background', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const logoContainer = screen.getByRole('img', { name: /happy tails rescue logo/i }).closest('.bg-white');
      expect(logoContainer).toHaveClass('bg-white');
      expect(logoContainer).toHaveClass('dark:bg-gray-800');
    });

    test('logo fallback text maintains orange theme', () => {
      const orgWithoutLogo = { ...mockOrganization, logo_url: null };
      render(<OrganizationHero organization={orgWithoutLogo} />);
      
      const logoFallback = screen.getByText('HTR'); // Happy Tails Rescue initials
      expect(logoFallback).toHaveClass('text-orange-600');
      expect(logoFallback).toHaveClass('dark:text-orange-400');
    });
  });

  describe('Organization Info Dark Mode', () => {
    test('organization name has dark mode text color', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const orgNameHeading = screen.getByRole('heading', { name: /happy tails rescue/i });
      expect(orgNameHeading).toHaveClass('text-gray-900');
      expect(orgNameHeading).toHaveClass('dark:text-gray-100');
    });

    test('location labels have dark mode styling', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const basedInLabel = screen.getByText('Based in:');
      const dogsInLabel = screen.getByText('Dogs located in:');
      const shipsToLabel = screen.getByText('Adoptable to:');
      
      [basedInLabel, dogsInLabel, shipsToLabel].forEach(label => {
        expect(label).toHaveClass('text-gray-700');
        expect(label).toHaveClass('dark:text-gray-300');
      });
    });

    test('description has dark mode text color', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const description = screen.getByText(/A wonderful rescue organization/);
      expect(description).toHaveClass('text-gray-700');
      expect(description).toHaveClass('dark:text-gray-300');
    });
  });

  describe('Statistics Cards Dark Mode', () => {
    test('statistics cards have dark mode backgrounds', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const statisticsCards = screen.getByTestId('statistics-cards');
      const cardElements = statisticsCards.querySelectorAll('.bg-white');
      
      cardElements.forEach(card => {
        expect(card).toHaveClass('bg-white');
        expect(card).toHaveClass('dark:bg-gray-800');
      });
    });

    test('statistics numbers have dark mode text colors', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const statisticsCards = screen.getByTestId('statistics-cards');
      
      const totalDogsNumber = screen.getByText('25');
      const allThrees = screen.getAllByText('3');
      const countriesNumber = allThrees[0]; // First "3" is countries
      const newWeekNumber = allThrees[1];   // Second "3" is new this week
      
      // Total dogs and countries use gray-900
      expect(totalDogsNumber).toHaveClass('text-gray-900');
      expect(totalDogsNumber).toHaveClass('dark:text-gray-100');
      expect(countriesNumber).toHaveClass('text-gray-900');
      expect(countriesNumber).toHaveClass('dark:text-gray-100');
      
      // New this week uses green (should adjust for dark mode)
      expect(newWeekNumber).toHaveClass('text-green-600');
      expect(newWeekNumber).toHaveClass('dark:text-green-400');
    });

    test('statistics labels have dark mode text colors', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const dogsLabel = screen.getByText('Dogs Available');
      const countriesLabel = screen.getByText('Countries');
      const newWeekLabel = screen.getByText('New This Week');
      
      [dogsLabel, countriesLabel, newWeekLabel].forEach(label => {
        expect(label).toHaveClass('text-gray-600');
        expect(label).toHaveClass('dark:text-gray-400');
      });
    });
  });

  describe('CTA Button Dark Mode', () => {
    test('website CTA button maintains orange theme', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const ctaButton = screen.getByText('Visit Original Website');
      expect(ctaButton).toHaveClass('bg-orange-500');
      expect(ctaButton).toHaveClass('hover:bg-orange-600');
      expect(ctaButton).toHaveClass('dark:bg-orange-600');
      expect(ctaButton).toHaveClass('dark:hover:bg-orange-700');
    });
  });
});