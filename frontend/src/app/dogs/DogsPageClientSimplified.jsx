"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  startTransition,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import Layout from "../../components/layout/Layout";
import DogCardOptimized from "../../components/dogs/DogCardOptimized";
import DogCardErrorBoundary from "../../components/error/DogCardErrorBoundary";
import DogCardSkeletonOptimized from "../../components/ui/DogCardSkeletonOptimized";
import EmptyState from "../../components/ui/EmptyState";
import {
  getAnimals,
  getFilterCounts,
  getAvailableRegions,
} from "../../services/animalsService";
import { Button } from "@/components/ui/button";
import { Filter, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import { BreadcrumbSchema } from "../../components/seo";
import { useDebouncedCallback } from "use-debounce";

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

const ITEMS_PER_PAGE = 20;

export default function DogsPageClientSimplified({
  initialDogs = [],
  metadata = {},
  initialParams = {},
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Validate organization_id parameter against available organizations
  const validateOrganizationId = (orgId) => {
    if (!orgId || orgId === "any") return "any";

    const organizations = metadata?.organizations || [];
    const isValidOrg = organizations.some(
      (org) => org.id?.toString() === orgId || org.id === parseInt(orgId, 10),
    );

    return isValidOrg ? orgId : "any";
  };

  // Parse filters from URL
  const filters = {
    searchQuery: searchParams.get("search") || "",
    sizeFilter: searchParams.get("size") || "Any size",
    ageFilter: searchParams.get("age") || "Any age",
    sexFilter: searchParams.get("sex") || "Any",
    organizationFilter: validateOrganizationId(
      searchParams.get("organization_id"),
    ),
    breedFilter: searchParams.get("breed") || "Any breed",
    breedGroupFilter: searchParams.get("breed_group") || "Any group",
    locationCountryFilter:
      searchParams.get("location_country") || "Any country",
    availableCountryFilter:
      searchParams.get("available_country") || "Any country",
    availableRegionFilter: searchParams.get("available_region") || "Any region",
  };

  // State management
  const [dogs, setDogs] = useState(initialDogs);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(initialDogs.length === ITEMS_PER_PAGE);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [filterCounts, setFilterCounts] = useState(null);
  const [availableRegions, setAvailableRegions] = useState(["Any region"]);
  const [page, setPage] = useState(1);

  // Local breed input state for fallback handling
  const [localBreedInput, setLocalBreedInput] = useState(
    filters.breedFilter === "Any breed" ? "" : filters.breedFilter,
  );

  // Update URL with filters (debounced)
  const updateURL = useDebouncedCallback((newFilters) => {
    const params = new URLSearchParams();

    Object.entries(newFilters).forEach(([key, value]) => {
      const paramKey = key
        .replace("Filter", "")
        .replace(/([A-Z])/g, "_$1")
        .toLowerCase();
      if (
        value &&
        value !== "Any" &&
        value !== "Any size" &&
        value !== "Any age" &&
        value !== "Any breed" &&
        value !== "Any country" &&
        value !== "Any region" &&
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

  // Build API params from filters
  const buildAPIParams = (filters) => {
    const params = {};

    if (filters.searchQuery) params.search = filters.searchQuery;
    if (filters.sizeFilter !== "Any size") params.size = filters.sizeFilter;
    if (filters.ageFilter !== "Any age") params.age = filters.ageFilter;
    if (filters.sexFilter !== "Any") params.sex = filters.sexFilter;
    if (filters.organizationFilter !== "any")
      params.organization_id = filters.organizationFilter;
    if (filters.breedFilter !== "Any breed")
      params.standardized_breed = filters.breedFilter;
    if (filters.breedGroupFilter !== "Any group")
      params.breed_group = filters.breedGroupFilter;
    if (filters.locationCountryFilter !== "Any country")
      params.location_country = filters.locationCountryFilter;
    if (filters.availableCountryFilter !== "Any country")
      params.available_country = filters.availableCountryFilter;
    if (filters.availableRegionFilter !== "Any region")
      params.available_region = filters.availableRegionFilter;

    return params;
  };

  // Handle filter changes
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

      // Fetch with new filters
      fetchDogsWithFilters(newFilters);
    },
    [filters, updateURL],
  );

  // Fetch dogs with current filters
  const fetchDogsWithFilters = async (currentFilters) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        limit: ITEMS_PER_PAGE,
        offset: 0,
        ...buildAPIParams(currentFilters),
      };

      const [newDogs, counts] = await Promise.all([
        getAnimals(params),
        getFilterCounts(params),
      ]);

      startTransition(() => {
        setDogs(newDogs);
        setHasMore(newDogs.length === ITEMS_PER_PAGE);
        setFilterCounts(counts);
        setPage(1);
      });
    } catch (err) {
      setError("Failed to load dogs");
    } finally {
      setLoading(false);
    }
  };

  // Load more dogs
  const loadMoreDogs = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);

    try {
      const nextPage = page + 1;
      const offset = (nextPage - 1) * ITEMS_PER_PAGE;

      const params = {
        limit: ITEMS_PER_PAGE,
        offset,
        ...buildAPIParams(filters),
      };

      const newDogs = await getAnimals(params);

      startTransition(() => {
        setDogs((prev) => [...prev, ...newDogs]);
        setHasMore(newDogs.length === ITEMS_PER_PAGE);
        setPage(nextPage);
      });
    } catch (err) {
      setError("Failed to load more dogs");
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, filters, loadingMore]);

  // Sync local breed input with URL filter changes (e.g., browser back/forward)
  useEffect(() => {
    const urlBreed =
      filters.breedFilter === "Any breed" ? "" : filters.breedFilter;
    if (urlBreed !== localBreedInput) {
      setLocalBreedInput(urlBreed);
    }
  }, [filters.breedFilter, localBreedInput]);

  // Load available regions when country changes
  useEffect(() => {
    if (
      filters.availableCountryFilter &&
      filters.availableCountryFilter !== "Any country"
    ) {
      getAvailableRegions(filters.availableCountryFilter)
        .then((regions) => {
          setAvailableRegions(["Any region", ...regions]);
        })
        .catch(() => {
          setAvailableRegions(["Any region"]);
        });
    } else {
      setAvailableRegions(["Any region"]);
    }
  }, [filters.availableCountryFilter]);

  // Local breed handlers to prevent heavy parent logic interference during typing
  const handleBreedSuggestionSelect = useCallback(
    (breed) => {
      setLocalBreedInput(breed);
      // Only trigger heavy parent logic when user actually selects a suggestion
      handleFilterChange("breedFilter", breed);
    },
    [handleFilterChange],
  );

  const handleBreedSearch = useCallback(
    (breed) => {
      setLocalBreedInput(breed);
      // Only trigger heavy parent logic when user performs explicit search (Enter key)
      handleFilterChange("breedFilter", breed);
    },
    [handleFilterChange],
  );

  // Handler for real-time typing that updates filter immediately like Name filter
  const handleBreedValueChange = useCallback(
    (breed) => {
      // Update both local state and actual filter, just like Name filter does
      setLocalBreedInput(breed);
      handleFilterChange("breedFilter", breed);
    },
    [handleFilterChange],
  );

  const handleBreedClear = useCallback(() => {
    setLocalBreedInput("");
    handleFilterChange("breedFilter", "Any breed");
  }, [handleFilterChange]);

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Find Dogs", href: "/dogs", current: true },
  ];

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) =>
      value && !value.includes("Any") && value !== "any" && value !== "",
  ).length;

  return (
    <Layout>
      <BreadcrumbSchema items={breadcrumbItems} />
      <div
        data-testid="dogs-page-container"
        className="container mx-auto px-4 py-6 lg:py-8"
      >
        <Breadcrumbs items={breadcrumbItems} />

        <div className="mt-6 mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
            Find Your New Best Friend
          </h1>
        </div>

        {/* Mobile filter button */}
        <div className="lg:hidden mb-4">
          <Button
            onClick={() => setIsSheetOpen(true)}
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

        <div className="flex gap-8">
          {/* Desktop filters sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <DesktopFilters
              // Search
              searchQuery={filters.searchQuery}
              handleSearchChange={(value) =>
                handleFilterChange("searchQuery", value)
              }
              clearSearch={() => handleFilterChange("searchQuery", "")}
              // Organization
              organizationFilter={filters.organizationFilter}
              setOrganizationFilter={(value) =>
                handleFilterChange("organizationFilter", value)
              }
              organizations={
                metadata?.organizations || [
                  { id: null, name: "Any organization" },
                ]
              }
              // Breed (using actual filter state like Name filter)
              standardizedBreedFilter={filters.breedFilter}
              setStandardizedBreedFilter={handleBreedSuggestionSelect}
              handleBreedSearch={handleBreedSearch}
              handleBreedClear={handleBreedClear}
              handleBreedValueChange={handleBreedValueChange}
              standardizedBreeds={metadata?.standardizedBreeds || ["Any breed"]}
              // Pet Details
              sexFilter={filters.sexFilter}
              setSexFilter={(value) => handleFilterChange("sexFilter", value)}
              sexOptions={["Any", "Male", "Female"]}
              sizeFilter={filters.sizeFilter}
              setSizeFilter={(value) => handleFilterChange("sizeFilter", value)}
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
                handleFilterChange("ageFilter", value)
              }
              ageOptions={["Any age", "Puppy", "Young", "Adult", "Senior"]}
              // Location
              locationCountryFilter={filters.locationCountryFilter}
              setLocationCountryFilter={(value) =>
                handleFilterChange("locationCountryFilter", value)
              }
              locationCountries={metadata?.locationCountries || ["Any country"]}
              availableCountryFilter={filters.availableCountryFilter}
              setAvailableCountryFilter={(value) =>
                handleFilterChange("availableCountryFilter", value)
              }
              availableCountries={
                metadata?.availableCountries || ["Any country"]
              }
              availableRegionFilter={filters.availableRegionFilter}
              setAvailableRegionFilter={(value) =>
                handleFilterChange("availableRegionFilter", value)
              }
              availableRegions={availableRegions}
              // Filter management
              resetFilters={() => router.push("/dogs")}
              // Dynamic filter counts
              filterCounts={filterCounts}
            />
          </aside>

          {/* Main content area */}
          <div className="flex-1 min-w-0">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {dogs.length === 0 && !loading ? (
              <EmptyState
                title="No dogs found"
                description="Try adjusting your filters or search terms"
                actionLabel="Clear filters"
                onAction={() => router.push("/dogs")}
              />
            ) : (
              <>
                {/* Simple responsive grid */}
                <div
                  data-testid="dogs-grid"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                  {dogs.map((dog, index) => (
                    <DogCardErrorBoundary key={dog.id || index}>
                      <DogCardOptimized
                        dog={dog}
                        priority={index < 4}
                        animationDelay={index % 8}
                        compact={false}
                      />
                    </DogCardErrorBoundary>
                  ))}
                </div>

                {/* Loading skeleton for initial load */}
                {loading && dogs.length === 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                      <DogCardSkeletonOptimized key={i} />
                    ))}
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

                {/* Loading indicator for load more */}
                {loadingMore && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Mobile filter drawer */}
        <MobileFilterDrawer
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          // Search
          searchQuery={filters.searchQuery}
          handleSearchChange={(value) =>
            handleFilterChange("searchQuery", value)
          }
          clearSearch={() => handleFilterChange("searchQuery", "")}
          // Organization
          organizationFilter={filters.organizationFilter}
          setOrganizationFilter={(value) =>
            handleFilterChange("organizationFilter", value)
          }
          organizations={
            metadata?.organizations || [{ id: null, name: "Any organization" }]
          }
          // Breed (using actual filter state like Name filter)
          standardizedBreedFilter={filters.breedFilter}
          setStandardizedBreedFilter={handleBreedSuggestionSelect}
          handleBreedSearch={handleBreedSearch}
          handleBreedClear={handleBreedClear}
          handleBreedValueChange={handleBreedValueChange}
          standardizedBreeds={metadata?.standardizedBreeds || ["Any breed"]}
          // Pet Details
          sexFilter={filters.sexFilter}
          setSexFilter={(value) => handleFilterChange("sexFilter", value)}
          sexOptions={["Any", "Male", "Female"]}
          sizeFilter={filters.sizeFilter}
          setSizeFilter={(value) => handleFilterChange("sizeFilter", value)}
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
            handleFilterChange("ageFilter", value)
          }
          ageOptions={["Any age", "Puppy", "Young", "Adult", "Senior"]}
          // Location
          locationCountryFilter={filters.locationCountryFilter}
          setLocationCountryFilter={(value) =>
            handleFilterChange("locationCountryFilter", value)
          }
          locationCountries={metadata?.locationCountries || ["Any country"]}
          availableCountryFilter={filters.availableCountryFilter}
          setAvailableCountryFilter={(value) =>
            handleFilterChange("availableCountryFilter", value)
          }
          availableCountries={metadata?.availableCountries || ["Any country"]}
          availableRegionFilter={filters.availableRegionFilter}
          setAvailableRegionFilter={(value) =>
            handleFilterChange("availableRegionFilter", value)
          }
          availableRegions={availableRegions}
          // Filter management
          resetFilters={() => router.push("/dogs")}
          // Dynamic filter counts
          filterCounts={filterCounts}
        />
      </div>
    </Layout>
  );
}
