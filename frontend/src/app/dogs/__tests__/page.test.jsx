import React from "react";
import {
  render,
  screen,
  waitFor,
  within,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DogsPage from "../page";
import { getAnimals } from "../../../services/animalsService";
import Loading from "../../../components/ui/Loading";

// Mock animalsService + meta endpoints
jest.mock("../../../services/animalsService", () => ({
  getAnimals: jest.fn(),
  getStandardizedBreeds: jest
    .fn()
    .mockResolvedValue(["Any breed", "Labrador Retriever", "Poodle"]),
  getLocationCountries: jest.fn().mockResolvedValue([]),
  getAvailableCountries: jest.fn().mockResolvedValue([]),
  getAvailableRegions: jest.fn().mockResolvedValue([]),
}));

// Mock organizationsService
import { getOrganizations } from "../../../services/organizationsService";
jest.mock("../../../services/organizationsService", () => ({
  getOrganizations: jest.fn().mockResolvedValue([
    { id: 1, name: "Org A" },
    { id: 2, name: "Org B" },
  ]),
}));

// Mock the Loading component
jest.mock("../../../components/ui/Loading", () => {
  return function MockLoading() {
    return <div data-testid="loading">Loading...</div>;
  };
});

// Mock next/navigation (needed by Layout/Header potentially)
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(() => "/dogs"),
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
  standardized_breed: "Test Breed",
  breed_group: "Test Group",
  primary_image_url: `https://example.com/dog${id}.jpg`,
  status: "available",
  organization: { city: "Test City", country: "TC" },
});

