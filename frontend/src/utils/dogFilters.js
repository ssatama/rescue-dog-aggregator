/**
 * Dog filtering and sorting utilities
 */

import { getAgeCategory } from "./dogHelpers";

/**
 * Filter dogs by age category using backend-compatible logic
 * @param {Array} dogs - Array of dog objects
 * @param {string} ageFilter - Age filter ('All', 'Puppy', 'Young', 'Adult', 'Senior', 'Unknown')
 * @returns {Array} Filtered dogs
 */
export const filterByAge = (dogs, ageFilter) => {
  if (!dogs || !Array.isArray(dogs)) return [];
  if (!ageFilter || ageFilter === "All") return dogs;

  const filtered = dogs.filter((dog) => {
    if (!dog) return false;

    // Check multiple possible field names for age data
    const ageMin = dog.age_min_months || dog.ageMinMonths;
    const ageMax = dog.age_max_months || dog.ageMaxMonths;

    // Handle Unknown age case
    if (ageFilter === "Unknown") {
      return !ageMin && !ageMax;
    }

    // If no minimum age data, exclude from age-specific filters
    if (!ageMin && ageMin !== 0) return false;

    // Use backend-compatible age range logic to match API filtering exactly
    switch (ageFilter) {
      case "Puppy": // < 12 months
        return ageMax && ageMax < 12;
      case "Young": // 12 to 36 months
        // Match backend SQL: (age_min_months >= 12 AND age_max_months <= 36)
        return (
          ageMin >= 12 &&
          ageMax !== null &&
          ageMax !== undefined &&
          ageMax <= 36
        );
      case "Adult": // 36 to 96 months
        return (
          ageMin >= 36 &&
          ageMax !== null &&
          ageMax !== undefined &&
          ageMax <= 96
        );
      case "Senior": // > 96 months
        return ageMin >= 96;
      default:
        return false;
    }
  });

  return filtered;
};

/**
 * Filter dogs by breed (partial text matching)
 * @param {Array} dogs - Array of dog objects
 * @param {string} breedFilter - Breed search term
 * @returns {Array} Filtered dogs
 */
export const filterByBreed = (dogs, breedFilter) => {
  if (!dogs || !Array.isArray(dogs)) return [];
  if (!breedFilter || breedFilter.trim() === "") return dogs;

  const searchTerm = breedFilter.toLowerCase().trim();

  return dogs.filter((dog) => {
    if (!dog) return false;

    // Check standardized_breed first, then fall back to breed
    const breed = (dog.standardized_breed || dog.breed || "").toLowerCase();
    return breed.includes(searchTerm);
  });
};

/**
 * Filter dogs by location (organization's service_regions)
 * @param {Array} dogs - Array of dog objects
 * @param {string} locationFilter - Country code to filter by
 * @returns {Array} Filtered dogs
 */
export const filterByLocation = (dogs, locationFilter) => {
  if (!dogs || !Array.isArray(dogs)) return [];
  if (!locationFilter || locationFilter === "All") return dogs;

  return dogs.filter((dog) => {
    if (!dog || !dog.organization) return false;

    const serviceRegions = dog.organization.service_regions || [];
    return serviceRegions.includes(locationFilter);
  });
};

/**
 * Filter dogs by ships-to countries
 * @param {Array} dogs - Array of dog objects
 * @param {string} shipsToFilter - Country code to filter by
 * @returns {Array} Filtered dogs
 */
export const filterByShipsTo = (dogs, shipsToFilter) => {
  if (!dogs || !Array.isArray(dogs)) return [];
  if (!shipsToFilter || shipsToFilter === "All") return dogs;

  return dogs.filter((dog) => {
    if (!dog || !dog.organization) return false;

    const shipsTo = dog.organization.ships_to || [];
    return shipsTo.includes(shipsToFilter);
  });
};

/**
 * Sort dogs by specified criteria
 * @param {Array} dogs - Array of dog objects
 * @param {string} sortBy - Sort criteria ('newest', 'name-asc', 'name-desc')
 * @returns {Array} Sorted dogs
 */
