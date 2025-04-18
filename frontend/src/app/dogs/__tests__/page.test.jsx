import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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
      expect(screen.getByTestId('loading')).toBeInTheDocument();
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

    // wait for loading to disappear
    await waitFor(() =>
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    );

    // find the no‐results container by its heading
    const noResultsContainer = screen
      .getByRole('heading', { name: /No Dogs Found/i })
      .closest('div');
    expect(noResultsContainer).toBeInTheDocument();

    // assert text inside it
    expect(within(noResultsContainer).getByText(/Try adjusting your filters/i))
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
    const initialDogs = Array.from({ length: 20 }, (_, i) => createMockDog(i + 1, `Dog Page 1-${i + 1}`));
    const moreDogs = Array.from({ length: 10 }, (_, i) => createMockDog(i + 21, `Dog Page 2-${i + 1}`));

    getAnimals.mockResolvedValueOnce([...initialDogs]);
    getAnimals.mockResolvedValueOnce([...moreDogs]);

    render(<DogsPage />);

    const loadMoreButton = await screen.findByRole('button', { name: /Load More Dogs/i });
    expect(screen.getByText('Dog Page 1-1')).toBeInTheDocument();
    expect(screen.getByText('Dog Page 1-20')).toBeInTheDocument();

    await user.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.getByText('Dog Page 2-1')).toBeInTheDocument();
      expect(screen.getByText('Dog Page 2-10')).toBeInTheDocument();
    });

    expect(getAnimals).toHaveBeenCalledTimes(2);
    expect(getAnimals).toHaveBeenNthCalledWith(1, expect.objectContaining({ offset: 0 }));
    expect(getAnimals).toHaveBeenNthCalledWith(2, expect.objectContaining({ offset: 20 }));

    expect(screen.getByText('Dog Page 1-1')).toBeInTheDocument();
  });

  test('fetches dogs with new filter when a filter is changed', async () => {
    const user = userEvent.setup();
    const initialDogs = Array.from({ length: 5 }, (_, i) => createMockDog(i + 1, `Initial Dog ${i + 1}`));
    const orgDogs = [ createMockDog(101, 'Org Dog', 'Test Breed') ];

    getAnimals.mockResolvedValueOnce(initialDogs);
    getAnimals.mockResolvedValueOnce(orgDogs);

    render(<DogsPage />);
    await waitFor(() => screen.getByText('Initial Dog 1'));

    const orgSelect = screen.getByRole('combobox', { name: /Rescue Organization/i });
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
    const orgSelect = screen.getByRole('combobox', { name: /Rescue Organization/i });
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
    const orgSelect = screen.getByRole('combobox', { name: /Rescue Organization/i });
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
});