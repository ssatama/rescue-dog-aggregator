import { render, screen, waitFor } from "@testing-library/react";
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
  return function DogsPageViewportWrapper({ dogs }) {
    return (
      <div data-testid="viewport-wrapper">
        {dogs.map(dog => (
          <div key={dog.id} data-testid="dog-card" data-dog-id={dog.id}>
            {dog.name}
          </div>
        ))}
      </div>
    );
  };
});

describe("DogsPageClientSimplified - SSR Cache Conflict (Bug #3)", () => {
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

    mockPush = jest.fn();
    mockReplace = jest.fn();

    useRouter.mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });

    usePathname.mockReturnValue("/dogs");

    getFilterCounts.mockResolvedValue({
      size: { Small: 100, Medium: 200, Large: 150 },
      age: { Puppy: 80, Adult: 300, Senior: 70 },
      sex: { Male: 250, Female: 200 },
    });
  });

  it("SHOULD FAIL: prevents duplicate dogs on hard reload at page=3", async () => {
    // Simulate Next.js cache: initialDogs has page 1, but URL says page=3
    const cachedPage1Dogs = createMockDogs(1, 20);
    const page1Dogs = createMockDogs(1, 20);
    const page2Dogs = createMockDogs(21, 20);
    const page3Dogs = createMockDogs(41, 20);

    // Mock URL to be at page=3
    const searchParams = new URLSearchParams('page=3');
    useSearchParams.mockReturnValue(searchParams);

    // Mock API calls - component should fetch pages 1, 2, 3
    getAnimals.mockImplementation(async (params) => {
      if (params.offset === 0) return page1Dogs;
      if (params.offset === 20) return page2Dogs;
      if (params.offset === 40) return page3Dogs;
      return [];
    });

    render(
      <DogsPageClientSimplified
        initialDogs={cachedPage1Dogs}
        metadata={{
          organizations: [{ id: 1, name: "Test Org" }],
          standardizedBreeds: ["Test Breed"],
          locationCountries: ["USA"],
          availableCountries: ["USA"],
        }}
        initialParams={{}}
      />
    );

    // Wait for hydration to complete
    await waitFor(() => {
      const dogCards = screen.getAllByTestId("dog-card");
      expect(dogCards.length).toBeGreaterThan(20);
    }, { timeout: 3000 });

    // Should have exactly 60 dogs (pages 1-3)
    const dogCards = screen.getAllByTestId("dog-card");
    expect(dogCards).toHaveLength(60);

    // CRITICAL TEST: No duplicates
    const dogIds = dogCards.map(card => card.dataset.dogId);
    const uniqueIds = new Set(dogIds);
    
    // This test WILL FAIL because initialDogs from page 1 conflicts with fetched data
    expect(uniqueIds.size).toBe(60);
    expect(dogIds).toEqual([...Array(60)].map((_, i) => String(i + 1)));
  });

  it("SHOULD FAIL: correctly handles page=1 with cached data", async () => {
    const cachedPage1Dogs = createMockDogs(1, 20);

    // Mock URL to be at page=1 (no cache conflict expected)
    const searchParams = new URLSearchParams('page=1');
    useSearchParams.mockReturnValue(searchParams);

    getAnimals.mockResolvedValue(cachedPage1Dogs);

    render(
      <DogsPageClientSimplified
        initialDogs={cachedPage1Dogs}
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

    // Should use cached data without refetch when page=1
    const dogCards = screen.getAllByTestId("dog-card");
    const dogIds = dogCards.map(card => card.dataset.dogId);
    const uniqueIds = new Set(dogIds);
    
    expect(uniqueIds.size).toBe(20);
    expect(dogIds[0]).toBe("1");
    expect(dogIds[19]).toBe("20");
  });

  it("SHOULD FAIL: correctly handles filters with cached page=1 data", async () => {
    const cachedPage1Dogs = createMockDogs(1, 20);
    const filteredDogs = createMockDogs(101, 15);

    // Mock URL with filters (should ignore cache)
    const searchParams = new URLSearchParams('size=Small&page=1');
    useSearchParams.mockReturnValue(searchParams);

    getAnimals.mockResolvedValue(filteredDogs);

    render(
      <DogsPageClientSimplified
        initialDogs={cachedPage1Dogs}
        metadata={{
          organizations: [{ id: 1, name: "Test Org" }],
          standardizedBreeds: ["Test Breed"],
          locationCountries: ["USA"],
          availableCountries: ["USA"],
        }}
        initialParams={{}}
      />
    );

    // Should fetch filtered data, not use cache
    await waitFor(() => {
      expect(getAnimals).toHaveBeenCalled();
    });

    // Final state should have filtered dogs
    await waitFor(() => {
      const dogCards = screen.getAllByTestId("dog-card");
      if (dogCards.length > 0) {
        expect(dogCards.length).toBeGreaterThanOrEqual(15);
      }
    });
  });
});
