import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react'; // <<< Add 'within'
import userEvent from '@testing-library/user-event'; // Ensure userEvent is imported
import DogsPage from '../page'; // Import the component to test
import { getAnimals } from '../../../services/animalsService'; // Import the service function we need to mock
import Loading from '../../../components/ui/Loading'; // Import Loading to mock it

// Mock the animalsService
jest.mock('../../../services/animalsService', () => ({
  getAnimals: jest.fn(),
  // Mock other service functions if needed by DogsPage, e.g., getStandardizedBreeds
  getStandardizedBreeds: jest.fn().mockResolvedValue(["Any breed", "Labrador Retriever", "Poodle"]),
  getBreedGroups: jest.fn().mockResolvedValue(["Any group", "Sporting", "Toy"]),
  // --- NEW: Mock location service functions ---
  getLocationCountries: jest.fn().mockResolvedValue(["Any country", "USA", "Canada"]),
  getAvailableCountries: jest.fn().mockResolvedValue(["Any country", "USA", "Canada", "Global"]),
  getAvailableRegions: jest.fn().mockImplementation(async (country) => {
    // Only return specific regions if a specific country is passed
    if (country && country !== 'Any country' && country !== 'Global') {
      // You could even vary the response based on the country if needed
      if (country === 'USA') {
        return ["Any region", "CA", "NY", "TX"];
      } else if (country === 'Canada') {
        return ["Any region", "ON", "BC"];
      }
    }
    // Return only the default if no specific country or 'Global'
    return ["Any region"];
  }),
}));

// Mock the Loading component
jest.mock('../../../components/ui/Loading', () => {
  return function MockLoading() {
    return <div data-testid="loading">Loading...</div>; // <<< FIX: Match actual test ID used in Loading.jsx
  };
});

