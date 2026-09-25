"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import DogCardSkeletonOptimized from "../../components/ui/DogCardSkeletonOptimized";
import CatalogDogGrid from "../../components/dogs/CatalogDogGrid";
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
import { DOG_GRID } from "@/constants/layout";

const SIDEBAR_KEY = "catalog-filters-hidden";

/** Whether the visitor hid the filter sidebar, remembered in this browser. */
function useSidebarHidden(): [boolean, () => void] {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once after hydration; the server cannot know
      if (localStorage.getItem(SIDEBAR_KEY) === "1") setHidden(true);
    } catch {
      // Storage blocked: the sidebar just starts shown
    }
  }, []);
  const toggle = useCallback(() => {
    setHidden((was) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, was ? "0" : "1");
      } catch {
        // Storage blocked: the choice lasts for this visit only
      }
      return !was;
    });
  }, []);
  return [hidden, toggle];
}

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

  // On a breed or rescue page the breed or rescue is the page's own, so there
  // is none to pick, and analytics keeps that page's traffic apart from the catalog's
  const breedIsFixed = Boolean(initialParams?.primary_breed || initialParams?.breed_group);
  const orgIsFixed = Boolean(initialParams?.organization_id);
  const analyticsSurface = breedIsFixed ? "breed_page" : orgIsFixed ? "org_page" : "catalog";
  const listContext = breedIsFixed ? "breed-page" : orgIsFixed ? "org-page" : "search";

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sidebarHidden, toggleSidebar] = useSidebarHidden();

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
      trackFiltersApplied(changes, analyticsSurface);
    },
    [applyFilters, analyticsSurface],
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
        initialParams?.primary_breed && "breedFilter",
        initialParams?.breed_group && "breedGroupFilter",
        initialParams?.organization_id && "organizationFilter",
      ].filter(Boolean) as (
        | "ageFilter"
        | "locationCountryFilter"
        | "availableCountryFilter"
        | "breedFilter"
        | "breedGroupFilter"
        | "organizationFilter"
      )[],
    [
      initialParams?.age_category,
      initialParams?.location_country,
      initialParams?.available_country,
      initialParams?.primary_breed,
      initialParams?.breed_group,
      initialParams?.organization_id,
    ],
  );
  const drawerConfig = useMemo(
    () => ({ ...CATALOG_DRAWER_CONFIG, showBreed: !breedIsFixed, showOrganization: !orgIsFixed }),
    [breedIsFixed, orgIsFixed],
  );

  const { goodWithKidsFilter, goodWithDogsFilter, goodWithCatsFilter, firstTimeFriendlyFilter, energyFilter } =
    filterState.filters;
  const lifestyleFilters = useMemo(
    () => ({ goodWithKidsFilter, goodWithDogsFilter, goodWithCatsFilter, firstTimeFriendlyFilter, energyFilter }),
    [goodWithKidsFilter, goodWithDogsFilter, goodWithCatsFilter, firstTimeFriendlyFilter, energyFilter],
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
      organizationFilter: initialParams?.organization_id || FILTER_DEFAULTS.ORGANIZATION,
      breedFilter: initialParams?.primary_breed || FILTER_DEFAULTS.BREED,
      breedGroupFilter: initialParams?.breed_group || FILTER_DEFAULTS.GROUP,
      locationCountryFilter: initialParams?.location_country || FILTER_DEFAULTS.COUNTRY,
      availableCountryFilter: initialParams?.available_country || FILTER_DEFAULTS.COUNTRY,
      availableRegionFilter: FILTER_DEFAULTS.REGION,
      goodWithKidsFilter: "",
      goodWithDogsFilter: "",
      goodWithCatsFilter: "",
      firstTimeFriendlyFilter: "",
      energyFilter: "",
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
  }, [router, pathname, initialParams?.age_category, initialParams?.location_country, initialParams?.available_country, initialParams?.primary_breed, initialParams?.breed_group, initialParams?.organization_id, filterState, saveScrollPosition, scrollPositionRef, pagination]);

  const breadcrumbItems = [{ name: "Home", url: "/" }, { name: "Find Dogs" }];

  const content = (
    <>

      {/* Mobile Sticky Header with Breadcrumb and Filter Button */}
      {!hideHero && (
        <div className="lg:hidden sticky top-16 z-20 bg-background dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
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
        <div className="lg:hidden sticky top-16 z-20 bg-background dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-end">
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

      {/* Layout's <main> gives the 16px phone gutter; this lines the edges up
          with the header's from 640px */}
      <div
        data-testid="dogs-page-container"
        className="mx-auto max-w-7xl py-6 sm:px-2 lg:px-4 lg:py-8"
      >
        {/* Phones: the header has no search field, so it sits at the top. Not
            on a breed or rescue page: its search would leave for /dogs and them */}
        {!breedIsFixed && !orgIsFixed && <GlobalSearch surface="mobile" className="mb-4 sm:hidden" />}

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
          {/* Filter sidebar from 1024px, which the visitor can hide; a sheet below */}
          <aside className={sidebarHidden ? "hidden" : "hidden lg:block w-72 flex-shrink-0"}>
            <DesktopFilters
              // Search is edited in the header; it still counts as a filter
              searchQuery={filterState.filters.searchQuery}
              // Organization. A rescue page's own rescue is hidden here and not
              // counted as active, like a breed page's breed
              organizationFilter={orgIsFixed ? FILTER_DEFAULTS.ORGANIZATION : filterState.filters.organizationFilter}
              showOrganization={!orgIsFixed}
              setOrganizationFilter={(value: string) =>
                handleFilterChange("organizationFilter", value)
              }
              organizations={
                metadata?.organizations || [
                  { id: null, name: "Any organization" },
                ]
              }
              // Breed (using actual filter state like Name filter). A breed
              // page's own breed is hidden here and not counted as active
              standardizedBreedFilter={breedIsFixed ? FILTER_DEFAULTS.BREED : filterState.filters.breedFilter}
              setStandardizedBreedFilter={handleBreedChange}
              handleBreedSearch={handleBreedTyped}
              handleBreedClear={handleBreedClear}
              handleBreedValueChange={handleBreedTyped}
              standardizedBreeds={metadata?.standardizedBreeds || ["Any breed"]}
              showBreed={!breedIsFixed}
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
              lifestyleFilters={lifestyleFilters}
              setLifestyleFilter={handleFilterChange}
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
              sidebar={{ shown: !sidebarHidden, onToggle: toggleSidebar }}
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
              className="relative flex-1 pb-8"
              id="dogs-catalog"
            >
              {/* Loading state */}
              {pagination.loading && !pagination.dogs.length && (
                <div className={DOG_GRID}>
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
                  <CatalogDogGrid dogs={pagination.dogs} listContext={listContext} />
                </div>
              )}

              {/* Empty state */}
              {!pagination.loading && pagination.dogs.length === 0 &&
                ((breedIsFixed || orgIsFixed) && filterState.activeFilterCount === 0 ? (
                  // Nothing to clear: the breed or rescue itself has no dogs listed now
                  <EmptyState
                    title="None listed right now"
                    description={`${orgIsFixed ? "This rescue's list is updated" : "Rescues add new dogs"} three times a week. Every other dog is in the catalog.`}
                    actionButton={{ text: "Browse all dogs", onClick: () => router.push("/dogs") }}
                  />
                ) : (
                  <EmptyState
                    variant="noDogsFiltered"
                    onClearFilters={handleResetFilters}
                  />
                ))}

              <div>
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
        filterConfig={drawerConfig}
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
        lifestyleFilters={lifestyleFilters}
        setLifestyleFilter={handleFilterChange}
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
