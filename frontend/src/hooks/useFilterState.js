/**
 * Hook for consolidated filter state management
 * Phase 2 Implementation for Performance Optimization
 */
import { useState, useCallback, useMemo } from 'react';

const defaultFilters = {
  standardizedBreedFilter: "Any breed",
  sexFilter: "Any",
  sizeFilter: "Any size", 
  ageCategoryFilter: "Any age",
  searchQuery: "",
  locationCountryFilter: "Any country",
  availableCountryFilter: "Any country",
  availableRegionFilter: "Any region",
  organizationFilter: "any"
};

export function useFilterState() {
  const [filters, setFilters] = useState(defaultFilters);
  const [resetTrigger, setResetTrigger] = useState(0);

  // Individual filter setters with optimized updates
  const updateFilter = useCallback((filterKey, value) => {
    setFilters(prev => {
      // Only update if value actually changed
      if (prev[filterKey] === value) return prev;
      
      return {
        ...prev,
        [filterKey]: value
      };
    });
  }, []);

  // Batch filter updates for better performance
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
    setResetTrigger(prev => prev + 1);
  }, []);

  // Clear individual filter
  const clearFilter = useCallback((filterType) => {
    const filterMap = {
      "search": "searchQuery",
      "breed": "standardizedBreedFilter", 
      "organization": "organizationFilter",
      "sex": "sexFilter",
      "size": "sizeFilter",
      "age": "ageCategoryFilter",
      "location_country": "locationCountryFilter",
      "available_country": "availableCountryFilter",
      "available_region": "availableRegionFilter"
    };

    const filterKey = filterMap[filterType];
    if (filterKey && defaultFilters[filterKey] !== undefined) {
      updateFilter(filterKey, defaultFilters[filterKey]);
    }
  }, [updateFilter]);

  // Calculate active filter count efficiently
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

  // Generate filter parameters for API calls
  const apiParams = useMemo(() => {
    const params = {
      search: filters.searchQuery || null,
      standardized_breed: filters.standardizedBreedFilter === "Any breed" ? null : filters.standardizedBreedFilter,
      organization_id: filters.organizationFilter === "any" ? null : filters.organizationFilter,
      sex: filters.sexFilter === "Any" ? null : filters.sexFilter,
      standardized_size: mapUiSizeToStandardized(filters.sizeFilter),
      age_category: filters.ageCategoryFilter === "Any age" ? null : filters.ageCategoryFilter,
      location_country: filters.locationCountryFilter === "Any country" ? null : filters.locationCountryFilter,
      available_to_country: filters.availableCountryFilter === "Any country" ? null : filters.availableCountryFilter,
      available_to_region: filters.availableRegionFilter === "Any region" ? null : filters.availableRegionFilter,
    };

    // Filter out null values
    return Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v != null)
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
    apiParams
  };
}

// Helper function to map UI size to standardized size
const mapUiSizeToStandardized = (uiSize) => {
  const mapping = {
    Tiny: "Tiny",
    Small: "Small", 
    Medium: "Medium",
    Large: "Large",
    "Extra Large": "XLarge",
  };
  return mapping[uiSize] || null;
};