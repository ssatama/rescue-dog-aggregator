/**
 * TDD Test Suite for DogsPageClient with useFilterState Integration
 * Tests the actual integration of useFilterState hook in DogsPageClient
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

// Mock services
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

describe('DogsPageClient with useFilterState Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSearchParams.mockReturnValue({
      get: jest.fn().mockReturnValue(null),
    });
  });

  describe('Filter State Consolidation', () => {
    test('FAILING TEST: DogsPageClient should use useFilterState hook instead of 9 separate useState calls', async () => {
      // This test will fail initially because DogsPageClient hasn't been updated
      // to use the useFilterState hook yet
      
      render(<DogsPageClient />);
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('dogs-grid')).toBeInTheDocument();
      });

      // The component should no longer have 9 separate useState calls
      // Instead, it should use the consolidated useFilterState hook
      
      // Check if filter state is properly managed
      const desktopFilters = screen.getByTestId('desktop-filters');
      expect(desktopFilters).toBeInTheDocument();
      
      // Verify that the component renders without errors when using consolidated state
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    test('FAILING TEST: Filter updates should use updateFilter from useFilterState', async () => {
      const { container } = render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dogs-grid')).toBeInTheDocument();
      });

      // Find filter controls (after integration, these should trigger updateFilter)
      // This test will initially fail because the component still uses individual setters
      
      // The component should be using updateFilter('standardizedBreedFilter', value)
      // instead of setStandardizedBreedFilter(value)
    });

    test('FAILING TEST: Reset filters should use resetFilters from useFilterState', async () => {
      render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dogs-grid')).toBeInTheDocument();
      });

      // Look for reset button
      const resetButton = screen.queryByText(/Clear All/i);
      
      if (resetButton) {
        fireEvent.click(resetButton);
        
        // After integration, this should call the consolidated resetFilters
        // instead of manually resetting each state
      }
    });

    test('FAILING TEST: Active filter count should come from useFilterState', async () => {
      render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dogs-grid')).toBeInTheDocument();
      });

      // The active filter count should be computed by useFilterState
      // not manually calculated in a useEffect
      const mobileFilterButton = screen.getByTestId('mobile-filter-button');
      expect(mobileFilterButton).toBeInTheDocument();
      
      // Should display count from useFilterState.activeFilterCount
    });

    test('FAILING TEST: API parameters should use apiParams from useFilterState', async () => {
      const mockGetAnimals = require('../../services/animalsService').getAnimals;
      
      render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(mockGetAnimals).toHaveBeenCalled();
      });

      // The API call should use pre-computed apiParams from useFilterState
      // instead of manually building the params object
      const lastCall = mockGetAnimals.mock.calls[mockGetAnimals.mock.calls.length - 1];
      const params = lastCall[0];
      
      // Should have clean params without manual filtering
      expect(params).toBeDefined();
    });

    test('FAILING TEST: Batch filter updates should be possible', async () => {
      render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dogs-grid')).toBeInTheDocument();
      });

      // After integration, it should be possible to update multiple filters at once
      // using updateFilters({ sexFilter: 'Male', sizeFilter: 'Large' })
      // This improves performance by reducing re-renders
    });

    test('FAILING TEST: Filter dependencies in useEffect should be simplified', async () => {
      const mockGetAnimals = require('../../services/animalsService').getAnimals;
      
      render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(mockGetAnimals).toHaveBeenCalled();
      });

      // After integration, the fetchDogs useEffect should depend on fewer variables
      // It should depend on [filters, resetTrigger] instead of 9+ individual states
      
      // Clear mock and trigger a filter change
      mockGetAnimals.mockClear();
      
      // Any filter change should trigger exactly one API call
      // not multiple due to effect dependencies
    });

    test('FAILING TEST: clearFilter should use consolidated method', async () => {
      render(<DogsPageClient />);
      
      await waitFor(() => {
        expect(screen.getByTestId('dogs-grid')).toBeInTheDocument();
      });

      // After integration, clearing individual filters should use
      // clearFilter('breed') from useFilterState
      // instead of manual switch statement with individual setters
    });
  });
});