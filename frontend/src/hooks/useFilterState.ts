import { useState, useCallback, useMemo } from "react";
import { FILTER_DEFAULTS, SIZE_API_MAPPING } from "@/constants/filters";

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
  standardizedBreedFilter: FILTER_DEFAULTS.BREED,
  sexFilter: FILTER_DEFAULTS.SEX,
  sizeFilter: FILTER_DEFAULTS.SIZE,
  ageCategoryFilter: FILTER_DEFAULTS.AGE,
  searchQuery: "",
  locationCountryFilter: FILTER_DEFAULTS.COUNTRY,
  availableCountryFilter: FILTER_DEFAULTS.COUNTRY,
  availableRegionFilter: FILTER_DEFAULTS.REGION,
  organizationFilter: FILTER_DEFAULTS.ORGANIZATION,
};

const mapUiSizeToStandardized = (uiSize: string): string | null => {
  return SIZE_API_MAPPING[uiSize] || null;
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
    if (filters.standardizedBreedFilter !== FILTER_DEFAULTS.BREED) count++;
    if (filters.organizationFilter !== FILTER_DEFAULTS.ORGANIZATION) count++;
    if (filters.sexFilter !== FILTER_DEFAULTS.SEX) count++;
    if (filters.sizeFilter !== FILTER_DEFAULTS.SIZE) count++;
    if (filters.ageCategoryFilter !== FILTER_DEFAULTS.AGE) count++;
    if (filters.locationCountryFilter !== FILTER_DEFAULTS.COUNTRY) count++;
    if (filters.availableCountryFilter !== FILTER_DEFAULTS.COUNTRY) count++;
    if (filters.availableRegionFilter !== FILTER_DEFAULTS.REGION) count++;
    return count;
  }, [filters]);

  const apiParams = useMemo(() => {
    const params: Record<string, string | null> = {
      search: filters.searchQuery || null,
      standardized_breed:
        filters.standardizedBreedFilter === FILTER_DEFAULTS.BREED
          ? null
          : filters.standardizedBreedFilter,
      organization_id:
        filters.organizationFilter === FILTER_DEFAULTS.ORGANIZATION
          ? null
          : filters.organizationFilter,
      sex: filters.sexFilter === FILTER_DEFAULTS.SEX ? null : filters.sexFilter,
      standardized_size: mapUiSizeToStandardized(filters.sizeFilter),
      age_category:
        filters.ageCategoryFilter === FILTER_DEFAULTS.AGE
          ? null
          : filters.ageCategoryFilter,
      location_country:
        filters.locationCountryFilter === FILTER_DEFAULTS.COUNTRY
          ? null
          : filters.locationCountryFilter,
      available_to_country:
        filters.availableCountryFilter === FILTER_DEFAULTS.COUNTRY
          ? null
          : filters.availableCountryFilter,
      available_to_region:
        filters.availableRegionFilter === FILTER_DEFAULTS.REGION
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
