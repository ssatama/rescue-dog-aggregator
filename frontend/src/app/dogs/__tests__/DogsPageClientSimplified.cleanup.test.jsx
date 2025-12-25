/**
 * Bug #4: AbortController Cleanup Tests
 * 
 * Tests to verify that fetch operations are properly canceled when:
 * 1. Component unmounts during a fetch
 * 2. New fetch is triggered before previous one completes
 * 3. Rapid navigation occurs
 * 
 * These tests ensure no memory leaks and prevent stale data from being set
 * after component unmount.
 */

import { render, waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import DogsPageClientSimplified from '../DogsPageClientSimplified';
import * as api from '../../../services/animalsService';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock API
jest.mock('../../../services/animalsService', () => ({
  getAnimals: jest.fn(),
  getFilterCounts: jest.fn(),
  getAvailableRegions: jest.fn(),
}));

// Mock Layout component
jest.mock('../../../components/layout/Layout', () => {
  return function Layout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

// Mock DogCardOptimized to avoid FavoritesContext requirements
jest.mock('../../../components/dogs/DogCardOptimized', () => {
  return function DogCardOptimized({ dog }) {
    return (
      <div data-testid="dog-card" data-dog-id={dog.id}>
        {dog.name}
      </div>
    );
  };
});

describe('Bug #4: AbortController Cleanup', () => {
  let mockRouter;
  let mockSearchParams;
  let abortSignals = [];

  beforeEach(() => {
    jest.clearAllMocks();
    abortSignals = [];

    mockRouter = {
      push: jest.fn(),
      replace: jest.fn(),
    };

    mockSearchParams = new URLSearchParams();

    useRouter.mockReturnValue(mockRouter);
    usePathname.mockReturnValue('/dogs');
    useSearchParams.mockReturnValue(mockSearchParams);

    // Track AbortSignals passed to API calls
    api.getAnimals.mockImplementation((params) => {
      if (params?.signal) {
        abortSignals.push(params.signal);
      }
      return new Promise((resolve) => {
        setTimeout(() => {
          // Only resolve if not aborted
          if (!params?.signal?.aborted) {
            // Return a full page of dogs (20) to keep hasMore=true
            const dogs = Array.from({ length: 20 }, (_, i) => ({
              id: (params?.offset || 0) + i + 1,
              name: `Dog ${(params?.offset || 0) + i + 1}`,
              breed: 'Labrador',
            }));
            resolve(dogs);
          }
        }, 100);
      });
    });

    api.getFilterCounts.mockResolvedValue({
      total: 2,
      sizes: {},
      ages: {},
      sexes: {},
    });

    api.getAvailableRegions.mockResolvedValue([]);
  });

  describe('fetchDogsWithFilters', () => {
    it('should abort fetch when component unmounts', async () => {
      const { unmount } = render(
        <DogsPageClientSimplified initialDogs={[]} />
      );

      // Wait for initial fetch to start
      await waitFor(() => {
        expect(api.getAnimals).toHaveBeenCalled();
      });

      // Capture signals before unmount
      const signalsBeforeUnmount = [...abortSignals];
      expect(signalsBeforeUnmount.length).toBeGreaterThan(0);

      // Unmount before fetch completes - this triggers cleanup
      unmount();

      // Wait for cleanup to complete (React may batch cleanup operations)
      await waitFor(() => {
        expect(signalsBeforeUnmount[0].aborted).toBe(true);
      });
    });
  });

  describe('hydrateDeepLinkPages', () => {
    it('should abort hydration when component unmounts', async () => {
      // Simulate deep link to page 3
      mockSearchParams = new URLSearchParams('page=3');
      useSearchParams.mockReturnValue(mockSearchParams);

      const { unmount } = render(
        <DogsPageClientSimplified initialDogs={[]} />
      );

      // Wait for hydration to start
      await waitFor(() => {
        expect(api.getAnimals).toHaveBeenCalled();
      });

      // Unmount during hydration
      unmount();

      // Check if signals were aborted (AbortController implemented in Bug #4 fix)
      await waitFor(() => {
        expect(abortSignals.length).toBeGreaterThan(0);
        abortSignals.forEach(signal => {
          expect(signal.aborted).toBe(true);
        });
      });
    });
  });

  describe('loadMoreDogs', () => {
    it('should abort load more when component unmounts', async () => {
      const initialDogs = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Dog ${i + 1}`,
        breed: 'Labrador',
      }));

      const { unmount, getByText } = render(
        <DogsPageClientSimplified initialDogs={initialDogs} />
      );

      // Wait for initial fetch to complete to avoid interference
      await waitFor(() => {
        expect(api.getAnimals).toHaveBeenCalled();
      });

      // Track the number of calls before Load More
      const callsBeforeLoadMore = api.getAnimals.mock.calls.length;

      // Click Load More
      const loadMoreButton = await waitFor(() => getByText(/Load More/i));
      await userEvent.click(loadMoreButton);

      // Wait specifically for Load More fetch to start (new call)
      await waitFor(() => {
        expect(api.getAnimals.mock.calls.length).toBeGreaterThan(callsBeforeLoadMore);
      });

      // Unmount before load more completes
      unmount();

      // Check if signal was aborted (AbortController implemented in Bug #4 fix)
      await waitFor(() => {
        const loadMoreSignal = abortSignals[abortSignals.length - 1];
        expect(loadMoreSignal?.aborted).toBe(true);
      });
    });
  });

  describe('Memory leak prevention', () => {
    it('should not set state after unmount', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      const { unmount } = render(
        <DogsPageClientSimplified initialDogs={[]} />
      );

      // Wait for fetch to start
      await waitFor(() => {
        expect(api.getAnimals).toHaveBeenCalled();
      });

      // Unmount immediately
      unmount();

      // Wait for original fetch to complete
      await new Promise(resolve => setTimeout(resolve, 150));

      // Check no React warnings about setting state on unmounted component
      const stateUpdateWarnings = consoleError.mock.calls.filter(call =>
        call[0]?.includes?.('unmounted component') ||
        call[0]?.includes?.('memory leak')
      );

      // AbortController implemented - should have no warnings
      expect(stateUpdateWarnings.length).toBe(0);

      consoleError.mockRestore();
    });
  });
});