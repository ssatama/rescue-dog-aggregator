import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";
import { FILTER_DEFAULTS, isDefaultFilterValue } from "@/constants/filters";

interface URLFilters {
  searchQuery: string;
  sizeFilter: string;
  ageFilter: string;
  sexFilter: string;
  organizationFilter: string;
  breedFilter: string;
  locationCountryFilter: string;
  availableCountryFilter: string;
  availableRegionFilter: string;
}

type URLFilterKey = keyof URLFilters;

interface UseURLFilterStateReturn {
  filters: URLFilters;
  apiParams: Record<string, string>;
  updateFilter: (key: URLFilterKey, value: string) => void;
  updateFilters: (updates: Partial<URLFilters>) => void;
  resetFilters: () => void;
  clearFilter: (key: URLFilterKey) => void;
  activeFilterCount: number;
}

const defaultValues: Record<URLFilterKey, string> = {
  searchQuery: "",
  sizeFilter: FILTER_DEFAULTS.SIZE,
  ageFilter: FILTER_DEFAULTS.AGE,
  sexFilter: FILTER_DEFAULTS.SEX,
  organizationFilter: FILTER_DEFAULTS.ORGANIZATION,
  breedFilter: FILTER_DEFAULTS.BREED,
  locationCountryFilter: FILTER_DEFAULTS.COUNTRY,
  availableCountryFilter: FILTER_DEFAULTS.COUNTRY,
  availableRegionFilter: FILTER_DEFAULTS.REGION,
};

export function useURLFilterState(): UseURLFilterStateReturn {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();

  const filters = useMemo<URLFilters>(
    () => ({
      searchQuery: searchParams?.get("search") || "",
      sizeFilter: searchParams?.get("size") || FILTER_DEFAULTS.SIZE,
      ageFilter: searchParams?.get("age") || FILTER_DEFAULTS.AGE,
      sexFilter: searchParams?.get("sex") || FILTER_DEFAULTS.SEX,
      organizationFilter: searchParams?.get("organization_id") || FILTER_DEFAULTS.ORGANIZATION,
      breedFilter: searchParams?.get("breed") || FILTER_DEFAULTS.BREED,
      locationCountryFilter:
        searchParams?.get("location_country") || FILTER_DEFAULTS.COUNTRY,
      availableCountryFilter:
        searchParams?.get("available_country") || FILTER_DEFAULTS.COUNTRY,
      availableRegionFilter:
        searchParams?.get("available_region") || FILTER_DEFAULTS.REGION,
    }),
    [searchParams],
  );

  const apiParams = useMemo(() => {
    const params: Record<string, string> = {};

    if (filters.searchQuery) params.search = filters.searchQuery;
    if (filters.sizeFilter !== FILTER_DEFAULTS.SIZE) params.size = filters.sizeFilter;
    if (filters.ageFilter !== FILTER_DEFAULTS.AGE) params.age = filters.ageFilter;
    if (filters.sexFilter !== FILTER_DEFAULTS.SEX) params.sex = filters.sexFilter;
    if (filters.organizationFilter !== FILTER_DEFAULTS.ORGANIZATION)
      params.organization_id = filters.organizationFilter;
    if (filters.breedFilter !== FILTER_DEFAULTS.BREED)
      params.standardized_breed = filters.breedFilter;
    if (filters.locationCountryFilter !== FILTER_DEFAULTS.COUNTRY)
      params.location_country = filters.locationCountryFilter;
    if (filters.availableCountryFilter !== FILTER_DEFAULTS.COUNTRY)
      params.available_country = filters.availableCountryFilter;
    if (filters.availableRegionFilter !== FILTER_DEFAULTS.REGION)
      params.available_region = filters.availableRegionFilter;

    return params;
  }, [filters]);

  const updateURL = useDebouncedCallback(
    (updates: Partial<URLFilters>, immediate = false) => {
      const newFilters = { ...filters, ...updates };
      const params = new URLSearchParams();

      Object.entries(newFilters).forEach(([key, value]) => {
        const paramKey = key
          .replace("Filter", "")
          .replace(/([A-Z])/g, "_$1")
          .toLowerCase();

        if (
          value &&
          value !== FILTER_DEFAULTS.SEX &&
          value !== FILTER_DEFAULTS.SIZE &&
          value !== FILTER_DEFAULTS.AGE &&
          value !== FILTER_DEFAULTS.BREED &&
          value !== FILTER_DEFAULTS.COUNTRY &&
          value !== FILTER_DEFAULTS.REGION &&
          value !== FILTER_DEFAULTS.ORGANIZATION &&
          value !== ""
        ) {
          params.set(paramKey, value);
        }
      });

      const newURL = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      if (immediate) {
        router.push(newURL, { scroll: false });
      } else {
        router.replace(newURL, { scroll: false });
      }
    },
    300,
  );

  const updateFilter = useCallback(
    (key: URLFilterKey, value: string) => {
      updateURL({ [key]: value });
    },
    [updateURL],
  );

  const updateFilters = useCallback(
    (updates: Partial<URLFilters>) => {
      updateURL(updates, true);
    },
    [updateURL],
  );

  const resetFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  const clearFilter = useCallback(
    (key: URLFilterKey) => {
      updateFilter(key, defaultValues[key]);
    },
    [updateFilter],
  );

  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(
      ([_key, value]) => !isDefaultFilterValue(value),
    ).length;
  }, [filters]);

  return {
    filters,
    apiParams,
    updateFilter,
    updateFilters,
    resetFilters,
    clearFilter,
    activeFilterCount,
  };
}
