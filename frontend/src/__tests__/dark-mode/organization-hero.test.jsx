/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrganizationHero from '../../components/organizations/OrganizationHero';

// Mock CountryFlag component to avoid country data dependencies
jest.mock('../../components/ui/CountryFlag', () => {
  return function MockCountryFlag({ countryCode, className }) {
    return <span data-testid={`flag-${countryCode}`} className={className}>🏴</span>;
  };
});

// Mock SocialMediaLinks component
jest.mock('../../components/ui/SocialMediaLinks', () => {
  return function MockSocialMediaLinks({ socialMedia, className }) {
    return <div data-testid="social-media-links" className={className}>Social Links</div>;
  };
});

// Mock StyledLink component
jest.mock('../../components/ui/StyledLink', () => {
  return function MockStyledLink({ href, children, variant, className }) {
    return <a href={href} className={className}>{children}</a>;
  };
});

const mockOrganization = {
  id: 1,
  name: "REAN (Rescuing European Animals in Need)",
  country: "GB",
  city: "London",
  service_regions: ["GB", "DE"],
  ships_to: ["GB", "DE", "FR"],
  description: "UK charity rescuing dogs from Romanian shelters and streets, transporting to UK homes",
  website_url: "https://rean.org.uk",
  total_dogs: 28,
  new_this_week: 5,
  social_media: {
    facebook: "https://facebook.com/rean",
    instagram: "https://instagram.com/rean"
  }
};

describe('OrganizationHero Dark Mode', () => {
  beforeEach(() => {
    // Reset document classes
    document.documentElement.className = '';
  });

  test('organization hero has dark background in dark mode', () => {
    // Set dark mode
    document.documentElement.classList.add('dark');
    
    render(<OrganizationHero organization={mockOrganization} />);
    
    const heroSection = screen.getByTestId('organization-hero');
    expect(heroSection).toBeInTheDocument();
    
    // Should have dark mode gradient classes for subtle dark background
    expect(heroSection).toHaveClass('dark:from-gray-800');
    expect(heroSection).toHaveClass('dark:to-gray-700');
    
    // Verify dark class is applied to document
    expect(document.documentElement).toHaveClass('dark');
  });

  test('organization hero has light background in light mode', () => {
    // Light mode (default)
    render(<OrganizationHero organization={mockOrganization} />);
    
    const heroSection = screen.getByTestId('organization-hero');
    expect(heroSection).toBeInTheDocument();
    
    // Should have gradient background
    expect(heroSection).toHaveClass('bg-gradient-to-br');
    
    // Verify dark class is NOT applied to document
    expect(document.documentElement).not.toHaveClass('dark');
  });

  test('statistics cards have proper dark mode styling', () => {
    // Set dark mode
    document.documentElement.classList.add('dark');
    
    render(<OrganizationHero organization={mockOrganization} />);
    
    const statisticsCards = screen.getByTestId('statistics-cards');
    expect(statisticsCards).toBeInTheDocument();
    
    // Find all the statistic cards
    const cards = statisticsCards.querySelectorAll('div.bg-white');
    expect(cards.length).toBeGreaterThan(0);
    
    // Each card should have dark mode background classes
    cards.forEach(card => {
      expect(card).toHaveClass('dark:bg-gray-800');
    });
  });

  test('handles missing organization gracefully in dark mode', () => {
    // Set dark mode
    document.documentElement.classList.add('dark');
    
    render(<OrganizationHero organization={null} />);
    
    expect(screen.getByText('Organization not found')).toBeInTheDocument();
    expect(screen.getByText('← Back to Organizations')).toBeInTheDocument();
  });
});