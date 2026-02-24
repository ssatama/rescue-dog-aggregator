"use client";

import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon } from "../ui/Icon";
import SearchTypeahead from "@/components/search/SearchTypeahead";
import {
  getSearchSuggestions,
  getBreedSuggestions,
} from "@/services/animalsService";
import { FILTER_DEFAULTS } from "@/constants/filters";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import type { DesktopFiltersProps } from "@/types/filterComponents";

export default function DesktopFilters({
  searchQuery,
  handleSearchChange,
  clearSearch,

  organizationFilter,
  setOrganizationFilter,
  organizations,

  showBreed = true,
  standardizedBreedFilter = "",
  setStandardizedBreedFilter,
  handleBreedSearch,
  handleBreedClear: handleBreedClearFromParent,
  handleBreedValueChange,
  standardizedBreeds = [],

  sexFilter,
  setSexFilter,
  sexOptions,

  sizeFilter,
  setSizeFilter,
  sizeOptions,

  ageCategoryFilter,
  setAgeCategoryFilter,
  ageOptions,

  locationCountryFilter,
  setLocationCountryFilter,
  locationCountries,

  availableCountryFilter,
  setAvailableCountryFilter,
  availableCountries,

  availableRegionFilter,
  setAvailableRegionFilter,
  availableRegions,

  resetFilters,

  filterCounts,
}: DesktopFiltersProps) {
  const {
    dynamicSizeOptions,
    dynamicAgeOptions,
    dynamicSexOptions,
    sectionCounts,
    activeFilterCount,
  } = useFilterOptions({
    filterValues: {
      searchQuery,
      organizationFilter,
      standardizedBreedFilter,
      sexFilter,
      sizeFilter,
      ageCategoryFilter,
      locationCountryFilter,
      availableCountryFilter,
      availableRegionFilter,
    },
    filterCounts,
    sizeOptions,
    ageOptions,
    sexOptions,
  });

  const handleBreedClear = useCallback(() => {
    if (handleBreedClearFromParent) {
      handleBreedClearFromParent();
    } else {
      setStandardizedBreedFilter?.(FILTER_DEFAULTS.BREED);
    }
  }, [handleBreedClearFromParent, setStandardizedBreedFilter]);

  return (
    <aside
      data-testid="desktop-filters-container"
      className="hidden lg:block w-72 shrink-0"
    >
      <div
        data-testid="desktop-filters-panel"
        className="bg-orange-50/50 dark:bg-gray-800/90 backdrop-blur-md rounded-xl shadow-xl p-6 border border-orange-100/30 dark:border-gray-700/30 sticky top-24 z-10 cross-browser-transition cross-browser-will-change hover:shadow-xl hover:bg-orange-50/60 dark:hover:bg-gray-800/95 transition-colors duration-200"
        role="complementary"
        aria-label="Filter options"
      >
        {/* Header with title and active filter count */}
        <div
          data-testid="filters-header"
          className="flex items-center justify-between mb-6"
        >
          <h3
            data-testid="filters-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            Filters
          </h3>
          {activeFilterCount > 0 && (
            <span
              data-testid="active-filters-badge"
              className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2.5 py-1 rounded-full text-sm font-medium"
            >
              {activeFilterCount} active
            </span>
          )}
        </div>

        {/* Enhanced Search Bar with Typeahead */}
        <div className="mb-6">
          <SearchTypeahead
            data-testid="search-input"
            value={searchQuery}
            placeholder="Search dogs..."
            onValueChange={handleSearchChange}
            onClear={clearSearch}
            fetchSuggestions={getSearchSuggestions}
            debounceMs={300}
            maxSuggestions={5}
            showHistory={true}
            showClearButton={true}
            showDidYouMean={true}
            historyKey="dog-search-history"
            className="w-full"
            inputClassName="enhanced-hover enhanced-focus-input mobile-form-input focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition-colors duration-200"
            aria-label="Search dogs by name or breed"
          />
        </div>

        {/* Filters container with collapsible sections */}
        <div data-testid="filters-container" className="space-y-6">
          {/* 1. Adoptable to Country Section - PRIMARY FILTER */}
          <div
            className={`space-y-3 ${sectionCounts.shipsToCountry > 0 ? "filter-section-active" : ""}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Adoptable to Country
              </h4>
              {sectionCounts.shipsToCountry > 0 && (
                <span className="inline-flex bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 rounded-full text-xs">
                  ({sectionCounts.shipsToCountry})
                </span>
              )}
            </div>

            {/* Hidden Location Select for E2E Tests */}
            <div className="absolute -left-[9999px] w-1 h-1 overflow-hidden">
              <select
                data-testid="location-filter"
                value={availableCountryFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAvailableCountryFilter(e.target.value)}
              >
                {availableCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            {/* Ships To Country Select */}
            <Select
              value={availableCountryFilter}
              onValueChange={setAvailableCountryFilter}
            >
              <SelectTrigger
                className="select-focus enhanced-hover enhanced-focus-select focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition-colors duration-200"
                aria-label="Filter by adoptable country"
              >
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent className="max-h-48">
                {availableCountries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Size Filter - PHYSICAL CONSTRAINT */}
          <div
            className={`space-y-3 ${sectionCounts.size > 0 ? "filter-section-active" : ""}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Size
              </h4>
              {sectionCounts.size > 0 && (
                <span className="inline-flex bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 rounded-full text-xs">
                  ({sectionCounts.size})
                </span>
              )}
            </div>

            {/* Hidden Size Select for E2E Tests */}
            <div className="absolute -left-[9999px] w-1 h-1 overflow-hidden">
              <select
                data-testid="size-filter"
                value={sizeFilter === FILTER_DEFAULTS.SIZE ? "any" : sizeFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSizeFilter(
                    e.target.value === "any" ? FILTER_DEFAULTS.SIZE : e.target.value,
                  )
                }
              >
                <option value="any">{FILTER_DEFAULTS.SIZE}</option>
                {dynamicSizeOptions
                  .filter((size) => size !== FILTER_DEFAULTS.SIZE)
                  .map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
              </select>
            </div>

            <div
              data-testid="size-button-grid"
              className="grid grid-cols-2 gap-2"
            >
              {dynamicSizeOptions.map((size) => {
                const isActive = sizeFilter === size;
                return (
                  <Button
                    key={size}
                    data-testid={`size-button-${size}`}
                    variant="outline"
                    onClick={() => setSizeFilter(size)}
                    className={`justify-start cross-browser-transition hover:scale-[1.02] focus:scale-[1.02] interactive-enhanced enhanced-focus-button mobile-touch-target ${
                      isActive
                        ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-200 dark:hover:bg-orange-900/50 cross-browser-shadow"
                        : "bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 hover:shadow-sm"
                    }`}
                    style={{ minHeight: "48px" }}
                  >
                    {size}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 3. Age Filter - LIFE STAGE PREFERENCE */}
          <div
            className={`space-y-3 ${sectionCounts.age > 0 ? "filter-section-active" : ""}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Age
              </h4>
              {sectionCounts.age > 0 && (
                <span className="inline-flex bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 rounded-full text-xs">
                  ({sectionCounts.age})
                </span>
              )}
            </div>

            {/* Hidden Age Select for E2E Tests */}
            <div className="absolute -left-[9999px] w-1 h-1 overflow-hidden">
              <select
                data-testid="age-filter"
                value={
                  ageCategoryFilter === FILTER_DEFAULTS.AGE ? "any" : ageCategoryFilter
                }
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setAgeCategoryFilter(
                    e.target.value === "any" ? FILTER_DEFAULTS.AGE : e.target.value,
                  )
                }
              >
                <option value="any">{FILTER_DEFAULTS.AGE}</option>
                {dynamicAgeOptions
                  .filter((age) => age !== FILTER_DEFAULTS.AGE)
                  .map((age) => (
                    <option key={age} value={age}>
                      {age}
                    </option>
                  ))}
              </select>
            </div>

            <div
              data-testid="age-button-grid"
              className="grid grid-cols-2 gap-2"
            >
              {dynamicAgeOptions.map((age) => {
                const isActive = ageCategoryFilter === age;
                return (
                  <Button
                    key={age}
                    data-testid={`age-button-${age}`}
                    variant="outline"
                    onClick={() => setAgeCategoryFilter(age)}
                    className={`justify-start cross-browser-transition hover:scale-[1.02] focus:scale-[1.02] interactive-enhanced enhanced-focus-button mobile-touch-target ${
                      isActive
                        ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-200 dark:hover:bg-orange-900/50 cross-browser-shadow"
                        : "bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 hover:shadow-sm"
                    }`}
                    style={{ minHeight: "48px" }}
                  >
                    {age}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 4. Sex Filter - BASIC PREFERENCE */}
          <div
            className={`space-y-3 ${sectionCounts.sex > 0 ? "filter-section-active" : ""}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Sex
              </h4>
              {sectionCounts.sex > 0 && (
                <span className="inline-flex bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 rounded-full text-xs">
                  ({sectionCounts.sex})
                </span>
              )}
            </div>

            {/* Hidden Sex Select for E2E Tests */}
            <div className="absolute -left-[9999px] w-1 h-1 overflow-hidden">
              <select
                data-testid="sex-filter"
                value={sexFilter === FILTER_DEFAULTS.SEX ? "any" : sexFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSexFilter(
                    e.target.value === "any" ? FILTER_DEFAULTS.SEX : e.target.value,
                  )
                }
              >
                <option value="any">{FILTER_DEFAULTS.SEX}</option>
                {dynamicSexOptions
                  .filter((sex) => sex !== FILTER_DEFAULTS.SEX)
                  .map((sex) => (
                    <option key={sex} value={sex}>
                      {sex}
                    </option>
                  ))}
              </select>
            </div>

            <div
              data-testid="sex-button-grid"
              className="grid grid-cols-3 gap-2"
            >
              {dynamicSexOptions.map((sex) => {
                const isActive = sexFilter === sex;
                return (
                  <Button
                    key={sex}
                    data-testid={`sex-button-${sex}`}
                    variant="outline"
                    onClick={() => setSexFilter(sex)}
                    className={`justify-center cross-browser-transition hover:scale-[1.02] focus:scale-[1.02] interactive-enhanced enhanced-focus-button mobile-touch-target ${
                      isActive
                        ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 hover:bg-orange-200 dark:hover:bg-orange-900/50 cross-browser-shadow"
                        : "bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 hover:shadow-sm"
                    }`}
                    style={{ minHeight: "48px" }}
                  >
                    {sex}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 5. Breed Filter - Direct search like Name filter */}
          {showBreed && (
            <div
              className={`space-y-3 ${sectionCounts.breed > 0 ? "filter-section-active" : ""}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Breed
                </h4>
                {sectionCounts.breed > 0 && (
                  <span className="inline-flex bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 rounded-full text-xs">
                    ({sectionCounts.breed})
                  </span>
                )}
              </div>

              {/* Hidden Breed Select for E2E tests */}
              <div className="absolute -left-[9999px] w-1 h-1 overflow-hidden">
                <select
                  data-testid="breed-filter"
                  value={
                    standardizedBreedFilter === FILTER_DEFAULTS.BREED
                      ? "any"
                      : standardizedBreedFilter
                  }
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setStandardizedBreedFilter?.(
                      e.target.value === "any" ? FILTER_DEFAULTS.BREED : e.target.value,
                    )
                  }
                >
                  <option value="any">{FILTER_DEFAULTS.BREED}</option>
                  {standardizedBreeds
                    ?.filter((breed) => breed !== FILTER_DEFAULTS.BREED)
                    .map((breed) => (
                      <option key={breed} value={breed}>
                        {breed}
                      </option>
                    ))}
                </select>
              </div>

              {/* Enhanced Breed Search with Typeahead */}
              <SearchTypeahead
                data-testid="breed-search-input"
                placeholder="Search breeds..."
                value={
                  standardizedBreedFilter === FILTER_DEFAULTS.BREED
                    ? ""
                    : standardizedBreedFilter
                }
                onValueChange={handleBreedValueChange}
                onSuggestionSelect={(breed: string) => {
                  if (setStandardizedBreedFilter) {
                    setStandardizedBreedFilter(breed);
                  }
                }}
                onSearch={(breed: string) => {
                  if (handleBreedSearch) {
                    handleBreedSearch(breed);
                  } else {
                    setStandardizedBreedFilter?.(breed);
                  }
                }}
                onClear={handleBreedClear}
                fetchSuggestions={getBreedSuggestions}
                debounceMs={300}
                maxSuggestions={8}
                showHistory={true}
                showClearButton={true}
                showDidYouMean={true}
                historyKey="breed-search-history"
                className="w-full"
                inputClassName="enhanced-hover enhanced-focus-input mobile-form-input focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition-colors duration-200"
                skipLocalFuzzySearch={true}
              />
            </div>
          )}

          {/* 6. Organization Filter - Direct select like other filters */}
          <div
            className={`space-y-3 ${sectionCounts.organization > 0 ? "filter-section-active" : ""}`}
          >
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Organization
              </h4>
              {sectionCounts.organization > 0 && (
                <span className="inline-flex bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 rounded-full text-xs">
                  ({sectionCounts.organization})
                </span>
              )}
            </div>

            {/* Hidden Organization Select for E2E Tests */}
            <div className="absolute -left-[9999px] w-1 h-1 overflow-hidden">
              <select
                data-testid="organization-filter"
                value={organizationFilter || FILTER_DEFAULTS.ORGANIZATION}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setOrganizationFilter(e.target.value)}
              >
                {organizations.map((org) => (
                  <option
                    key={org.id ?? FILTER_DEFAULTS.ORGANIZATION}
                    value={org.id != null ? org.id.toString() : FILTER_DEFAULTS.ORGANIZATION}
                  >
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <Select
              value={organizationFilter || FILTER_DEFAULTS.ORGANIZATION}
              onValueChange={setOrganizationFilter}
            >
              <SelectTrigger className="select-focus enhanced-hover enhanced-focus-select focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition-colors duration-200">
                <SelectValue>
                  {organizationFilter === FILTER_DEFAULTS.ORGANIZATION || !organizationFilter
                    ? "Any Organization"
                    : organizations.find(
                        (org) => org.id?.toString() === organizationFilter,
                      )?.name || "Any Organization"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem
                    key={org.id ?? FILTER_DEFAULTS.ORGANIZATION}
                    value={org.id != null ? org.id.toString() : FILTER_DEFAULTS.ORGANIZATION}
                  >
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Clear all filters button */}
        {activeFilterCount > 0 && (
          <button
            data-testid="clear-all-filters"
            className="w-full mt-6 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 font-medium py-2 px-4 rounded-lg transition-colors duration-200 interactive-enhanced enhanced-focus-button focus:ring-2 focus:ring-orange-600"
            onClick={resetFilters}
          >
            Clear All Filters
          </button>
        )}
      </div>
    </aside>
  );
}