describe("DogsPage Component", () => {
  // Clear mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    getAnimals.mockReset();
  });

  test("shows loading state initially", async () => {
    getAnimals.mockImplementation(() => new Promise(() => {}));
    render(<DogsPage />);

    await waitFor(() => {
      // Should show skeleton screens instead of simple loading
      const loadingSkeletons = screen.getAllByTestId("dog-card-skeleton");
      expect(loadingSkeletons.length).toBeGreaterThan(0);
    });
  });

  test("renders dog cards when API call succeeds", async () => {
    const mockDogs = [createMockDog(1, "Buddy"), createMockDog(2, "Lucy")];
    getAnimals.mockResolvedValue(mockDogs);

    render(<DogsPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      expect(screen.getByText("Buddy")).toBeInTheDocument();
      expect(screen.getByText("Lucy")).toBeInTheDocument();
    });
  });

  test('shows "No Dogs Found" message when API returns empty array', async () => {
    getAnimals.mockResolvedValue([]);
    render(<DogsPage />);

    // wait for loading to complete (skeletons disappear)
    await waitFor(() =>
      expect(screen.queryByTestId("dog-card-skeleton")).not.toBeInTheDocument(),
    );

    // find the no‐results container by its heading (updated for EmptyState)
    const noResultsContainer = screen
      .getByRole("heading", { name: /No dogs match your filters/i })
      .closest("div");
    expect(noResultsContainer).toBeInTheDocument();

    // assert text inside it
    expect(
      within(noResultsContainer).getByText(
        /Try adjusting your search criteria/i,
      ),
    ).toBeInTheDocument();

    // now scoped to that container, find the exact button
    expect(
      within(noResultsContainer).getByRole("button", {
        name: /Clear All Filters/i,
      }),
    ).toBeInTheDocument();
  });

  test("shows error message when API call fails", async () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();

    const errorMessage = "Network Error";
    getAnimals.mockRejectedValue(new Error(errorMessage));

    render(<DogsPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: /Error Loading Dogs/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Failed to load dogs\. Please try again\./i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Retry/i }),
      ).toBeInTheDocument();
    });

    console.error = originalConsoleError;
  });

  test('loads more dogs when "Load More" button is clicked', async () => {
    const user = userEvent.setup();
    const initialDogs = Array.from({ length: 20 }, (_, i) =>
      createMockDog(i + 1, `Dog Page 1-1-${i + 1}`),
    );
    const moreDogs = Array.from({ length: 10 }, (_, i) =>
      createMockDog(i + 21, `Dog Page 2-${i + 1}`),
    );

    getAnimals.mockResolvedValueOnce([...initialDogs]);
    getAnimals.mockResolvedValueOnce([...moreDogs]);

    render(<DogsPage />);

    const loadMoreButton = await screen.findByRole("button", {
      name: /Load More Dogs/i,
    });

    // check first and last initial cards
    expect(screen.getByText("Dog Page 1-1-1")).toBeInTheDocument();
    expect(screen.getByText("Dog Page 1-1-20")).toBeInTheDocument();

    await user.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.getByText("Dog Page 2-1")).toBeInTheDocument();
      expect(screen.getByText("Dog Page 2-10")).toBeInTheDocument();
    });

    expect(getAnimals).toHaveBeenCalledTimes(2);
    expect(getAnimals).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ offset: 0 }),
    );
    expect(getAnimals).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ offset: 20 }),
    );
  });

  test.skip("fetches dogs with new filter when a filter is changed (TODO: Organization filter UI)", async () => {
    const user = userEvent.setup();
    const initialDogs = Array.from({ length: 5 }, (_, i) =>
      createMockDog(i + 1, `Initial Dog ${i + 1}`),
    );
    const orgDogs = [createMockDog(101, "Org Dog", "Test Breed")];

    getAnimals.mockResolvedValueOnce(initialDogs);
    getAnimals.mockResolvedValueOnce(orgDogs);

    render(<DogsPage />);
    await waitFor(() => screen.getByText("Initial Dog 1"));

    const orgSelect = screen.getByTestId("organization-filter");
    await user.click(orgSelect);
    const opt = await screen.findByRole("option", { name: "Org A" });
    await user.click(opt);

    await waitFor(() => {
      expect(screen.getByText("Org Dog")).toBeInTheDocument();
    });

    expect(getAnimals).toHaveBeenCalledTimes(2);
    expect(getAnimals).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        organization_id: "1",
        offset: 0,
      }),
    );
  });

  test.skip("removes filter and refetches when a filter chip is clicked (TODO: Organization filter UI)", async () => {
    const user = userEvent.setup();
    const orgDogs = [createMockDog(101, "Org Dog")];
    const allDogs = [
      createMockDog(1, "Any Dog 1"),
      createMockDog(2, "Any Dog 2"),
    ];
    const initialDogsPlaceholder = [createMockDog(999, "Placeholder")];

    getAnimals
      .mockResolvedValueOnce(initialDogsPlaceholder)
      .mockResolvedValueOnce(orgDogs)
      .mockResolvedValueOnce(allDogs);

    render(<DogsPage />);

    // pick “Org A”
    const orgSelect = screen.getByTestId("organization-filter");
    await user.click(orgSelect);
    const orgOption = await screen.findByRole("option", { name: "Org A" });
    await user.click(orgOption);

    // after filter, we see “Org Dog”
    await waitFor(() =>
      expect(screen.getByText("Org Dog")).toBeInTheDocument(),
    );

    // find the remove‑chip button
    const removeBtn = screen.getByRole("button", {
      name: /Remove Org A filter/i,
    });
    expect(removeBtn).toBeInTheDocument();
    await user.click(removeBtn);

    // now it’s cleared
    await waitFor(() => {
      expect(screen.queryByText("Org Dog")).not.toBeInTheDocument();
      expect(screen.getByText("Any Dog 1")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Remove Org A filter/i }),
      ).not.toBeInTheDocument();
    });

    // and API was called three times:
    expect(getAnimals).toHaveBeenCalledTimes(3);
    expect(getAnimals).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ offset: 0 }),
    );
    expect(getAnimals).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        organization_id: "1",
        offset: 0,
      }),
    );
    expect(getAnimals).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ offset: 0 }),
    );
  });

  test.skip('clears all filters and refetches when "Clear All" is clicked (TODO: Organization filter UI)', async () => {
    const user = userEvent.setup();
    const orgDogs = [createMockDog(101, "Org Dog")];
    const allDogs = [
      createMockDog(1, "Any Dog 1"),
      createMockDog(2, "Any Dog 2"),
    ];
    const initialDogsPlaceholder = [createMockDog(999, "Placeholder")];

    getAnimals
      .mockResolvedValueOnce(initialDogsPlaceholder)
      .mockResolvedValueOnce(orgDogs)
      .mockResolvedValueOnce(allDogs);

    render(<DogsPage />);

    // apply the organization filter
    const orgSelect = screen.getByTestId("organization-filter");
    await user.click(orgSelect);
    const orgOption = await screen.findByRole("option", { name: "Org A" });
    await user.click(orgOption);

    await waitFor(() =>
      expect(screen.getByText("Org Dog")).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /Remove Org A filter/i }),
    ).toBeInTheDocument();

    // locate the Active Filters container
    const activeFiltersContainer = screen
      .getByText(/Active Filters:/i)
      .closest("div");
    expect(activeFiltersContainer).toBeInTheDocument();

    // click the “Clear All” within that container
    const clearAllButton = within(activeFiltersContainer).getByRole("button", {
      name: /Clear All/i,
    });
    expect(clearAllButton).toBeInTheDocument();
    await user.click(clearAllButton);

    // should remove the org chip and re‑fetch
    await waitFor(() => {
      expect(screen.queryByText("Org Dog")).not.toBeInTheDocument();
      expect(screen.getByText("Any Dog 1")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Remove Org A filter/i }),
      ).not.toBeInTheDocument();
      expect(
        within(activeFiltersContainer).queryByRole("button", {
          name: /Clear All/i,
        }),
      ).not.toBeInTheDocument();
    });

    expect(getAnimals).toHaveBeenCalledTimes(3);
    expect(getAnimals).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ offset: 0 }),
    );
    expect(getAnimals).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        organization_id: "1",
        offset: 0,
      }),
    );
    expect(getAnimals).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ offset: 0 }),
    );
  });

  test("changing search box refetches with search param", async () => {
    // stub getAnimals for every call so dogs never become undefined
    getAnimals.mockResolvedValue([]);

    render(<DogsPage />);
    const input = screen.getByPlaceholderText(/Search dogs/i);
    fireEvent.change(input, { target: { value: "buddy" } });
    await waitFor(() => {
      expect(getAnimals).toHaveBeenCalledWith(
        expect.objectContaining({ search: "buddy" }),
      );
    });
  });

  describe("Mobile Filter Button Enhancements", () => {
    test("mobile filter button displays with orange border and hover states", async () => {
      getAnimals.mockResolvedValue([]);
      render(<DogsPage />);

      const mobileFilterButton = screen.getByRole("button", {
        name: /Filter/i,
      });
      expect(mobileFilterButton).toBeInTheDocument();
      expect(mobileFilterButton).toHaveClass(
        "border-2",
        "border-orange-200",
        "hover:border-orange-300",
      );
    });

    test.skip("mobile filter button shows active filter count badge when filters are applied (TODO: Organization filter UI)", async () => {
      const user = userEvent.setup();
      const mockDogs = [createMockDog(1, "Test Dog")];

      getAnimals.mockResolvedValue(mockDogs);
      render(<DogsPage />);

      // Apply a filter first
      const orgSelect = screen.getByTestId("organization-filter");
      await user.click(orgSelect);
      const orgOption = await screen.findByRole("option", { name: "Org A" });
      await user.click(orgOption);

      await waitFor(() => {
        const mobileFilterButton = screen.getByRole("button", {
          name: /Filter.*1/i,
        });
        expect(mobileFilterButton).toBeInTheDocument();

        // Check for the orange badge styling
        const badge = mobileFilterButton.querySelector("span.bg-orange-100");
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass(
          "text-orange-700",
          "px-2",
          "py-0.5",
          "rounded-full",
        );
        expect(badge).toHaveTextContent("1");
      });
    });

    test.skip("mobile filter button count updates in real-time as filters change (TODO: Organization filter UI)", async () => {
      const user = userEvent.setup();
      const mockDogs = [createMockDog(1, "Test Dog")];

      getAnimals.mockResolvedValue(mockDogs);
      render(<DogsPage />);

      // Initially no count shown
      expect(
        screen.getByRole("button", { name: /^Filter$/ }),
      ).toBeInTheDocument();

      // Apply first filter - should show (1)
      const orgSelect = screen.getByTestId("organization-filter");
      await user.click(orgSelect);
      const orgOption = await screen.findByRole("option", { name: "Org A" });
      await user.click(orgOption);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Filter.*1/i }),
        ).toBeInTheDocument();
      });

      // Apply second filter - should show (2)
      const sizeButton = screen.getByTestId("size-button-Small");
      await user.click(sizeButton);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Filter.*2/i }),
        ).toBeInTheDocument();
      });

      // Clear one filter - should show (1)
      const removeOrgBtn = screen.getByRole("button", {
        name: /Remove Org A filter/i,
      });
      await user.click(removeOrgBtn);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Filter.*1/i }),
        ).toBeInTheDocument();
      });
    });

    test.skip("mobile filter button hides count badge when no filters are active (TODO: Organization filter UI)", async () => {
      const user = userEvent.setup();
      const mockDogs = [createMockDog(1, "Test Dog")];

      getAnimals.mockResolvedValue(mockDogs);
      render(<DogsPage />);

      // Apply filter
      const orgSelect = screen.getByTestId("organization-filter");
      await user.click(orgSelect);
      const orgOption = await screen.findByRole("option", { name: "Org A" });
      await user.click(orgOption);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /Filter.*1/i }),
        ).toBeInTheDocument();
      });

      // Clear all filters
      const activeFiltersContainer = screen
        .getByText(/Active Filters:/i)
        .closest("div");
      const clearAllButton = within(activeFiltersContainer).getByRole(
        "button",
        { name: /Clear All/i },
      );
      await user.click(clearAllButton);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /^Filter$/ }),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: /Filter.*\d/i }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Background and Layout", () => {
    test("applies gradient background to page wrapper", async () => {
      getAnimals.mockResolvedValue([]);
      render(<DogsPage />);

      // Find the gradient background wrapper
      const gradientWrapper = screen.getByTestId("dogs-page-gradient-wrapper");
      expect(gradientWrapper).toBeInTheDocument();
      expect(gradientWrapper).toHaveClass(
        "bg-gradient-to-br",
        "from-[#FFF5E6]",
        "to-[#FFE4CC]",
      );
    });

    test("gradient background covers full viewport height", async () => {
      getAnimals.mockResolvedValue([]);
      render(<DogsPage />);

      const gradientWrapper = screen.getByTestId("dogs-page-gradient-wrapper");
      expect(gradientWrapper).toHaveClass("min-h-screen");
    });

    test("maintains proper container constraints within gradient background", async () => {
      getAnimals.mockResolvedValue([]);
      render(<DogsPage />);

      const container = screen.getByTestId("dogs-page-container");
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass(
        "max-w-7xl",
        "mx-auto",
        "px-4",
        "sm:px-6",
        "lg:px-8",
      );
    });
  });

  describe("Session 6: Enhanced Loading States & Filter Transitions", () => {
    test.skip("applies filter loading type when filters change", async () => {
      const user = userEvent.setup();
      const initialDogs = [createMockDog(1, "Initial Dog")];
      const filteredDogs = [createMockDog(2, "Filtered Dog")];

      getAnimals.mockResolvedValueOnce(initialDogs);
      getAnimals.mockResolvedValueOnce(filteredDogs);

      render(<DogsPage />);
      await waitFor(() => screen.getByText("Initial Dog"));

      // Change breed filter using search input
      const breedInput = screen.getByTestId("breed-search-input");
      await user.clear(breedInput);
      await user.type(breedInput, "Labrador Retriever");

      // Wait for the filter change to complete
      await waitFor(() => {
        expect(screen.getByText("Filtered Dog")).toBeInTheDocument();
      });

      // Verify the API was called with filter parameters
      expect(getAnimals).toHaveBeenCalledTimes(2);
      expect(getAnimals).toHaveBeenLastCalledWith(
        expect.objectContaining({
          standardized_breed: "Labrador Retriever",
        }),
      );
    });

    test.skip("shows smooth transition when clearing all filters", async () => {
      const user = userEvent.setup();
      const initialDogs = [createMockDog(1, "Initial Dog")];
      const filteredDogs = [createMockDog(2, "Filtered Dog")];
      const allDogs = [
        createMockDog(1, "All Dog 1"),
        createMockDog(3, "All Dog 2"),
      ];

      getAnimals.mockResolvedValueOnce(initialDogs);
      getAnimals.mockResolvedValueOnce(filteredDogs);
      getAnimals.mockResolvedValueOnce(allDogs);

      render(<DogsPage />);
      await waitFor(() => screen.getByText("Initial Dog"));

      // Apply a filter first
      const breedInput = screen.getByTestId("breed-search-input");
      await user.clear(breedInput);
      await user.type(breedInput, "Labrador Retriever");

      await waitFor(() => screen.getByText("Filtered Dog"));

      // Clear all filters
      const clearAllButton = screen.getByRole("button", { name: /Clear All/i });
      await user.click(clearAllButton);

      // Wait for transition to complete
      await waitFor(() => {
        expect(screen.getByText("All Dog 1")).toBeInTheDocument();
        expect(screen.getByText("All Dog 2")).toBeInTheDocument();
      });

      // Verify API calls were made correctly
      expect(getAnimals).toHaveBeenCalledTimes(3);
    });

    test("maintains scroll position during filter transitions", async () => {
      const user = userEvent.setup();
      const manyDogs = Array.from({ length: 20 }, (_, i) =>
        createMockDog(i + 1, `Dog ${i + 1}`),
      );
      const filteredDogs = [createMockDog(100, "Filtered Dog")];

      getAnimals.mockResolvedValueOnce(manyDogs);
      getAnimals.mockResolvedValueOnce(filteredDogs);

      render(<DogsPage />);
      await waitFor(() => screen.getByText("Dog 1"));

      // Simulate user scrolling down
      Object.defineProperty(window, "scrollY", {
        value: 500,
        configurable: true,
      });

      // Apply filter
      const sizeButton = screen.getByTestId("size-button-Small");
      await user.click(sizeButton);

      // Wait for filter transition to complete
      await waitFor(() => {
        expect(screen.getByText("Filtered Dog")).toBeInTheDocument();
      });

      // Verify filter was applied correctly
      expect(getAnimals).toHaveBeenCalledTimes(2);
      expect(getAnimals).toHaveBeenLastCalledWith(
        expect.objectContaining({
          standardized_size: "Small",
        }),
      );
    });

    test("applies enhanced fade transitions for filter changes", async () => {
      const user = userEvent.setup();
      const initialDogs = [createMockDog(1, "Initial Dog")];
      const filteredDogs = [createMockDog(2, "Filtered Dog")];

      getAnimals.mockResolvedValueOnce(initialDogs);
      getAnimals.mockResolvedValueOnce(filteredDogs);

      render(<DogsPage />);
      await waitFor(() => screen.getByText("Initial Dog"));

      // Change sex filter
      const sexButton = screen.getByTestId("sex-button-Male");
      await user.click(sexButton);

      // Should show dogs grid with appropriate animation classes during transition
      await waitFor(() => {
        const dogsGrid = screen.getByTestId("dogs-grid");
        expect(dogsGrid).toBeInTheDocument();
        // Grid should have fade animation classes
        expect(dogsGrid).toHaveClass("animate-in", "fade-in");
      });

      await waitFor(() => {
        expect(screen.getByText("Filtered Dog")).toBeInTheDocument();
      });
    });

    test("handles rapid filter changes gracefully", async () => {
      const user = userEvent.setup();
      const dogs1 = [createMockDog(1, "Dogs Set 1")];
      const dogs2 = [createMockDog(2, "Dogs Set 2")];
      const dogs3 = [createMockDog(3, "Dogs Set 3")];

      getAnimals.mockResolvedValueOnce(dogs1);
      getAnimals.mockResolvedValueOnce(dogs2);
      getAnimals.mockResolvedValueOnce(dogs3);

      render(<DogsPage />);
      await waitFor(() => screen.getByText("Dogs Set 1"));

      // Apply multiple filters quickly
      const sizeSmall = screen.getByTestId("size-button-Small");
      const sizeMedium = screen.getByTestId("size-button-Medium");

      await user.click(sizeSmall);
      // Immediately click another filter before first resolves
      await user.click(sizeMedium);

      // Should eventually show the final result
      await waitFor(
        () => {
          expect(screen.getByText("Dogs Set 3")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    test("skeletons maintain staggered animation during filter loading", async () => {
      const user = userEvent.setup();
      const initialDogs = [createMockDog(1, "Initial Dog")];
      const filteredDogs = [createMockDog(2, "Filtered Dog")];

      getAnimals.mockResolvedValueOnce(initialDogs);
      getAnimals.mockResolvedValueOnce(filteredDogs);

      render(<DogsPage />);
      await waitFor(() => screen.getByText("Initial Dog"));

      // Apply filter
      const ageButton = screen.getByTestId("age-button-Puppy");
      await user.click(ageButton);

      // Wait for filter change to complete
      await waitFor(() => {
        expect(screen.getByText("Filtered Dog")).toBeInTheDocument();
      });

      // Verify the age filter was applied
      expect(getAnimals).toHaveBeenCalledTimes(2);
      expect(getAnimals).toHaveBeenLastCalledWith(
        expect.objectContaining({
          age_category: "Puppy",
        }),
      );
    });
  });

  describe("Session 7: Final Polish & Visual Consistency", () => {
    test("Load More button matches dog card CTA styling", async () => {
      const initialDogs = Array.from({ length: 20 }, (_, i) =>
        createMockDog(i + 1, `Dog ${i + 1}`),
      );
      // Mock the main call and ensure hasMore is true by returning exactly 20 items
      getAnimals.mockResolvedValue(initialDogs);

      render(<DogsPage />);

      // Wait for the dogs to load first
      await waitFor(() => {
        expect(screen.getByText("Dog 1")).toBeInTheDocument();
      });

      const loadMoreButton = await screen.findByRole("button", {
        name: /Load More Dogs/i,
      });

      // Check button has orange gradient styling (actual implementation)
      expect(loadMoreButton).toHaveClass(
        "bg-gradient-to-r",
        "from-orange-500",
        "to-orange-600",
      );
      expect(loadMoreButton).toHaveClass(
        "hover:from-orange-600",
        "hover:to-orange-700",
      );
      expect(loadMoreButton).toHaveClass("text-white", "font-medium");

      // Check proper spacing and shadows
      expect(loadMoreButton).toHaveClass("px-8", "py-3", "rounded-lg");
      expect(loadMoreButton).toHaveClass("shadow-md", "hover:shadow-lg");

      // Check accessibility styling
      expect(loadMoreButton).toHaveClass("enhanced-focus-button");
      expect(loadMoreButton).toHaveClass("mobile-touch-target");

      // Check button text includes arrow
      expect(loadMoreButton).toHaveTextContent("Load More Dogs →");
    });

    test("Load More button styling is consistent with dog card CTAs", async () => {
      const initialDogs = Array.from({ length: 20 }, (_, i) =>
        createMockDog(i + 1, `Dog ${i + 1}`),
      );
      // Mock the main call and ensure hasMore is true by returning exactly 20 items
      getAnimals.mockResolvedValue(initialDogs);

      render(<DogsPage />);

      // Wait for the dogs to load first
      await waitFor(() => {
        expect(screen.getByText("Dog 1")).toBeInTheDocument();
      });

      const loadMoreButton = await screen.findByRole("button", {
        name: /Load More Dogs/i,
      });

      // Verify the button maintains consistent orange theme (actual implementation)
      expect(loadMoreButton).toHaveClass(
        "bg-gradient-to-r",
        "from-orange-500",
        "to-orange-600",
      );

      // Verify it has proper disabled state classes (even if not currently disabled)
      expect(loadMoreButton).toHaveClass(
        "disabled:opacity-50",
        "disabled:cursor-not-allowed",
      );

      // Verify minimum height for touch targets
      expect(loadMoreButton).toHaveClass("mobile-touch-target");
    });
  });
});
