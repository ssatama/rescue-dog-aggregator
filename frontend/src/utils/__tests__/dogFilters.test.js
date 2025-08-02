/**
 * Tests for dogFilters utility functions
 */

import {
  filterByAge,
  filterByBreed,
  filterByLocation,
  filterByShipsTo,
  sortDogs,
  applyAllFilters,
} from "../dogFilters";

describe("dogFilters", () => {
  // Mock data for testing
  const mockDogs = [
    {
      id: 1,
      name: "Buddy",
      age_min_months: 6, // Puppy
      age_max_months: 10,
      standardized_breed: "Golden Retriever",
      breed: "Golden Retriever Mix",
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
      age_min_months: 18, // Young
      age_max_months: 24,
      standardized_breed: "Labrador Retriever",
      breed: "Lab Mix",
      created_at: "2024-02-10T10:00:00Z",
      organization: {
        name: "Another Rescue",
        service_regions: ["US", "CA"],
        ships_to: ["US", "CA", "MX"],
      },
    },
    {
      id: 3,
      name: "Luna",
      age_min_months: 48, // Adult
      age_max_months: 60,
      standardized_breed: "Mixed Breed",
      breed: "Unknown",
      created_at: "2024-03-01T10:00:00Z",
      organization: {
        name: "Test Rescue",
        service_regions: ["TR", "RO"],
        ships_to: ["DE", "FR", "IT"],
      },
    },
    {
      id: 4,
      name: "Charlie",
      age_min_months: 96, // Senior
      age_max_months: 120,
      standardized_breed: "German Shepherd",
      breed: "German Shepherd",
      created_at: "2023-12-01T10:00:00Z",
      organization: {
        name: "Senior Dogs Rescue",
        service_regions: ["DE"],
        ships_to: ["DE", "AT", "CH"],
      },
    },
    {
      id: 5,
      name: "Bella",
      age_min_months: null, // Unknown age
      age_max_months: null,
      age_text: "Young adult",
      standardized_breed: "Golden Retriever",
      breed: "Golden Retriever",
      created_at: "2024-01-20T10:00:00Z",
      organization: {
        name: "Test Rescue",
        service_regions: ["TR"],
        ships_to: ["DE", "NL"],
      },
    },
  ];

  describe("filterByAge", () => {
    test("filters puppies correctly", () => {
      const result = filterByAge(mockDogs, "Puppy");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Buddy");
    });

    test("filters young dogs correctly", () => {
      const result = filterByAge(mockDogs, "Young");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Max");
    });

    test("filters adult dogs correctly", () => {
      const result = filterByAge(mockDogs, "Adult");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Luna");
    });

    test("filters senior dogs correctly", () => {
      const result = filterByAge(mockDogs, "Senior");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Charlie");
    });

    test('returns all dogs when filter is "All" or empty', () => {
      expect(filterByAge(mockDogs, "All")).toHaveLength(5);
      expect(filterByAge(mockDogs, "")).toHaveLength(5);
      expect(filterByAge(mockDogs, null)).toHaveLength(5);
    });

    test("handles dogs with unknown age gracefully", () => {
      const result = filterByAge(mockDogs, "Unknown");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Bella");
    });
  });

  describe("filterByBreed", () => {
    test("filters by exact breed match (case insensitive)", () => {
      const result = filterByBreed(mockDogs, "golden retriever");
      expect(result).toHaveLength(2);
      expect(result.map((d) => d.name)).toEqual(["Buddy", "Bella"]);
    });

    test("filters by partial breed match", () => {
      const result = filterByBreed(mockDogs, "retriever");
      expect(result).toHaveLength(3);
      expect(result.map((d) => d.name)).toEqual(["Buddy", "Max", "Bella"]);
    });

    test("filters by standardized_breed when available", () => {
      const result = filterByBreed(mockDogs, "Mixed Breed");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Luna");
    });

    test("falls back to breed field when standardized_breed not available", () => {
      const result = filterByBreed(mockDogs, "German Shepherd");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Charlie");
    });

    test("returns all dogs when filter is empty", () => {
      expect(filterByBreed(mockDogs, "")).toHaveLength(5);
      expect(filterByBreed(mockDogs, null)).toHaveLength(5);
    });

    test("handles special characters and spaces", () => {
      const result = filterByBreed(mockDogs, "lab");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Max");
    });

    test("returns empty array when no matches found", () => {
      const result = filterByBreed(mockDogs, "Nonexistent Breed");
      expect(result).toHaveLength(0);
    });
  });

  describe("filterByLocation", () => {
    test("filters dogs by organization service regions", () => {
      const result = filterByLocation(mockDogs, "TR");
      expect(result).toHaveLength(3);
      expect(result.map((d) => d.name)).toEqual(["Buddy", "Luna", "Bella"]);
    });

    test("filters by single country match", () => {
      const result = filterByLocation(mockDogs, "DE");
      expect(result).toHaveLength(2);
      expect(result.map((d) => d.name)).toEqual(["Buddy", "Charlie"]);
    });

    test('returns all dogs when filter is "All" or empty', () => {
      expect(filterByLocation(mockDogs, "All")).toHaveLength(5);
      expect(filterByLocation(mockDogs, "")).toHaveLength(5);
      expect(filterByLocation(mockDogs, null)).toHaveLength(5);
    });

    test("returns empty array when no dogs in specified location", () => {
      const result = filterByLocation(mockDogs, "JP");
      expect(result).toHaveLength(0);
    });

    test("handles missing service_regions gracefully", () => {
      const dogsWithoutRegions = [
        {
          id: 6,
          name: "Test Dog",
          organization: { name: "Test" },
        },
      ];
      const result = filterByLocation(dogsWithoutRegions, "TR");
      expect(result).toHaveLength(0);
    });
  });

  describe("filterByShipsTo", () => {
    test("filters dogs by organization ships_to countries", () => {
      const result = filterByShipsTo(mockDogs, "DE");
      expect(result).toHaveLength(4);
      expect(result.map((d) => d.name)).toEqual([
        "Buddy",
        "Luna",
        "Charlie",
        "Bella",
      ]);
    });

    test("filters by single ships_to country", () => {
      const result = filterByShipsTo(mockDogs, "NL");
      expect(result).toHaveLength(2);
      expect(result.map((d) => d.name)).toEqual(["Buddy", "Bella"]);
    });

    test('returns all dogs when filter is "All" or empty', () => {
      expect(filterByShipsTo(mockDogs, "All")).toHaveLength(5);
      expect(filterByShipsTo(mockDogs, "")).toHaveLength(5);
      expect(filterByShipsTo(mockDogs, null)).toHaveLength(5);
    });

    test("returns empty array when no organizations ship to specified country", () => {
      const result = filterByShipsTo(mockDogs, "JP");
      expect(result).toHaveLength(0);
    });

    test("handles missing ships_to array gracefully", () => {
      const dogsWithoutShipsTo = [
        {
          id: 6,
          name: "Test Dog",
          organization: { name: "Test" },
        },
      ];
      const result = filterByShipsTo(dogsWithoutShipsTo, "DE");
      expect(result).toHaveLength(0);
    });
  });

  describe("sortDogs", () => {
    test("sorts by newest first (default)", () => {
      const result = sortDogs(mockDogs, "newest");
      expect(result[0].name).toBe("Luna"); // 2024-03-01
      expect(result[1].name).toBe("Max"); // 2024-02-10
      expect(result[2].name).toBe("Bella"); // 2024-01-20
      expect(result[3].name).toBe("Buddy"); // 2024-01-15
      expect(result[4].name).toBe("Charlie"); // 2023-12-01
    });

    test("sorts by name A-Z", () => {
      const result = sortDogs(mockDogs, "name-asc");
      expect(result.map((d) => d.name)).toEqual([
        "Bella",
        "Buddy",
        "Charlie",
        "Luna",
        "Max",
      ]);
    });

    test("sorts by name Z-A", () => {
      const result = sortDogs(mockDogs, "name-desc");
      expect(result.map((d) => d.name)).toEqual([
        "Max",
        "Luna",
        "Charlie",
        "Buddy",
        "Bella",
      ]);
    });

    test("handles invalid sort option gracefully", () => {
      const result = sortDogs(mockDogs, "invalid-sort");
      expect(result).toHaveLength(5);
      // Should default to newest first
      expect(result[0].name).toBe("Luna");
    });

    test("handles dogs with missing created_at dates", () => {
      const dogsWithMissingDates = [
        { id: 1, name: "A", created_at: "2024-01-01T10:00:00Z" },
        { id: 2, name: "B" }, // missing created_at
        { id: 3, name: "C", created_at: "2024-01-02T10:00:00Z" },
      ];
      const result = sortDogs(dogsWithMissingDates, "newest");
      expect(result).toHaveLength(3);
      // Dogs without dates should be at the end
      expect(result[result.length - 1].name).toBe("B");
    });
  });

  describe("applyAllFilters", () => {
    const defaultFilters = {
      age: "All",
      breed: "",
      location: "All",
      shipsTo: "All",
      sort: "newest",
    };

    test("applies all filters correctly", () => {
      const filters = {
        age: "Young",
        breed: "retriever",
        location: "US",
        shipsTo: "CA",
        sort: "name-asc",
      };
      const result = applyAllFilters(mockDogs, filters);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Max");
    });

    test("applies multiple filters in sequence", () => {
      const filters = {
        age: "All",
        breed: "retriever",
        location: "TR",
        shipsTo: "DE",
        sort: "name-desc",
      };
      const result = applyAllFilters(mockDogs, filters);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Buddy"); // Should be first alphabetically (desc)
      expect(result[1].name).toBe("Bella");
    });

    test("returns all dogs when no filters applied", () => {
      const result = applyAllFilters(mockDogs, defaultFilters);
      expect(result).toHaveLength(5);
      expect(result[0].name).toBe("Luna"); // Newest first
    });

    test("returns empty array when filters exclude all dogs", () => {
      const filters = {
        age: "Puppy",
        breed: "labrador",
        location: "All",
        shipsTo: "All",
        sort: "newest",
      };
      const result = applyAllFilters(mockDogs, filters);
      expect(result).toHaveLength(0);
    });

    test("handles undefined or null filter values", () => {
      const filters = {
        age: null,
        breed: undefined,
        location: "",
        shipsTo: "All",
        sort: "newest",
      };
      const result = applyAllFilters(mockDogs, filters);
      expect(result).toHaveLength(5);
    });

    test("maintains performance with large datasets", () => {
      // Create a larger dataset for performance testing
      const largeDogList = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Dog ${i + 1}`,
        age_min_months: Math.floor(Math.random() * 120) + 1,
        standardized_breed: "Test Breed",
        created_at: new Date(
          2024,
          Math.floor(Math.random() * 12),
          Math.floor(Math.random() * 28),
        ).toISOString(),
        organization: {
          name: `Org ${i + 1}`,
          service_regions: ["TR", "DE", "US"][Math.floor(Math.random() * 3)],
          ships_to: ["DE", "NL", "FR", "US"][Math.floor(Math.random() * 4)],
        },
      }));

      const start = performance.now();
      const result = applyAllFilters(largeDogList, {
        age: "Adult",
        breed: "test",
        location: "TR",
        shipsTo: "DE",
        sort: "name-asc",
      });
      const end = performance.now();

      expect(end - start).toBeLessThan(100); // Should complete in under 100ms
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("handles empty dogs array", () => {
      expect(filterByAge([], "Puppy")).toEqual([]);
      expect(filterByBreed([], "retriever")).toEqual([]);
      expect(filterByLocation([], "TR")).toEqual([]);
      expect(filterByShipsTo([], "DE")).toEqual([]);
      expect(sortDogs([], "newest")).toEqual([]);
      expect(applyAllFilters([], {})).toEqual([]);
    });

    test("handles null dogs array", () => {
      expect(filterByAge(null, "Puppy")).toEqual([]);
      expect(filterByBreed(null, "retriever")).toEqual([]);
      expect(filterByLocation(null, "TR")).toEqual([]);
      expect(filterByShipsTo(null, "DE")).toEqual([]);
      expect(sortDogs(null, "newest")).toEqual([]);
      expect(applyAllFilters(null, {})).toEqual([]);
    });

    test("handles malformed dog objects", () => {
      const malformedDogs = [
        { id: 1 }, // missing most fields
        { name: "Test" }, // missing id and other fields
        null, // null dog
        undefined, // undefined dog
      ];

      expect(() => filterByAge(malformedDogs, "Puppy")).not.toThrow();
      expect(() => filterByBreed(malformedDogs, "test")).not.toThrow();
      expect(() => filterByLocation(malformedDogs, "TR")).not.toThrow();
      expect(() => filterByShipsTo(malformedDogs, "DE")).not.toThrow();
      expect(() => sortDogs(malformedDogs, "newest")).not.toThrow();
    });
  });
});
