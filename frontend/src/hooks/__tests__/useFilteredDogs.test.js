/**
 * Tests for useFilteredDogs custom hook
 */

import { renderHook, act } from "@testing-library/react";
import useFilteredDogs from "../useFilteredDogs";

// Mock the dogFilters module
jest.mock("../../utils/dogFilters", () => {
  const hasActiveFiltersMock = jest.fn();
  return {
    applyAllFilters: jest.fn(),
    extractAvailableBreeds: jest.fn(),
    extractAvailableLocations: jest.fn(),
    extractAvailableShipsTo: jest.fn(),
    hasActiveFilters: hasActiveFiltersMock,
  };
});

describe("useFilteredDogs", () => {
  const mockDogs = [
    {
      id: 1,
      name: "Buddy",
      age_min_months: 6,
      standardized_breed: "Golden Retriever",
      created_at: "2024-01-15T10:00:00Z",
      organization: {
        name: "Test Rescue",
        service_regions: ["TR", "DE"],
        ships_to: ["DE", "NL", "BE"],
      },
    },
    {
      id: 2,
      name: "Max",
      age_min_months: 18,
      standardized_breed: "Labrador Retriever",
      created_at: "2024-02-10T10:00:00Z",
      organization: {
        name: "Another Rescue",
        service_regions: ["US", "CA"],
        ships_to: ["US", "CA", "MX"],
      },
    },
  ];

  const defaultFilters = {
    age: "All",
    breed: "",
    location: "All",
    shipsTo: "All",
    sort: "newest",
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Set up default mock implementations
    const {
      applyAllFilters,
      extractAvailableBreeds,
      extractAvailableLocations,
      extractAvailableShipsTo,
      hasActiveFilters,
    } = require("../../utils/dogFilters");

    applyAllFilters.mockImplementation((dogs, filters) => dogs || []);
    extractAvailableBreeds.mockImplementation((dogs) => {
      if (!dogs || !Array.isArray(dogs)) return [];
      const breeds = new Set();
      dogs.forEach((dog) => {
        if (dog) {
          const breed = dog.standardized_breed || dog.breed;
          if (breed && breed !== "Unknown") {
            breeds.add(breed);
          }
        }
      });
      return Array.from(breeds).sort();
    });
    extractAvailableLocations.mockImplementation((dogs) => {
      if (!dogs || !Array.isArray(dogs)) return [];
      const locations = new Set();
      dogs.forEach((dog) => {
        if (dog && dog.organization && dog.organization.service_regions) {
          dog.organization.service_regions.forEach((region) =>
            locations.add(region),
          );
        }
      });
      return Array.from(locations).sort();
    });
    extractAvailableShipsTo.mockImplementation((dogs) => {
      if (!dogs || !Array.isArray(dogs)) return [];
      const shipsTo = new Set();
      dogs.forEach((dog) => {
        if (dog && dog.organization && dog.organization.ships_to) {
          dog.organization.ships_to.forEach((country) => shipsTo.add(country));
        }
      });
      return Array.from(shipsTo).sort();
    });
    hasActiveFilters.mockImplementation((filters) => {
      if (!filters) return false;
      return (
        (filters.age && filters.age !== "All" && filters.age !== null) ||
        (filters.breed &&
          typeof filters.breed === "string" &&
          filters.breed.trim() !== "") ||
        (filters.location &&
          filters.location !== "All" &&
          filters.location !== null) ||
        (filters.shipsTo &&
          filters.shipsTo !== "All" &&
          filters.shipsTo !== null)
      );
    });
  });

  describe("Basic Functionality", () => {
    test("returns filtered dogs and metadata", () => {
      const { applyAllFilters } = require("../../utils/dogFilters");
      applyAllFilters.mockReturnValue(mockDogs);

      const { result } = renderHook(() =>
        useFilteredDogs(mockDogs, defaultFilters),
      );

      expect(result.current.filteredDogs).toEqual(mockDogs);
      expect(result.current.totalCount).toBe(2);
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.availableBreeds).toEqual([
        "Golden Retriever",
        "Labrador Retriever",
      ]);
      expect(result.current.availableLocations).toEqual([
        "CA",
        "DE",
        "TR",
        "US",
      ]);
      expect(result.current.availableShipsTo).toEqual([
        "BE",
        "CA",
        "DE",
        "MX",
        "NL",
        "US",
      ]);
    });

    test("calls applyAllFilters with correct parameters", () => {
      const { applyAllFilters } = require("../../utils/dogFilters");
      const filters = { ...defaultFilters, age: "Puppy" };

      renderHook(() => useFilteredDogs(mockDogs, filters));

      expect(applyAllFilters).toHaveBeenCalledWith(mockDogs, filters, true);
    });

    test("calls applyAllFilters with includeShipsTo=false when specified", () => {
      const { applyAllFilters } = require("../../utils/dogFilters");
      const filters = { ...defaultFilters, age: "Puppy" };

      renderHook(() => useFilteredDogs(mockDogs, filters, false));

      expect(applyAllFilters).toHaveBeenCalledWith(mockDogs, filters, false);
    });

    test("detects active filters correctly", () => {
      const filtersWithActive = {
        age: "Puppy",
        breed: "golden",
        location: "All",
        shipsTo: "All",
        sort: "newest",
      };

      const { result } = renderHook(() =>
        useFilteredDogs(mockDogs, filtersWithActive),
      );

      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  describe("Memoization and Performance", () => {
    test("memoizes results when inputs unchanged", () => {
      const { applyAllFilters } = require("../../utils/dogFilters");
      applyAllFilters.mockReturnValue(mockDogs);

      const { result, rerender } = renderHook(
        ({ dogs, filters }) => useFilteredDogs(dogs, filters),
        { initialProps: { dogs: mockDogs, filters: defaultFilters } },
      );

      const firstResult = result.current;

      // Rerender with same props
      rerender({ dogs: mockDogs, filters: defaultFilters });

      // Result should be the same object (memoized)
      expect(result.current.filteredDogs).toBe(firstResult.filteredDogs);
      expect(result.current.availableBreeds).toBe(firstResult.availableBreeds);
      expect(result.current.availableLocations).toBe(
        firstResult.availableLocations,
      );
      expect(result.current.availableShipsTo).toBe(
        firstResult.availableShipsTo,
      );
    });

    test("recalculates when dogs array changes", () => {
      const { applyAllFilters } = require("../../utils/dogFilters");
      applyAllFilters.mockReturnValue(mockDogs);

      const { result, rerender } = renderHook(
        ({ dogs, filters }) => useFilteredDogs(dogs, filters),
        { initialProps: { dogs: mockDogs, filters: defaultFilters } },
      );

      const firstCallCount = applyAllFilters.mock.calls.length;

      // Rerender with different dogs array
      const newDogs = [...mockDogs, { id: 3, name: "Luna" }];
      rerender({ dogs: newDogs, filters: defaultFilters });

      expect(applyAllFilters.mock.calls.length).toBeGreaterThan(firstCallCount);
    });

    test("recalculates when filters change", () => {
      const { applyAllFilters } = require("../../utils/dogFilters");
      applyAllFilters.mockReturnValue(mockDogs);

      const { result, rerender } = renderHook(
        ({ dogs, filters }) => useFilteredDogs(dogs, filters),
        { initialProps: { dogs: mockDogs, filters: defaultFilters } },
      );

      const firstCallCount = applyAllFilters.mock.calls.length;

      // Rerender with different filters
      const newFilters = { ...defaultFilters, age: "Puppy" };
      rerender({ dogs: mockDogs, filters: newFilters });

      expect(applyAllFilters.mock.calls.length).toBeGreaterThan(firstCallCount);
    });
  });

  describe("Available Options Extraction", () => {
    test("extracts unique breeds from dogs", () => {
      const dogsWithDuplicateBreeds = [
        ...mockDogs,
        {
          id: 3,
          name: "Luna",
          standardized_breed: "Golden Retriever", // Duplicate
          organization: { service_regions: [], ships_to: [] },
        },
      ];

      const { result } = renderHook(() =>
        useFilteredDogs(dogsWithDuplicateBreeds, defaultFilters),
      );

      expect(result.current.availableBreeds).toEqual([
        "Golden Retriever",
        "Labrador Retriever",
      ]);
    });

    test("handles dogs with missing breed information", () => {
      const dogsWithMissingBreeds = [
        {
          id: 1,
          name: "Buddy",
          standardized_breed: "Golden Retriever",
          organization: { service_regions: [], ships_to: [] },
        },
        {
          id: 2,
          name: "Max",
          // No breed information
          organization: { service_regions: [], ships_to: [] },
        },
      ];

      const { result } = renderHook(() =>
        useFilteredDogs(dogsWithMissingBreeds, defaultFilters),
      );

      expect(result.current.availableBreeds).toEqual(["Golden Retriever"]);
    });

    test("extracts unique locations from organization service_regions", () => {
      const { result } = renderHook(() =>
        useFilteredDogs(mockDogs, defaultFilters),
      );

      expect(result.current.availableLocations).toEqual([
        "CA",
        "DE",
        "TR",
        "US",
      ]);
    });

    test("extracts unique ships_to countries", () => {
      const { result } = renderHook(() =>
        useFilteredDogs(mockDogs, defaultFilters),
      );

      expect(result.current.availableShipsTo).toEqual([
        "BE",
        "CA",
        "DE",
        "MX",
        "NL",
        "US",
      ]);
    });

    test("handles dogs with missing organization data", () => {
      const dogsWithMissingOrgs = [
        {
          id: 1,
          name: "Buddy",
          standardized_breed: "Golden Retriever",
          organization: {
            service_regions: ["TR"],
            ships_to: ["DE"],
          },
        },
        {
          id: 2,
          name: "Max",
          standardized_breed: "Labrador Retriever",
          // No organization
        },
      ];

      const { result } = renderHook(() =>
        useFilteredDogs(dogsWithMissingOrgs, defaultFilters),
      );

      expect(result.current.availableLocations).toEqual(["TR"]);
      expect(result.current.availableShipsTo).toEqual(["DE"]);
    });
  });

  describe("Active Filters Detection", () => {
    test("detects age filter as active", () => {
      const filters = { ...defaultFilters, age: "Puppy" };
      const { result } = renderHook(() => useFilteredDogs(mockDogs, filters));
      expect(result.current.hasActiveFilters).toBe(true);
    });

    test("detects breed filter as active", () => {
      const filters = { ...defaultFilters, breed: "golden" };
      const { result } = renderHook(() => useFilteredDogs(mockDogs, filters));
      expect(result.current.hasActiveFilters).toBe(true);
    });

    test("detects location filter as active", () => {
      const filters = { ...defaultFilters, location: "TR" };
      const { result } = renderHook(() => useFilteredDogs(mockDogs, filters));
      expect(result.current.hasActiveFilters).toBe(true);
    });

    test("detects ships_to filter as active", () => {
      const filters = { ...defaultFilters, shipsTo: "DE" };
      const { result } = renderHook(() => useFilteredDogs(mockDogs, filters));
      expect(result.current.hasActiveFilters).toBe(true);
    });

    test("does not consider sort as active filter", () => {
      const filters = { ...defaultFilters, sort: "name-asc" };
      const { result } = renderHook(() => useFilteredDogs(mockDogs, filters));
      expect(result.current.hasActiveFilters).toBe(false);
    });

    test("handles multiple active filters", () => {
      const filters = {
        age: "Puppy",
        breed: "golden",
        location: "TR",
        shipsTo: "DE",
        sort: "newest",
      };
      const { result } = renderHook(() => useFilteredDogs(mockDogs, filters));
      expect(result.current.hasActiveFilters).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    test("handles empty dogs array", () => {
      const { result } = renderHook(() => useFilteredDogs([], defaultFilters));

      expect(result.current.filteredDogs).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.availableBreeds).toEqual([]);
      expect(result.current.availableLocations).toEqual([]);
      expect(result.current.availableShipsTo).toEqual([]);
    });

    test("handles null dogs array", () => {
      const { result } = renderHook(() =>
        useFilteredDogs(null, defaultFilters),
      );

      expect(result.current.filteredDogs).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.availableBreeds).toEqual([]);
      expect(result.current.availableLocations).toEqual([]);
      expect(result.current.availableShipsTo).toEqual([]);
    });

    test("handles undefined filters", () => {
      const { result } = renderHook(() => useFilteredDogs(mockDogs, undefined));

      expect(result.current.filteredDogs).toEqual(mockDogs);
      expect(result.current.hasActiveFilters).toBe(false);
    });

    test("handles malformed filter objects", () => {
      const { hasActiveFilters } = require("../../utils/dogFilters");
      hasActiveFilters.mockReturnValue(false); // Explicitly set return value

      const malformedFilters = {
        age: null,
        breed: undefined,
        // missing location and shipsTo
        sort: "invalid-sort",
      };

      const { result } = renderHook(() =>
        useFilteredDogs(mockDogs, malformedFilters),
      );

      expect(result.current.hasActiveFilters).toBe(false);
      expect(result.current.filteredDogs).toBeDefined();
    });
  });

  describe("Performance with Large Datasets", () => {
    test("handles large datasets efficiently", () => {
      const largeDogList = Array.from({ length: 5000 }, (_, i) => ({
        id: i + 1,
        name: `Dog ${i + 1}`,
        age_min_months: Math.floor(Math.random() * 120) + 1,
        standardized_breed: `Breed ${i % 10}`,
        organization: {
          service_regions: [`Country${i % 5}`],
          ships_to: [`Ship${i % 3}`],
        },
      }));

      const start = performance.now();
      const { result } = renderHook(() =>
        useFilteredDogs(largeDogList, defaultFilters),
      );
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
      expect(result.current.totalCount).toBe(5000);
      expect(result.current.availableBreeds.length).toBe(10); // Exactly 10 unique breeds (Breed 0-9)
      expect(result.current.availableLocations.length).toBe(5); // Exactly 5 unique locations (Country0-4)
      expect(result.current.availableShipsTo.length).toBe(3); // Exactly 3 unique ships_to (Ship0-2)
    });
  });

  describe("Hook Return Interface", () => {
    test("returns consistent interface shape", () => {
      const { result } = renderHook(() =>
        useFilteredDogs(mockDogs, defaultFilters),
      );

      expect(result.current).toHaveProperty("filteredDogs");
      expect(result.current).toHaveProperty("totalCount");
      expect(result.current).toHaveProperty("hasActiveFilters");
      expect(result.current).toHaveProperty("availableBreeds");
      expect(result.current).toHaveProperty("availableLocations");
      expect(result.current).toHaveProperty("availableShipsTo");

      expect(Array.isArray(result.current.filteredDogs)).toBe(true);
      expect(typeof result.current.totalCount).toBe("number");
      expect(typeof result.current.hasActiveFilters).toBe("boolean");
      expect(Array.isArray(result.current.availableBreeds)).toBe(true);
      expect(Array.isArray(result.current.availableLocations)).toBe(true);
      expect(Array.isArray(result.current.availableShipsTo)).toBe(true);
    });
  });
});
