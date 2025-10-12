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

jest.mock("../../../components/dogs/DogsPageViewportWrapper", () => {
  return function DogsPageViewportWrapper({ dogs, onLoadMore, hasMore, loadingMore }) {
    return (
      <div data-testid="viewport-wrapper">
        {dogs.map(dog => (
          <div key={dog.id} data-testid="dog-card" data-dog-id={dog.id}>
            {dog.name}
          </div>
        ))}
        {hasMore && (
          <button onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load More Dogs"}
          </button>
        )}
      </div>
    );
  };
});

describe("DogsPageClientSimplified - Race Conditions (Bug #2)", () => {
  let mockPush;
  let mockReplace;

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
    jest.useFakeTimers();

    mockPush = jest.fn();
    mockReplace = jest.fn();

    useRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });

    useSearchParams.mockReturnValue(new URLSearchParams());
    usePathname.mockReturnValue("/dogs");

    getFilterCounts.mockResolvedValue({
      size: { Small: 100, Medium: 200, Large: 150 },
      age: { Puppy: 80, Adult: 300, Senior: 70 },
      sex: { Male: 250, Female: 200 },
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it("prevents double-fetch when loadMore triggers URL change", async () => {
    // Use real timers for this test to avoid Promise resolution issues
    jest.useRealTimers();

    let requestCount = 0;
    const page1Dogs = createMockDogs(1, 20);
    const page2Dogs = createMockDogs(21, 20);

    // Mock window.history.replaceState to track URL updates
    const originalReplaceState = window.history.replaceState;
    const mockReplaceState = jest.fn();
    window.history.replaceState = mockReplaceState;

    // Track all API calls (without setTimeout for simpler testing)
    getAnimals.mockImplementation(async (params) => {
      requestCount++;
      // Simulate small async delay without setTimeout
      await Promise.resolve();

      if (params.offset === 0) {
        return page1Dogs;
      } else if (params.offset === 20) {
        return page2Dogs;
      }
      return [];
    });

    const { getByRole } = render(
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

    // Reset count after initial load
    requestCount = 0;

    const loadMoreButton = getByRole("button", { name: /load more dogs/i });

    // Click load more button
    fireEvent.click(loadMoreButton);

    // Wait for the API call to complete and state to update
    await waitFor(() => {
      expect(requestCount).toBe(1);
    }, { timeout: 3000 });

    // BUG B FIX: Now using window.history.replaceState instead of router.push
    await waitFor(() => {
      expect(mockReplaceState).toHaveBeenCalled();
    });

    // Verify dogs were appended correctly (no duplicates)
    await waitFor(() => {
      const dogCards = screen.getAllByTestId("dog-card");
      expect(dogCards).toHaveLength(40);
    }, { timeout: 3000 });

    // Cleanup
    window.history.replaceState = originalReplaceState;
  });

  it("SHOULD FAIL: rapid Load More clicks should not cause duplicate dogs", async () => {
    const page1Dogs = createMockDogs(1, 20);
    const page2Dogs = createMockDogs(21, 20);
    const page3Dogs = createMockDogs(41, 20);

    let callCount = 0;
    getAnimals.mockImplementation(async (params) => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 50));
      
      if (params.offset === 0) return page1Dogs;
      if (params.offset === 20) return page2Dogs;
      if (params.offset === 40) return page3Dogs;
      return [];
    });

    const { getByRole } = render(
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

    callCount = 0;

    const loadMoreButton = getByRole("button", { name: /load more dogs/i });

    // Rapidly click twice
    await act(async () => {
      fireEvent.click(loadMoreButton);
      fireEvent.click(loadMoreButton);
    });

    await act(async () => {
      jest.advanceTimersByTime(150);
    });

    // CRITICAL TEST: Second click should be ignored due to loadingMore guard
    // But race condition could still allow duplicate fetches
    expect(callCount).toBeLessThanOrEqual(1);

    // Verify no duplicate dog IDs
    await waitFor(() => {
      const dogCards = screen.getAllByTestId("dog-card");
      const dogIds = dogCards.map(card => card.dataset.dogId);
      const uniqueIds = new Set(dogIds);
      
      expect(uniqueIds.size).toBe(dogIds.length);
    });
  });

  it("guards against concurrent loadMore operations", async () => {
    const page1Dogs = createMockDogs(1, 20);
    const page2Dogs = createMockDogs(21, 20);

    getAnimals.mockResolvedValueOnce(page1Dogs);

    const { getByRole, rerender } = render(
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

    let fetchCount = 0;
    getAnimals.mockImplementation(async () => {
      fetchCount++;
      await new Promise(resolve => setTimeout(resolve, 200));
      return page2Dogs;
    });

    const loadMoreButton = getByRole("button", { name: /load more dogs/i });

    // Click load more
    await act(async () => {
      fireEvent.click(loadMoreButton);
    });

    // Verify button is disabled while loading
    await waitFor(() => {
      expect(loadMoreButton).toBeDisabled();
    });

    // Complete the request
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getAllByTestId("dog-card")).toHaveLength(40);
    });

    // Should have only made one request
    expect(fetchCount).toBe(1);
  });
});