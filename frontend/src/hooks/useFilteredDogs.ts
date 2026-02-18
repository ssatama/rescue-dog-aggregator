import { useMemo } from "react";
import type { Dog } from "@/types/dog";
import {
  applyAllFilters,
  extractAvailableBreeds,
  extractAvailableLocations,
  extractAvailableShipsTo,
  hasActiveFilters as checkActiveFilters,
} from "../utils/dogFilters";

interface Filters {
  age?: string;
  breed?: string;
  shipsTo?: string;
  sort?: string;
}

interface UseFilteredDogsReturn {
  filteredDogs: Partial<Dog>[];
  totalCount: number;
  hasActiveFilters: boolean;
  availableBreeds: string[];
  availableLocations: string[];
  availableShipsTo: string[];
}

const useFilteredDogs = (
  dogs: Partial<Dog>[],
  filters: Filters | undefined,
  includeShipsTo = true,
): UseFilteredDogsReturn => {
  const filteredDogs = useMemo(() => {
    if (!dogs || !Array.isArray(dogs)) return [];
    return applyAllFilters(dogs, filters, includeShipsTo);
  }, [dogs, filters, includeShipsTo]);

  const availableOptions = useMemo(() => {
    if (!dogs || !Array.isArray(dogs)) {
      return {
        breeds: [] as string[],
        locations: [] as string[],
        shipsTo: [] as string[],
      };
    }

    return {
      breeds: extractAvailableBreeds(dogs),
      locations: extractAvailableLocations(dogs),
      shipsTo: extractAvailableShipsTo(dogs),
    };
  }, [dogs]);

  const hasActiveFilters = useMemo(() => {
    return checkActiveFilters(filters, includeShipsTo);
  }, [filters, includeShipsTo]);

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
