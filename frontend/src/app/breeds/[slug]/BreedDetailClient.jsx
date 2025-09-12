"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  startTransition,
  useMemo,
  useRef,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import Layout from "@/components/layout/Layout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import DogsGrid from "@/components/dogs/DogsGrid";
import { Button } from "@/components/ui/button";
import { Filter, Loader2 } from "lucide-react";
import BreedPhotoGallery from "@/components/breeds/BreedPhotoGallery";
import { BreedInfo } from "@/components/breeds/BreedStatistics";
import { getAnimals, getFilterCounts } from "@/services/animalsService";
import { getBreedDescription } from "@/utils/breedDescriptions";
import { useDebouncedCallback } from "use-debounce";
import BreedFilterBar from "@/components/breeds/BreedFilterBar";
import {
  getBreedEmptyStateConfig,
  getBreedFilterOptions,
} from "@/utils/breedFilterUtils";
import EmptyState from "@/components/ui/EmptyState";
import PersonalityBarChart from "@/components/breeds/PersonalityBarChart";
import CommonTraits from "@/components/breeds/CommonTraits";
import ExperienceLevelChart from "@/components/breeds/ExperienceLevelChart";
import ExpandableText from "@/components/ui/ExpandableText";

// Lazy load filter component
const MobileFilterDrawer = dynamic(
  () => import("@/components/filters/MobileFilterDrawer"),
  {
    loading: () => null,
    ssr: false,
  },
);

const ITEMS_PER_PAGE = 12; // Smaller page size for breed pages

