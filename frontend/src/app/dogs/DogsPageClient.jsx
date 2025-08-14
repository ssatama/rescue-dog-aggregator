"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Layout from "../../components/layout/Layout";
import DogCard from "../../components/dogs/DogCard";
import DogCardErrorBoundary from "../../components/error/DogCardErrorBoundary";
import DogCardSkeleton from "../../components/ui/DogCardSkeleton";
import DogsGrid from "../../components/dogs/DogsGrid";
import EmptyState from "../../components/ui/EmptyState";
import {
  getAnimals,
  getStandardizedBreeds,
  getLocationCountries,
  getAvailableCountries,
  getAvailableRegions,
  getFilterCounts,
} from "../../services/animalsService";
import { getOrganizations } from "../../services/organizationsService";
import { Button } from "@/components/ui/button";
import { Filter, X, Loader2 } from "lucide-react";
import { useParallelMetadata } from "../../hooks/useParallelMetadata";
import { useFilterState } from "../../hooks/useFilterState";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch";
import FilterControls from "../../components/dogs/FilterControls";
import DesktopFilters from "../../components/filters/DesktopFilters";
import MobileFilterDrawer from "../../components/filters/MobileFilterDrawer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { reportError } from "../../utils/logger";
import { Badge } from "@/components/ui/badge";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import { BreadcrumbSchema } from "../../components/seo";

