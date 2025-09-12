"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";

export default function BreedFilterBar({
  breedData,
  filters,
  filterCounts,
  onFilterChange,
  onClearFilters,
  onOpenMobileFilters,
  activeFilterCount,
}) {
  // Default values for each filter type to avoid constructing invalid "Any ..." strings
  const defaultValues = {
    ageFilter: "Any age",
    sizeFilter: "Any size", 
    sexFilter: "Any"
  };

  const quickFilters = [
    // Sex filters first
    {
      key: "sexFilter",
      label: "Sex",
      options: [
        { value: "Male", label: "Male", count: filterCounts?.sex_options?.find(opt => opt.value === "Male")?.count },
        { value: "Female", label: "Female", count: filterCounts?.sex_options?.find(opt => opt.value === "Female")?.count },
      ].filter(opt => opt.count == null || opt.count > 0)
    },
    // Size filters second (small to large)
    {
      key: "sizeFilter",
      label: "Size",
      options: [
        { value: "Small", label: "Small", count: filterCounts?.size_options?.find(opt => opt.value === "Small")?.count },
        { value: "Medium", label: "Medium", count: filterCounts?.size_options?.find(opt => opt.value === "Medium")?.count },
        { value: "Large", label: "Large", count: filterCounts?.size_options?.find(opt => opt.value === "Large")?.count },
      ].filter(opt => opt.count == null || opt.count > 0)
    },
    // Age filters third (young to old)
    {
      key: "ageFilter",
      label: "Age",
      options: [
        { value: "Puppy", label: "Puppies", count: filterCounts?.age_options?.find(opt => opt.value === "Puppy")?.count },
        { value: "Young", label: "Young", count: filterCounts?.age_options?.find(opt => opt.value === "Young")?.count },
        { value: "Adult", label: "Adults", count: filterCounts?.age_options?.find(opt => opt.value === "Adult")?.count },
        { value: "Senior", label: "Seniors", count: filterCounts?.age_options?.find(opt => opt.value === "Senior")?.count },
      ].filter(opt => opt.count == null || opt.count > 0)
    }
  ];

  // Calculate total dogs count
  const totalDogsCount = filterCounts?.total_count || 0;
  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="sticky top-20 z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 py-4">
      <div className="max-w-6xl mx-auto px-4">
        {/* Mobile filter button */}
        <div className="lg:hidden mb-4">
          <Button
            onClick={onOpenMobileFilters}
            variant="outline"
            className="w-full"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Quick filter chips - hidden on mobile */}
        <div className="hidden md:flex flex-wrap gap-2 items-center">
          {/* All button - highlighted when no filters are active */}
          <Button
            variant={!hasActiveFilters ? "default" : "outline"}
            size="sm"
            onClick={onClearFilters}
            className={`transition-all duration-200 ${
              !hasActiveFilters
                ? "bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-600 dark:hover:bg-orange-700" 
                : "hover:bg-orange-50 hover:border-orange-200 dark:hover:bg-orange-950/50 dark:hover:border-orange-800"
            }`}
          >
            All {totalDogsCount > 0 && `${totalDogsCount}`}
          </Button>
          
          {quickFilters.map(filterGroup => 
            filterGroup.options.map(option => {
              const isActive = filters[filterGroup.key] === option.value;
              return (
                <Button
                  key={`${filterGroup.key}-${option.value}`}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => onFilterChange(
                    filterGroup.key, 
                    isActive ? defaultValues[filterGroup.key] : option.value
                  )}
                  className={`transition-all duration-200 ${
                    isActive 
                      ? "bg-orange-600 hover:bg-orange-700 text-white dark:bg-orange-600 dark:hover:bg-orange-700" 
                      : "hover:bg-orange-50 hover:border-orange-200 dark:hover:bg-orange-950/50 dark:hover:border-orange-800"
                  }`}
                >
                  {option.label}
                  {option.count && (
                    <span className="ml-1 text-xs opacity-75">
                      ({option.count})
                    </span>
                  )}
                </Button>
              );
            })
          )}
          
          {/* Clear filters button - only show when filters are active */}
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-950/50"
            >
              <X className="mr-1 h-3 w-3" />
              Clear ({activeFilterCount})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}