// Mock next/navigation (needed by Layout/Header potentially)
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dogs'), // Mock pathname for Header active link styling
  useRouter: () => ({ // Mock router if Layout uses it
    push: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    replace: jest.fn(),
  }),
  useSearchParams: () => ({ // Mock searchParams if needed
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
    // Reset mock implementations if necessary
    getAnimals.mockReset();
    // Reset other mocks if needed
  });

  test('shows loading state initially', async () => { // Make the test async
    // Prevent getAnimals from resolving immediately
    getAnimals.mockImplementation(() => new Promise(() => {}));
    render(<DogsPage />);

    // Wait for the loading indicator to appear
    await waitFor(() => {
      // Use the actual test ID from the Loading component
      expect(screen.getByTestId('loading')).toBeInTheDocument(); // <<< FIX: Use correct test ID
    });
    // You could also wait for it *not* to find something else initially
    // await waitFor(() => {
    //   expect(screen.queryByText(/No Dogs Found/i)).not.toBeInTheDocument();
    // });
  });

  test('renders dog cards when API call succeeds', async () => {
    const mockDogs = [
      createMockDog(1, 'Buddy'),
      createMockDog(2, 'Lucy'),
    ];
    // Mock getAnimals to resolve with mock data
    getAnimals.mockResolvedValue(mockDogs);

    render(<DogsPage />);

    // Wait for the loading state to disappear and cards to appear
    await waitFor(() => {
      // Check that loading is gone
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      // Check that dog names are rendered (implies DogCard rendered)
      expect(screen.getByText('Buddy')).toBeInTheDocument();
      expect(screen.getByText('Lucy')).toBeInTheDocument();
    });

    // Optionally, check if the "Load More" button appears if hasMore is true
    // (Assuming the mock response length matches the limit, hasMore would be true)
    // expect(screen.getByRole('button', { name: /Load More Dogs/i })).toBeInTheDocument();
  });

  // *** NEW TEST: No Results State ***
  test('shows "No Dogs Found" message when API returns empty array', async () => {
    // Mock getAnimals to resolve with an empty array
    getAnimals.mockResolvedValue([]);

    render(<DogsPage />);

    // Wait for the loading state to disappear and the message to appear
    await waitFor(() => {
      // Check that loading is gone
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      // Check that the "No Dogs Found" heading is rendered
      expect(screen.getByRole('heading', { name: /No Dogs Found/i })).toBeInTheDocument();
      // Check that the descriptive text is present
      expect(screen.getByText(/Try adjusting your filters/i)).toBeInTheDocument();
      // Check that the "Clear all filters" button within this section is present
      expect(screen.getByRole('button', { name: /Clear all filters/i })).toBeInTheDocument();
    });
  });

  // *** NEW TEST: Error State ***
  test('shows error message when API call fails', async () => {
    // --- Temporarily silence console.error ---
    const originalConsoleError = console.error;
    console.error = jest.fn(); // Replace console.error with a mock function

    // Mock getAnimals to reject with an error
    const errorMessage = 'Network Error';
    getAnimals.mockRejectedValue(new Error(errorMessage));

    render(<DogsPage />);

    // Wait for the loading state to disappear and the error alert to appear
    await waitFor(() => {
      // Check that loading is gone
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      // Check that the Alert title "Error" is rendered
      expect(screen.getByRole('heading', { name: /Error/i })).toBeInTheDocument();
      // Check that the error description text is present
      expect(screen.getByText(/Failed to load dogs/i)).toBeInTheDocument(); // <<< FIX: Match actual error message
      // Check that the "Retry" button is present
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });

    // --- Restore original console.error ---
    console.error = originalConsoleError;
  });

  // *** NEW TEST: Load More Interaction ***
  test('loads more dogs when "Load More" button is clicked', async () => {
    const user = userEvent.setup();
    const initialDogs = Array.from({ length: 20 }, (_, i) => createMockDog(i + 1, `Dog Page 1-${i + 1}`));
    const moreDogs = Array.from({ length: 10 }, (_, i) => createMockDog(i + 21, `Dog Page 2-${i + 1}`));

    // *** FIX: Provide mocks for TWO calls (Initial load, Load More) ***
    // Mock first call (initial mount, offset 0)
    getAnimals.mockResolvedValueOnce([...initialDogs]); // Use spread to ensure a new array instance
    // Mock second call (load more click, offset 20)
    getAnimals.mockResolvedValueOnce([...moreDogs]);

    render(<DogsPage />);

    // Wait for initial dogs and the button to appear
    // findByRole waits, so it should appear after the second fetch completes
    const loadMoreButton = await screen.findByRole('button', { name: /Load More Dogs/i });
    expect(screen.getByText('Dog Page 1-1')).toBeInTheDocument();
    expect(screen.getByText('Dog Page 1-20')).toBeInTheDocument();

    // Click the "Load More" button
    await user.click(loadMoreButton);

    // Wait for the new dogs to appear
    await waitFor(() => {
      expect(screen.getByText('Dog Page 2-1')).toBeInTheDocument();
      expect(screen.getByText('Dog Page 2-10')).toBeInTheDocument();
    });

    // *** FIX: Verify getAnimals was called TWO times ***
    expect(getAnimals).toHaveBeenCalledTimes(2);
    // Verify the calls had the correct offsets
    expect(getAnimals).toHaveBeenNthCalledWith(1, expect.objectContaining({ offset: 0 })); // Initial mount
    expect(getAnimals).toHaveBeenNthCalledWith(2, expect.objectContaining({ offset: 20 })); // Load more

    // Check that initial dogs are still present
    expect(screen.getByText('Dog Page 1-1')).toBeInTheDocument();
  });

  // *** NEW TEST: Filter Interaction ***
  test('fetches dogs with new filter when a filter is changed', async () => {
    const user = userEvent.setup();
    const initialDogs = Array.from({ length: 5 }, (_, i) => createMockDog(i + 1, `Initial Dog ${i + 1}`));
    const sportingDogs = [
      createMockDog(101, 'Sporty Dog 1', 'Labrador Retriever', 'Sporting'),
      createMockDog(102, 'Sporty Dog 2', 'Golden Retriever', 'Sporting'),
    ];

    // Mock initial call (mount)
    getAnimals.mockResolvedValueOnce([...initialDogs]);
    // Mock call after filter change (reset=true, offset=0, new filter) - This is the second call
    getAnimals.mockResolvedValueOnce([...sportingDogs]);

    render(<DogsPage />);

    // Wait for initial dogs to render
    await waitFor(() => {
      expect(screen.getByText('Initial Dog 1')).toBeInTheDocument();
    });

    // Find the Breed Group select trigger
    // Use getByRole with name based on the label associated with the select
    const breedGroupSelect = screen.getByRole('combobox', { name: /Breed Group/i });
    expect(breedGroupSelect).toBeInTheDocument();

    // Open the select dropdown
    await user.click(breedGroupSelect);

    // Find and click the 'Sporting' option
    // Options might be rendered in a portal, use findByRole for async appearance
    const sportingOption = await screen.findByRole('option', { name: 'Sporting' });
    await user.click(sportingOption);

    // Wait for the component to re-render with the filtered dogs
    await waitFor(() => {
      // Check that initial dogs are gone (because it was a reset fetch)
      expect(screen.queryByText('Initial Dog 1')).not.toBeInTheDocument();
      // Check that sporting dogs are present
      expect(screen.getByText('Sporty Dog 1')).toBeInTheDocument();
      expect(screen.getByText('Sporty Dog 2')).toBeInTheDocument();
    });

    // Verify getAnimals was called TWO times (initial mount, filter change effect)
    expect(getAnimals).toHaveBeenCalledTimes(2);
    // Verify the second call had the correct filter and offset
    expect(getAnimals).toHaveBeenNthCalledWith(2, expect.objectContaining({
      breed_group: 'Sporting',
      offset: 0 // Filter changes reset offset
    }));
  });

  // *** NEW TEST: Remove Filter Chip Interaction ***
  test('removes filter and refetches when a filter chip is clicked', async () => {
    const user = userEvent.setup();
    const sportingDogs = [
      createMockDog(101, 'Sporty Dog 1', 'Labrador Retriever', 'Sporting'),
    ];
    const allDogs = [
      createMockDog(1, 'Any Dog 1'),
      createMockDog(2, 'Any Dog 2'),
    ];
    const initialDogsPlaceholder = [createMockDog(999, 'Placeholder')]; // Data for initial loads

    // *** FIX: Adjust mock sequence for THREE calls ***
    // Mock first call (initial mount, offset 0)
    getAnimals.mockResolvedValueOnce([...initialDogsPlaceholder]);
    // Mock second call (SIMULATED filter change to 'Sporting', offset 0, reset=true)
    getAnimals.mockResolvedValueOnce([...sportingDogs]); // <<< Should return sporting dogs HERE
    // Mock third call (ACTUAL chip remove click, offset 0, reset=true)
    getAnimals.mockResolvedValueOnce([...allDogs]); // <<< Should return all dogs HERE

    render(<DogsPage />);

    // --- Simulate selecting 'Sporting' first to get the chip ---
    const breedGroupSelect = screen.getByRole('combobox', { name: /Breed Group/i });
    await user.click(breedGroupSelect);
    const sportingOption = await screen.findByRole('option', { name: 'Sporting' });
    await user.click(sportingOption);
    // --- Wait for the sporting dogs (from the SECOND mock) and the chip to appear ---
    await waitFor(() => {
      expect(screen.getByText('Sporty Dog 1')).toBeInTheDocument(); // Should now find this
    });
    const filterChipRemoveButton = screen.getByRole('button', { name: /Remove Breed Group filter/i });
    expect(filterChipRemoveButton).toBeInTheDocument();
    // --- End simulation ---

    // Click the remove button on the filter chip (triggers the THIRD mock)
    await user.click(filterChipRemoveButton);

    // Wait for the component to re-render with the filter removed
    await waitFor(() => {
      // Check that the sporting dog is gone
      expect(screen.queryByText('Sporty Dog 1')).not.toBeInTheDocument();
      // Check that the "all dogs" are now present
      expect(screen.getByText('Any Dog 1')).toBeInTheDocument();
      // Check that the filter chip remove button is gone
      expect(screen.queryByRole('button', { name: /Remove Breed Group filter/i })).not.toBeInTheDocument();
    });

    // Verify getAnimals was called THREE times
    expect(getAnimals).toHaveBeenCalledTimes(3);
    // Verify the calls had the correct parameters
    expect(getAnimals).toHaveBeenNthCalledWith(1, expect.objectContaining({ offset: 0 })); // Initial mount
    expect(getAnimals).toHaveBeenNthCalledWith(2, expect.objectContaining({ breed_group: 'Sporting', offset: 0 })); // Simulated click
    expect(getAnimals).toHaveBeenNthCalledWith(4, expect.objectContaining({ breed_group: null, offset: 0 })); // Chip remove click
  });

  // *** NEW TEST: Clear All Filters Interaction ***
  test('clears all filters and refetches when "Clear All" is clicked', async () => {
    const user = userEvent.setup();
    const sportingDogs = [ createMockDog(101, 'Sporty Dog 1', 'Labrador Retriever', 'Sporting') ];
    const allDogs = [ createMockDog(1, 'Any Dog 1'), createMockDog(2, 'Any Dog 2') ];
    const initialDogsPlaceholder = [createMockDog(999, 'Placeholder')];

    // *** FIX: Mock THREE API calls ***
    getAnimals.mockResolvedValueOnce([...initialDogsPlaceholder]); // 1. Initial mount
    getAnimals.mockResolvedValueOnce([...sportingDogs]);          // 2. SIMULATED filter change to 'Sporting'
    getAnimals.mockResolvedValueOnce([...allDogs]);               // 3. ACTUAL "Clear All" click (triggers useEffect)

    render(<DogsPage />);

    // --- Simulate selecting 'Sporting' ---
    const breedGroupSelect = screen.getByRole('combobox', { name: /Breed Group/i });
    await user.click(breedGroupSelect);
    const sportingOption = await screen.findByRole('option', { name: 'Sporting' });
    await user.click(sportingOption);
    // --- Wait for the sporting dogs and chip ---
    await waitFor(() => {
      expect(screen.getByText('Sporty Dog 1')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Remove Breed Group filter/i })).toBeInTheDocument();
    // --- End simulation ---

    // Find the container div holding the chips and the adjacent "Clear All" button
    const activeFiltersContainer = screen.getByText(/Active Filters:/i).closest('div');
    expect(activeFiltersContainer).toBeInTheDocument(); // Verify container found

    // Find the "Clear All" button *within* that specific container
    const clearAllButton = within(activeFiltersContainer).getByRole('button', { name: /Clear all filters/i });
    expect(clearAllButton).toBeInTheDocument(); // Verify button found within container

    // Click the specific "Clear All" button
    await user.click(clearAllButton);

    // Wait for re-render - should now show "Any Dog 1"
    await waitFor(() => {
      expect(screen.queryByText('Sporty Dog 1')).not.toBeInTheDocument();
      expect(screen.getByText('Any Dog 1')).toBeInTheDocument(); // <<< This should pass now
      expect(screen.queryByRole('button', { name: /Remove Breed Group filter/i })).not.toBeInTheDocument();
      expect(within(activeFiltersContainer).queryByRole('button', { name: /Clear all filters/i })).not.toBeInTheDocument();
    });

    // *** FIX: Verify THREE API calls ***
    expect(getAnimals).toHaveBeenCalledTimes(3);

    // Define the state expected AFTER all filters are cleared
    const expectedClearedParams = {
      limit: 20, // Default limit
      offset: 0, // Reset offset
      search: null,
      standardized_breed: null,
      breed_group: null,
      sex: null,
      standardized_size: null,
      age_category: null,
      // --- NEW: Ensure location filters are checked ---
      location_country: null,
      available_to_country: null,
      available_to_region: null,
      // --- END NEW ---
      organization_id: null // Assuming default
    };

    expect(getAnimals).toHaveBeenNthCalledWith(1, expect.objectContaining({ offset: 0 })); // Initial mount
    expect(getAnimals).toHaveBeenNthCalledWith(2, expect.objectContaining({ breed_group: 'Sporting', offset: 0 })); // Simulated click
    // 3rd call is from the useEffect triggered by resetTrigger - should have cleared filters
    expect(getAnimals).toHaveBeenNthCalledWith(3, expect.objectContaining(expectedClearedParams));
  });

  // More tests will go here...
});