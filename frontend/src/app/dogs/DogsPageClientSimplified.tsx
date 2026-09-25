"use client";

import React, {
  useState,
  useCallback,
  useMemo,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import DogCardSkeletonOptimized from "../../components/ui/DogCardSkeletonOptimized";
import DogsPageViewportWrapper from "../../components/dogs/DogsPageViewportWrapper";
import EmptyState from "../../components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Filter, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import GlobalSearch from "../../components/search/GlobalSearch";
import OnlyAdoptableSwitch from "../../components/location/OnlyAdoptableSwitch";
import CatalogToolbar from "../../components/dogs/catalog/CatalogToolbar";
import useScrollRestoration from "../../hooks/dogs/useScrollRestoration";
import useDogsFilters from "../../hooks/dogs/useDogsFilters";
import useDogsPagination from "../../hooks/dogs/useDogsPagination";
import { trackFiltersApplied } from "@/lib/analytics";
import type {
  DogsPageClientSimplifiedProps,
  Filters,
} from "../../types/dogsPage";

import type { FilterConfig } from "../../types/filterComponents";
import { AGE_OPTIONS, FILTER_DEFAULTS, SIZE_OPTIONS } from "@/constants/filters";

// The field at the top of the page edits the text search, so the drawer leaves it out
const CATALOG_DRAWER_CONFIG: FilterConfig = {
  showAge: true,
  showBreed: true,
  showSize: true,
  showSex: true,
  showShipsTo: true,
  showOrganization: true,
  showSearch: false,
};

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

  // A page that fixes the age (/dogs/puppies) promises it, so dogs without a
  // recorded age stay off it; in the catalog they appear under every age
  const ageIsFixed = Boolean(initialParams?.age_category);
  const { buildAPIParams: buildFilterParams } = filterState;
  const buildAPIParams = useCallback(
    (filters: Filters) => {
      const params = buildFilterParams(filters);
      return ageIsFixed && params.age_category ? { ...params, age_known: "true" } : params;
    },
    [buildFilterParams, ageIsFixed],
  );

  const pagination = useDogsPagination({
    initialDogs,
    initialParams,
    filters: filterState.filters,
    buildAPIParams,
    scrollPositionRef: scrollPositionRef,
    searchParams,
    pathname,
  });

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const applyFilters = useCallback(
    (changes: Record<string, string | undefined>) => {
      // A region belongs to one country, so a new country (or none) drops it
      const regionReset =
        "availableCountryFilter" in changes && !("availableRegionFilter" in changes)
          ? { availableRegionFilter: FILTER_DEFAULTS.REGION }
          : {};
      const newFilters: Filters = { ...filterState.filters, ...changes, ...regionReset };

      filterState.updateURL(newFilters, 1, false);
      pagination.resetForNewFilters(newFilters, scrollPositionRef);
    },
    [filterState, pagination, scrollPositionRef],
  );

  const handleFilterChange = useCallback(
    (filterKey: string | Record<string, string>, value?: string) => {
      const changes =
        typeof filterKey === "object" ? filterKey : { [filterKey]: value };
      applyFilters(changes);
      trackFiltersApplied(changes, "catalog");
    },
    [applyFilters],
  );

  // A breed picked from the list or a suggestion is tracked; text typed into
  // the breed box is free text, so it filters without an analytics event.
  const handleBreedChange = useCallback(
    (breed: string) => {
      handleFilterChange("breedFilter", breed);
    },
    [handleFilterChange],
  );

  const handleBreedTyped = useCallback(
    (breed: string) => {
      applyFilters({ breedFilter: breed });
    },
    [applyFilters],
  );

  const handleBreedClear = useCallback(() => {
    handleFilterChange("breedFilter", "Any breed");
  }, [handleFilterChange]);

  // Sort is not a filter: it fires sort_changed (in SortMenu), not filter_applied
  const setSort = useCallback((sort: string) => applyFilters({ sortFilter: sort }), [applyFilters]);

  // Filters the landing page itself sets (age on /dogs/puppies) cannot be removed there
  const pageFixedFilters = useMemo(
    () =>
      [
        initialParams?.age_category && "ageFilter",
        initialParams?.location_country && "locationCountryFilter",
        initialParams?.available_country && "availableCountryFilter",
      ].filter(Boolean) as ("ageFilter" | "locationCountryFilter" | "availableCountryFilter")[],
    [initialParams?.age_category, initialParams?.location_country, initialParams?.available_country],
  );

  const setAvailableCountry = useCallback(
    (value: string) => handleFilterChange("availableCountryFilter", value),
    [handleFilterChange],
  );

  const handleResetFilters = useCallback(() => {
    const defaultFilters: Filters = {
      searchQuery: "",
      sizeFilter: FILTER_DEFAULTS.SIZE,
      // A landing page's own filter (age on /dogs/puppies) stays
      ageFilter: initialParams?.age_category || FILTER_DEFAULTS.AGE,
      sexFilter: FILTER_DEFAULTS.SEX,
      organizationFilter: FILTER_DEFAULTS.ORGANIZATION,
      breedFilter: FILTER_DEFAULTS.BREED,
      breedGroupFilter: FILTER_DEFAULTS.GROUP,
      locationCountryFilter: initialParams?.location_country || FILTER_DEFAULTS.COUNTRY,
      availableCountryFilter: initialParams?.available_country || FILTER_DEFAULTS.COUNTRY,
      availableRegionFilter: FILTER_DEFAULTS.REGION,
      // Clearing filters keeps the chosen order
      sortFilter: filterState.filters.sortFilter,
    };

    filterState.updateURL?.cancel?.();
    saveScrollPosition?.cancel?.();
    const sort = defaultFilters.sortFilter;
    // Stay on this page: the fixed filters come from it, not from the URL
    router.replace(sort === FILTER_DEFAULTS.SORT ? pathname : `${pathname}?sort=${sort}`, { scroll: false });
    scrollPositionRef.current = 0;
    pagination.resetAll(defaultFilters);
  }, [router, pathname, initialParams?.age_category, initialParams?.location_country, initialParams?.available_country, filterState, saveScrollPosition, scrollPositionRef, pagination]);

  const breadcrumbItems = [{ name: "Home", url: "/" }, { name: "Find Dogs" }];

  const content = (
    <>

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
            <div className="text-xl font-bold text-gray-900 dark:text-white">
              Find Your New Best Friend
            </div>

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
        {/* Phones: the header has no search field, so it sits at the top */}
        <GlobalSearch surface="mobile" className="mb-4 sm:hidden" />

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
              Browse adoptable dogs from{" "}
              {metadata?.organizations?.filter(
                (org: { id: number | string | null }) => org.id !== null,
              ).length || "multiple"}{" "}
              verified rescue organizations across{" "}
              {metadata?.locationCountries?.filter(
                (c: string) => c !== "Any country",
              ).length || "multiple"}{" "}
              countries. Filter by breed, size, age, and location to find your
              perfect companion.
            </p>
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop filters sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <DesktopFilters
              // Search is edited in the header; it still counts as a filter
              searchQuery={filterState.filters.searchQuery}
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
              handleBreedSearch={handleBreedTyped}
              handleBreedClear={handleBreedClear}
              handleBreedValueChange={handleBreedTyped}
              standardizedBreeds={metadata?.standardizedBreeds || ["Any breed"]}
              // Pet Details
              sexFilter={filterState.filters.sexFilter}
              setSexFilter={(value: string) => handleFilterChange("sexFilter", value)}
              sexOptions={["Any", "Male", "Female"]}
              sizeFilter={filterState.filters.sizeFilter}
              setSizeFilter={(value: string) => handleFilterChange("sizeFilter", value)}
              sizeOptions={SIZE_OPTIONS}
              ageCategoryFilter={filterState.filters.ageFilter}
              setAgeCategoryFilter={(value: string) =>
                handleFilterChange("ageFilter", value)
              }
              ageOptions={AGE_OPTIONS}
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

            <CatalogToolbar
              filters={filterState.filters}
              total={pagination.filterCounts?.total ?? null}
              organizations={metadata?.organizations}
              fixed={pageFixedFilters}
              onRemove={handleFilterChange}
              onClearAll={handleResetFilters}
              onSortChange={setSort}
            />

            {/* Labels come from the visitor's country; hiding the rest is opt-in (#493) */}
            <OnlyAdoptableSwitch
              countryOptions={metadata?.availableCountries || []}
              value={filterState.filters.availableCountryFilter}
              onChange={setAvailableCountry}
              className="mb-4"
            />

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
        // Search is edited in the field at the top of the page
        searchQuery={filterState.filters.searchQuery}
        filterConfig={CATALOG_DRAWER_CONFIG}
        // Organization
        organizationFilter={filterState.filters.organizationFilter}
        setOrganizationFilter={(value: string) =>
          handleFilterChange("organizationFilter", value)
        }
        organizations={
          metadata?.organizations || [{ id: null, name: "Any organization" }]
        }
        standardizedBreedFilter={filterState.filters.breedFilter}
        setStandardizedBreedFilter={handleBreedChange}
        standardizedBreeds={metadata?.standardizedBreeds || ["Any breed"]}
        // Pet Details
        sexFilter={filterState.filters.sexFilter}
        setSexFilter={(value: string) => handleFilterChange("sexFilter", value)}
        sexOptions={["Any", "Male", "Female"]}
        sizeFilter={filterState.filters.sizeFilter}
        setSizeFilter={(value: string) => handleFilterChange("sizeFilter", value)}
        sizeOptions={SIZE_OPTIONS}
        ageCategoryFilter={filterState.filters.ageFilter}
        setAgeCategoryFilter={(value: string) => handleFilterChange("ageFilter", value)}
        ageOptions={AGE_OPTIONS}
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
        matchCount={pagination.filterCounts?.total ?? null}
      />
    </>
  );

  return content;
}