export default function DogsPageClient() {
  const searchParams = useSearchParams();

  // Use consolidated filter state management
  const {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    clearFilter,
    activeFilterCount,
    resetTrigger,
    apiParams,
  } = useFilterState();

  // Use debounced search for better performance
  const {
    searchValue,
    debouncedValue: debouncedSearchQuery,
    handleSearchChange,
    clearSearch,
    setSearchValue,
  } = useDebouncedSearch(filters.searchQuery);

  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Use parallel metadata hook for optimized API calls
  const { metadata, metadataLoading, metadataError } = useParallelMetadata();

  const [availableRegions, setAvailableRegions] = useState(["Any region"]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [filterCounts, setFilterCounts] = useState(null);

  const sexOptions = ["Any", "Male", "Female"];
  const sizeOptions = [
    "Any size",
    "Tiny",
    "Small",
    "Medium",
    "Large",
    "Extra Large",
  ];
  const ageOptions = ["Any age", "Puppy", "Young", "Adult", "Senior"];

  // Metadata is now loaded via useParallelMetadata hook for better performance

  // Fetch Available Regions
  useEffect(() => {
    const fetchRegions = async () => {
      if (
        filters.availableCountryFilter &&
        filters.availableCountryFilter !== "Any country"
      ) {
        try {
          const regions = await getAvailableRegions(
            filters.availableCountryFilter,
          );
          setAvailableRegions(["Any region", ...regions]);
        } catch (err) {
          reportError(err, {
            context: `Failed to fetch regions for ${filters.availableCountryFilter}`,
          });
          setAvailableRegions(["Any region"]);
        }
      } else {
        setAvailableRegions(["Any region"]);
      }
      updateFilter("availableRegionFilter", "Any region");
    };
    fetchRegions();
  }, [filters.availableCountryFilter, updateFilter]);

  // Organizations now loaded via useParallelMetadata hook

  // Initialize Filters from URL Parameters
  useEffect(() => {
    const organizationIdParam = searchParams.get("organization_id");

    if (organizationIdParam) {
      const organizationExists = metadata.organizations.some(
        (org) => org.id && org.id.toString() === organizationIdParam,
      );

      if (organizationExists) {
        updateFilter("organizationFilter", organizationIdParam);
      } else {
        updateFilter("organizationFilter", "any");
      }
    }
  }, [searchParams, metadata.organizations, updateFilter]);

  // Main Data Fetching Logic
  const fetchDogs = useCallback(
    async (currentPage = 1, loadMore = false, isFilterChange = false) => {
      if (!loadMore) {
        setLoading(true);
        setDogs([]);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      const limit = 20;
      const offset = (currentPage - 1) * limit;

      // Use pre-computed apiParams from useFilterState for better performance
      const params = {
        limit,
        offset,
        ...apiParams,
        // Use debounced search value for better UX
        search: debouncedSearchQuery || null,
      };

      try {
        const newDogs = await getAnimals(params);
        React.startTransition(() => {
          setDogs((prevDogs) =>
            loadMore ? [...prevDogs, ...newDogs] : newDogs,
          );
          setHasMore(newDogs.length === limit);
          setPage(currentPage);
          setLoading(false);
          setLoadingMore(false);
        });
      } catch (err) {
        reportError(err, {
          context: "Error fetching dogs",
          params: params,
        });
        React.startTransition(() => {
          setError("Failed to load dogs. Please try again.");
          setHasMore(false);
          setLoading(false);
          setLoadingMore(false);
        });
      }
    },
    [apiParams, debouncedSearchQuery, resetTrigger],
  );

  // Fetch Filter Counts
  const fetchFilterCounts = useCallback(async () => {
    try {
      const filterParams = {
        ...apiParams,
        search: debouncedSearchQuery || null,
      };

      const counts = await getFilterCounts(filterParams);
      React.startTransition(() => {
        setFilterCounts(counts);
      });
    } catch (err) {
      reportError(err, { context: "Error fetching filter counts" });
      // Don't show error to user for filter counts, just log it
      React.startTransition(() => {
        setFilterCounts(null);
      });
    }
  }, [apiParams, debouncedSearchQuery, resetTrigger]);

  // Trigger Fetch on Filter/Search/Reset Change
  useEffect(() => {
    fetchDogs(1, false, true); // isFilterChange = true for filter/search changes
    fetchFilterCounts(); // Fetch filter counts when filters change
  }, [fetchDogs, fetchFilterCounts]);

  // Handle Load More
  const handleLoadMore = () => {
    if (hasMore && !loading && !loadingMore) {
      fetchDogs(page + 1, true);
    }
  };

  // Note: Active filter count is now computed by useFilterState hook

  // Handle search change with debouncing
  useEffect(() => {
    updateFilter("searchQuery", searchValue);
  }, [searchValue, updateFilter]);

  // Reset Filters wrapper - combines hook reset with local state
  const handleResetFilters = () => {
    resetFilters(); // From useFilterState hook
    clearSearch(); // From useDebouncedSearch hook
    setPage(1);
    setHasMore(true);
    setIsSheetOpen(false);
  };

  // Clear Individual Filter wrapper
  const handleClearFilter = (filterType) => {
    if (filterType === "search") {
      clearSearch(); // From useDebouncedSearch hook
    }
    clearFilter(filterType); // From useFilterState hook
    setPage(1);
    setHasMore(true);
  };

  // Note: Search handling is now managed by useDebouncedSearch hook
  // handleSearchChange and clearSearch are provided by the hook

  // Handle Mobile Filter Changes

  // Render Active Filter Badges
  const renderActiveFilters = () => {
    const activeFilters = [];
    if (searchValue)
      activeFilters.push({ type: "search", label: `Search: "${searchValue}"` });
    if (filters.standardizedBreedFilter !== "Any breed")
      activeFilters.push({
        type: "breed",
        label: filters.standardizedBreedFilter,
      });

    if (filters.organizationFilter !== "any") {
      const sel = metadata.organizations.find(
        (o) => o.id?.toString() === filters.organizationFilter,
      );
      activeFilters.push({
        type: "organization",
        label: sel?.name ?? filters.organizationFilter,
      });
    }

    if (filters.sexFilter !== "Any")
      activeFilters.push({ type: "sex", label: filters.sexFilter });
    if (filters.sizeFilter !== "Any size")
      activeFilters.push({ type: "size", label: filters.sizeFilter });
    if (filters.ageCategoryFilter !== "Any age")
      activeFilters.push({ type: "age", label: filters.ageCategoryFilter });
    if (filters.locationCountryFilter !== "Any country")
      activeFilters.push({
        type: "location_country",
        label: `Located: ${filters.locationCountryFilter}`,
      });
    if (filters.availableCountryFilter !== "Any country")
      activeFilters.push({
        type: "available_country",
        label: `Ships To: ${filters.availableCountryFilter}`,
      });
    if (filters.availableRegionFilter !== "Any region")
      activeFilters.push({
        type: "available_region",
        label: `Region: ${filters.availableRegionFilter}`,
      });

    if (activeFilters.length === 0) return null;

    return (
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">
          Active Filters:
        </span>
        {activeFilters.map((filter) => (
          <Badge
            key={filter.type}
            data-testid="active-filter-badge"
            variant="secondary"
            className="flex items-center gap-1"
          >
            {filter.label}
            <button
              data-testid="filter-badge-clear"
              onClick={() => handleClearFilter(filter.type)}
              aria-label={`Remove ${filter.label} filter`}
              className="ml-1 p-0.5 rounded-full hover:bg-gray-300"
            >
              <X size={12} />
            </button>
          </Badge>
        ))}
        <Button
          variant="link"
          size="sm"
          onClick={handleResetFilters}
          className="text-orange-600 hover:text-orange-700 p-0 h-auto font-medium enhanced-focus-link"
          data-testid="clear-all-filters-button"
        >
          Clear All
        </Button>
      </div>
    );
  };

  const breadcrumbItems = [{ name: "Home", url: "/" }, { name: "Find Dogs" }];

  return (
    <div
      data-testid="dogs-page-gradient-wrapper"
      className="min-h-screen bg-gradient-to-br from-[#FFF5E6] to-[#FFE4CC] dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800"
    >
      <Layout>
        {/* SEO: Breadcrumb structured data */}
        <BreadcrumbSchema items={breadcrumbItems} />

        <div
          data-testid="dogs-page-container"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          {/* Breadcrumb Navigation */}
          <Breadcrumbs items={breadcrumbItems} />
          <h1 className="text-title text-gray-900 dark:text-gray-100 mb-6">
            Find Your New Best Friend
          </h1>

          <div className="flex gap-8">
            {/* Desktop Floating Filter Panel */}
            <DesktopFilters
              searchQuery={searchValue}
              handleSearchChange={handleSearchChange}
              clearSearch={clearSearch}
              organizationFilter={filters.organizationFilter}
              setOrganizationFilter={(value) =>
                updateFilter("organizationFilter", value)
              }
              organizations={metadata.organizations}
              standardizedBreedFilter={filters.standardizedBreedFilter}
              setStandardizedBreedFilter={(value) =>
                updateFilter("standardizedBreedFilter", value)
              }
              standardizedBreeds={metadata.standardizedBreeds}
              sexFilter={filters.sexFilter}
              setSexFilter={(value) => updateFilter("sexFilter", value)}
              sexOptions={sexOptions}
              sizeFilter={filters.sizeFilter}
              setSizeFilter={(value) => updateFilter("sizeFilter", value)}
              sizeOptions={sizeOptions}
              ageCategoryFilter={filters.ageCategoryFilter}
              setAgeCategoryFilter={(value) =>
                updateFilter("ageCategoryFilter", value)
              }
              ageOptions={ageOptions}
              locationCountryFilter={filters.locationCountryFilter}
              setLocationCountryFilter={(value) =>
                updateFilter("locationCountryFilter", value)
              }
              locationCountries={metadata.locationCountries}
              availableCountryFilter={filters.availableCountryFilter}
              setAvailableCountryFilter={(value) =>
                updateFilter("availableCountryFilter", value)
              }
              availableCountries={metadata.availableCountries}
              availableRegionFilter={filters.availableRegionFilter}
              setAvailableRegionFilter={(value) =>
                updateFilter("availableRegionFilter", value)
              }
              availableRegions={availableRegions}
              resetFilters={handleResetFilters}
              filterCounts={filterCounts}
            />

            <main className="flex-1 min-w-0">
              {/* Mobile Filter Button */}
              <div className="lg:hidden mb-4">
                <Button
                  data-testid="mobile-filter-button"
                  variant="outline"
                  className="w-full h-12 justify-center gap-3 mobile-touch-target border-gray-400 hover:border-orange-600 hover:bg-orange-50 text-gray-900 dark:text-gray-100 hover:text-orange-600 enhanced-focus-button"
                  onClick={() => setIsSheetOpen(true)}
                >
                  <Filter className="mr-2 h-5 w-5 text-orange-600" />
                  <span className="font-medium">Filter</span>
                  {activeFilterCount > 0 && (
                    <span className="ml-2 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-sm">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </div>

              {/* Mobile Filter Drawer */}
              <MobileFilterDrawer
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                // Search
                searchQuery={searchValue}
                handleSearchChange={handleSearchChange}
                clearSearch={clearSearch}
                // Organization
                organizationFilter={filters.organizationFilter}
                setOrganizationFilter={(value) =>
                  updateFilter("organizationFilter", value)
                }
                organizations={metadata.organizations}
                // Breed
                standardizedBreedFilter={filters.standardizedBreedFilter}
                setStandardizedBreedFilter={(value) =>
                  updateFilter("standardizedBreedFilter", value)
                }
                standardizedBreeds={metadata.standardizedBreeds}
                // Pet Details
                sexFilter={filters.sexFilter}
                setSexFilter={(value) => updateFilter("sexFilter", value)}
                sexOptions={sexOptions}
                sizeFilter={filters.sizeFilter}
                setSizeFilter={(value) => updateFilter("sizeFilter", value)}
                sizeOptions={sizeOptions}
                ageCategoryFilter={filters.ageCategoryFilter}
                setAgeCategoryFilter={(value) =>
                  updateFilter("ageCategoryFilter", value)
                }
                ageOptions={ageOptions}
                // Location
                availableCountryFilter={filters.availableCountryFilter}
                setAvailableCountryFilter={(value) =>
                  updateFilter("availableCountryFilter", value)
                }
                availableCountries={metadata.availableCountries}
                // Filter management
                resetFilters={handleResetFilters}
                // Dynamic filter counts
                filterCounts={filterCounts}
              />

              {/* Metadata Loading Indicator */}
              {metadataLoading && (
                <div
                  data-testid="metadata-loading"
                  className="mb-4 flex items-center gap-2 text-sm text-gray-600"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading filters...
                </div>
              )}

              {renderActiveFilters()}

              {error && !loading && (
                <Alert variant="destructive" className="mb-6">
                  <AlertTitle>Error Loading Dogs</AlertTitle>
                  <AlertDescription>
                    {error}
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => fetchDogs(1)}
                      className="mt-2 text-red-700 hover:text-red-800 p-0 h-auto block"
                    >
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {loading && (
                <DogsGrid
                  dogs={[]}
                  loading={true}
                  loadingType="filter"
                  skeletonCount={9}
                  className="mb-8"
                />
              )}

              {!loading && dogs && dogs.length > 0 && (
                <DogsGrid
                  dogs={dogs}
                  loading={false}
                  className="mb-8 content-fade-in"
                />
              )}

              {!loading && !error && dogs && dogs.length === 0 && (
                <EmptyState
                  variant="noDogsFiltered"
                  onClearFilters={resetFilters}
                />
              )}

              {hasMore && !loading && !loadingMore && (
                <div className="text-center mt-8 mb-12">
                  <Button
                    data-testid="load-more-button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium px-8 py-3 rounded-lg shadow-md hover:shadow-lg cross-browser-transition enhanced-focus-button mobile-touch-target disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Load More Dogs →
                  </Button>
                </div>
              )}
              {loadingMore && (
                <DogsGrid
                  dogs={[]}
                  loading={true}
                  loadingType="pagination"
                  skeletonCount={6}
                  className="mt-8"
                />
              )}
            </main>
          </div>
        </div>
      </Layout>
    </div>
  );
}
