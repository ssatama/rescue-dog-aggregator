/**
 * Custom hook for filtering and managing dog data
 */

import { useMemo } from "react";
import {
  applyAllFilters,
  extractAvailableBreeds,
  extractAvailableLocations,
  extractAvailableShipsTo,
  hasActiveFilters as checkActiveFilters,
} from "../utils/dogFilters";

/**
 * Custom hook for filtering dogs with memoized results
 * @param {Array} dogs - Array of dog objects
 * @param {Object} filters - Filter object with age, breed, optionally shipsTo, sort
 * @param {boolean} includeShipsTo - Whether to include shipsTo filtering (default: true)
 * @returns {Object} Filtered dogs and metadata
 */
const useFilteredDogs = (dogs, filters, includeShipsTo = true) => {
  // Memoize filtered dogs to avoid unnecessary recalculations
  const filteredDogs = useMemo(() => {
    if (!dogs || !Array.isArray(dogs)) return [];
    return applyAllFilters(dogs, filters, includeShipsTo);
  }, [dogs, filters, includeShipsTo]);

  // Memoize available options from the original dogs array
  const availableOptions = useMemo(() => {
    if (!dogs || !Array.isArray(dogs)) {
      return {
        breeds: [],
        locations: [],
        shipsTo: [],
      };
    }

    return {
      breeds: extractAvailableBreeds(dogs),
      locations: extractAvailableLocations(dogs),
      shipsTo: extractAvailableShipsTo(dogs),
    };
  }, [dogs]);

  // Memoize active filters check
  const hasActiveFilters = useMemo(() => {
    return checkActiveFilters(filters, includeShipsTo);
  }, [filters, includeShipsTo]);

  // Memoize total count
  const totalCount = useMemo(() => {
    return filteredDogs.length;
  }, [filteredDogs]);

  return {
    filteredDogs,
    totalCount,
    hasActiveFilters,
    availableBreeds: availableOptions.breeds,
    availableLocations: availableOptions.locations,
    availableShipsTo: availableOptions.shipsTo,
  };
};

export default useFilteredDogs;
