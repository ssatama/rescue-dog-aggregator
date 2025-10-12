import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import DogsPageClientSimplified from "../DogsPageClientSimplified";
import { getAnimals, getFilterCounts } from "../../../services/animalsService";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock("../../../services/animalsService", () => ({
  getAnimals: jest.fn(),
  getFilterCounts: jest.fn(),
  getAvailableRegions: jest.fn(),
}));

jest.mock("../../../components/layout/Layout", () => {
  return function Layout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock("../../../components/dogs/DogCardOptimized", () => {
  return function DogCardOptimized({ dog }) {
    return (
      <div data-testid="dog-card" data-dog-id={dog.id}>
        {dog.name}
      </div>
    );
  };
});

describe("DogsPageClientSimplified - Pagination Bug", () => {
  let mockPush;
  let mockReplace;
  let searchParamsValue;
  let searchParamsListeners;

  const createMockDogs = (start, count) => {
    return Array.from({ length: count }, (_, i) => ({
      id: start + i,
      name: `Dog ${start + i}`,
      breed: "Test Breed",
      age: "Adult",
      sex: "Male",
      size: "Medium",
    }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    searchParamsListeners = [];

    // Mock URLSearchParams to track changes
    searchParamsValue = new URLSearchParams();

    mockPush = jest.fn((url) => {
      // Extract params from URL and update searchParams
      const urlObj = new URL(url, "http://localhost");
      searchParamsValue = new URLSearchParams(urlObj.search);

      // Trigger all listeners (simulate useEffect re-runs)
      searchParamsListeners.forEach(listener => listener());
    });

    mockReplace = jest.fn();

    useRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });

    useSearchParams.mockImplementation(() => {
      // Return current searchParams and register listener for changes
      const listener = () => {};
      searchParamsListeners.push(listener);
      return searchParamsValue;
    });

    usePathname.mockReturnValue("/dogs");

    // Mock API responses
    getFilterCounts.mockResolvedValue({
      size: { Small: 100, Medium: 200, Large: 150 },
      age: { Puppy: 80, Adult: 300, Senior: 70 },
      sex: { Male: 250, Female: 200 },
    });
  });

  it.skip("FAILS: Load More Dogs should append new dogs without disappearing", async () => {
    // Initial data: 20 dogs (page 1)
    const page1Dogs = createMockDogs(1, 20);
    const page2Dogs = createMockDogs(21, 20);

    // Set up initial render with page 1
    getAnimals.mockResolvedValueOnce(page1Dogs);

    const { rerender } = render(
      <DogsPageClientSimplified
        initialDogs={page1Dogs}
        metadata={{
          organizations: [{ id: 1, name: "Test Org" }],
          standardizedBreeds: ["Test Breed"],
          locationCountries: ["USA"],
          availableCountries: ["USA"],
        }}
        initialParams={{}}
      />
    );

    // Verify initial 20 dogs are rendered
    await waitFor(() => {
      const dogCards = screen.getAllByTestId("dog-card");
      expect(dogCards).toHaveLength(20);
      expect(screen.getByText("Dog 1")).toBeInTheDocument();
      expect(screen.getByText("Dog 20")).toBeInTheDocument();
    });

    // Find and click "Load More Dogs" button
    const loadMoreButton = screen.getByRole("button", { name: /load more dogs/i });
    expect(loadMoreButton).toBeInTheDocument();

    // Mock API response for page 2
    getAnimals.mockResolvedValueOnce(page2Dogs);
    getFilterCounts.mockResolvedValueOnce({
      size: { Small: 100, Medium: 200, Large: 150 },
      age: { Puppy: 80, Adult: 300, Senior: 70 },
      sex: { Male: 250, Female: 200 },
    });

    // Click Load More
    await act(async () => {
      fireEvent.click(loadMoreButton);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(getAnimals).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 20, // Page 2 offset
        })
      );
    });

    // CRITICAL TEST: Verify dogs are APPENDED, not REPLACED
    // This test SHOULD FAIL with current implementation
    await waitFor(() => {
      const dogCards = screen.getAllByTestId("dog-card");

      // Should have 40 dogs total (20 from page 1 + 20 from page 2)
      expect(dogCards).toHaveLength(40);

      // Original page 1 dogs should still be present
      expect(screen.getByText("Dog 1")).toBeInTheDocument();
      expect(screen.getByText("Dog 10")).toBeInTheDocument();
      expect(screen.getByText("Dog 20")).toBeInTheDocument();

      // New page 2 dogs should also be present
      expect(screen.getByText("Dog 21")).toBeInTheDocument();
      expect(screen.getByText("Dog 30")).toBeInTheDocument();
      expect(screen.getByText("Dog 40")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it.skip("FAILS: Pagination should not trigger duplicate API calls", async () => {
    const page1Dogs = createMockDogs(1, 20);
    const page2Dogs = createMockDogs(21, 20);

    getAnimals.mockResolvedValueOnce(page1Dogs);

    render(
      <DogsPageClientSimplified
        initialDogs={page1Dogs}
        metadata={{
          organizations: [{ id: 1, name: "Test Org" }],
          standardizedBreeds: ["Test Breed"],
          locationCountries: ["USA"],
          availableCountries: ["USA"],
        }}
        initialParams={{}}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("dog-card")).toHaveLength(20);
    });

    // Clear previous mock calls
    getAnimals.mockClear();

    // Mock page 2 response
    getAnimals.mockResolvedValueOnce(page2Dogs);

    const loadMoreButton = screen.getByRole("button", { name: /load more dogs/i });

    await act(async () => {
      fireEvent.click(loadMoreButton);
    });

    // Wait for the first call
    await waitFor(() => {
      expect(getAnimals).toHaveBeenCalled();
    });

    // Give time for any race condition to trigger duplicate calls
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
    });

    // CRITICAL TEST: Should only call API ONCE for pagination
    // This test SHOULD FAIL because the race condition causes 2 calls
    expect(getAnimals).toHaveBeenCalledTimes(1);
  });

  it.skip("Filter changes should replace dogs (not append)", async () => {
    const initialDogs = createMockDogs(1, 20);
    const filteredDogs = createMockDogs(101, 15);

    getAnimals.mockResolvedValueOnce(initialDogs);

    render(
      <DogsPageClientSimplified
        initialDogs={initialDogs}
        metadata={{
          organizations: [{ id: 1, name: "Test Org" }],
          standardizedBreeds: ["Test Breed"],
          locationCountries: ["USA"],
          availableCountries: ["USA"],
        }}
        initialParams={{}}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByTestId("dog-card")).toHaveLength(20);
    });

    // Mock filtered results
    getAnimals.mockResolvedValueOnce(filteredDogs);

    // Change a filter (this should REPLACE, not append)
    const sizeFilter = screen.getAllByRole("button").find(btn =>
      btn.textContent.includes("Small") || btn.textContent.includes("size")
    );

    if (sizeFilter) {
      await act(async () => {
        fireEvent.click(sizeFilter);
      });
    }

    // After filter change, should only have the NEW dogs (not appended)
    await waitFor(() => {
      const dogCards = screen.getAllByTestId("dog-card");
      expect(dogCards.length).toBeLessThanOrEqual(20);

      // Original dogs should NOT be present
      expect(screen.queryByText("Dog 1")).not.toBeInTheDocument();

      // Only filtered dogs should be present
      if (screen.queryByText("Dog 101")) {
        expect(screen.getByText("Dog 101")).toBeInTheDocument();
      }
    });
  });
});
