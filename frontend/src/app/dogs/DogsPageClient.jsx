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
import { Filter, X } from "lucide-react";
import FilterControls from "../../components/dogs/FilterControls";
import DesktopFilters from "../../components/filters/DesktopFilters";
import MobileFilterDrawer from "../../components/filters/MobileFilterDrawer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { reportError } from "../../utils/logger";
import { Badge } from "@/components/ui/badge";

// Helper function to map UI size to standardized size
const mapUiSizeToStandardized = (uiSize) => {
  const mapping = {
    Tiny: "Tiny",
    Small: "Small",
    Medium: "Medium",
    Large: "Large",
    "Extra Large": "XLarge",
  };
  return mapping[uiSize] || null;
};

export default function DogsPageClient() {
  const searchParams = useSearchParams();

  const [standardizedBreedFilter, setStandardizedBreedFilter] =
    useState("Any breed");
  const [sexFilter, setSexFilter] = useState("Any");
  const [sizeFilter, setSizeFilter] = useState("Any size");
  const [ageCategoryFilter, setAgeCategoryFilter] = useState("Any age");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationCountryFilter, setLocationCountryFilter] =
    useState("Any country");
  const [availableCountryFilter, setAvailableCountryFilter] =
    useState("Any country");
  const [availableRegionFilter, setAvailableRegionFilter] =
    useState("Any region");
  const [organizationFilter, setOrganizationFilter] = useState("any");

  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [standardizedBreeds, setStandardizedBreeds] = useState(["Any breed"]);
  const [locationCountries, setLocationCountries] = useState(["Any country"]);
  const [availableCountries, setAvailableCountries] = useState(["Any country"]);
  const [availableRegions, setAvailableRegions] = useState(["Any region"]);
  const [organizations, setOrganizations] = useState([
    { id: null, name: "Any organization" },
  ]);

  const [activeFilterCount, setActiveFilterCount] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);
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

  // Fetch Standardized Breeds
  useEffect(() => {
    const fetchBreeds = async () => {
      try {
        const raw = await getStandardizedBreeds();
        const filtered = raw.filter((b) => b !== "Any breed");
        React.startTransition(() => {
          setStandardizedBreeds(["Any breed", ...filtered]);
        });
      } catch (err) {
        reportError("Failed to fetch standardized breeds", {
          error: err.message,
        });
        React.startTransition(() => {
          setStandardizedBreeds(["Any breed"]);
        });
      }
    };
    fetchBreeds();
  }, []);

  // Fetch Location Options
  useEffect(() => {
    const fetchLocationMeta = async () => {
      try {
        const [locCountries, availCountries] = await Promise.all([
          getLocationCountries(),
          getAvailableCountries(),
        ]);
        setLocationCountries(["Any country", ...locCountries]);
        setAvailableCountries(["Any country", ...availCountries]);
      } catch (err) {
        reportError("Failed to fetch location metadata", {
          error: err.message,
        });
      }
    };
    fetchLocationMeta();
  }, []);

  // Fetch Available Regions
  useEffect(() => {
    const fetchRegions = async () => {
      if (availableCountryFilter && availableCountryFilter !== "Any country") {
        try {
          const regions = await getAvailableRegions(availableCountryFilter);
          setAvailableRegions(["Any region", ...regions]);
        } catch (err) {
          reportError(`Failed to fetch regions for ${availableCountryFilter}`, {
            error: err.message,
          });
          setAvailableRegions(["Any region"]);
        }
      } else {
        setAvailableRegions(["Any region"]);
      }
      setAvailableRegionFilter("Any region");
    };
    fetchRegions();
  }, [availableCountryFilter]);

  // Fetch Organizations
  useEffect(() => {
    getOrganizations()
      .then((orgs) => {
        React.startTransition(() => {
          setOrganizations([
            { id: null, name: "Any organization" },
            ...(Array.isArray(orgs) ? orgs : []),
          ]);
        });
      })
      .catch((err) =>
        reportError("Failed to fetch organizations", { error: err.message }),
      );
  }, []);

  // Initialize Filters from URL Parameters
  useEffect(() => {
    const organizationIdParam = searchParams.get("organization_id");

    if (organizationIdParam) {
      const organizationExists = organizations.some(
        (org) => org.id && org.id.toString() === organizationIdParam,
      );

      if (organizationExists) {
        setOrganizationFilter(organizationIdParam);
      } else {
        setOrganizationFilter("any");
      }
    }
  }, [searchParams, organizations]);

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

      const params = {
        limit,
        offset,
        search: searchQuery || null,
        standardized_breed:
          standardizedBreedFilter === "Any breed"
            ? null
            : standardizedBreedFilter,
        organization_id:
          organizationFilter === "any" ? null : organizationFilter,
        sex: sexFilter === "Any" ? null : sexFilter,
        standardized_size: mapUiSizeToStandardized(sizeFilter),
        age_category:
          ageCategoryFilter === "Any age" ? null : ageCategoryFilter,
        location_country:
          locationCountryFilter === "Any country"
            ? null
            : locationCountryFilter,
        available_to_country:
          availableCountryFilter === "Any country"
            ? null
            : availableCountryFilter,
        available_to_region:
          availableRegionFilter === "Any region" ? null : availableRegionFilter,
      };

      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v != null),
      );

      try {
        const newDogs = await getAnimals(cleanParams);
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
        reportError("Error fetching dogs", {
          error: err.message,
          params: cleanParams,
        });
        React.startTransition(() => {
          setError("Failed to load dogs. Please try again.");
          setHasMore(false);
          setLoading(false);
          setLoadingMore(false);
        });
      }
    },
    [
      searchQuery,
      standardizedBreedFilter,
      organizationFilter,
      sexFilter,
      sizeFilter,
      ageCategoryFilter,
      locationCountryFilter,
      availableCountryFilter,
      availableRegionFilter,
      resetTrigger,
    ],
  );

  // Fetch Filter Counts
  const fetchFilterCounts = useCallback(async () => {
    try {
      const filterParams = {
        search: searchQuery || null,
        standardized_breed:
          standardizedBreedFilter === "Any breed"
            ? null
            : standardizedBreedFilter,
        organization_id:
          organizationFilter === "any" ? null : organizationFilter,
        sex: sexFilter === "Any" ? null : sexFilter,
        standardized_size: mapUiSizeToStandardized(sizeFilter),
        age_category:
          ageCategoryFilter === "Any age" ? null : ageCategoryFilter,
        location_country:
          locationCountryFilter === "Any country"
            ? null
            : locationCountryFilter,
        available_to_country:
          availableCountryFilter === "Any country"
            ? null
            : availableCountryFilter,
        available_to_region:
          availableRegionFilter === "Any region" ? null : availableRegionFilter,
      };

      const counts = await getFilterCounts(filterParams);
      React.startTransition(() => {
        setFilterCounts(counts);
      });
    } catch (err) {
      reportError("Error fetching filter counts", { error: err.message });
      // Don't show error to user for filter counts, just log it
      React.startTransition(() => {
        setFilterCounts(null);
      });
    }
  }, [
    searchQuery,
    standardizedBreedFilter,
    organizationFilter,
    sexFilter,
    sizeFilter,
    ageCategoryFilter,
    locationCountryFilter,
    availableCountryFilter,
    availableRegionFilter,
    resetTrigger,
  ]);

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

  // Calculate Active Filters
  useEffect(() => {
    let count = 0;
    if (searchQuery) count++;
    if (standardizedBreedFilter !== "Any breed") count++;
    if (organizationFilter !== "any") count++;
    if (sexFilter !== "Any") count++;
    if (sizeFilter !== "Any size") count++;
    if (ageCategoryFilter !== "Any age") count++;
    if (locationCountryFilter !== "Any country") count++;
    if (availableCountryFilter !== "Any country") count++;
    if (availableRegionFilter !== "Any region") count++;
    setActiveFilterCount(count);
  }, [
    searchQuery,
    standardizedBreedFilter,
    organizationFilter,
    sexFilter,
    sizeFilter,
    ageCategoryFilter,
    locationCountryFilter,
    availableCountryFilter,
    availableRegionFilter,
  ]);

  // Reset Filters
  const resetFilters = () => {
    setSearchQuery("");
    setStandardizedBreedFilter("Any breed");
    setOrganizationFilter("any");
    setSexFilter("Any");
    setSizeFilter("Any size");
    setAgeCategoryFilter("Any age");
    setLocationCountryFilter("Any country");
    setAvailableCountryFilter("Any country");
    setPage(1);
    setHasMore(true);
    setResetTrigger((prev) => prev + 1);
    setIsSheetOpen(false);
  };

  // Clear Individual Filter
  const clearFilter = (filterType) => {
    switch (filterType) {
      case "search":
        setSearchQuery("");
        break;
      case "breed":
        setStandardizedBreedFilter("Any breed");
        break;
      case "organization":
        setOrganizationFilter("any");
        break;
      case "sex":
        setSexFilter("Any");
        break;
      case "size":
        setSizeFilter("Any size");
        break;
      case "age":
        setAgeCategoryFilter("Any age");
        break;
      case "location_country":
        setLocationCountryFilter("Any country");
        break;
      case "available_country":
        setAvailableCountryFilter("Any country");
        break;
      case "available_region":
        setAvailableRegionFilter("Any region");
        break;
      default:
        break;
    }
    setPage(1);
    setHasMore(true);
    setResetTrigger((prev) => prev + 1);
  };

  // Handle Search Input Change
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // Clear Search Input
  const clearSearch = () => {
    setSearchQuery("");
    setPage(1);
    setHasMore(true);
    setResetTrigger((prev) => prev + 1);
  };

  // Handle Mobile Filter Changes

  // Render Active Filter Badges
  const renderActiveFilters = () => {
    const filters = [];
    if (searchQuery)
      filters.push({ type: "search", label: `Search: "${searchQuery}"` });
    if (standardizedBreedFilter !== "Any breed")
      filters.push({ type: "breed", label: standardizedBreedFilter });

    if (organizationFilter !== "any") {
      const sel = organizations.find(
        (o) => o.id?.toString() === organizationFilter,
      );
      filters.push({
        type: "organization",
        label: sel?.name ?? organizationFilter,
      });
    }

    if (sexFilter !== "Any") filters.push({ type: "sex", label: sexFilter });
    if (sizeFilter !== "Any size")
      filters.push({ type: "size", label: sizeFilter });
    if (ageCategoryFilter !== "Any age")
      filters.push({ type: "age", label: ageCategoryFilter });
    if (locationCountryFilter !== "Any country")
      filters.push({
        type: "location_country",
        label: `Located: ${locationCountryFilter}`,
      });
    if (availableCountryFilter !== "Any country")
      filters.push({
        type: "available_country",
        label: `Ships To: ${availableCountryFilter}`,
      });
    if (availableRegionFilter !== "Any region")
      filters.push({
        type: "available_region",
        label: `Region: ${availableRegionFilter}`,
      });

    if (filters.length === 0) return null;

    return (
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">
          Active Filters:
        </span>
        {filters.map((filter) => (
          <Badge
            key={filter.type}
            data-testid="active-filter-badge"
            variant="secondary"
            className="flex items-center gap-1"
          >
            {filter.label}
            <button
              data-testid="filter-badge-clear"
              onClick={() => clearFilter(filter.type)}
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
          onClick={resetFilters}
          className="text-orange-600 hover:text-orange-700 p-0 h-auto font-medium enhanced-focus-link"
          data-testid="clear-all-filters-button"
        >
          Clear All
        </Button>
      </div>
    );
  };

  return (
    <div
      data-testid="dogs-page-gradient-wrapper"
      className="min-h-screen bg-gradient-to-br from-[#FFF5E6] to-[#FFE4CC] dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800"
    >
      <Layout>
        <div
          data-testid="dogs-page-container"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        >
          <h1 className="text-title text-gray-900 dark:text-gray-100 mb-6">
            Find Your New Best Friend
          </h1>

          <div className="flex gap-8">
            {/* Desktop Floating Filter Panel */}
            <DesktopFilters
              searchQuery={searchQuery}
              handleSearchChange={handleSearchChange}
              clearSearch={clearSearch}
              organizationFilter={organizationFilter}
              setOrganizationFilter={setOrganizationFilter}
              organizations={organizations}
              standardizedBreedFilter={standardizedBreedFilter}
              setStandardizedBreedFilter={setStandardizedBreedFilter}
              standardizedBreeds={standardizedBreeds}
              sexFilter={sexFilter}
              setSexFilter={setSexFilter}
              sexOptions={sexOptions}
              sizeFilter={sizeFilter}
              setSizeFilter={setSizeFilter}
              sizeOptions={sizeOptions}
              ageCategoryFilter={ageCategoryFilter}
              setAgeCategoryFilter={setAgeCategoryFilter}
              ageOptions={ageOptions}
              locationCountryFilter={locationCountryFilter}
              setLocationCountryFilter={setLocationCountryFilter}
              locationCountries={locationCountries}
              availableCountryFilter={availableCountryFilter}
              setAvailableCountryFilter={setAvailableCountryFilter}
              availableCountries={availableCountries}
              availableRegionFilter={availableRegionFilter}
              setAvailableRegionFilter={setAvailableRegionFilter}
              availableRegions={availableRegions}
              resetFilters={resetFilters}
              filterCounts={filterCounts}
            />

            <main className="flex-1 min-w-0">
              {/* Mobile Filter Button */}
              <div className="lg:hidden mb-4">
                <Button
                  data-testid="mobile-filter-button"
                  variant="outline"
                  className="w-full justify-center mobile-touch-target bg-white/90 backdrop-blur border-2 border-orange-200 hover:border-orange-300 animate-button-hover enhanced-focus-button"
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
                searchQuery={searchQuery}
                handleSearchChange={handleSearchChange}
                clearSearch={clearSearch}
                // Organization
                organizationFilter={organizationFilter}
                setOrganizationFilter={setOrganizationFilter}
                organizations={organizations}
                // Breed
                standardizedBreedFilter={standardizedBreedFilter}
                setStandardizedBreedFilter={setStandardizedBreedFilter}
                standardizedBreeds={standardizedBreeds}
                // Pet Details
                sexFilter={sexFilter}
                setSexFilter={setSexFilter}
                sexOptions={sexOptions}
                sizeFilter={sizeFilter}
                setSizeFilter={setSizeFilter}
                sizeOptions={sizeOptions}
                ageCategoryFilter={ageCategoryFilter}
                setAgeCategoryFilter={setAgeCategoryFilter}
                ageOptions={ageOptions}
                // Location
                availableCountryFilter={availableCountryFilter}
                setAvailableCountryFilter={setAvailableCountryFilter}
                availableCountries={availableCountries}
                // Filter management
                resetFilters={resetFilters}
                // Dynamic filter counts
                filterCounts={filterCounts}
              />

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
                <DogsGrid dogs={dogs} loading={false} className="mb-8" />
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
