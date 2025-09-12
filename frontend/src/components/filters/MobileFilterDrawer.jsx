"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/**
 * Enhanced FilterSection component for mobile drawer with custom collapse animations
 */
function MobileFilterSection({
  id,
  title,
  defaultOpen = false,
  children,
  count = 0,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = useCallback((e) => {
    e.preventDefault();
    setIsOpen((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle(e);
      }
    },
    [handleToggle],
  );

  const hasActiveFilters = count > 0;

  return (
    <details
      data-testid={`filter-section-${id}`}
      data-open={isOpen}
      className={`filter-section overflow-hidden will-change-transform group ${
        hasActiveFilters ? "filter-section-active" : ""
      } ${!isOpen ? "collapsed" : ""}`}
      aria-label={`${title} filters section`}
      open={isOpen}
      role="region"
    >
      <summary
        data-testid={`filter-summary-${id}`}
        className="flex items-center justify-between cursor-pointer py-3 px-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 ease-out interactive-enhanced btn-focus-ring"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        aria-expanded={isOpen}
        role="button"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-700 dark:text-gray-300">
            {title}
          </h3>
          {count > 0 && (
            <span className="inline-flex bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2 rounded-full text-xs">
              ({count})
            </span>
          )}
        </div>
        <Icon
          name="chevron-down"
          size="small"
          data-testid={`chevron-icon-${id}`}
          className={`text-gray-500 chevron-icon transition-transform duration-200 ease-out ${
            isOpen ? "chevron-open" : ""
          } group-open:rotate-180`}
        />
      </summary>
      <div
        data-testid={`filter-content-${id}`}
        className="filter-section-content transition-opacity transition-transform duration-200 ease-out will-change-transform mt-3 space-y-3 px-4 pb-2"
      >
        {children}
      </div>
    </details>
  );
}

/**
 * Mobile slide-out drawer filter component
 * Features left-to-right slide animation, consistent filter hierarchy with desktop,
 * dynamic filter counts, and no sorting options
 */
export default function MobileFilterDrawer({
  // Drawer state
  isOpen = false,
  onClose,

  // Search
  searchQuery,
  handleSearchChange,
  clearSearch,

  // Organization
  organizationFilter,
  setOrganizationFilter,
  organizations,

  // Breed
  standardizedBreedFilter,
  setStandardizedBreedFilter,
  handleBreedSearch,
  handleBreedClear: handleBreedClearFromParent,
  handleBreedValueChange,
  standardizedBreeds,

  // Pet Details
  sexFilter,
  setSexFilter,
  sexOptions,

  sizeFilter,
  setSizeFilter,
  sizeOptions,

  ageCategoryFilter,
  setAgeCategoryFilter,
  ageOptions,

  // Location
  availableCountryFilter,
  setAvailableCountryFilter,
  availableCountries,

  // Filter management
  resetFilters,

  // Dynamic filter counts
  filterCounts,

  // Context-aware filtering
  filterConfig = {
    showAge: true,
    showBreed: true,
    showSort: true,
    showSize: true,
    showSex: true,
    showShipsTo: true,
    showOrganization: true,
    showSearch: true,
  },

  // Simple breed dropdown option
  useSimpleBreedDropdown = false,
}) {
  // Local state for breed input to handle real-time suggestions
  // Removed local state for breed input - SearchTypeahead manages its own state

  // Helper function to merge static options with dynamic counts
  const getOptionsWithCounts = useCallback(
    (staticOptions, dynamicOptions, filterType) => {
      if (!filterCounts || !dynamicOptions) return staticOptions;

      return staticOptions.filter((option) => {
        if (option.includes("Any")) return true; // Always include "Any" options

        // Find matching dynamic option
        const dynamicOption = dynamicOptions.find((dynOpt) => {
          if (filterType === "size") {
            // Map static size options to dynamic values
            const sizeMapping = {
              Tiny: "Tiny",
              Small: "Small",
              Medium: "Medium",
              Large: "Large",
              "Extra Large": "XLarge",
            };
            return dynOpt.value === sizeMapping[option];
          }
          return dynOpt.value === option || dynOpt.label === option;
        });

        return dynamicOption && dynamicOption.count > 0;
      });
    },
    [filterCounts],
  );

  // Dynamic options with counts (only show options that have results)
  const dynamicSizeOptions = useMemo(
    () => getOptionsWithCounts(sizeOptions, filterCounts?.size_options, "size"),
    [filterCounts?.size_options, getOptionsWithCounts, sizeOptions],
  );

  const dynamicAgeOptions = useMemo(
    () => getOptionsWithCounts(ageOptions, filterCounts?.age_options, "age"),
    [filterCounts?.age_options, getOptionsWithCounts, ageOptions],
  );

  const dynamicSexOptions = useMemo(
    () => getOptionsWithCounts(sexOptions, filterCounts?.sex_options, "sex"),
    [filterCounts?.sex_options, getOptionsWithCounts, sexOptions],
  );

  // Handle opening/closing with body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Store current scroll position
      const scrollY = window.scrollY;

      // Apply scroll lock styles
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";

      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      }
    }

    return () => {
      // Cleanup on unmount
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  // Optimized handlers with useCallback
  const handleBreedClear = useCallback(() => {
    // Use parent-provided handler if available, otherwise fallback to direct setter
    if (handleBreedClearFromParent) {
      handleBreedClearFromParent();
    } else {
      setStandardizedBreedFilter("Any breed");
    }
  }, [handleBreedClearFromParent, setStandardizedBreedFilter]);

  // Removed handleBreedSuggestionClick - SearchTypeahead handles suggestions

  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) {
        onClose?.();
      }
    },
    [onClose],
  );

  // Filtered breeds for suggestions (memoized for performance)
  // Removed filteredBreeds - SearchTypeahead handles its own filtering

  // Calculate active filter count (only for visible filters)
  const activeFilterCount = useMemo(() => {
    let count = 0;

    // Search query (if search is shown)
    if (filterConfig.showSearch && searchQuery && searchQuery.trim() !== "")
      count++;

    // Organization filter (if organization section is shown)
    if (
      filterConfig.showOrganization &&
      organizationFilter &&
      organizationFilter !== "any"
    )
      count++;

    // Breed filter (if breed section is shown)
    if (
      filterConfig.showBreed &&
      standardizedBreedFilter &&
      standardizedBreedFilter !== "Any breed"
    )
      count++;

    // Sex filter (if sex section is shown)
    if (filterConfig.showSex && sexFilter && sexFilter !== "Any") count++;

    // Size filter (if size section is shown)
    if (filterConfig.showSize && sizeFilter && sizeFilter !== "Any size")
      count++;

    // Age filter (if age section is shown)
    if (
      filterConfig.showAge &&
      ageCategoryFilter &&
      ageCategoryFilter !== "Any age"
    )
      count++;

    // Available country filter (if ships-to section is shown)
    if (
      filterConfig.showShipsTo &&
      availableCountryFilter &&
      availableCountryFilter !== "Any country"
    )
      count++;

    return count;
  }, [
    filterConfig,
    searchQuery,
    organizationFilter,
    standardizedBreedFilter,
    sexFilter,
    sizeFilter,
    ageCategoryFilter,
    availableCountryFilter,
  ]);

  // Calculate section-specific filter counts
  const sectionCounts = useMemo(() => {
    const counts = {
      organization: 0,
      breed: 0,
      shipsToCountry: 0,
      age: 0,
      size: 0,
      sex: 0,
    };

    // Organization section
    if (organizationFilter && organizationFilter !== "any")
      counts.organization++;

    // Breed section
    if (standardizedBreedFilter && standardizedBreedFilter !== "Any breed")
      counts.breed++;

    // Ships to Country section
    if (availableCountryFilter && availableCountryFilter !== "Any country")
      counts.shipsToCountry++;

    // Age section
    if (ageCategoryFilter && ageCategoryFilter !== "Any age") counts.age++;

    // Size section
    if (sizeFilter && sizeFilter !== "Any size") counts.size++;

    // Sex section
    if (sexFilter && sexFilter !== "Any") counts.sex++;

    return counts;
  }, [
    organizationFilter,
    standardizedBreedFilter,
    availableCountryFilter,
    ageCategoryFilter,
    sizeFilter,
    sexFilter,
  ]);

  // Calculate total dogs count from filter counts
  const totalDogsCount = filterCounts?.total_count || 0;

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 lg:hidden"
            data-testid="filter-drawer-backdrop"
            onClick={handleBackdropClick}
          />

          {/* Full-screen Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
            }}
            className="fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-hidden lg:hidden will-change-transform gpu-accelerated flex flex-col"
            data-testid="mobile-filter-drawer"
            role="dialog"
            aria-label="Filter options"
            aria-modal="true"
            aria-labelledby="filter-drawer-title"
          >
            {/* Fixed Header with Apply Button */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Icon
                    name="filter"
                    size="default"
                    className="text-orange-600"
                  />
                  <h2
                    id="filter-drawer-title"
                    className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                  >
                    Filters
                  </h2>
                  {activeFilterCount > 0 && (
                    <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-2.5 py-1 rounded-full text-sm font-medium">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-10 w-10 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-400"
                  aria-label="Close filters"
                >
                  <Icon name="x" size="default" />
                </Button>
              </div>
              
              {/* Apply Filters Button in Header */}
              <div className="px-4 pb-3">
                <Button
                  onClick={onClose}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3"
                >
                  Apply Filters {totalDogsCount > 0 && `(${totalDogsCount} dogs)`}
                </Button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden"
              style={{ 
                paddingBottom: "env(safe-area-inset-bottom, 20px)",
                WebkitOverflowScrolling: "touch"
              }}
            >
              <div className="p-4 space-y-6">
                {/* Filter Sections */}
                {filterConfig.showShipsTo ? (
                  <MobileFilterSection
                    id="ships-to-country"
                    title="Adoptable to Country"
                    defaultOpen={false}
                    count={sectionCounts.shipsToCountry}
                  >
                    {/* Hidden Location Select for E2E Tests */}
                    <div className="absolute -left-[9999px] w-1 h-1 overflow-hidden">
                      <select
                        data-testid="location-filter"
                        value={availableCountryFilter}
                        onChange={(e) =>
                          setAvailableCountryFilter(e.target.value)
                        }
                      >
                        {availableCountries.map((country) => (
                          <option key={country} value={country}>
                            {country}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Select
                        value={availableCountryFilter}
                        onValueChange={setAvailableCountryFilter}
                      >
                        <SelectTrigger
                          className="select-focus enhanced-hover enhanced-focus-select focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition-colors duration-200"
                          style={{ minHeight: "48px" }}
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
                  </MobileFilterSection>
                ) : null}

                {/* === BUTTON/LOLLIPOP FILTERS SECTION === */}

                {/* 2. Size Filter - PHYSICAL CONSTRAINT */}
                {filterConfig.showSize && (
                  <div
                    className={`space-y-3 ${sectionCounts.size > 0 ? "filter-section-active" : ""}`}
                    role="region"
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
                        value={sizeFilter === "Any size" ? "any" : sizeFilter}
                        onChange={(e) =>
                          setSizeFilter(
                            e.target.value === "any"
                              ? "Any size"
                              : e.target.value,
                          )
                        }
                      >
                        <option value="any">Any size</option>
                        {dynamicSizeOptions
                          .filter((size) => size !== "Any size")
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
                            aria-pressed={isActive}
                          >
                            {size}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Age Filter - LIFE STAGE PREFERENCE */}
                {filterConfig.showAge && (
                  <div
                    className={`space-y-3 ${sectionCounts.age > 0 ? "filter-section-active" : ""}`}
                    role="region"
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
                          ageCategoryFilter === "Any age"
                            ? "any"
                            : ageCategoryFilter
                        }
                        onChange={(e) =>
                          setAgeCategoryFilter(
                            e.target.value === "any"
                              ? "Any age"
                              : e.target.value,
                          )
                        }
                      >
                        <option value="any">Any age</option>
                        {dynamicAgeOptions
                          .filter((age) => age !== "Any age")
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
                            aria-pressed={isActive}
                          >
                            {age}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 4. Sex Filter - BASIC PREFERENCE */}
                {filterConfig.showSex && (
                  <div
                    className={`space-y-3 ${sectionCounts.sex > 0 ? "filter-section-active" : ""}`}
                    role="region"
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
                        value={sexFilter === "Any" ? "any" : sexFilter}
                        onChange={(e) =>
                          setSexFilter(
                            e.target.value === "any" ? "Any" : e.target.value,
                          )
                        }
                      >
                        <option value="any">Any</option>
                        {dynamicSexOptions
                          .filter((sex) => sex !== "Any")
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
                            aria-pressed={isActive}
                          >
                            {sex}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. Breed Filter - Direct search like Name filter */}
                {filterConfig.showBreed && (
                  <div
                    className={`space-y-3 ${sectionCounts.breed > 0 ? "filter-section-active" : ""}`}
                    role="region"
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
                          standardizedBreedFilter === "Any breed"
                            ? "any"
                            : standardizedBreedFilter
                        }
                        onChange={(e) =>
                          setStandardizedBreedFilter(
                            e.target.value === "any"
                              ? "Any breed"
                              : e.target.value,
                          )
                        }
                      >
                        <option value="any">Any breed</option>
                        {standardizedBreeds
                          .filter((breed) => breed !== "Any breed")
                          .map((breed) => (
                            <option key={breed} value={breed}>
                              {breed}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Breed Input - Conditional rendering */}
                    {useSimpleBreedDropdown ? (
                      <Select
                        value={
                          standardizedBreedFilter === "Any breed"
                            ? "Any breed"
                            : standardizedBreedFilter
                        }
                        onValueChange={(value) =>
                          setStandardizedBreedFilter(value)
                        }
                      >
                        <SelectTrigger className="select-focus enhanced-hover enhanced-focus-select focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition-colors duration-200 h-12">
                          <SelectValue placeholder="Select breed" />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          <SelectItem value="Any breed">Any breed</SelectItem>
                          {standardizedBreeds
                            .filter((breed) => breed !== "Any breed")
                            .map((breed) => (
                              <SelectItem key={breed} value={breed}>
                                {breed}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <SearchTypeahead
                        data-testid="breed-search-input"
                        placeholder="Search breeds..."
                        value={
                          standardizedBreedFilter === "Any breed"
                            ? ""
                            : standardizedBreedFilter
                        }
                        onValueChange={handleBreedValueChange}
                        onSuggestionSelect={(breed) => {
                          // Use parent-provided handler if available, otherwise fallback to direct setter
                          if (setStandardizedBreedFilter) {
                            setStandardizedBreedFilter(breed);
                          }
                        }}
                        onSearch={(breed) => {
                          // Use parent-provided handler if available, otherwise fallback to direct setter
                          if (handleBreedSearch) {
                            handleBreedSearch(breed);
                          } else {
                            setStandardizedBreedFilter(breed);
                          }
                        }}
                        onClear={handleBreedClear}
                        fetchSuggestions={getBreedSuggestions}
                        debounceMs={300}
                        maxSuggestions={8}
                        showHistory={true}
                        showClearButton={true}
                        showDidYouMean={true}
                        historyKey="mobile-breed-search-history"
                        size="lg"
                        className="w-full"
                        inputClassName="enhanced-hover enhanced-focus-input mobile-form-input focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition-colors duration-200 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800"
                        skipLocalFuzzySearch={true}
                      />
                    )}
                  </div>
                )}

                {/* 6. Organization Filter - Direct select like other filters */}
                {filterConfig.showOrganization && (
                  <div
                    className={`space-y-3 ${sectionCounts.organization > 0 ? "filter-section-active" : ""}`}
                    role="region"
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
                        value={organizationFilter || "any"}
                        onChange={(e) => setOrganizationFilter(e.target.value)}
                      >
                        {organizations.map((org) => (
                          <option
                            key={org.id ?? "any"}
                            value={org.id != null ? org.id.toString() : "any"}
                          >
                            {org.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <Select
                      value={organizationFilter || "any"}
                      onValueChange={setOrganizationFilter}
                    >
                      <SelectTrigger
                        className="select-focus enhanced-hover enhanced-focus-select focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition-colors duration-200"
                        style={{ minHeight: "48px" }}
                      >
                        <SelectValue>
                          {organizationFilter === "any" || !organizationFilter
                            ? "Any Organization"
                            : organizations.find(
                                (org) =>
                                  org.id?.toString() === organizationFilter,
                              )?.name || "Any Organization"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem
                            key={org.id ?? "any"}
                            value={org.id != null ? org.id.toString() : "any"}
                          >
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 7. Search Bar - MOVED TO BOTTOM */}
                {filterConfig.showSearch && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="mb-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                        Search Dogs by Name
                      </h4>
                    </div>
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
                      size="lg"
                      className="w-full"
                      inputClassName="enhanced-hover enhanced-focus-input mobile-form-input focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition-colors duration-200 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer with Clear All Button */}
            {activeFilterCount > 0 && (
              <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                <button
                  data-testid="clear-all-filters"
                  className="w-full text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/30 font-medium py-3 px-4 rounded-lg transition-colors duration-200 interactive-enhanced enhanced-focus-button focus:ring-2 focus:ring-orange-600"
                  onClick={resetFilters}
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}