export default function BreedDetailClient({
  initialBreedData,
  initialDogs,
  initialParams,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [breedData, setBreedData] = useState(initialBreedData);

  // Parse filters from URL with memoization to prevent unnecessary re-renders
  const filters = useMemo(
    () => ({
      searchQuery: searchParams.get("search") || "",
      sizeFilter: searchParams.get("size") || "Any size",
      ageFilter: searchParams.get("age") || "Any age",
      sexFilter: searchParams.get("sex") || "Any",
      organizationFilter: searchParams.get("organization_id") || "any",
      availableCountryFilter:
        searchParams.get("available_country") || "Any country",
      // Note: breed filter is locked to current breed
    }),
    [searchParams],
  );

  // State for dogs grid and pagination
  const [dogs, setDogs] = useState(initialDogs?.results || initialDogs || []);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(
    (initialDogs?.results || initialDogs || []).length === ITEMS_PER_PAGE,
  );
  const [page, setPage] = useState(1);
  const [filterCounts, setFilterCounts] = useState(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [error, setError] = useState(null);
  const breedAlertButtonRef = React.useRef(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef(null);

  // Build API params from filters with breed-specific filtering
  const buildAPIParams = useCallback(
    (filters) => {
      const params = {};

      // Handle mixed breeds differently - filter by breed_group instead of breed
      if (
        breedData.breed_slug === "mixed" ||
        breedData.breed_type === "mixed"
      ) {
        params.breed_group = "Mixed";
      } else {
        params.breed = breedData.primary_breed; // Filter by specific breed
      }

      // Size mapping from UI labels to API values
      const sizeMapping = {
        Tiny: "Tiny",
        Small: "Small",
        Medium: "Medium",
        Large: "Large",
        "Extra Large": "XLarge",
      };

      if (filters.searchQuery) params.search = filters.searchQuery;
      if (filters.sizeFilter !== "Any size")
        params.standardized_size =
          sizeMapping[filters.sizeFilter] || filters.sizeFilter;
      if (filters.ageFilter !== "Any age")
        params.age_category = filters.ageFilter;
      if (filters.sexFilter !== "Any") params.sex = filters.sexFilter;
      if (filters.organizationFilter !== "any")
        params.organization_id = filters.organizationFilter;
      if (filters.availableCountryFilter !== "Any country")
        params.available_to_country = filters.availableCountryFilter;

      return params;
    },
    [breedData.breed_slug, breedData.breed_type, breedData.primary_breed],
  );

  // URL update with debouncing (same pattern as DogsPageClientSimplified)
  const updateURL = useDebouncedCallback((newFilters) => {
    const params = new URLSearchParams();

    // Explicit mapping to correct URL param keys
    const paramMapping = {
      searchQuery: "search",
      sizeFilter: "size",
      ageFilter: "age",
      sexFilter: "sex",
      organizationFilter: "organization_id",
      availableCountryFilter: "available_to_country",
    };

    Object.entries(newFilters).forEach(([key, value]) => {
      const paramKey = paramMapping[key] || key;
      if (
        value &&
        value !== "Any" &&
        value !== "Any size" &&
        value !== "Any age" &&
        value !== "Any country" &&
        value !== "any"
      ) {
        params.set(paramKey, value);
      }
    });

    const newURL = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.push(newURL, { scroll: false });
  }, 500);

  // Fetch dogs with current filters and handle race conditions
  const fetchDogsWithFilters = useCallback(
    async (currentFilters) => {
      const requestId = ++requestIdRef.current;

      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        const params = {
          limit: ITEMS_PER_PAGE,
          offset: 0,
          ...buildAPIParams(currentFilters),
        };

        const [response, counts] = await Promise.all([
          getAnimals(params, { signal: abortControllerRef.current.signal }),
          getFilterCounts(params, {
            signal: abortControllerRef.current.signal,
          }),
        ]);

        // Ignore stale responses
        if (requestId !== requestIdRef.current) return;

        const newDogs = response?.results || response || [];

        startTransition(() => {
          setDogs(newDogs);
          setHasMore(newDogs.length === ITEMS_PER_PAGE);
          setFilterCounts(counts);
          setPage(1);
        });
      } catch (err) {
        // Ignore abort errors
        if (err.name === "AbortError") return;

        if (process.env.NODE_ENV === "development") {
          console.error("Failed to load dogs:", err);
        }
        if (requestId === requestIdRef.current) {
          setError("Could not load dogs. Please try again.");
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [buildAPIParams],
  );

  // Debounced version of fetchDogsWithFilters
  const debouncedFetchDogs = useDebouncedCallback(fetchDogsWithFilters, 300);

  // Filter change handler
  const handleFilterChange = useCallback(
    (filterKey, value) => {
      const newFilters = { ...filters, [filterKey]: value };
      updateURL(newFilters);

      // Reset and reload with new filters
      startTransition(() => {
        setDogs([]);
        setPage(1);
        setHasMore(true);
      });

      debouncedFetchDogs(newFilters);
    },
    [filters, updateURL, debouncedFetchDogs],
  );

  // Immediate filter change handler for mobile drawer (no debouncing)
  const handleMobileFilterChange = useCallback(
    (filterKey, value) => {
      const newFilters = { ...filters, [filterKey]: value };

      // Update URL immediately without debounce
      const params = new URLSearchParams();
      const paramMapping = {
        searchQuery: "search",
        sizeFilter: "size",
        ageFilter: "age",
        sexFilter: "sex",
        organizationFilter: "organization_id",
        availableCountryFilter: "available_country",
      };

      Object.entries(newFilters).forEach(([key, value]) => {
        const paramKey = paramMapping[key] || key;
        if (
          value &&
          value !== "Any" &&
          value !== "Any size" &&
          value !== "Any age" &&
          value !== "Any country" &&
          value !== "any"
        ) {
          params.set(paramKey, value);
        }
      });

      const newURL = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;
      router.push(newURL, { scroll: false });

      // Fetch immediately
      fetchDogsWithFilters(newFilters);
    },
    [filters, pathname, router, fetchDogsWithFilters],
  );

  // Load more dogs with race condition protection
  const loadMoreDogs = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError(null);

    // Snapshot filters to detect changes during request
    const filtersSnapshot = JSON.stringify(filters);

    try {
      const nextPage = page + 1;
      const offset = (nextPage - 1) * ITEMS_PER_PAGE;

      const params = {
        limit: ITEMS_PER_PAGE,
        offset,
        ...buildAPIParams(filters),
      };

      const response = await getAnimals(params);
      const newDogs = response?.results || response || [];

      // Discard response if filters changed during request
      if (filtersSnapshot !== JSON.stringify(filters)) {
        if (process.env.NODE_ENV === "development") {
          console.log("Filters changed during load more, discarding response");
        }
        return;
      }

      startTransition(() => {
        setDogs((prev) => [...prev, ...newDogs]);
        setHasMore(newDogs.length === ITEMS_PER_PAGE);
        setPage(nextPage);
      });
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to load more dogs:", err);
      }
      setError("Could not load more dogs. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, filters, loadingMore, buildAPIParams]);

  // Initial load with filter counts - only on mount
  useEffect(() => {
    if (!initialDogs || initialDogs.length === 0) {
      fetchDogsWithFilters(filters);
    } else {
      // Just fetch counts if we have initial dogs
      const params = buildAPIParams(filters);
      getFilterCounts(params)
        .then((counts) => {
          setFilterCounts(counts);
        })
        .catch((err) => {
          if (process.env.NODE_ENV === "development") {
            console.error("Failed to load filter counts:", err);
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup debounced callbacks on unmount
  useEffect(() => {
    return () => {
      debouncedFetchDogs.cancel?.();
      updateURL.cancel?.();
    };
  }, [debouncedFetchDogs, updateURL]);

  // Calculate active filter count
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) =>
      value && !value.includes("Any") && value !== "any" && value !== "",
  ).length;

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Breeds", url: "/breeds" },
    {
      name: breedData.primary_breed,
      url:
        breedData.breed_slug === "mixed"
          ? "/breeds/mixed"
          : `/breeds/${breedData.breed_slug}`,
    },
  ];

  // Get breed-specific filter options
  const filterOptions = React.useMemo(
    () => getBreedFilterOptions(breedData, { organizations: [] }),
    [breedData],
  );

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8 lg:mb-12 mt-4 lg:mt-6">
          <BreedPhotoGallery
            dogs={breedData.topDogs}
            breedName={breedData.primary_breed}
            className="w-full order-2 lg:order-1"
          />

          <BreedInfo breedData={breedData} className="order-1 lg:order-2" />
        </div>

        {/* Breed Description Section */}
        {(() => {
          const description = getBreedDescription(breedData.primary_breed);
          return description ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-2xl font-bold mb-4">
                About the {breedData.primary_breed}
              </h2>
              <ExpandableText
                text={description}
                lines={4}
                className="text-gray-700 dark:text-gray-300"
              />
            </div>
          ) : null;
        })()}

        {/* Personality Profile with Horizontal Bar Charts */}
        <PersonalityBarChart breedData={breedData} />

        {/* Common Traits Section */}
        {breedData.personality_traits &&
          breedData.personality_traits.length > 0 && (
            <CommonTraits personalityTraits={breedData.personality_traits} />
          )}

        {/* Experience Level with Visual Bars */}
        {breedData.experience_distribution && (
          <ExperienceLevelChart
            experienceDistribution={breedData.experience_distribution}
          />
        )}

        {/* Breed filter bar for quick filters */}
        <BreedFilterBar
          breedData={breedData}
          filters={filters}
          filterCounts={filterCounts}
          onFilterChange={handleFilterChange}
          onClearFilters={() => router.push(pathname)}
          onOpenMobileFilters={() => setIsFilterDrawerOpen(true)}
          activeFilterCount={activeFilterCount}
        />

        {/* Main content area with DogsGrid - no sidebar */}
        <div>
          {error && (
            <div
              role="alert"
              className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded"
            >
              {error}
            </div>
          )}
          {dogs.length === 0 && !loading ? (
            <EmptyState
              {...getBreedEmptyStateConfig(breedData, activeFilterCount > 0)}
              onAction={() => {
                if (activeFilterCount > 0) {
                  router.push(pathname);
                } else {
                  // Trigger breed alert save via ref
                  breedAlertButtonRef.current?.click();
                }
              }}
            />
          ) : (
            <div id="dogs-grid">
              <DogsGrid
                dogs={dogs}
                loading={loading && dogs.length === 0}
                loadingType="filter"
                listContext="breed-page"
              />
            </div>
          )}

          {/* Load more button */}
          {hasMore && !loading && dogs.length > 0 && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={loadMoreDogs}
                disabled={loadingMore}
                variant="outline"
                size="lg"
              >
                {loadingMore ? (
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
        </div>

        {/* Mobile filter drawer */}
        <MobileFilterDrawer
          isOpen={isFilterDrawerOpen}
          onClose={() => {
            setIsFilterDrawerOpen(false);
            // Scroll to dogs grid after closing
            setTimeout(() => {
              document.getElementById("dogs-grid")?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
            }, 300); // Wait for drawer animation to complete
          }}
          // Filter config to hide breed selector on breed page
          filterConfig={{
            showAge: true,
            showBreed: false,
            showSort: false,
            showSize: true,
            showSex: true,
            showShipsTo: true,
            showOrganization: true,
            showSearch: true,
          }}
          // Search
          searchQuery={filters.searchQuery}
          handleSearchChange={(value) =>
            handleMobileFilterChange("searchQuery", value)
          }
          clearSearch={() => handleMobileFilterChange("searchQuery", "")}
          // Organization
          organizationFilter={filters.organizationFilter}
          setOrganizationFilter={(value) =>
            handleMobileFilterChange("organizationFilter", value)
          }
          organizations={filterOptions.organizations}
          // Hide breed filter since it's locked
          showBreed={false}
          standardizedBreeds={[]} // Pass empty array since we're not showing breed filter
          // Pet Details
          sexFilter={filters.sexFilter}
          setSexFilter={(value) => handleMobileFilterChange("sexFilter", value)}
          sexOptions={["Any", "Male", "Female"]}
          sizeFilter={filters.sizeFilter}
          setSizeFilter={(value) =>
            handleMobileFilterChange("sizeFilter", value)
          }
          sizeOptions={[
            "Any size",
            "Tiny",
            "Small",
            "Medium",
            "Large",
            "Extra Large",
          ]}
          ageCategoryFilter={filters.ageFilter}
          setAgeCategoryFilter={(value) =>
            handleMobileFilterChange("ageFilter", value)
          }
          ageOptions={["Any age", "Puppy", "Young", "Adult", "Senior"]}
          // Location
          availableCountryFilter={filters.availableCountryFilter}
          setAvailableCountryFilter={(value) =>
            handleMobileFilterChange("availableCountryFilter", value)
          }
          availableCountries={["Any country"]}
          // Filter management
          resetFilters={() => router.push(pathname)}
          // Dynamic filter counts
          filterCounts={filterCounts}
        />
      </div>
    </Layout>
  );
}
