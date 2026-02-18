"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import type { MobileFilterDrawerProps, FilterConfig } from "@/types/filterComponents";

interface MobileFilterSectionProps {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  count?: number;
}

function MobileFilterSection({
  id,
  title,
  defaultOpen = false,
  children,
  count = 0,
}: MobileFilterSectionProps) {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  const handleToggle = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    setIsOpen((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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

const DEFAULT_FILTER_CONFIG: FilterConfig = {
  showAge: true,
  showBreed: true,
  showSize: true,
  showSex: true,
  showShipsTo: true,
  showOrganization: true,
  showSearch: true,
};

export default function MobileFilterDrawer({
  isOpen = false,
  onClose,

  searchQuery,
  handleSearchChange,
  clearSearch,

  organizationFilter,
  setOrganizationFilter,
  organizations,

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

  availableCountryFilter,
  setAvailableCountryFilter,
  availableCountries,

  resetFilters,

  filterCounts,

  filterConfig = DEFAULT_FILTER_CONFIG,

  useSimpleBreedDropdown = false,

  totalDogsCount,
}: MobileFilterDrawerProps) {
  const {
    dynamicSizeOptions,
    dynamicAgeOptions,
    dynamicSexOptions,
    sectionCounts,
  } = useFilterOptions({
    filterValues: {
      searchQuery,
      organizationFilter,
      standardizedBreedFilter,
      sexFilter,
      sizeFilter,
      ageCategoryFilter,
      availableCountryFilter,
    },
    filterCounts,
    sizeOptions,
    ageOptions,
    sexOptions,
  });

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;

      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
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
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, onClose]);

  const handleBreedClear = useCallback(() => {
    if (handleBreedClearFromParent) {
      handleBreedClearFromParent();
    } else {
      setStandardizedBreedFilter?.(FILTER_DEFAULTS.BREED);
    }
  }, [handleBreedClearFromParent, setStandardizedBreedFilter]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const activeFilterCount = useMemo((): number => {
    let count = 0;
    if (filterConfig.showSearch && searchQuery && searchQuery.trim() !== "") count++;
    if (filterConfig.showOrganization) count += sectionCounts.organization;
    if (filterConfig.showBreed) count += sectionCounts.breed;
    if (filterConfig.showSex) count += sectionCounts.sex;
    if (filterConfig.showSize) count += sectionCounts.size;
    if (filterConfig.showAge) count += sectionCounts.age;
    if (filterConfig.showShipsTo) count += sectionCounts.shipsToCountry;
    return count;
  }, [filterConfig, searchQuery, sectionCounts]);

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
            className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[60] lg:hidden"
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
            className="fixed inset-0 bg-white dark:bg-gray-900 z-[60] overflow-hidden lg:hidden will-change-transform gpu-accelerated flex flex-col"
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

              {/* Action Buttons in Header */}
              <div className="px-4 pb-3 space-y-2">
                <Button
                  onClick={onClose}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3"
                >
                  Apply Filters{" "}
                  {totalDogsCount > 0 && `(${totalDogsCount} dogs)`}
                </Button>
                {activeFilterCount > 0 && (
                  <Button
                    onClick={() => {
                      resetFilters();
                      onClose();
                    }}
                    variant="outline"
                    className="w-full border-orange-600 text-orange-600 hover:bg-orange-50 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-950/30 font-medium py-3"
                  >
                    Reset All Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Scrollable Content */}
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden"
              style={{
                paddingBottom: "env(safe-area-inset-bottom, 20px)",
                WebkitOverflowScrolling: "touch",
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
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
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
                        value={sizeFilter === FILTER_DEFAULTS.SIZE ? "any" : sizeFilter}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setSizeFilter(
                            e.target.value === "any"
                              ? FILTER_DEFAULTS.SIZE
                              : e.target.value,
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
                          ageCategoryFilter === FILTER_DEFAULTS.AGE
                            ? "any"
                            : ageCategoryFilter
                        }
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setAgeCategoryFilter(
                            e.target.value === "any"
                              ? FILTER_DEFAULTS.AGE
                              : e.target.value,
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
                          standardizedBreedFilter === FILTER_DEFAULTS.BREED
                            ? "any"
                            : standardizedBreedFilter
                        }
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          setStandardizedBreedFilter?.(
                            e.target.value === "any"
                              ? FILTER_DEFAULTS.BREED
                              : e.target.value,
                          )
                        }
                      >
                        <option value="any">{FILTER_DEFAULTS.BREED}</option>
                        {standardizedBreeds
                          .filter((breed) => breed !== FILTER_DEFAULTS.BREED)
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
                          standardizedBreedFilter === FILTER_DEFAULTS.BREED
                            ? FILTER_DEFAULTS.BREED
                            : standardizedBreedFilter
                        }
                        onValueChange={(value: string) =>
                          setStandardizedBreedFilter?.(value)
                        }
                      >
                        <SelectTrigger className="select-focus enhanced-hover enhanced-focus-select focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition-colors duration-200 h-12">
                          <SelectValue placeholder="Select breed" />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          <SelectItem value={FILTER_DEFAULTS.BREED}>{FILTER_DEFAULTS.BREED}</SelectItem>
                          {standardizedBreeds
                            .filter((breed) => breed !== FILTER_DEFAULTS.BREED)
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
                      <SelectTrigger
                        className="select-focus enhanced-hover enhanced-focus-select focus:ring-2 focus:ring-orange-600 focus:border-orange-600 transition-colors duration-200"
                        style={{ minHeight: "48px" }}
                      >
                        <SelectValue>
                          {organizationFilter === FILTER_DEFAULTS.ORGANIZATION || !organizationFilter
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
                            key={org.id ?? FILTER_DEFAULTS.ORGANIZATION}
                            value={org.id != null ? org.id.toString() : FILTER_DEFAULTS.ORGANIZATION}
                          >
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 7. Search Bar */}
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
                  onClick={() => {
                    resetFilters();
                    onClose();
                  }}
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
