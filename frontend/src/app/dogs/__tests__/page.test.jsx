import React from 'react';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DogsPage from '../page';
import { getAnimals } from '../../../services/animalsService';
import Loading from '../../../components/ui/Loading';

// Mock animalsService + meta endpoints
jest.mock('../../../services/animalsService', () => ({
  getAnimals: jest.fn(),
  getStandardizedBreeds: jest.fn().mockResolvedValue([
    "Any breed", "Labrador Retriever", "Poodle"
  ]),
  getLocationCountries: jest.fn().mockResolvedValue([]),
  getAvailableCountries: jest.fn().mockResolvedValue([]),
  getAvailableRegions: jest.fn().mockResolvedValue([]),
}));

// Mock organizationsService
import { getOrganizations } from '../../../services/organizationsService';
jest.mock('../../../services/organizationsService', () => ({
  getOrganizations: jest.fn().mockResolvedValue([
    { id: 1, name: "Org A" },
    { id: 2, name: "Org B" },
  ]),
}));

// Mock the Loading component
jest.mock('../../../components/ui/Loading', () => {
  return function MockLoading() {
    return <div data-testid="loading">Loading...</div>;
  };
});

// Mock next/navigation (needed by Layout/Header potentially)
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dogs'),
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

// Helper to create mock dog data
const createMockDog = (id, name = `Dog ${id}`) => ({
  id,
  name,
  standardized_breed: 'Test Breed',
  breed_group: 'Test Group',
  primary_image_url: `https://example.com/dog${id}.jpg`,
  status: 'available',
  organization: { city: 'Test City', country: 'TC' }
});

