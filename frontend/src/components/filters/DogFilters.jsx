"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Icon } from "../ui/Icon";
import {
  getAgeFilterOptions,
  getSortFilterOptions,
  getDefaultFilters,
} from "@/utils/dogFilters";
import { getCountryName } from "@/utils/countryHelpers";

/**
 * DogFilters component for filtering and sorting dogs
 * @param {Object} props - Component props
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFiltersChange - Callback when filters change
 * @param {Array} props.availableBreeds - Available breed options
 * @param {Array} props.availableShipsTo - Available ships-to options (optional)
 * @param {number} props.totalCount - Total number of filtered results
 * @param {boolean} props.hasActiveFilters - Whether any filters are active
 * @param {boolean} props.showShipsToFilter - Whether to show ships-to filter (default: true)
 * @param {Function} props.onMobileFilterClick - Callback for mobile filter button click
 */
export default function DogFilters({
  filters,
  onFiltersChange,
  availableBreeds = [],
  availableShipsTo = [],
  totalCount = 0,
  hasActiveFilters = false,
  showShipsToFilter = true,
  onMobileFilterClick,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localBreedInput, setLocalBreedInput] = useState(filters?.breed || "");

  // Debounced breed input handling
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localBreedInput !== filters?.breed) {
        handleFilterChange("breed", localBreedInput);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localBreedInput, filters?.breed]);

  // Sync local breed input with external filter changes
  useEffect(() => {
    if (filters?.breed !== localBreedInput) {
      setLocalBreedInput(filters?.breed || "");
    }
  }, [filters?.breed]);

  const handleFilterChange = useCallback(
    (filterType, value) => {
      if (!onFiltersChange) return;

      const newFilters = {
        ...filters,
        [filterType]: value,
      };

      onFiltersChange(newFilters);

      // Update URL params for shareable views
      const params = new URLSearchParams(searchParams);
      if (value && value !== "All" && value !== "") {
        params.set(filterType, value);
      } else {
        params.delete(filterType);
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [filters, onFiltersChange, router, searchParams],
  );

  const handleClearAll = useCallback(() => {
    const defaultFilters = getDefaultFilters();
    setLocalBreedInput("");
    onFiltersChange?.(defaultFilters);

    // Clear URL params
    router.push(window.location.pathname, { scroll: false });
  }, [onFiltersChange, router]);

  const ageOptions = getAgeFilterOptions();
  const sortOptions = getSortFilterOptions();

  // Count active filters for badge
  const activeFilterCount = React.useMemo(() => {
    if (!filters) return 0;
    let count = 0;
    if (filters.age && filters.age !== "All") count++;
    if (filters.breed && filters.breed.trim() !== "") count++;
    if (showShipsToFilter && filters.shipsTo && filters.shipsTo !== "All")
      count++;
    return count;
  }, [filters, showShipsToFilter]);

  return (
    <div
      data-testid="dog-filters"
      className="bg-white dark:bg-gray-900 shadow-sm border-b md:sticky top-0 z-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Filter Header - Desktop and Mobile */}
        <div className="flex items-center justify-between mb-4">
          {/* Desktop Filter Header */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Icon name="filter" size="default" className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Filter by:
              </span>
            </div>
            {hasActiveFilters && (
              <Badge
                variant="secondary"
                data-testid="active-filters-badge"
                className="text-xs"
              >
                {activeFilterCount} active
              </Badge>
            )}
          </div>

          {/* Mobile Filter Button */}
          <div className="lg:hidden flex-1">
            <Button
              variant="outline"
              onClick={onMobileFilterClick}
              data-testid="mobile-filter-button"
              aria-label="Open filter and sort options"
              className="w-full h-12 justify-center gap-3 border-gray-300 hover:border-orange-600 hover:bg-orange-50 text-gray-700 hover:text-orange-600"
            >
              <Icon name="filter" size="default" />
              <span className="font-medium">Filter & Sort</span>
              {hasActiveFilters && (
                <Badge
                  variant="secondary"
                  data-testid="mobile-active-filters-badge"
                  className="bg-orange-600 text-white text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Results Count and Clear All */}
          <div className="flex items-center gap-4">
            {/* Hide count on mobile to avoid crowding with mobile filter button */}
            {totalCount > 0 && (
              <span className="hidden lg:inline text-sm text-gray-600">
                {totalCount} dogs
              </span>
            )}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                data-testid="clear-filters-button"
                aria-label="Clear all filters"
                className="hidden lg:flex text-sm text-gray-600 hover:text-gray-900"
              >
                <Icon name="x" size="small" className="mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Filter Controls - Desktop Only */}
        <div
          data-testid="filters-container"
          className="hidden lg:flex gap-4 overflow-x-auto lg:overflow-x-visible pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        >
          {/* Age Filter */}
          <div className="flex-shrink-0 min-w-[160px]">
            <label htmlFor="age-filter" className="sr-only">
              Filter by age
            </label>
            <Select
              value={filters?.age || "All"}
              onValueChange={(value) => handleFilterChange("age", value)}
            >
              <SelectTrigger
                id="age-filter"
                data-testid="age-filter"
                className="w-full"
                aria-label="Filter by age"
              >
                <Icon name="calendar" size="small" className="text-gray-500" />
                <SelectValue placeholder="Age" />
              </SelectTrigger>
              <SelectContent>
                {ageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Breed Filter */}
          <div className="flex-shrink-0 min-w-[200px]">
            <label htmlFor="breed-filter" className="sr-only">
              Search breeds
            </label>
            <Input
              id="breed-filter"
              data-testid="breed-filter"
              type="text"
              placeholder="Search breeds..."
              value={localBreedInput}
              onChange={(e) => setLocalBreedInput(e.target.value)}
              className="w-full"
              aria-label="Search breeds"
            />
          </div>

          {/* Ships To Filter - only show if enabled */}
          {showShipsToFilter && (
            <div className="flex-shrink-0 min-w-[160px]">
              <label htmlFor="ships-to-filter" className="sr-only">
                Filter by ships to
              </label>
              <Select
                value={filters?.shipsTo || "All"}
                onValueChange={(value) => handleFilterChange("shipsTo", value)}
              >
                <SelectTrigger
                  id="ships-to-filter"
                  data-testid="ships-to-filter"
                  className="w-full"
                  aria-label="Filter by adoptable to"
                >
                  <Icon name="globe" size="small" className="text-gray-500" />
                  <SelectValue placeholder="Adoptable to" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Countries</SelectItem>
                  {availableShipsTo.map((country) => (
                    <SelectItem key={country} value={country}>
                      {getCountryName(country)} ({country})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sort Filter */}
          <div className="flex-shrink-0 min-w-[160px]">
            <label htmlFor="sort-filter" className="sr-only">
              Sort dogs
            </label>
            <Select
              value={filters?.sort || "newest"}
              onValueChange={(value) => handleFilterChange("sort", value)}
            >
              <SelectTrigger
                id="sort-filter"
                data-testid="sort-filter"
                className="w-full"
                aria-label="Sort dogs"
              >
                <Icon name="sort-desc" size="small" className="text-gray-500" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
