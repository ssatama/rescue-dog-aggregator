import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

export function useURLFilterState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse filters from URL
  const filters = useMemo(
    () => ({
      searchQuery: searchParams.get("search") || "",
      sizeFilter: searchParams.get("size") || "Any size",
      ageFilter: searchParams.get("age") || "Any age",
      sexFilter: searchParams.get("sex") || "Any",
      organizationFilter: searchParams.get("organization_id") || "any",
      breedFilter: searchParams.get("breed") || "Any breed",
      locationCountryFilter:
        searchParams.get("location_country") || "Any country",
      availableCountryFilter:
        searchParams.get("available_country") || "Any country",
      availableRegionFilter:
        searchParams.get("available_region") || "Any region",
    }),
    [searchParams],
  );

  // Convert filters to API params
  const apiParams = useMemo(() => {
    const params = {};

    if (filters.searchQuery) params.search = filters.searchQuery;
    if (filters.sizeFilter !== "Any size") params.size = filters.sizeFilter;
    if (filters.ageFilter !== "Any age") params.age = filters.ageFilter;
    if (filters.sexFilter !== "Any") params.sex = filters.sexFilter;
    if (filters.organizationFilter !== "any")
      params.organization_id = filters.organizationFilter;
    if (filters.breedFilter !== "Any breed")
      params.standardized_breed = filters.breedFilter;
    if (filters.locationCountryFilter !== "Any country")
      params.location_country = filters.locationCountryFilter;
    if (filters.availableCountryFilter !== "Any country")
      params.available_country = filters.availableCountryFilter;
    if (filters.availableRegionFilter !== "Any region")
      params.available_region = filters.availableRegionFilter;

    return params;
  }, [filters]);

  // Update URL with filters (debounced for search)
  const updateURL = useDebouncedCallback((updates, immediate = false) => {
    const newFilters = { ...filters, ...updates };
    const params = new URLSearchParams();

    // Convert filter object to URL params
    Object.entries(newFilters).forEach(([key, value]) => {
      const paramKey = key
        .replace("Filter", "")
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase();

      // Only add non-default values to URL
      if (
        value &&
        value !== "Any" &&
        value !== "Any size" &&
        value !== "Any age" &&
        value !== "Any breed" &&
        value !== "Any country" &&
        value !== "Any region" &&
        value !== "any" &&
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
  }, 300);

  // Update single filter
  const updateFilter = useCallback(
    (key, value) => {
      updateURL({ [key]: value });
    },
    [updateURL],
  );

  // Update multiple filters at once
  const updateFilters = useCallback(
    (updates) => {
      updateURL(updates, true);
    },
    [updateURL],
  );

  // Reset all filters
  const resetFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  // Clear single filter
  const clearFilter = useCallback(
    (key) => {
      const defaultValues = {
        searchQuery: "",
        sizeFilter: "Any size",
        ageFilter: "Any age",
        sexFilter: "Any",
        organizationFilter: "any",
        breedFilter: "Any breed",
        locationCountryFilter: "Any country",
        availableCountryFilter: "Any country",
        availableRegionFilter: "Any region",
      };

      updateFilter(key, defaultValues[key]);
    },
    [updateFilter],
  );

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.entries(filters).filter(([key, value]) => {
      if (key === "searchQuery") return value !== "";
      return value && !value.includes("Any") && value !== "any";
    }).length;
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
