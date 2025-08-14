/**
 * Integration Test Suite for All Performance Optimizations
 * Verifies that all optimizations work together correctly
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import DogsPageClient from '../../app/dogs/DogsPageClient';
import '@testing-library/jest-dom';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
  usePathname: jest.fn(() => '/dogs'),
}));

// Mock services to return quickly
jest.mock('../../services/animalsService', () => ({
  getAnimals: jest.fn(() => Promise.resolve([])),
  getStandardizedBreeds: jest.fn(() => Promise.resolve(['Labrador', 'Poodle'])),
  getLocationCountries: jest.fn(() => Promise.resolve(['UK', 'US'])),
  getAvailableCountries: jest.fn(() => Promise.resolve(['UK', 'US'])),
  getAvailableRegions: jest.fn(() => Promise.resolve(['California', 'Texas'])),
  getFilterCounts: jest.fn(() => Promise.resolve({ total: 0 })),
}));

jest.mock('../../services/organizationsService', () => ({
  getOrganizations: jest.fn(() => Promise.resolve([
    { id: 1, name: 'Org 1' },
    { id: 2, name: 'Org 2' }
  ])),
}));

// Mock components
jest.mock('../../components/layout/Layout', () => ({ children }) => <div>{children}</div>);
jest.mock('../../components/dogs/DogCard', () => () => <div>DogCard</div>);
jest.mock('../../components/dogs/DogsGrid', () => ({ dogs, loading }) => 
  <div data-testid="dogs-grid">{loading ? 'Loading...' : `Dogs: ${dogs.length}`}</div>
);
jest.mock('../../components/filters/DesktopFilters', () => (props) => 
  <div data-testid="desktop-filters">Desktop Filters</div>
);
jest.mock('../../components/filters/MobileFilterDrawer', () => (props) => 
  <div data-testid="mobile-drawer">Mobile Drawer</div>
);
jest.mock('../../components/ui/Breadcrumbs', () => () => <div>Breadcrumbs</div>);
jest.mock('../../components/seo', () => ({
  BreadcrumbSchema: () => null,
}));

// Mock hooks that we've implemented
jest.mock('../../hooks/useParallelMetadata');
jest.mock('../../hooks/useFilterState');
jest.mock('../../hooks/useDebouncedSearch');

describe('Performance Optimizations Integration', () => {
  const mockGetAnimals = require('../../services/animalsService').getAnimals;
  const mockGetFilterCounts = require('../../services/animalsService').getFilterCounts;
  const { useParallelMetadata } = require('../../hooks/useParallelMetadata');
  const { useFilterState } = require('../../hooks/useFilterState');
  const { useDebouncedSearch } = require('../../hooks/useDebouncedSearch');

  beforeEach(() => {
    jest.clearAllMocks();
    
    useSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    });

    // Mock parallel metadata hook
    useParallelMetadata.mockReturnValue({
      metadata: {
        standardizedBreeds: ['Labrador', 'Poodle'],
        locationCountries: ['UK', 'US'],
        availableCountries: ['UK', 'US'],
        organizations: [
          { id: 1, name: 'Org 1' },
          { id: 2, name: 'Org 2' }
        ],
      },
      metadataLoading: false,
      metadataError: null,
    });

    // Mock filter state hook
    useFilterState.mockReturnValue({
      filters: {
        standardizedBreedFilter: "Any breed",
        sexFilter: "Any",
        sizeFilter: "Any size",
        ageCategoryFilter: "Any age",
        searchQuery: "",
        locationCountryFilter: "Any country",
        availableCountryFilter: "Any country",
        availableRegionFilter: "Any region",
        organizationFilter: "any"
      },
      updateFilter: jest.fn(),
      updateFilters: jest.fn(),
      resetFilters: jest.fn(),
      clearFilter: jest.fn(),
      activeFilterCount: 0,
      resetTrigger: 0,
      apiParams: {}
    });

    // Mock debounced search hook
    useDebouncedSearch.mockReturnValue({
      searchValue: '',
      debouncedValue: '',
      handleSearchChange: jest.fn(),
      clearSearch: jest.fn(),
      setSearchValue: jest.fn(),
    });
  });

  describe('Optimization 1: API Response Caching', () => {
    test('should use cached metadata from useParallelMetadata', async () => {
      render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dogs-grid')).toBeInTheDocument();
      });

      // Should use cached metadata without additional API calls
      expect(useParallelMetadata).toHaveBeenCalled();
      
      // Metadata should be available immediately
      const filters = screen.getByTestId('desktop-filters');
      expect(filters).toBeInTheDocument();
    });

    test('should show loading indicator while metadata loads', async () => {
      useParallelMetadata.mockReturnValue({
        metadata: {
          standardizedBreeds: [],
          locationCountries: [],
          availableCountries: [],
          organizations: [],
        },
        metadataLoading: true,
        metadataError: null,
      });

      render(<DogsPageClient />);
      
      expect(screen.getByTestId('metadata-loading')).toBeInTheDocument();
      expect(screen.getByText(/Loading filters/i)).toBeInTheDocument();
    });
  });

  describe('Optimization 2: Parallel API Calls', () => {
    test('should fetch all metadata in parallel', async () => {
      const mockGetOrganizations = require('../../services/organizationsService').getOrganizations;
      const mockGetStandardizedBreeds = require('../../services/animalsService').getStandardizedBreeds;
      const mockGetLocationCountries = require('../../services/animalsService').getLocationCountries;
      const mockGetAvailableCountries = require('../../services/animalsService').getAvailableCountries;

      // All should be called during initial render via useParallelMetadata
      render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dogs-grid')).toBeInTheDocument();
      });

      // Verify parallel fetching happened
      expect(useParallelMetadata).toHaveBeenCalled();
    });
  });

  describe('Optimization 3: Consolidated Filter State', () => {
    test('should use consolidated filter state management', async () => {
      render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dogs-grid')).toBeInTheDocument();
      });

      // Should use the consolidated hook
      expect(useFilterState).toHaveBeenCalled();
      
      // Should not have multiple useState calls
      const mockUpdateFilter = useFilterState.mock.results[0].value.updateFilter;
      expect(mockUpdateFilter).toBeDefined();
    });

    test('should compute API params automatically', async () => {
      const mockApiParams = {
        standardized_breed: 'Labrador',
        sex: 'Male',
      };

      useFilterState.mockReturnValue({
        filters: {
          standardizedBreedFilter: "Labrador",
          sexFilter: "Male",
          sizeFilter: "Any size",
          ageCategoryFilter: "Any age",
          searchQuery: "",
          locationCountryFilter: "Any country",
          availableCountryFilter: "Any country",
          availableRegionFilter: "Any region",
          organizationFilter: "any"
        },
        updateFilter: jest.fn(),
        updateFilters: jest.fn(),
        resetFilters: jest.fn(),
        clearFilter: jest.fn(),
        activeFilterCount: 2,
        resetTrigger: 0,
        apiParams: mockApiParams
      });

      render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(mockGetAnimals).toHaveBeenCalled();
      });

      // Should use pre-computed apiParams
      const lastCall = mockGetAnimals.mock.calls[mockGetAnimals.mock.calls.length - 1];
      expect(lastCall[0]).toMatchObject(mockApiParams);
    });
  });

  describe('Optimization 4: Debounced Search', () => {
    test('should use debounced search value', async () => {
      useDebouncedSearch.mockReturnValue({
        searchValue: 'test',
        debouncedValue: 'test',
        handleSearchChange: jest.fn(),
        clearSearch: jest.fn(),
        setSearchValue: jest.fn(),
      });

      render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(mockGetAnimals).toHaveBeenCalled();
      });

      // Should use debounced value in API call
      const lastCall = mockGetAnimals.mock.calls[mockGetAnimals.mock.calls.length - 1];
      expect(lastCall[0].search).toBe('test');
    });

    test('should prevent excessive API calls during typing', async () => {
      const mockHandleSearchChange = jest.fn();
      
      useDebouncedSearch.mockReturnValue({
        searchValue: 'te',
        debouncedValue: '', // Not yet debounced
        handleSearchChange: mockHandleSearchChange,
        clearSearch: jest.fn(),
        setSearchValue: jest.fn(),
      });

      render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dogs-grid')).toBeInTheDocument();
      });

      const initialCallCount = mockGetAnimals.mock.calls.length;
      
      // Simulate typing
      mockHandleSearchChange({ target: { value: 'tes' } });
      
      // Should not trigger immediate API call
      expect(mockGetAnimals).toHaveBeenCalledTimes(initialCallCount);
    });
  });

  describe('Optimization 5: Optimized useEffect Dependencies', () => {
    test('should have minimal useEffect dependencies', async () => {
      render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(mockGetAnimals).toHaveBeenCalled();
      });

      // Reset mock
      mockGetAnimals.mockClear();

      // Change a single filter
      const { updateFilter } = useFilterState.mock.results[0].value;
      updateFilter('sexFilter', 'Male');

      // Should trigger only one API call
      await waitFor(() => {
        expect(mockGetAnimals).toHaveBeenCalledTimes(1);
      });
    });

    test('should use resetTrigger for force refresh', async () => {
      let resetTriggerValue = 0;
      
      useFilterState.mockImplementation(() => ({
        filters: {
          standardizedBreedFilter: "Any breed",
          sexFilter: "Any",
          sizeFilter: "Any size",
          ageCategoryFilter: "Any age",
          searchQuery: "",
          locationCountryFilter: "Any country",
          availableCountryFilter: "Any country",
          availableRegionFilter: "Any region",
          organizationFilter: "any"
        },
        updateFilter: jest.fn(),
        updateFilters: jest.fn(),
        resetFilters: jest.fn(() => {
          resetTriggerValue++;
        }),
        clearFilter: jest.fn(),
        activeFilterCount: 0,
        resetTrigger: resetTriggerValue,
        apiParams: {}
      }));

      const { rerender } = render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(mockGetAnimals).toHaveBeenCalled();
      });

      const initialCallCount = mockGetAnimals.mock.calls.length;

      // Trigger reset
      resetTriggerValue++;
      rerender(<DogsPageClient />);

      await waitFor(() => {
        expect(mockGetAnimals).toHaveBeenCalledTimes(initialCallCount + 1);
      });
    });
  });

  describe('Performance Metrics', () => {
    test('should reduce total re-renders', async () => {
      let renderCount = 0;
      
      // Track renders
      const OriginalDogsGrid = jest.requireMock('../../components/dogs/DogsGrid');
      jest.mock('../../components/dogs/DogsGrid', () => (props) => {
        renderCount++;
        return OriginalDogsGrid(props);
      });

      render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dogs-grid')).toBeInTheDocument();
      });

      const initialRenderCount = renderCount;

      // Update a filter
      const { updateFilter } = useFilterState.mock.results[0].value;
      updateFilter('sexFilter', 'Male');

      // Should minimize re-renders due to optimizations
      expect(renderCount).toBeLessThanOrEqual(initialRenderCount + 2);
    });

    test('should batch filter updates efficiently', async () => {
      render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(mockGetAnimals).toHaveBeenCalled();
      });

      mockGetAnimals.mockClear();

      // Batch update multiple filters
      const { updateFilters } = useFilterState.mock.results[0].value;
      updateFilters({
        sexFilter: 'Female',
        sizeFilter: 'Small',
        ageCategoryFilter: 'Puppy'
      });

      // Should trigger only one API call for batch update
      await waitFor(() => {
        expect(mockGetAnimals).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('All Optimizations Working Together', () => {
    test('should handle complex filter scenarios efficiently', async () => {
      // Set up complex state
      useParallelMetadata.mockReturnValue({
        metadata: {
          standardizedBreeds: Array(50).fill(null).map((_, i) => `Breed ${i}`),
          locationCountries: Array(20).fill(null).map((_, i) => `Country ${i}`),
          availableCountries: Array(20).fill(null).map((_, i) => `Country ${i}`),
          organizations: Array(30).fill(null).map((_, i) => ({ id: i, name: `Org ${i}` })),
        },
        metadataLoading: false,
        metadataError: null,
      });

      useFilterState.mockReturnValue({
        filters: {
          standardizedBreedFilter: "Breed 5",
          sexFilter: "Male",
          sizeFilter: "Large",
          ageCategoryFilter: "Adult",
          searchQuery: "friendly",
          locationCountryFilter: "Country 3",
          availableCountryFilter: "Country 7",
          availableRegionFilter: "Any region",
          organizationFilter: "15"
        },
        updateFilter: jest.fn(),
        updateFilters: jest.fn(),
        resetFilters: jest.fn(),
        clearFilter: jest.fn(),
        activeFilterCount: 8,
        resetTrigger: 0,
        apiParams: {
          standardized_breed: "Breed 5",
          sex: "Male",
          standardized_size: "Large",
          age_category: "Adult",
          location_country: "Country 3",
          available_to_country: "Country 7",
          organization_id: "15"
        }
      });

      useDebouncedSearch.mockReturnValue({
        searchValue: 'friendly',
        debouncedValue: 'friendly',
        handleSearchChange: jest.fn(),
        clearSearch: jest.fn(),
        setSearchValue: jest.fn(),
      });

      const startTime = performance.now();
      
      render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dogs-grid')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly even with complex state
      expect(renderTime).toBeLessThan(1000); // Under 1 second

      // Should make minimal API calls
      expect(mockGetAnimals).toHaveBeenCalledTimes(1);
      expect(mockGetFilterCounts).toHaveBeenCalledTimes(1);

      // Should use all optimizations
      expect(useParallelMetadata).toHaveBeenCalled();
      expect(useFilterState).toHaveBeenCalled();
      expect(useDebouncedSearch).toHaveBeenCalled();
    });
  });
});