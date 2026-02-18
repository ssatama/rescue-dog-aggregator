import { useState, useCallback, useMemo } from "react";

interface FilterValues {
  standardizedBreedFilter: string;
  sexFilter: string;
  sizeFilter: string;
  ageCategoryFilter: string;
  searchQuery: string;
  locationCountryFilter: string;
  availableCountryFilter: string;
  availableRegionFilter: string;
  organizationFilter: string;
}

type FilterKey = keyof FilterValues;

type FilterType =
  | "search"
  | "breed"
  | "organization"
  | "sex"
  | "size"
  | "age"
  | "location_country"
  | "available_country"
  | "available_region";

interface UseFilterStateReturn {
  filters: FilterValues;
  updateFilter: (filterKey: FilterKey, value: string) => void;
  updateFilters: (newFilters: Partial<FilterValues>) => void;
  resetFilters: () => void;
  clearFilter: (filterType: FilterType) => void;
  activeFilterCount: number;
  resetTrigger: number;
  apiParams: Record<string, string>;
}

const defaultFilters: FilterValues = {
  standardizedBreedFilter: "Any breed",
  sexFilter: "Any",
  sizeFilter: "Any size",
  ageCategoryFilter: "Any age",
  searchQuery: "",
  locationCountryFilter: "Any country",
  availableCountryFilter: "Any country",
  availableRegionFilter: "Any region",
  organizationFilter: "any",
};

const mapUiSizeToStandardized = (uiSize: string): string | null => {
  const mapping: Record<string, string> = {
    Tiny: "Tiny",
    Small: "Small",
    Medium: "Medium",
    Large: "Large",
    "Extra Large": "XLarge",
  };
  return mapping[uiSize] || null;
};

export function useFilterState(): UseFilterStateReturn {
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const [resetTrigger, setResetTrigger] = useState(0);

  const updateFilter = useCallback((filterKey: FilterKey, value: string) => {
    setFilters((prev) => {
      if (prev[filterKey] === value) return prev;

      return {
        ...prev,
        [filterKey]: value,
      };
    });
  }, []);

  const updateFilters = useCallback((newFilters: Partial<FilterValues>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setResetTrigger((prev) => prev + 1);
  }, []);

  const clearFilter = useCallback(
    (filterType: FilterType) => {
      const filterMap: Record<FilterType, FilterKey> = {
        search: "searchQuery",
        breed: "standardizedBreedFilter",
        organization: "organizationFilter",
        sex: "sexFilter",
        size: "sizeFilter",
        age: "ageCategoryFilter",
        location_country: "locationCountryFilter",
        available_country: "availableCountryFilter",
        available_region: "availableRegionFilter",
      };

      const filterKey = filterMap[filterType];
      if (filterKey && defaultFilters[filterKey] !== undefined) {
        updateFilter(filterKey, defaultFilters[filterKey]);
      }
    },
    [updateFilter],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.standardizedBreedFilter !== "Any breed") count++;
    if (filters.organizationFilter !== "any") count++;
    if (filters.sexFilter !== "Any") count++;
    if (filters.sizeFilter !== "Any size") count++;
    if (filters.ageCategoryFilter !== "Any age") count++;
    if (filters.locationCountryFilter !== "Any country") count++;
    if (filters.availableCountryFilter !== "Any country") count++;
    if (filters.availableRegionFilter !== "Any region") count++;
    return count;
  }, [filters]);

  const apiParams = useMemo(() => {
    const params: Record<string, string | null> = {
      search: filters.searchQuery || null,
      standardized_breed:
        filters.standardizedBreedFilter === "Any breed"
          ? null
          : filters.standardizedBreedFilter,
      organization_id:
        filters.organizationFilter === "any"
          ? null
          : filters.organizationFilter,
      sex: filters.sexFilter === "Any" ? null : filters.sexFilter,
      standardized_size: mapUiSizeToStandardized(filters.sizeFilter),
      age_category:
        filters.ageCategoryFilter === "Any age"
          ? null
          : filters.ageCategoryFilter,
      location_country:
        filters.locationCountryFilter === "Any country"
          ? null
          : filters.locationCountryFilter,
      available_to_country:
        filters.availableCountryFilter === "Any country"
          ? null
          : filters.availableCountryFilter,
      available_to_region:
        filters.availableRegionFilter === "Any region"
          ? null
          : filters.availableRegionFilter,
    };

    return Object.fromEntries(
      Object.entries(params).filter(
        (entry): entry is [string, string] => entry[1] != null,
      ),
    );
  }, [filters]);

  return {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    clearFilter,
    activeFilterCount,
    resetTrigger,
    apiParams,
  };
}
