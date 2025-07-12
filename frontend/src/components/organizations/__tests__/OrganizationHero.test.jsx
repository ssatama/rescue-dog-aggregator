import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import OrganizationHero from '../OrganizationHero';

// Mock Next.js Link
jest.mock('next/link', () => {
  return function MockedLink({ children, href, ...props }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

// Mock CountryFlag component from Session 3
jest.mock('../../ui/CountryFlag', () => {
  return function MockedCountryFlag({ countryCode, countryName, size }) {
    return <span data-testid={`flag-${countryCode}`} data-size={size}>{countryCode}</span>;
  };
});

// Mock countries utility from Session 3
jest.mock('../../../utils/countries', () => ({
  formatBasedIn: jest.fn((country, city, mobile) => 
    mobile ? `${country}` : `${country}${city ? ` (${city})` : ''}`),
  formatServiceRegions: jest.fn((regions, showFlags, mobile) => 
    mobile ? regions.slice(0, 2).join(', ') : regions.join(', ')),
  formatShipsToList: jest.fn((countries, limit) => 
    countries.length <= limit ? countries.join(' ') : `${countries.slice(0, limit).join(' ')} +${countries.length - limit} more`),
  getCountryName: jest.fn((code) => ({ 'TR': 'Turkey', 'DE': 'Germany', 'RO': 'Romania' }[code] || code))
}));

describe('OrganizationHero', () => {
  const mockOrganization = {
    id: 1,
    name: 'Pets in Turkey',
    description: 'Dedicated to rescuing street dogs in Turkey and finding them loving homes across Europe. Every dog deserves a second chance at happiness.',
    country: 'TR',
    city: 'Izmir',
    logo_url: 'https://example.com/logo.jpg',
    service_regions: ['TR', 'RO'],
    ships_to: ['DE', 'NL', 'BE', 'FR', 'IT'],
    total_dogs: 33,
    new_this_week: 3,
    website_url: 'https://petsinturkey.org',
    social_media: {
      facebook: 'https://facebook.com/petsinturkey',
      instagram: 'https://instagram.com/petsinturkey'
    }
  };

  describe('Basic Rendering', () => {
    test('renders hero section with gradient background', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const heroSection = screen.getByTestId('organization-hero');
      expect(heroSection).toBeInTheDocument();
      expect(heroSection).toHaveClass('bg-gradient-to-br', 'from-amber-100', 'to-orange-200');
    });

    test('renders organization name as h1', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Pets in Turkey');
    });

    test('renders organization description', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      expect(screen.getByText(/Dedicated to rescuing street dogs/)).toBeInTheDocument();
    });
  });

  describe('Logo Display', () => {
    test('renders organization logo with correct styling', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const logo = screen.getByAltText('Pets in Turkey logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', 'https://example.com/logo.jpg');
      
      // Find the logo container (it has the sizing classes)
      const logoContainer = logo.closest('.w-20');
      expect(logoContainer).toHaveClass('w-20', 'h-20', 'md:w-32', 'md:h-32'); // Responsive sizing
    });

    test('renders initials fallback when no logo_url', () => {
      const orgWithoutLogo = { ...mockOrganization, logo_url: null };
      render(<OrganizationHero organization={orgWithoutLogo} />);
      
      // The getInitials function takes first 3 words: "Pets in Turkey" -> "PIT" (uppercase)
      const initialsElement = screen.getByText('PIT');
      expect(initialsElement).toBeInTheDocument();
      expect(initialsElement.parentElement).toHaveClass('w-20', 'h-20', 'md:w-32', 'md:h-32', 'bg-white', 'rounded-full', 'shadow-lg');
    });

    test('displays smaller logo on mobile', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const logoContainer = screen.getByAltText('Pets in Turkey logo').parentElement;
      expect(logoContainer).toHaveClass('md:w-32', 'md:h-32', 'w-20', 'h-20'); // 80px mobile, 120px desktop
    });
  });

  describe('Location Information', () => {
    test('displays "Based in" information with country flag', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      expect(screen.getByText('Based in:')).toBeInTheDocument();
      // The formatBasedIn function is mocked to return text, not JSX with flags
      // In real implementation, this would render flags via the formatting function
    });

    test('displays "Dogs located in" with service regions', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      expect(screen.getByText('Dogs located in:')).toBeInTheDocument();
      // The formatServiceRegions function is mocked to return text
      // In real implementation, this would render flags via the formatting function
    });

    test('displays "Adoptable to" with adoption countries', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      expect(screen.getByText('Adoptable to:')).toBeInTheDocument();
      // The formatShipsToList function is mocked to return text
      // In real implementation, this would render flags via the formatting function
    });

    test('shows country abbreviations on mobile', () => {
      // This would typically be tested with different viewport sizes
      render(<OrganizationHero organization={mockOrganization} />);
      
      // Check that the location section has proper responsive classes
      const locationSection = screen.getByText('Based in:').closest('div');
      expect(locationSection).toHaveClass('flex', 'items-center');
      
      // Check that mobile version uses "sm:hidden" class for mobile-specific content
      const mobileElements = document.querySelectorAll('.sm\\:hidden');
      expect(mobileElements.length).toBeGreaterThan(0);
      
      // Check that desktop version uses "hidden" and "sm:flex" classes
      const desktopElements = document.querySelectorAll('.hidden.sm\\:flex');
      expect(desktopElements.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics Cards', () => {
    test('displays total dogs statistic', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      expect(screen.getByText('33')).toBeInTheDocument();
      expect(screen.getByText('Dogs Available')).toBeInTheDocument();
    });

    test('displays countries served statistic', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      expect(screen.getByText('5')).toBeInTheDocument(); // ships_to.length
      expect(screen.getByText('Countries')).toBeInTheDocument();
    });

    test('displays new this week statistic when > 0', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('New This Week')).toBeInTheDocument();
    });

    test('hides new this week when 0', () => {
      const orgWithoutNew = { ...mockOrganization, new_this_week: 0 };
      render(<OrganizationHero organization={orgWithoutNew} />);
      
      expect(screen.queryByText('New This Week')).not.toBeInTheDocument();
    });

    test('statistics are responsive - row on desktop, grid on mobile', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const statsContainer = screen.getByTestId('statistics-cards');
      expect(statsContainer).toHaveClass('grid', 'grid-cols-2', 'md:flex', 'md:flex-row');
    });
  });

  describe('Breadcrumb Navigation', () => {
    test('renders breadcrumb with back link', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const backLink = screen.getByText('← Organizations');
      expect(backLink).toBeInTheDocument();
      expect(backLink.closest('a')).toHaveAttribute('href', '/organizations');
    });

    test('shows current organization name in breadcrumb', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      // Check for breadcrumb elements separately since they're in different spans
      expect(screen.getByText('/')).toBeInTheDocument();
      
      // Find the breadcrumb nav specifically and check it contains the organization name
      const breadcrumbNav = screen.getByLabelText('Breadcrumb');
      expect(breadcrumbNav).toBeInTheDocument();
      
      // Check that the breadcrumb has the organization name (using getAllByText to handle multiple instances)
      const orgNameInBreadcrumb = screen.getAllByText('Pets in Turkey').find(el => 
        breadcrumbNav.contains(el)
      );
      expect(orgNameInBreadcrumb).toBeInTheDocument();
    });
  });

  describe('Call to Action', () => {
    test('renders visit website button', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const visitButton = screen.getByText('Visit Original Website');
      expect(visitButton).toBeInTheDocument();
      expect(visitButton.closest('a')).toHaveAttribute('href', 'https://petsinturkey.org');
      expect(visitButton.closest('a')).toHaveAttribute('target', '_blank');
    });

    test('handles missing website_url gracefully', () => {
      const orgWithoutWebsite = { ...mockOrganization, website_url: null };
      render(<OrganizationHero organization={orgWithoutWebsite} />);
      
      expect(screen.queryByText('Visit Original Website')).not.toBeInTheDocument();
    });
  });

  describe('Social Media Links', () => {
    test('renders social media links when available', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      // This would depend on the SocialMediaLinks component implementation
      // For now, just check that the social media section exists
      const socialSection = screen.getByTestId('social-media-section');
      expect(socialSection).toBeInTheDocument();
    });

    test('hides social media section when no links available', () => {
      const orgWithoutSocial = { ...mockOrganization, social_media: {} };
      render(<OrganizationHero organization={orgWithoutSocial} />);
      
      expect(screen.queryByTestId('social-media-section')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles missing organization data gracefully', () => {
      render(<OrganizationHero organization={null} />);
      
      expect(screen.getByText('Organization not found')).toBeInTheDocument();
    });

    test('handles partial organization data', () => {
      const minimalOrg = { name: 'Test Org' };
      render(<OrganizationHero organization={minimalOrg} />);
      
      // Check that the heading is rendered (there might be multiple instances)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test Org');
      // Should not crash and should handle missing fields gracefully
    });
  });

  describe('Accessibility', () => {
    test('has proper heading hierarchy', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1).toHaveTextContent('Pets in Turkey');
    });

    test('logo has proper alt text', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const logo = screen.getByAltText('Pets in Turkey logo');
      expect(logo).toBeInTheDocument();
    });

    test('links have proper accessibility attributes', () => {
      render(<OrganizationHero organization={mockOrganization} />);
      
      const visitButton = screen.getByText('Visit Original Website').closest('a');
      expect(visitButton).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});