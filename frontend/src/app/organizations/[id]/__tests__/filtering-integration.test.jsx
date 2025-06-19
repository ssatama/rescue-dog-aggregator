/**
 * Integration test for Session 6 filtering system on organization detail pages
 * Organization pages only show Age, Breed, and Sort filters (no location-based filters)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrganizationDetailClient from '../OrganizationDetailClient';

// Mock the services
jest.mock('../../../../services/organizationsService', () => ({
  getOrganizationById: jest.fn(),
  getOrganizationDogs: jest.fn()
}));

// Mock Next.js hooks
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: mockPush })
}));

// Mock the components to focus on integration
jest.mock('../../../../components/layout/Layout', () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock('../../../../components/organizations/OrganizationHero', () => {
  return function MockOrganizationHero({ organization }) {
    return <div data-testid="organization-hero">{organization?.name || 'Organization Hero'}</div>;
  };
});

describe('Session 6 Filtering Integration', () => {
  const mockOrganization = {
    id: 1,
    name: 'Test Rescue Organization',
    description: 'A test rescue organization',
    service_regions: ['TR', 'DE'],
    ships_to: ['DE', 'NL', 'BE'],
    total_dogs: 5,
    website_url: 'https://test.org'
  };

  const mockDogs = [
    {
      id: 1,
      name: 'Buddy',
      age_min_months: 6,
      standardized_breed: 'Golden Retriever',
      created_at: '2024-01-15T10:00:00Z',
      organization: {
        service_regions: ['TR', 'DE'],
        ships_to: ['DE', 'NL', 'BE']
      }
    },
    {
      id: 2,
      name: 'Max',
      age_min_months: 24,
      standardized_breed: 'Labrador Retriever',
      created_at: '2024-02-10T10:00:00Z',
      organization: {
        service_regions: ['TR', 'DE'],
        ships_to: ['DE', 'NL', 'BE']
      }
    },
    {
      id: 3,
      name: 'Luna',
      age_min_months: 48,
      standardized_breed: 'Mixed Breed',
      created_at: '2024-03-01T10:00:00Z',
      organization: {
        service_regions: ['TR', 'DE'],
        ships_to: ['DE', 'NL', 'BE']
      }
    }
  ];

  beforeEach(() => {
    const { getOrganizationById, getOrganizationDogs } = require('../../../../services/organizationsService');
    
    getOrganizationById.mockResolvedValue(mockOrganization);
    getOrganizationDogs.mockResolvedValue(mockDogs);
    
    jest.clearAllMocks();
  });

  describe('Filter System Integration', () => {
    test('renders DogFilters component when dogs are loaded', async () => {
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('dog-filters')).toBeInTheDocument();
      });

      // Check that filter components are present (only age, breed, sort for org pages)
      expect(screen.getByTestId('age-filter')).toBeInTheDocument();
      expect(screen.getByTestId('breed-filter')).toBeInTheDocument();
      expect(screen.getByTestId('sort-filter')).toBeInTheDocument();
      
      // Ships-to and location filters should NOT be present for organization pages
      expect(screen.queryByTestId('location-filter')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ships-to-filter')).not.toBeInTheDocument();
    });

    test('displays correct dog count', async () => {
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByText('3 dogs available')).toBeInTheDocument();
      });
    });

    test('breed filter is populated from dog data', async () => {
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('breed-filter')).toBeInTheDocument();
      });

      // Breed filter should be present and functional
      const breedInput = screen.getByTestId('breed-filter');
      expect(breedInput).toHaveAttribute('placeholder', 'Search breeds...');
    });

    test('filters work correctly - age filter', async () => {
      const user = userEvent.setup();
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('age-filter')).toBeInTheDocument();
        expect(screen.getByText('3 dogs available')).toBeInTheDocument();
      });

      // Apply puppy filter
      const ageSelect = screen.getByTestId('age-filter');
      await user.click(ageSelect);
      await user.click(screen.getByRole('option', { name: 'Puppy' }));

      // Should show only 1 dog (Buddy - 6 months old)
      await waitFor(() => {
        expect(screen.getByText('1 dogs match filters')).toBeInTheDocument();
      });
    });

    test('breed search filter works', async () => {
      const user = userEvent.setup();
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('breed-filter')).toBeInTheDocument();
      });

      // Search for "golden"
      const breedInput = screen.getByTestId('breed-filter');
      await user.type(breedInput, 'golden');

      // Should show only 1 dog (Buddy - Golden Retriever)
      await waitFor(() => {
        expect(screen.getByText('1 dogs match filters')).toBeInTheDocument();
      }, { timeout: 1000 }); // Account for debounce
    });

    test('clear all filters works', async () => {
      const user = userEvent.setup();
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('age-filter')).toBeInTheDocument();
      });

      // Apply a filter first
      const ageSelect = screen.getByTestId('age-filter');
      await user.click(ageSelect);
      await user.click(screen.getByRole('option', { name: 'Puppy' }));

      await waitFor(() => {
        expect(screen.getByTestId('clear-filters-button')).toBeInTheDocument();
      });

      // Clear all filters
      const clearButton = screen.getByTestId('clear-filters-button');
      await user.click(clearButton);

      // Should show all dogs again
      await waitFor(() => {
        expect(screen.getByText('3 dogs available')).toBeInTheDocument();
      });
    });

    test('does not show filters when no dogs available', async () => {
      const { getOrganizationDogs } = require('../../../../services/organizationsService');
      getOrganizationDogs.mockResolvedValue([]); // No dogs

      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByText('0 dogs available')).toBeInTheDocument();
      });

      // Filter component should not be present
      expect(screen.queryByTestId('dog-filters')).not.toBeInTheDocument();
    });

    test('handles loading state correctly', () => {
      // Don't resolve the promises to simulate loading
      const { getOrganizationById, getOrganizationDogs } = require('../../../../services/organizationsService');
      getOrganizationById.mockImplementation(() => new Promise(() => {})); // Never resolves
      getOrganizationDogs.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<OrganizationDetailClient params={{ id: '1' }} />);

      // Should show skeleton screens instead of simple loading
      const loadingSkeletons = screen.getAllByTestId('dog-card-skeleton');
      expect(loadingSkeletons.length).toBeGreaterThan(0);
      expect(screen.queryByTestId('dog-filters')).not.toBeInTheDocument();
    });
  });

  describe('Session 6 Success Criteria Validation', () => {
    test('✓ Filter bar has correct styling (white background, shadow, sticky)', async () => {
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        const filterBar = screen.getByTestId('dog-filters');
        expect(filterBar).toHaveClass('bg-white');
        expect(filterBar).toHaveClass('shadow-sm');
        expect(filterBar).toHaveClass('md:sticky');
      });
    });

    test('✓ All required filter options are present for organization pages', async () => {
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        // Age groups filter
        expect(screen.getByTestId('age-filter')).toBeInTheDocument();
        
        // Breed search
        expect(screen.getByTestId('breed-filter')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Search breeds...')).toBeInTheDocument();
        
        // Sort dropdown
        expect(screen.getByTestId('sort-filter')).toBeInTheDocument();
        
        // Location filters should NOT be present for organization pages
        expect(screen.queryByTestId('location-filter')).not.toBeInTheDocument();
        expect(screen.queryByTestId('ships-to-filter')).not.toBeInTheDocument();
      });
    });

    test('✓ Active filter count and clear all functionality', async () => {
      const user = userEvent.setup();
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('age-filter')).toBeInTheDocument();
      });

      // Apply filter
      const ageSelect = screen.getByTestId('age-filter');
      await user.click(ageSelect);
      await user.click(screen.getByRole('option', { name: 'Puppy' }));

      // Check active filter badge and clear all button appear
      await waitFor(() => {
        expect(screen.getByTestId('active-filters-badge')).toBeInTheDocument();
        expect(screen.getByTestId('clear-filters-button')).toBeInTheDocument();
        expect(screen.getByText('Clear all')).toBeInTheDocument();
      });
    });

    test('✓ Dog count shows filter results', async () => {
      const user = userEvent.setup();
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByText('3 dogs available')).toBeInTheDocument();
      });

      // Apply filter
      const ageSelect = screen.getByTestId('age-filter');
      await user.click(ageSelect);
      await user.click(screen.getByRole('option', { name: 'Puppy' }));

      // Count should update to show filtered results
      await waitFor(() => {
        expect(screen.getByText('1 dogs match filters')).toBeInTheDocument();
      });
    });
  });
});