export const sortDogs = (dogs, sortBy) => {
  if (!dogs || !Array.isArray(dogs)) return [];

  // Create a copy to avoid mutating the original array
  const sortedDogs = [...dogs];

  switch (sortBy) {
    case "name-asc":
      return sortedDogs.sort((a, b) => {
        const nameA = (a?.name || "").toLowerCase();
        const nameB = (b?.name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

    case "name-desc":
      return sortedDogs.sort((a, b) => {
        const nameA = (a?.name || "").toLowerCase();
        const nameB = (b?.name || "").toLowerCase();
        return nameB.localeCompare(nameA);
      });

    case "newest":
    default:
      return sortedDogs.sort((a, b) => {
        const dateA = a?.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b?.created_at ? new Date(b.created_at) : new Date(0);
        return dateB - dateA; // Newest first
      });
  }
};

/**
 * Apply all filters and sorting to dogs array
 * @param {Array} dogs - Array of dog objects
 * @param {Object} filters - Filter object with age, breed, optionally shipsTo, sort
 * @param {boolean} includeShipsTo - Whether to apply shipsTo filter (default: true)
 * @returns {Array} Filtered and sorted dogs
 */
export const applyAllFilters = (dogs, filters, includeShipsTo = true) => {
  if (!dogs || !Array.isArray(dogs)) return [];
  if (!filters) return dogs;

  let filteredDogs = dogs;

  // Apply filters in sequence
  filteredDogs = filterByAge(filteredDogs, filters.age);
  filteredDogs = filterByBreed(filteredDogs, filters.breed);

  // Only apply shipsTo filter if enabled (not needed for organization pages)
  if (includeShipsTo) {
    filteredDogs = filterByShipsTo(filteredDogs, filters.shipsTo);
  }

  // Apply sorting last
  filteredDogs = sortDogs(filteredDogs, filters.sort);

  return filteredDogs;
};

/**
 * Extract unique breeds from dogs array
 * @param {Array} dogs - Array of dog objects
 * @returns {Array} Array of unique breed names
 */
export const extractAvailableBreeds = (dogs) => {
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
};

/**
 * Extract unique locations from dogs' organization service_regions
 * @param {Array} dogs - Array of dog objects
 * @returns {Array} Array of unique country codes
 */
export const extractAvailableLocations = (dogs) => {
  if (!dogs || !Array.isArray(dogs)) return [];

  const locations = new Set();

  dogs.forEach((dog) => {
    if (dog && dog.organization && dog.organization.service_regions) {
      dog.organization.service_regions.forEach((region) => {
        if (region) {
          locations.add(region);
        }
      });
    }
  });

  return Array.from(locations).sort();
};

/**
 * Extract unique ships-to countries from dogs' organizations
 * @param {Array} dogs - Array of dog objects
 * @returns {Array} Array of unique country codes
 */
export const extractAvailableShipsTo = (dogs) => {
  if (!dogs || !Array.isArray(dogs)) return [];

  const shipsTo = new Set();

  dogs.forEach((dog) => {
    if (dog && dog.organization && dog.organization.ships_to) {
      dog.organization.ships_to.forEach((country) => {
        if (country) {
          shipsTo.add(country);
        }
      });
    }
  });

  return Array.from(shipsTo).sort();
};

/**
 * Check if any filters are active (not default values)
 * @param {Object} filters - Filter object
 * @param {boolean} includeShipsTo - Whether to include shipsTo in active filter check (default: true)
 * @returns {boolean} True if any filters are active
 */
export const hasActiveFilters = (filters, includeShipsTo = true) => {
  if (!filters) return false;

  return (
    (filters.age && filters.age !== "All") ||
    (filters.breed && filters.breed.trim() !== "") ||
    (includeShipsTo && filters.shipsTo && filters.shipsTo !== "All")
    // Note: sort is not considered an "active filter" for the badge
  );
};

/**
 * Get default filter values
 * @returns {Object} Default filter object
 */
export const getDefaultFilters = () => ({
  age: "All",
  breed: "",
  shipsTo: "All",
  sort: "newest",
});

/**
 * Get age filter options for UI
 * @returns {Array} Array of age filter options
 */
export const getAgeFilterOptions = () => [
  { value: "All", label: "All Ages" },
  { value: "Puppy", label: "Puppy" },
  { value: "Young", label: "Young (1-3 years)" },
  { value: "Adult", label: "Adult (3-8 years)" },
  { value: "Senior", label: "Senior (8+ years)" },
  { value: "Unknown", label: "Age Unknown" },
];

/**
 * Get sort filter options for UI
 * @returns {Array} Array of sort options
 */
export const getSortFilterOptions = () => [
  { value: "newest", label: "Newest First" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
  { value: "oldest", label: "Oldest First" },
];
