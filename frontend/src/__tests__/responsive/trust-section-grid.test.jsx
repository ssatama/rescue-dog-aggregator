/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrustSection from '../../components/home/TrustSection';

// Mock the statistics service
jest.mock('../../services/animalsService', () => ({
  getStatistics: jest.fn(() => Promise.resolve({
    total_dogs: 450,
    total_organizations: 7,
    countries: ['DE', 'TR', 'UK', 'US', 'FR', 'ES', 'IT'],
    organizations: [
      { id: 1, name: 'REAN', dog_count: 28, logo_url: 'https://example.com/logo1.jpg' },
      { id: 2, name: 'Pets in Turkey', dog_count: 33, logo_url: 'https://example.com/logo2.jpg' },
      { id: 3, name: 'Tierschutzverein Europa e.V.', dog_count: 332, logo_url: 'https://example.com/logo3.jpg' },
      { id: 4, name: 'German Shepherd Rescue', dog_count: 45, logo_url: 'https://example.com/logo4.jpg' },
      { id: 5, name: 'French Bulldog Rescue', dog_count: 23, logo_url: 'https://example.com/logo5.jpg' },
      { id: 6, name: 'Golden Retriever Rescue', dog_count: 67, logo_url: 'https://example.com/logo6.jpg' },
      { id: 7, name: 'Mixed Breed Rescue', dog_count: 89, logo_url: 'https://example.com/logo7.jpg' }
    ]
  }))
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  reportError: jest.fn()
}));

// Mock OrganizationCard component
jest.mock('../../components/organizations/OrganizationCard', () => {
  return function MockOrganizationCard({ organization, size }) {
    return (
      <div 
        data-testid="organization-card"
        data-org-id={organization.id}
        data-size={size}
        className="organization-card-mock"
      >
        <h3>{organization.name}</h3>
        <p>{organization.dog_count} dogs</p>
        <button>{organization.dog_count} Dogs</button>
      </div>
    );
  };
});

describe('TrustSection Responsive Grid', () => {
  // Helper function to set viewport size
  const setViewportSize = (width, height) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
    
    // Update the CSS media query matching
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  };

  beforeEach(() => {
    // Reset viewport to default
    setViewportSize(1024, 768);
  });

  test('renders organizations grid with correct test id', async () => {
    render(<TrustSection />);
    
    // Wait for statistics to load
    await screen.findByTestId('organizations-grid');
    
    const grid = screen.getByTestId('organizations-grid');
    expect(grid).toBeInTheDocument();
  });

  test('displays all 7 organizations when showing first 8', async () => {
    render(<TrustSection />);
    
    // Wait for organizations to load
    await screen.findByTestId('organizations-grid');
    
    const organizationCards = screen.getAllByTestId('organization-card');
    expect(organizationCards).toHaveLength(7);
  });

  test('has responsive grid classes for progressive enhancement', async () => {
    render(<TrustSection />);
    
    // Wait for organizations to load
    await screen.findByTestId('organizations-grid');
    
    const grid = screen.getByTestId('organizations-grid');
    
    // Test for expected responsive grid classes
    // This test will FAIL initially with current implementation
    expect(grid).toHaveClass('grid');
    expect(grid).toHaveClass('grid-cols-1'); // Mobile first
    expect(grid).toHaveClass('sm:grid-cols-2'); // Small breakpoint
    expect(grid).toHaveClass('lg:grid-cols-3'); // Large breakpoint
    expect(grid).toHaveClass('xl:grid-cols-4'); // Extra large breakpoint
  });

  test('has progressive gap spacing classes', async () => {
    render(<TrustSection />);
    
    // Wait for organizations to load
    await screen.findByTestId('organizations-grid');
    
    const grid = screen.getByTestId('organizations-grid');
    
    // Test for progressive gap spacing
    // This test will FAIL initially with current implementation
    expect(grid).toHaveClass('gap-4'); // Base gap
    expect(grid).toHaveClass('sm:gap-6'); // Small screen gap
    expect(grid).toHaveClass('lg:gap-8'); // Large screen gap
  });

  test('uses max-w-7xl container for better desktop utilization', async () => {
    render(<TrustSection />);
    
    // Wait for organizations to load
    await screen.findByTestId('organizations-grid');
    
    const grid = screen.getByTestId('organizations-grid');
    
    // Test for expanded container width
    // This test will FAIL initially with current implementation
    expect(grid).toHaveClass('max-w-7xl');
    expect(grid).toHaveClass('mx-auto');
  });

  test('organization cards have proper size prop', async () => {
    render(<TrustSection />);
    
    // Wait for organizations to load
    await screen.findByTestId('organizations-grid');
    
    const organizationCards = screen.getAllByTestId('organization-card');
    
    // All cards should have size="small" prop
    organizationCards.forEach(card => {
      expect(card).toHaveAttribute('data-size', 'small');
    });
  });

  test('CTA buttons are visible and properly formatted', async () => {
    render(<TrustSection />);
    
    // Wait for organizations to load
    await screen.findByTestId('organizations-grid');
    
    const ctaButtons = screen.getAllByRole('button', { name: /\d+ Dogs/i });
    
    // Should have 7 CTA buttons (one per organization)
    expect(ctaButtons).toHaveLength(7);
    
    // Each button should contain "X Dogs" text
    ctaButtons.forEach(button => {
      expect(button.textContent).toMatch(/\d+ Dogs/);
    });
  });

  test('grid maintains proper spacing without content overflow', async () => {
    render(<TrustSection />);
    
    // Wait for organizations to load
    await screen.findByTestId('organizations-grid');
    
    const grid = screen.getByTestId('organizations-grid');
    const organizationCards = screen.getAllByTestId('organization-card');
    
    // Grid should have bottom margin
    expect(grid).toHaveClass('mb-6');
    
    // All cards should be properly contained within grid
    organizationCards.forEach(card => {
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('organization-card-mock');
    });
  });

  test('shows "Show More" button when there are more than 8 organizations', async () => {
    render(<TrustSection />);
    
    // Wait for organizations to load
    await screen.findByTestId('organizations-grid');
    
    // With 7 organizations, there should be no "Show More" button
    const showMoreButton = screen.queryByText(/\+ \d+ more organizations/i);
    expect(showMoreButton).not.toBeInTheDocument();
  });

  test('grid has proper semantic structure', async () => {
    render(<TrustSection />);
    
    // Wait for organizations to load
    await screen.findByTestId('organizations-grid');
    
    const grid = screen.getByTestId('organizations-grid');
    
    // Grid should be a div with proper ARIA structure
    expect(grid.tagName).toBe('DIV');
    expect(grid).toHaveAttribute('data-testid', 'organizations-grid');
  });

  test('handles empty organizations array gracefully', async () => {
    // Mock empty organizations response
    const mockGetStatistics = require('../../services/animalsService').getStatistics;
    mockGetStatistics.mockResolvedValueOnce({
      total_dogs: 0,
      total_organizations: 0,
      countries: [],
      organizations: []
    });

    render(<TrustSection />);
    
    // Wait for component to load
    await screen.findByTestId('trust-section');
    
    // Grid should still exist but with no cards
    const grid = screen.queryByTestId('organizations-grid');
    if (grid) {
      const organizationCards = screen.queryAllByTestId('organization-card');
      expect(organizationCards).toHaveLength(0);
    }
  });
});