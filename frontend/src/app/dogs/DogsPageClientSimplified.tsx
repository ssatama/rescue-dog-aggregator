"use client";

import React, {
  useState,
  useCallback,
  useMemo,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import Layout from "../../components/layout/Layout";
import DogCardSkeletonOptimized from "../../components/ui/DogCardSkeletonOptimized";
import DogsPageViewportWrapper from "../../components/dogs/DogsPageViewportWrapper";
import EmptyState from "../../components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Filter, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import { BreadcrumbSchema } from "../../components/seo";
import useScrollRestoration from "../../hooks/dogs/useScrollRestoration";
import useDogsFilters from "../../hooks/dogs/useDogsFilters";
import useDogsPagination from "../../hooks/dogs/useDogsPagination";
import type {
  DogsPageClientSimplifiedProps,
  Filters,
} from "../../types/dogsPage";

// Lazy load filter components for better initial load
const DesktopFilters = dynamic(
  () => import("../../components/filters/DesktopFilters"),
  {
    loading: () => <div className="w-64 h-96 bg-muted animate-pulse rounded" />,
    ssr: false,
  },
);

const MobileFilterDrawer = dynamic(
  () => import("../../components/filters/MobileFilterDrawer"),
  {
    loading: () => null,
    ssr: false,
  },
);

export default function DogsPageClientSimplified({
  initialDogs = [],
  metadata = {},
  initialParams = {},
  hideHero = false,
  hideBreadcrumbs = false,
  wrapWithLayout = true,
}: DogsPageClientSimplifiedProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const rawSearchParams = useSearchParams();
  const searchParams = useMemo(
    () => rawSearchParams ?? new URLSearchParams(),
    [rawSearchParams],
  );

  const { scrollPositionRef, saveScrollPosition } = useScrollRestoration({ searchParams, pathname });

  const filterState = useDogsFilters({
    metadata,
    initialParams,
    searchParams,
    pathname,
    scrollPositionRef: scrollPositionRef,
  });

  const pagination = useDogsPagination({
    initialDogs,
    initialParams,
    filters: filterState.filters,
    buildAPIParams: filterState.buildAPIParams,
    scrollPositionRef: scrollPositionRef,
    searchParams,
    pathname,
  });

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleFilterChange = useCallback(
    (filterKey: string | Record<string, string>, value?: string) => {
      const newFilters: Filters = typeof filterKey === "object"
        ? { ...filterState.filters, ...filterKey }
        : { ...filterState.filters, [filterKey]: value };

      filterState.updateURL(newFilters, 1, false);
      pagination.resetForNewFilters(newFilters, scrollPositionRef);
    },
    [filterState, pagination, scrollPositionRef],
  );

  const handleBreedChange = useCallback(
    (breed: string) => {
      handleFilterChange("breedFilter", breed);
    },
    [handleFilterChange],
  );

  const handleBreedClear = useCallback(() => {
    handleFilterChange("breedFilter", "Any breed");
  }, [handleFilterChange]);

  const handleResetFilters = useCallback(() => {
    const defaultFilters: Filters = {
      searchQuery: "",
      sizeFilter: "Any size",
      ageFilter: "Any age",
      sexFilter: "Any",
      organizationFilter: "any",
      breedFilter: "Any breed",
      breedGroupFilter: "Any group",
      locationCountryFilter: "Any country",
      availableCountryFilter: "Any country",
      availableRegionFilter: "Any region",
    };

    filterState.updateURL?.cancel?.();
    saveScrollPosition?.cancel?.();
    router.replace("/dogs", { scroll: false });
    scrollPositionRef.current = 0;
    pagination.resetAll(defaultFilters);
  }, [router, filterState, saveScrollPosition, scrollPositionRef, pagination]);

  const breadcrumbItems = [{ name: "Home", url: "/" }, { name: "Find Dogs" }];

  const content = (
    <>
      {!hideBreadcrumbs && <BreadcrumbSchema items={breadcrumbItems} />}

      {/* Mobile Sticky Header with Breadcrumb and Filter Button */}
      {!hideHero && (
        <div className="lg:hidden sticky top-[80px] z-20 bg-background dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          {/* Add spacing at the top */}
          <div className="h-2 bg-background dark:bg-gray-900"></div>

          {!hideBreadcrumbs && (
            <div className="flex justify-between items-center px-4 py-3">
              {/* Breadcrumb Navigation (left side) */}
              <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span
                  className="hover:text-gray-900 dark:hover:text-white cursor-pointer transition-colors"
                  onClick={() => router.push("/")}
                >
                  Home
                </span>
                <span>/</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  Find Dogs
                </span>
              </nav>
            </div>
          )}

          {/* Mobile Page Title with Filter Button */}
          <div className="px-4 pb-3 bg-background dark:bg-gray-900 flex justify-between items-center">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Find Your New Best Friend
            </h1>

            {/* Enhanced Filter Button - inline with title */}
            <Button
              onClick={() => setIsSheetOpen(true)}
              variant="default"
              size="lg"
              className="rounded-full shadow-lg bg-orange-500 hover:bg-orange-600 text-white p-3 relative"
              aria-label="Open filters"
            >
              <Filter className="w-6 h-6" />
              {filterState.activeFilterCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold min-w-[20px] h-5"
                >
                  {filterState.activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Filter Button (when hero is hidden) */}
      {hideHero && (
        <div className="lg:hidden sticky top-[80px] z-20 bg-background dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-end">
          <Button
            onClick={() => setIsSheetOpen(true)}
            variant="default"
            size="lg"
            className="rounded-full shadow-lg bg-orange-500 hover:bg-orange-600 text-white p-3 relative"
            aria-label="Open filters"
          >
            <Filter className="w-6 h-6" />
            {filterState.activeFilterCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold min-w-[20px] h-5"
              >
                {filterState.activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      <div
        data-testid="dogs-page-container"
        className="container mx-auto px-4 py-6 lg:py-8"
      >
        {/* Desktop Breadcrumbs - Hidden on Mobile */}
        {!hideBreadcrumbs && (
          <div className="hidden lg:block">
            <Breadcrumbs items={breadcrumbItems} />
          </div>
        )}

        {/* Desktop Page header */}
        {!hideHero && (
          <div className="mb-6 hidden lg:block text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Find Your New Best Friend
            </h1>
            <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
              Browse adoptable dogs from trusted rescue organizations
            </p>
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop filters sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <DesktopFilters
              // Search
              searchQuery={filterState.filters.searchQuery}
              handleSearchChange={(value: string) =>
                handleFilterChange("searchQuery", value)
              }
              clearSearch={() => handleFilterChange("searchQuery", "")}
              // Organization
              organizationFilter={filterState.filters.organizationFilter}
              setOrganizationFilter={(value: string) =>
                handleFilterChange("organizationFilter", value)
              }
              organizations={
                metadata?.organizations || [
                  { id: null, name: "Any organization" },
                ]
              }
              // Breed (using actual filter state like Name filter)
              standardizedBreedFilter={filterState.filters.breedFilter}
              setStandardizedBreedFilter={handleBreedChange}
              handleBreedSearch={handleBreedChange}
              handleBreedClear={handleBreedClear}
              handleBreedValueChange={handleBreedChange}
              standardizedBreeds={metadata?.standardizedBreeds || ["Any breed"]}
              // Pet Details
              sexFilter={filterState.filters.sexFilter}
              setSexFilter={(value: string) => handleFilterChange("sexFilter", value)}
              sexOptions={["Any", "Male", "Female"]}
              sizeFilter={filterState.filters.sizeFilter}
              setSizeFilter={(value: string) => handleFilterChange("sizeFilter", value)}
              sizeOptions={[
                "Any size",
                "Tiny",
                "Small",
                "Medium",
                "Large",
                "Extra Large",
              ]}
              ageCategoryFilter={filterState.filters.ageFilter}
              setAgeCategoryFilter={(value: string) =>
                handleFilterChange("ageFilter", value)
              }
              ageOptions={["Any age", "Puppy", "Young", "Adult", "Senior"]}
              // Location
              locationCountryFilter={filterState.filters.locationCountryFilter}
              setLocationCountryFilter={(value: string) =>
                handleFilterChange("locationCountryFilter", value)
              }
              locationCountries={metadata?.locationCountries || ["Any country"]}
              availableCountryFilter={filterState.filters.availableCountryFilter}
              setAvailableCountryFilter={(value: string) =>
                handleFilterChange("availableCountryFilter", value)
              }
              availableCountries={
                metadata?.availableCountries || ["Any country"]
              }
              availableRegionFilter={filterState.filters.availableRegionFilter}
              setAvailableRegionFilter={(value: string) =>
                handleFilterChange("availableRegionFilter", value)
              }
              availableRegions={filterState.availableRegions}
              // Filter management
              resetFilters={handleResetFilters}
              // Dynamic filter counts
              filterCounts={pagination.filterCounts}
            />
          </aside>

          {/* Main content area */}
          <div className="flex-1 min-w-0">
            {pagination.error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{pagination.error}</AlertDescription>
              </Alert>
            )}

            {/* Dogs Grid */}
            <div
              className="relative flex-1 pb-8 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-hidden"
              id="dogs-catalog"
            >
              {/* Loading state */}
              {pagination.loading && !pagination.dogs.length && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <DogCardSkeletonOptimized key={i} />
                  ))}
                </div>
              )}

              {/* Dogs list with filter transition overlay */}
              {pagination.dogs.length > 0 && (
                <div className="relative">
                  {pagination.isFilterTransition && (
                    <div className="absolute inset-0 bg-background/60 dark:bg-gray-900/60 z-10 flex items-start justify-center pt-20 backdrop-blur-[1px]">
                      <div className="flex items-center gap-2 bg-background dark:bg-gray-800 px-4 py-2 rounded-full shadow-lg">
                        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                        <span className="text-sm text-muted-foreground">Updating results...</span>
                      </div>
                    </div>
                  )}
                  <DogsPageViewportWrapper
                    dogs={pagination.dogs}
                    loading={pagination.loading}
                    loadingMore={pagination.loadingMore}
                    onOpenFilter={() => setIsSheetOpen(true)}
                    onResetFilters={handleResetFilters}
                    onLoadMore={pagination.loadMoreDogs}
                    hasMore={pagination.hasMore}
                    filters={filterState.filters}
                    onFilterChange={handleFilterChange}
                  />
                </div>
              )}

              {/* Empty state */}
              {!pagination.loading && pagination.dogs.length === 0 && (
                <EmptyState
                  variant="noDogsFiltered"
                  onClearFilters={handleResetFilters}
                />
              )}

              {/* Load more button - Hidden on mobile since it's handled in PremiumMobileCatalog */}
              <div className="hidden lg:block">
                {pagination.hasMore && !pagination.loading && pagination.dogs.length > 0 && (
                  <div className="flex justify-center mt-8">
                    <Button
                      onClick={pagination.loadMoreDogs}
                      disabled={pagination.loadingMore}
                      variant="outline"
                      size="lg"
                    >
                      {pagination.loadingMore ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load More Dogs"
                      )}
                    </Button>
                  </div>
                )}

                {/* Loading indicator for load more */}
                {pagination.loadingMore && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      <MobileFilterDrawer
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        // Search
        searchQuery={filterState.filters.searchQuery}
        handleSearchChange={(value: string) => handleFilterChange("searchQuery", value)}
        clearSearch={() => handleFilterChange("searchQuery", "")}
        // Organization
        organizationFilter={filterState.filters.organizationFilter}
        setOrganizationFilter={(value: string) =>
          handleFilterChange("organizationFilter", value)
        }
        organizations={
          metadata?.organizations || [{ id: null, name: "Any organization" }]
        }
        // Breed (using actual filter state like Name filter)
        standardizedBreedFilter={filterState.filters.breedFilter}
        setStandardizedBreedFilter={handleBreedChange}
        handleBreedSearch={handleBreedChange}
        handleBreedClear={handleBreedClear}
        handleBreedValueChange={handleBreedChange}
        standardizedBreeds={metadata?.standardizedBreeds || ["Any breed"]}
        // Pet Details
        sexFilter={filterState.filters.sexFilter}
        setSexFilter={(value: string) => handleFilterChange("sexFilter", value)}
        sexOptions={["Any", "Male", "Female"]}
        sizeFilter={filterState.filters.sizeFilter}
        setSizeFilter={(value: string) => handleFilterChange("sizeFilter", value)}
        sizeOptions={[
          "Any size",
          "Tiny",
          "Small",
          "Medium",
          "Large",
          "Extra Large",
        ]}
        ageCategoryFilter={filterState.filters.ageFilter}
        setAgeCategoryFilter={(value: string) => handleFilterChange("ageFilter", value)}
        ageOptions={["Any age", "Puppy", "Young", "Adult", "Senior"]}
        // Location
        availableCountryFilter={filterState.filters.availableCountryFilter}
        setAvailableCountryFilter={(value: string) =>
          handleFilterChange("availableCountryFilter", value)
        }
        availableCountries={metadata?.availableCountries || ["Any country"]}
        // Filter management
        resetFilters={handleResetFilters}
        // Dynamic filter counts
        filterCounts={pagination.filterCounts}
        // Currently loaded dogs count for mobile "Apply Filters" button
        totalDogsCount={pagination.dogs.length}
      />
    </>
  );

  return wrapWithLayout ? <Layout>{content}</Layout> : content;
}
