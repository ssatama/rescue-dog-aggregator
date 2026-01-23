"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "../ui/Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/**
 * Mobile-optimized bottom sheet filter component with native touch gestures
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the bottom sheet is open
 * @param {Function} props.onClose - Callback to close the bottom sheet
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFiltersChange - Callback when filters change
 * @param {Array} props.availableBreeds - Available breed options
 * @param {Array} props.organizations - Available organization options
 * @param {number} props.totalCount - Total number of filtered results
 * @param {boolean} props.hasActiveFilters - Whether any filters are active
 * @param {Function} props.onClearAll - Callback to clear all filters
 * @param {boolean} props.isOrganizationPage - Whether this is an organization page (limits filters)
 */
export default function MobileFilterBottomSheet({
  isOpen = false,
  onClose,
  filters = {},
  onFiltersChange,
  availableBreeds = [],
  organizations = [],
  totalCount = 0,
  hasActiveFilters = false,
  onClearAll,
  isOrganizationPage = false,
}) {
  const [localBreedInput, setLocalBreedInput] = useState(filters?.breed || "");
  const [isVisible, setIsVisible] = useState(false);

  // Filter options
  const ageOptions = ["All", "Puppy", "Young", "Adult", "Senior"];
  const sexOptions = ["Any", "Male", "Female"];
  const sizeOptions = [
    "Any size",
    "Tiny",
    "Small",
    "Medium",
    "Large",
    "Extra Large",
  ];
  const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "oldest", label: "Oldest First" },
    { value: "name", label: "Name A-Z" },
    { value: "name-desc", label: "Name Z-A" },
  ];

  const handleFilterChange = useCallback(
    (filterType, value) => {
      if (!onFiltersChange) return;

      const newFilters = {
        ...filters,
        [filterType]: value,
      };

      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange],
  );

  // Handle opening/closing with body scroll lock
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      // Delay hiding to allow exit animation
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Sync local breed input with external filter changes
  useEffect(() => {
    if (filters?.breed !== localBreedInput) {
      setLocalBreedInput(filters?.breed || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only sync when external filter changes, not on local input
  }, [filters?.breed]);

  // Debounced breed input handling
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localBreedInput !== filters?.breed) {
        handleFilterChange("breed", localBreedInput);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localBreedInput, filters?.breed, handleFilterChange]);

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

  const handleBackdropClick = useCallback(
    (e) => {
      if (e.target === e.currentTarget) {
        onClose?.();
      }
    },
    [onClose],
  );

  // Filter button component for consistency
  const FilterButton = ({
    value,
    currentValue,
    onSelect,
    children,
    testId,
  }) => {
    const isActive = currentValue === value;

    return (
      <Button
        variant={isActive ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect(value)}
        data-testid={testId}
        className={`
          min-h-[48px] px-4 py-3 animate-button-hover focus-ring transition-colors duration-200
          ${
            isActive
              ? "bg-orange-600 dark:bg-orange-600 hover:bg-orange-700 dark:hover:bg-orange-700 text-white border-orange-600 dark:border-orange-600 focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-400 focus:ring-offset-2"
              : "bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-orange-600 dark:focus:ring-orange-400 focus:ring-offset-2"
          }
        `}
        aria-pressed={isActive}
      >
        {children}
      </Button>
    );
  };

  if (!isVisible) {
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
            className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 md:hidden"
            data-testid="filter-backdrop"
            onClick={handleBackdropClick}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
            }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl z-50 max-h-[85vh] overflow-hidden md:hidden will-change-transform gpu-accelerated"
            data-testid="mobile-filter-sheet"
            role="dialog"
            aria-label="Filter and sort options"
            aria-modal="true"
          >
            {/* Handle Bar */}
            <div className="flex justify-center py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Icon name="filter" size="default" color="active" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Filter & Sort
                </h2>
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

            {/* Results Counter */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {totalCount} dogs found
                </span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearAll}
                    data-testid="clear-all-button"
                    className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                  >
                    <Icon name="x" size="small" className="mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Content */}
            <div
              className="overflow-y-auto"
              style={{ maxHeight: "calc(85vh - 160px)" }}
            >
              <div className="p-4 space-y-6">
                {/* Age Filter */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon name="calendar" size="small" color="default" />
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Age
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {ageOptions.map((age) => (
                      <FilterButton
                        key={age}
                        value={age}
                        currentValue={filters?.age}
                        onSelect={(value) => handleFilterChange("age", value)}
                        testId={`age-filter-${age}`}
                      >
                        {age}
                      </FilterButton>
                    ))}
                  </div>
                </div>

                {/* Breed Search */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon name="paw-print" size="small" color="default" />
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Breed
                    </h3>
                  </div>
                  <div className="relative">
                    <Icon
                      name="search"
                      size="small"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500"
                    />
                    <Input
                      type="text"
                      placeholder="Search for specific breed..."
                      value={localBreedInput}
                      onChange={(e) => setLocalBreedInput(e.target.value)}
                      data-testid="breed-search-input"
                      aria-label="Search for specific breed"
                      className="pl-12 min-h-[48px] border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-orange-600 dark:focus:border-orange-400 focus:ring-orange-600 focus:ring-2 transition-colors duration-200"
                    />
                  </div>
                  {localBreedInput && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Search results will appear as you type
                    </div>
                  )}
                </div>

                {/* Sex Filter - Only show on main dogs page */}
                {!isOrganizationPage && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon name="tag" size="small" color="default" />
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Sex
                      </h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {sexOptions.map((sex) => (
                        <FilterButton
                          key={sex}
                          value={sex}
                          currentValue={filters?.sex}
                          onSelect={(value) => handleFilterChange("sex", value)}
                          testId={`sex-filter-${sex}`}
                        >
                          {sex}
                        </FilterButton>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size Filter - Only show on main dogs page */}
                {!isOrganizationPage && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon name="ruler" size="small" color="default" />
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Size
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {sizeOptions.map((size) => (
                        <FilterButton
                          key={size}
                          value={size}
                          currentValue={filters?.size}
                          onSelect={(value) =>
                            handleFilterChange("size", value)
                          }
                          testId={`size-filter-${size}`}
                        >
                          {size}
                        </FilterButton>
                      ))}
                    </div>
                  </div>
                )}

                {/* Organization Filter - Only show on main dogs page */}
                {!isOrganizationPage && organizations.length > 1 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon name="home" size="small" color="default" />
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Organization
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {organizations.map((org) => (
                        <FilterButton
                          key={org.id ?? "any"}
                          value={org.id?.toString() ?? "any"}
                          currentValue={filters?.organization}
                          onSelect={(value) =>
                            handleFilterChange("organization", value)
                          }
                          testId={`organization-filter-${org.id ?? "any"}`}
                        >
                          {org.name}
                        </FilterButton>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sort Filter */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Icon name="sort-desc" size="small" color="default" />
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sort By
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {sortOptions.map((sort) => (
                      <FilterButton
                        key={sort.value}
                        value={sort.value}
                        currentValue={filters?.sort}
                        onSelect={(value) => handleFilterChange("sort", value)}
                        testId={`sort-filter-${sort.value}`}
                      >
                        {sort.label}
                      </FilterButton>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Apply Button */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
              <Button
                onClick={onClose}
                className="w-full min-h-[48px] bg-orange-600 dark:bg-orange-600 hover:bg-orange-700 dark:hover:bg-orange-700 text-white font-medium"
                size="lg"
              >
                Apply Filters ({totalCount} dogs)
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}