describe('DogsPage Component', () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    getAnimals.mockReset();
  });

  test('shows loading state initially', async () => {
    getAnimals.mockImplementation(() => new Promise(() => {}));
    render(<DogsPage />);

    await waitFor(() => {
      // Should show skeleton screens instead of simple loading
      const loadingSkeletons = screen.getAllByTestId('dog-card-skeleton');
      expect(loadingSkeletons.length).toBeGreaterThan(0);
    });
  });

  test('renders dog cards when API call succeeds', async () => {
    const mockDogs = [
      createMockDog(1, 'Buddy'),
      createMockDog(2, 'Lucy'),
    ];
    getAnimals.mockResolvedValue(mockDogs);

    render(<DogsPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      expect(screen.getByText('Buddy')).toBeInTheDocument();
      expect(screen.getByText('Lucy')).toBeInTheDocument();
    });
  });

  test('shows "No Dogs Found" message when API returns empty array', async () => {
    getAnimals.mockResolvedValue([]);
    render(<DogsPage />);

    // wait for loading to complete (skeletons disappear)
    await waitFor(() =>
      expect(screen.queryByTestId('dog-card-skeleton')).not.toBeInTheDocument()
    );

    // find the no‐results container by its heading (updated for EmptyState)
    const noResultsContainer = screen
      .getByRole('heading', { name: /No dogs match your filters/i })
      .closest('div');
    expect(noResultsContainer).toBeInTheDocument();

    // assert text inside it
    expect(within(noResultsContainer).getByText(/Try adjusting your search criteria/i))
      .toBeInTheDocument();

    // now scoped to that container, find the exact button
    expect(
      within(noResultsContainer).getByRole('button', {
        name: /Clear All Filters/i
      })
    ).toBeInTheDocument();
  });

  test('shows error message when API call fails', async () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();

    const errorMessage = 'Network Error';
    getAnimals.mockRejectedValue(new Error(errorMessage));

    render(<DogsPage />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Error Loading Dogs/i })).toBeInTheDocument();
      expect(screen.getByText(/Failed to load dogs\. Please try again\./i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    console.error = originalConsoleError;
  });

  test('loads more dogs when "Load More" button is clicked', async () => {
    const user = userEvent.setup();
    const initialDogs = Array.from({ length: 20 }, (_, i) => createMockDog(i + 1, `Dog Page 1-1-${i + 1}`));
    const moreDogs = Array.from({ length: 10 }, (_, i) => createMockDog(i + 21, `Dog Page 2-${i + 1}`));

    getAnimals.mockResolvedValueOnce([...initialDogs]);
    getAnimals.mockResolvedValueOnce([...moreDogs]);

    render(<DogsPage />);

    const loadMoreButton = await screen.findByRole('button', { name: /Load More Dogs/i });

    // check first and last initial cards
    expect(screen.getByText('Dog Page 1-1-1')).toBeInTheDocument();
    expect(screen.getByText('Dog Page 1-1-20')).toBeInTheDocument();

    await user.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.getByText('Dog Page 2-1')).toBeInTheDocument();
      expect(screen.getByText('Dog Page 2-10')).toBeInTheDocument();
    });

    expect(getAnimals).toHaveBeenCalledTimes(2);
    expect(getAnimals).toHaveBeenNthCalledWith(1, expect.objectContaining({ offset: 0 }));
    expect(getAnimals).toHaveBeenNthCalledWith(2, expect.objectContaining({ offset: 20 }));
  });

  test('fetches dogs with new filter when a filter is changed', async () => {
    const user = userEvent.setup();
    const initialDogs = Array.from({ length: 5 }, (_, i) => createMockDog(i + 1, `Initial Dog ${i + 1}`));
    const orgDogs = [ createMockDog(101, 'Org Dog', 'Test Breed') ];

    getAnimals.mockResolvedValueOnce(initialDogs);
    getAnimals.mockResolvedValueOnce(orgDogs);

    render(<DogsPage />);
    await waitFor(() => screen.getByText('Initial Dog 1'));

    const orgSelect = screen.getByTestId('organization-select');
    await user.click(orgSelect);
    const opt = await screen.findByRole('option', { name: 'Org A' });
    await user.click(opt);

    await waitFor(() => {
      expect(screen.getByText('Org Dog')).toBeInTheDocument();
    });

    expect(getAnimals).toHaveBeenCalledTimes(2);
    expect(getAnimals).toHaveBeenNthCalledWith(2, expect.objectContaining({
      organization_id: '1',
      offset: 0
    }));
  });

  test('removes filter and refetches when a filter chip is clicked', async () => {
    const user = userEvent.setup();
    const orgDogs = [ createMockDog(101, 'Org Dog') ];
    const allDogs = [ createMockDog(1, 'Any Dog 1'), createMockDog(2, 'Any Dog 2') ];
    const initialDogsPlaceholder = [ createMockDog(999, 'Placeholder') ];

    getAnimals
      .mockResolvedValueOnce(initialDogsPlaceholder)
      .mockResolvedValueOnce(orgDogs)
      .mockResolvedValueOnce(allDogs);

    render(<DogsPage />);

    // pick “Org A”
    const orgSelect = screen.getByTestId('organization-select');
    await user.click(orgSelect);
    const orgOption = await screen.findByRole('option', { name: 'Org A' });
    await user.click(orgOption);

    // after filter, we see “Org Dog”
    await waitFor(() => expect(screen.getByText('Org Dog')).toBeInTheDocument());

    // find the remove‑chip button
    const removeBtn = screen.getByRole('button', { name: /Remove Org A filter/i });
    expect(removeBtn).toBeInTheDocument();
    await user.click(removeBtn);

    // now it’s cleared
    await waitFor(() => {
      expect(screen.queryByText('Org Dog')).not.toBeInTheDocument();
      expect(screen.getByText('Any Dog 1')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Remove Org A filter/i })).not.toBeInTheDocument();
    });

    // and API was called three times:
    expect(getAnimals).toHaveBeenCalledTimes(3);
    expect(getAnimals).toHaveBeenNthCalledWith(1, expect.objectContaining({ offset: 0 }));
    expect(getAnimals).toHaveBeenNthCalledWith(2, expect.objectContaining({
      organization_id: '1',
      offset: 0
    }));
    expect(getAnimals).toHaveBeenNthCalledWith(3, expect.objectContaining({ offset: 0 }));
  });

  test('clears all filters and refetches when "Clear All" is clicked', async () => {
    const user = userEvent.setup();
    const orgDogs = [ createMockDog(101, 'Org Dog') ];
    const allDogs = [ createMockDog(1, 'Any Dog 1'), createMockDog(2, 'Any Dog 2') ];
    const initialDogsPlaceholder = [ createMockDog(999, 'Placeholder') ];

    getAnimals
      .mockResolvedValueOnce(initialDogsPlaceholder)
      .mockResolvedValueOnce(orgDogs)
      .mockResolvedValueOnce(allDogs);

    render(<DogsPage />);

    // apply the organization filter
    const orgSelect = screen.getByTestId('organization-select');
    await user.click(orgSelect);
    const orgOption = await screen.findByRole('option', { name: 'Org A' });
    await user.click(orgOption);

    await waitFor(() => expect(screen.getByText('Org Dog')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Remove Org A filter/i })).toBeInTheDocument();

    // locate the Active Filters container
    const activeFiltersContainer = screen.getByText(/Active Filters:/i).closest('div');
    expect(activeFiltersContainer).toBeInTheDocument();

    // click the “Clear All” within that container
    const clearAllButton = within(activeFiltersContainer).getByRole('button', { name: /Clear All/i });
    expect(clearAllButton).toBeInTheDocument();
    await user.click(clearAllButton);

    // should remove the org chip and re‑fetch
    await waitFor(() => {
      expect(screen.queryByText('Org Dog')).not.toBeInTheDocument();
      expect(screen.getByText('Any Dog 1')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Remove Org A filter/i })).not.toBeInTheDocument();
      expect(within(activeFiltersContainer).queryByRole('button', { name: /Clear All/i })).not.toBeInTheDocument();
    });

    expect(getAnimals).toHaveBeenCalledTimes(3);
    expect(getAnimals).toHaveBeenNthCalledWith(1, expect.objectContaining({ offset: 0 }));
    expect(getAnimals).toHaveBeenNthCalledWith(2, expect.objectContaining({
      organization_id: '1',
      offset: 0
    }));
    expect(getAnimals).toHaveBeenNthCalledWith(3, expect.objectContaining({ offset: 0 }));
  });

  test('changing search box refetches with search param', async () => {
    // stub getAnimals for every call so dogs never become undefined
    getAnimals.mockResolvedValue([]);

    render(<DogsPage />);
    const input = screen.getByPlaceholderText(/Search dogs/i);
    fireEvent.change(input, { target: { value: 'buddy' } });
    await waitFor(() => {
      expect(getAnimals).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'buddy' })
      );
    });
  });

  describe('Mobile Filter Button Enhancements', () => {
    test('mobile filter button displays with orange border and hover states', async () => {
      getAnimals.mockResolvedValue([]);
      render(<DogsPage />);

      const mobileFilterButton = screen.getByRole('button', { name: /Filter & Sort/i });
      expect(mobileFilterButton).toBeInTheDocument();
      expect(mobileFilterButton).toHaveClass('border-2', 'border-orange-200', 'hover:border-orange-300');
    });

    test('mobile filter button shows active filter count badge when filters are applied', async () => {
      const user = userEvent.setup();
      const mockDogs = [createMockDog(1, 'Test Dog')];
      
      getAnimals.mockResolvedValue(mockDogs);
      render(<DogsPage />);

      // Apply a filter first
      const orgSelect = screen.getByTestId('organization-select');
      await user.click(orgSelect);
      const orgOption = await screen.findByRole('option', { name: 'Org A' });
      await user.click(orgOption);

      await waitFor(() => {
        const mobileFilterButton = screen.getByRole('button', { name: /Filter & Sort.*1/i });
        expect(mobileFilterButton).toBeInTheDocument();
        
        // Check for the orange badge styling
        const badge = mobileFilterButton.querySelector('span.bg-orange-100');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('text-orange-700', 'px-2', 'py-0.5', 'rounded-full');
        expect(badge).toHaveTextContent('1');
      });
    });

    test('mobile filter button count updates in real-time as filters change', async () => {
      const user = userEvent.setup();
      const mockDogs = [createMockDog(1, 'Test Dog')];
      
      getAnimals.mockResolvedValue(mockDogs);
      render(<DogsPage />);

      // Initially no count shown
      expect(screen.getByRole('button', { name: /^Filter & Sort$/ })).toBeInTheDocument();

      // Apply first filter - should show (1)
      const orgSelect = screen.getByTestId('organization-select');
      await user.click(orgSelect);
      const orgOption = await screen.findByRole('option', { name: 'Org A' });
      await user.click(orgOption);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Filter & Sort.*1/i })).toBeInTheDocument();
      });

      // Apply second filter - should show (2)
      const sizeButton = screen.getByTestId('size-button-Small');
      await user.click(sizeButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Filter & Sort.*2/i })).toBeInTheDocument();
      });

      // Clear one filter - should show (1)
      const removeOrgBtn = screen.getByRole('button', { name: /Remove Org A filter/i });
      await user.click(removeOrgBtn);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Filter & Sort.*1/i })).toBeInTheDocument();
      });
    });

    test('mobile filter button hides count badge when no filters are active', async () => {
      const user = userEvent.setup();
      const mockDogs = [createMockDog(1, 'Test Dog')];
      
      getAnimals.mockResolvedValue(mockDogs);
      render(<DogsPage />);

      // Apply filter
      const orgSelect = screen.getByTestId('organization-select');
      await user.click(orgSelect);
      const orgOption = await screen.findByRole('option', { name: 'Org A' });
      await user.click(orgOption);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Filter & Sort.*1/i })).toBeInTheDocument();
      });

      // Clear all filters
      const activeFiltersContainer = screen.getByText(/Active Filters:/i).closest('div');
      const clearAllButton = within(activeFiltersContainer).getByRole('button', { name: /Clear All/i });
      await user.click(clearAllButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^Filter & Sort$/ })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Filter & Sort.*\d/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('Background and Layout', () => {
    test('applies gradient background to page wrapper', async () => {
      getAnimals.mockResolvedValue([]);
      render(<DogsPage />);

      // Find the gradient background wrapper
      const gradientWrapper = screen.getByTestId('dogs-page-gradient-wrapper');
      expect(gradientWrapper).toBeInTheDocument();
      expect(gradientWrapper).toHaveClass('bg-gradient-to-br', 'from-[#FFF5E6]', 'to-[#FFE4CC]');
    });

    test('gradient background covers full viewport height', async () => {
      getAnimals.mockResolvedValue([]);
      render(<DogsPage />);

      const gradientWrapper = screen.getByTestId('dogs-page-gradient-wrapper');
      expect(gradientWrapper).toHaveClass('min-h-screen');
    });

    test('maintains proper container constraints within gradient background', async () => {
      getAnimals.mockResolvedValue([]);
      render(<DogsPage />);

      const container = screen.getByTestId('dogs-page-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass('max-w-7xl', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8');
    });
  });
});