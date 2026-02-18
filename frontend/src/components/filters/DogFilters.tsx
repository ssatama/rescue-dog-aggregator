"use client";

import React, { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
import { FILTER_DEFAULTS } from "@/constants/filters";
import {
  trackFilterChange,
  trackSortChange,
} from "@/lib/monitoring/breadcrumbs";

interface DogFilterValues {
  age?: string;
  breed?: string;
  sex?: string;
  shipsTo?: string;
  sort?: string;
}

interface DogFiltersProps {
  filters: DogFilterValues;
  onFiltersChange: (filters: DogFilterValues) => void;
  availableBreeds?: string[];
  availableShipsTo?: string[];
  totalCount?: number;
  hasActiveFilters?: boolean;
  showShipsToFilter?: boolean;
  showSortFilter?: boolean;
  onMobileFilterClick?: () => void;
  fetchBreedSuggestions?: (query: string) => Promise<string[]>;
  handleBreedValueChange?: (value: string) => void;
  handleBreedSuggestionSelect?: (value: string) => void;
  handleBreedSearch?: (value: string) => void;
  handleBreedClear?: () => void;
  useSimpleBreedDropdown?: boolean;
}

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
}: DogFiltersProps) {
  const router = useRouter();
  const rawSearchParams = useSearchParams();

  const handleFilterChange = useCallback(
    (filterType: string, value: string) => {
      const newFilters = {
        ...filters,
        [filterType]: value,
      };

      onFiltersChange(newFilters);

      try {
        if (filterType === "sort") {
          trackSortChange(value || "newest");
        } else {
          trackFilterChange(filterType, value, totalCount || 0);
        }
      } catch (error) {
        console.error("Failed to track filter change:", error);
      }

      if (!rawSearchParams) return;
      const params = new URLSearchParams(rawSearchParams.toString());
      if (value && value !== FILTER_DEFAULTS.ALL && value !== "") {
        params.set(filterType, value);
      } else {
        params.delete(filterType);
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [filters, onFiltersChange, router, rawSearchParams, totalCount],
  );

  const handleClearAll = useCallback(() => {
    const defaultFilters = getDefaultFilters();
    onFiltersChange(defaultFilters);

    router.push(window.location.pathname, { scroll: false });
  }, [onFiltersChange, router]);

  const ageOptions = getAgeFilterOptions();
  const sortOptions = getSortFilterOptions();

  const activeFilterCount = useMemo((): number => {
    if (!filters) return 0;
    let count = 0;
    if (filters.age && filters.age !== FILTER_DEFAULTS.ALL) count++;
    if (filters.breed && filters.breed.trim() !== "") count++;
    if (filters.sex && filters.sex !== FILTER_DEFAULTS.SEX) count++;
    if (showShipsToFilter && filters.shipsTo && filters.shipsTo !== FILTER_DEFAULTS.ALL)
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
              value={filters?.age || FILTER_DEFAULTS.ALL}
              onValueChange={(value: string) => handleFilterChange("age", value)}
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
                {ageOptions.map((option: { value: string; label: string }) => (
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
                value={filters?.breed || FILTER_DEFAULTS.BREED}
                onValueChange={(value: string) =>
                  handleFilterChange(
                    "breed",
                    value === FILTER_DEFAULTS.BREED ? "" : value,
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
                  <SelectItem value={FILTER_DEFAULTS.BREED}>{FILTER_DEFAULTS.BREED}</SelectItem>
                  {availableBreeds
                    .filter((breed) => breed && breed !== FILTER_DEFAULTS.BREED)
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
                  ((value: string) => {
                    handleFilterChange("breed", value);
                  })
                }
                onSuggestionSelect={
                  handleBreedSuggestionSelect
                    ? handleBreedSuggestionSelect
                    : (value: string) => {
                        handleFilterChange("breed", value);
                      }
                }
                onSearch={
                  handleBreedSearch
                    ? handleBreedSearch
                    : (value: string) => {
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
                value={filters?.shipsTo || FILTER_DEFAULTS.ALL}
                onValueChange={(value: string) => handleFilterChange("shipsTo", value)}
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
                  <SelectItem value={FILTER_DEFAULTS.ALL}>All Countries</SelectItem>
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
              onValueChange={(value: string) => handleFilterChange("sort", value)}
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
                {sortOptions.map((option: { value: string; label: string }) => (
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
