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

    test('shows Load More button when organization has more than 20 dogs', async () => {
      // Mock an organization with many dogs
      const { getOrganizationById, getOrganizationDogs } = require('../../../../services/organizationsService');
      
      const largeMockOrganization = {
        ...mockOrganization,
        total_dogs: 28
      };
      
      // Mock first page of 20 dogs
      const firstPageDogs = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Dog ${i + 1}`,
        age_min_months: 12 + i,
        standardized_breed: 'Mixed Breed',
        created_at: '2024-01-01T10:00:00Z',
        organization: mockOrganization
      }));
      
      getOrganizationById.mockResolvedValue(largeMockOrganization);
      getOrganizationDogs.mockResolvedValue(firstPageDogs);

      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByText('20 of 28 dogs')).toBeInTheDocument();
        expect(screen.getByTestId('load-more-button')).toBeInTheDocument();
      });
    });

    test('Load More button loads additional dogs when clicked', async () => {
      const user = userEvent.setup();
      const { getOrganizationById, getOrganizationDogs } = require('../../../../services/organizationsService');
      
      const largeMockOrganization = {
        ...mockOrganization,
        total_dogs: 28
      };
      
      // Mock first page
      const firstPageDogs = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Dog ${i + 1}`,
        age_min_months: 12 + i,
        standardized_breed: 'Mixed Breed',
        created_at: '2024-01-01T10:00:00Z',
        organization: mockOrganization
      }));
      
      // Mock second page (remaining 8 dogs)
      const secondPageDogs = Array.from({ length: 8 }, (_, i) => ({
        id: i + 21,
        name: `Dog ${i + 21}`,
        age_min_months: 12 + i + 20,
        standardized_breed: 'Mixed Breed',
        created_at: '2024-01-01T10:00:00Z',
        organization: mockOrganization
      }));
      
      getOrganizationById.mockResolvedValue(largeMockOrganization);
      getOrganizationDogs
        .mockResolvedValueOnce(firstPageDogs) // First call
        .mockResolvedValueOnce(secondPageDogs); // Second call after Load More

      render(<OrganizationDetailClient params={{ id: '1' }} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('20 of 28 dogs')).toBeInTheDocument();
        expect(screen.getByTestId('load-more-button')).toBeInTheDocument();
      });

      // Click Load More
      await user.click(screen.getByTestId('load-more-button'));

      // Should show all dogs and hide Load More button
      await waitFor(() => {
        expect(screen.getByText('28 dogs available')).toBeInTheDocument();
        expect(screen.queryByTestId('load-more-button')).not.toBeInTheDocument();
      });
    });

    test('displays correct total count in organization stats when dogs are paginated', async () => {
      const { getOrganizationById, getOrganizationDogs } = require('../../../../services/organizationsService');
      
      const largeMockOrganization = {
        ...mockOrganization,
        total_dogs: 28
      };
      
      const firstPageDogs = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Dog ${i + 1}`,
        age_min_months: 12 + i,
        standardized_breed: 'Mixed Breed',
        created_at: '2024-01-01T10:00:00Z',
        organization: mockOrganization
      }));
      
      getOrganizationById.mockResolvedValue(largeMockOrganization);
      getOrganizationDogs.mockResolvedValue(firstPageDogs);

      render(<OrganizationDetailClient params={{ id: '1' }} />);

      // The organization hero should show the total count from organization data
      await waitFor(() => {
        expect(screen.getByTestId('organization-hero')).toBeInTheDocument();
      });
      
      // The available dogs section should show loaded vs total
      await waitFor(() => {
        expect(screen.getByText('20 of 28 dogs')).toBeInTheDocument();
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

  describe('Mobile Filter Sheet Integration', () => {
    // Mock window.matchMedia for mobile tests
    beforeEach(() => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('max-width'), // Simulate mobile for max-width queries
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      // Mock document.body.style for scroll lock tests
      Object.defineProperty(document.body, 'style', {
        writable: true,
        value: {
          overflow: ''
        }
      });
    });

    test('renders mobile filter button when data is loaded', async () => {
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-filter-button')).toBeInTheDocument();
      });

      // Button should show Filter & Sort text
      expect(screen.getByText('Filter & Sort')).toBeInTheDocument();
    });

    test('mobile filter button shows active filter count', async () => {
      const user = userEvent.setup();
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('age-filter')).toBeInTheDocument();
      });

      // Apply a filter first (use desktop controls)
      const ageSelect = screen.getByTestId('age-filter');
      await user.click(ageSelect);
      await user.click(screen.getByRole('option', { name: 'Puppy' }));

      // Mobile button should show active filter badge
      await waitFor(() => {
        expect(screen.getByTestId('mobile-active-filters-badge')).toBeInTheDocument();
        expect(screen.getByTestId('mobile-active-filters-badge')).toHaveTextContent('1');
      });
    });

    test('mobile filter button opens bottom sheet', async () => {
      const user = userEvent.setup();
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-filter-button')).toBeInTheDocument();
      });

      // Click mobile filter button
      await user.click(screen.getByTestId('mobile-filter-button'));

      // Bottom sheet should open
      await waitFor(() => {
        expect(screen.getByTestId('mobile-filter-sheet')).toBeInTheDocument();
      });

      // Check for organization-specific filter sections (age, breed, sort only)
      expect(screen.getByTestId('age-filter-All')).toBeInTheDocument();
      expect(screen.getByTestId('breed-search-input')).toBeInTheDocument();
      expect(screen.getByTestId('sort-filter-newest')).toBeInTheDocument();

      // Sex, size, and organization filters should NOT be present
      expect(screen.queryByTestId('sex-filter-Any')).not.toBeInTheDocument();
      expect(screen.queryByTestId('size-filter-Any size')).not.toBeInTheDocument();
      expect(screen.queryByTestId('organization-filter-any')).not.toBeInTheDocument();
    });

    test('mobile filter sheet applies filters correctly', async () => {
      const user = userEvent.setup();
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-filter-button')).toBeInTheDocument();
        expect(screen.getByText('3 dogs available')).toBeInTheDocument();
      });

      // Open mobile filter sheet
      await user.click(screen.getByTestId('mobile-filter-button'));

      // Select Puppy age filter
      await user.click(screen.getByTestId('age-filter-Puppy'));

      // Apply filters (close sheet)
      await user.click(screen.getByText('Apply Filters (1 dogs)'));

      // Should show filtered results
      await waitFor(() => {
        expect(screen.getByText('1 dogs match filters')).toBeInTheDocument();
      });
    });

    test('mobile filter sheet breed search works', async () => {
      const user = userEvent.setup();
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-filter-button')).toBeInTheDocument();
      });

      // Open mobile filter sheet
      await user.click(screen.getByTestId('mobile-filter-button'));

      // Type in breed search
      const breedInput = screen.getByTestId('breed-search-input');
      await user.type(breedInput, 'golden');

      // Wait for debounce and apply
      await user.click(screen.getByText(/Apply Filters/));

      // Should show filtered results
      await waitFor(() => {
        expect(screen.getByText('1 dogs match filters')).toBeInTheDocument();
      }, { timeout: 1000 });
    });

    test('mobile filter sheet clear all works', async () => {
      const user = userEvent.setup();
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-filter-button')).toBeInTheDocument();
      });

      // Apply a filter first (using desktop controls)
      const ageSelect = screen.getByTestId('age-filter');
      await user.click(ageSelect);
      await user.click(screen.getByRole('option', { name: 'Puppy' }));

      await waitFor(() => {
        expect(screen.getByText('1 dogs match filters')).toBeInTheDocument();
      });

      // Open mobile filter sheet
      await user.click(screen.getByTestId('mobile-filter-button'));

      // Click clear all button
      await user.click(screen.getByTestId('clear-all-button'));

      // Close sheet
      await user.click(screen.getByText(/Apply Filters/));

      // Should show all dogs again
      await waitFor(() => {
        expect(screen.getByText('3 dogs available')).toBeInTheDocument();
      });
    });

    test('mobile filter sheet closes with backdrop click', async () => {
      const user = userEvent.setup();
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-filter-button')).toBeInTheDocument();
      });

      // Open mobile filter sheet
      await user.click(screen.getByTestId('mobile-filter-button'));

      await waitFor(() => {
        expect(screen.getByTestId('mobile-filter-sheet')).toBeInTheDocument();
      });

      // Click backdrop
      await user.click(screen.getByTestId('filter-backdrop'));

      // Sheet should close
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-filter-sheet')).not.toBeInTheDocument();
      });
    });

    test('mobile filter sheet accessibility compliance', async () => {
      const user = userEvent.setup();
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-filter-button')).toBeInTheDocument();
      });

      // Check mobile button accessibility
      const mobileButton = screen.getByTestId('mobile-filter-button');
      expect(mobileButton).toHaveAttribute('aria-label', 'Open filter and sort options');

      // Open filter sheet
      await user.click(mobileButton);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-filter-sheet')).toBeInTheDocument();
      });

      // Check sheet accessibility
      const filterSheet = screen.getByTestId('mobile-filter-sheet');
      expect(filterSheet).toHaveAttribute('role', 'dialog');
      expect(filterSheet).toHaveAttribute('aria-label', 'Filter and sort options');
      expect(filterSheet).toHaveAttribute('aria-modal', 'true');

      // Check filter buttons are properly sized (48px minimum for touch targets)
      const ageButtons = screen.getAllByTestId(/^age-filter-/);
      ageButtons.forEach(button => {
        expect(button).toHaveClass('min-h-[48px]');
      });

      // Check breed search input accessibility
      const breedInput = screen.getByTestId('breed-search-input');
      expect(breedInput).toHaveAttribute('aria-label', 'Search for specific breed');
      expect(breedInput).toHaveClass('min-h-[48px]');
    });

    test('hides count text on mobile to avoid crowding', async () => {
      render(<OrganizationDetailClient params={{ id: '1' }} />);

      await waitFor(() => {
        expect(screen.getByTestId('mobile-filter-button')).toBeInTheDocument();
      });

      // Check that count texts are hidden on mobile (using hidden md:block/inline classes)
      // The page title section count should be hidden on mobile
      const titleSection = screen.getByText('Available Dogs').parentElement;
      const countInTitle = titleSection?.querySelector('.hidden.md\\:block');
      expect(countInTitle).toBeInTheDocument();

      // The filter bar count should also be hidden on mobile  
      const filtersContainer = screen.getByTestId('dog-filters');
      const countInFilters = filtersContainer.querySelector('.hidden.md\\:inline');
      expect(countInFilters).toBeInTheDocument();

      // Mobile filter button should be visible
      expect(screen.getByTestId('mobile-filter-button')).toBeInTheDocument();
      expect(screen.getByText('Filter & Sort')).toBeInTheDocument();
    });
  });
});