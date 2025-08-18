"use client";

import React, { useCallback } from "react";
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
import SearchTypeahead from "@/components/search/SearchTypeahead";
import { getBreedSuggestions } from "@/services/animalsService";
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
 * @param {boolean} props.showSortFilter - Whether to show sort filter (default: true)
 * @param {Function} props.onMobileFilterClick - Callback for mobile filter button click
 * @param {Function} props.fetchBreedSuggestions - Custom breed suggestions function (optional)
 * @param {Function} props.handleBreedValueChange - Handler for typing in breed field (no API calls)
 * @param {Function} props.handleBreedSuggestionSelect - Handler for selecting a breed suggestion
 * @param {Function} props.handleBreedSearch - Handler for explicit breed search (Enter key)
 * @param {Function} props.handleBreedClear - Handler for clearing breed filter
 * @param {boolean} props.useSimpleBreedDropdown - Use simple Select dropdown instead of SearchTypeahead (default: false)
 */
export default function DogFilters({
  filters,
  onFiltersChange,
  availableBreeds = [],
  availableShipsTo = [],
  totalCount = 0,
  hasActiveFilters = false,
  showShipsToFilter = true,
  showSortFilter = true,
  onMobileFilterClick,
  fetchBreedSuggestions,
  handleBreedValueChange,
  handleBreedSuggestionSelect,
  handleBreedSearch,
  handleBreedClear,
  useSimpleBreedDropdown = false,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
              aria-label={
                showSortFilter
                  ? "Open filter and sort options"
                  : "Open filter options"
              }
              className="w-full h-12 justify-center gap-3 border-gray-400 hover:border-orange-600 hover:bg-orange-50 text-gray-900 dark:text-gray-100 hover:text-orange-600"
            >
              <Icon name="filter" size="default" />
              <span className="font-medium">
                {showSortFilter ? "Filter & Sort" : "Filter"}
              </span>
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
            {useSimpleBreedDropdown ? (
              <label htmlFor="breed-filter" className="sr-only">
                Filter by breed
              </label>
            ) : null}
            {useSimpleBreedDropdown ? (
              <Select
                value={filters?.breed || "Any breed"}
                onValueChange={(value) =>
                  handleFilterChange(
                    "breed",
                    value === "Any breed" ? "" : value,
                  )
                }
              >
                <SelectTrigger
                  id="breed-filter"
                  data-testid="breed-filter"
                  className="w-full"
                  aria-label="Filter by breed"
                >
                  <Icon name="heart" size="small" className="text-gray-500" />
                  <SelectValue placeholder="Breed" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Any breed">Any breed</SelectItem>
                  {availableBreeds
                    .filter((breed) => breed && breed !== "Any breed")
                    .map((breed) => (
                      <SelectItem key={breed} value={breed}>
                        {breed}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <SearchTypeahead
                data-testid="breed-filter"
                placeholder="Search breeds..."
                value={filters?.breed || ""}
                onValueChange={
                  handleBreedValueChange ||
                  ((value) => {
                    handleFilterChange("breed", value);
                  })
                }
                onSuggestionSelect={
                  handleBreedSuggestionSelect
                    ? handleBreedSuggestionSelect
                    : (value) => {
                        handleFilterChange("breed", value);
                      }
                }
                onSearch={
                  handleBreedSearch
                    ? handleBreedSearch
                    : (value) => {
                        handleFilterChange("breed", value);
                      }
                }
                onClear={
                  handleBreedClear
                    ? handleBreedClear
                    : () => {
                        handleFilterChange("breed", "");
                      }
                }
                fetchSuggestions={fetchBreedSuggestions || getBreedSuggestions}
                debounceMs={300}
                maxSuggestions={8}
                showHistory={true}
                showClearButton={true}
                showDidYouMean={true}
                historyKey="breed-search-history"
                className="w-full"
                inputClassName="bg-white"
                aria-label="Search breeds"
                skipLocalFuzzySearch={true}
              />
            )}
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
