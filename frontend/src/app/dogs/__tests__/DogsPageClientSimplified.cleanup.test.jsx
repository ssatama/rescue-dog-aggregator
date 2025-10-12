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
            resolve([
              { id: 1, name: 'Dog 1', breed: 'Labrador' },
              { id: 2, name: 'Dog 2', breed: 'Poodle' },
            ]);
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

      // Unmount before fetch completes
      unmount();

      // Check if signal was aborted
      await waitFor(() => {
        expect(abortSignals.length).toBeGreaterThan(0);
        // THIS WILL FAIL - no AbortController implemented yet
        expect(abortSignals[0].aborted).toBe(true);
      });
    });

    it('should abort previous fetch when filters change rapidly', async () => {
      const { getByLabelText } = render(
        <DogsPageClientSimplified 
          initialDogs={[]}
          metadata={{}}
        />
      );

      // Wait for initial mount
      await waitFor(() => {
        expect(api.getAnimals).toHaveBeenCalled();
      });

      const callCount = api.getAnimals.mock.calls.length;

      // Simulate rapid filter changes
      const sizeFilter = getByLabelText(/Size/i);
      await userEvent.selectOptions(sizeFilter, 'Small');
      await userEvent.selectOptions(sizeFilter, 'Medium');
      await userEvent.selectOptions(sizeFilter, 'Large');

      await waitFor(() => {
        expect(api.getAnimals.mock.calls.length).toBeGreaterThan(callCount + 1);
      });

      // Check if earlier signals were aborted
      // THIS WILL FAIL - no AbortController implemented yet
      expect(abortSignals[0]?.aborted).toBe(true);
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

      // Check if signals were aborted
      await waitFor(() => {
        expect(abortSignals.length).toBeGreaterThan(0);
        // THIS WILL FAIL - no AbortController implemented yet
        abortSignals.forEach(signal => {
          expect(signal.aborted).toBe(true);
        });
      });
    });

    it('should abort hydration when URL changes during load', async () => {
      // Start with page=3
      mockSearchParams = new URLSearchParams('page=3');
      useSearchParams.mockReturnValue(mockSearchParams);

      const { rerender } = render(
        <DogsPageClientSimplified initialDogs={[]} />
      );

      // Wait for hydration to start
      await waitFor(() => {
        expect(api.getAnimals).toHaveBeenCalled();
      });

      const initialSignals = [...abortSignals];

      // Change URL to page=1 (simulating back button)
      mockSearchParams = new URLSearchParams('page=1');
      useSearchParams.mockReturnValue(mockSearchParams);

      rerender(<DogsPageClientSimplified initialDogs={[]} />);

      // Check if previous signals were aborted
      await waitFor(() => {
        // THIS WILL FAIL - no AbortController implemented yet
        initialSignals.forEach(signal => {
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

      // Click Load More
      const loadMoreButton = await waitFor(() => getByText(/Load More/i));
      await userEvent.click(loadMoreButton);

      // Wait for load more to start
      await waitFor(() => {
        expect(api.getAnimals.mock.calls.length).toBeGreaterThan(0);
      });

      // Unmount before load more completes
      unmount();

      // Check if signal was aborted
      await waitFor(() => {
        const loadMoreSignal = abortSignals[abortSignals.length - 1];
        // THIS WILL FAIL - no AbortController implemented yet
        expect(loadMoreSignal?.aborted).toBe(true);
      });
    });

    it('should abort load more when filters change during pagination', async () => {
      const initialDogs = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Dog ${i + 1}`,
        breed: 'Labrador',
      }));

      const { getByText, getByLabelText } = render(
        <DogsPageClientSimplified 
          initialDogs={initialDogs}
          metadata={{}}
        />
      );

      // Click Load More
      const loadMoreButton = await waitFor(() => getByText(/Load More/i));
      await userEvent.click(loadMoreButton);

      const loadMoreSignal = abortSignals[abortSignals.length - 1];

      // Change filter while load more is in progress
      const sizeFilter = getByLabelText(/Size/i);
      await userEvent.selectOptions(sizeFilter, 'Small');

      // Check if load more signal was aborted
      await waitFor(() => {
        // THIS WILL FAIL - no AbortController implemented yet
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

      // THIS WILL FAIL if AbortController is not implemented
      expect(stateUpdateWarnings.length).toBe(0);

      consoleError.mockRestore();
    });
  });

  describe('Concurrent request handling', () => {
    it('should only keep the latest request active', async () => {
      const { getByLabelText } = render(
        <DogsPageClientSimplified 
          initialDogs={[]}
          metadata={{}}
        />
      );

      // Trigger multiple rapid filter changes
      const sizeFilter = getByLabelText(/Size/i);
      
      await userEvent.selectOptions(sizeFilter, 'Small');
      await userEvent.selectOptions(sizeFilter, 'Medium');
      await userEvent.selectOptions(sizeFilter, 'Large');

      await waitFor(() => {
        expect(abortSignals.length).toBeGreaterThan(2);
      });

      // All but the last signal should be aborted
      const allButLast = abortSignals.slice(0, -1);
      const lastSignal = abortSignals[abortSignals.length - 1];

      // THIS WILL FAIL - no AbortController implemented yet
      allButLast.forEach(signal => {
        expect(signal.aborted).toBe(true);
      });
      
      // Last request should not be aborted
      expect(lastSignal?.aborted).toBe(false);
    });
  });
});