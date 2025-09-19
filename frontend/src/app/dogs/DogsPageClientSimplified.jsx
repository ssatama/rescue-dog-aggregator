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
import DogsPageViewportWrapper from "../../components/dogs/DogsPageViewportWrapper";
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

const PremiumMobileCatalog = dynamic(
  () => import("../../components/dogs/mobile/catalog/PremiumMobileCatalog"),
  {
    loading: () => <div className="min-h-screen bg-gray-50 animate-pulse" />,
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

  // Parse filters from URL including page and scroll
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

  // Parse page and scroll from URL
  const urlPage = parseInt(searchParams.get("page") || "1", 10);
  const urlScroll = parseInt(searchParams.get("scroll") || "0", 10);

  // State management
  const [dogs, setDogs] = useState(initialDogs);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(initialDogs.length === ITEMS_PER_PAGE);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [filterCounts, setFilterCounts] = useState(null);
  const [availableRegions, setAvailableRegions] = useState(["Any region"]);
  const [page, setPage] = useState(urlPage);
  const scrollPositionRef = useRef(urlScroll);
  const isRestoringScroll = useRef(false);

  // Local breed input state for fallback handling
  const [localBreedInput, setLocalBreedInput] = useState(
    filters.breedFilter === "Any breed" ? "" : filters.breedFilter,
  );

  // Track scroll position
  const saveScrollPosition = useDebouncedCallback(() => {
    if (isRestoringScroll.current) return;
    const currentScroll = window.scrollY;
    scrollPositionRef.current = currentScroll;
    
    // Update URL with scroll position without causing navigation
    const params = new URLSearchParams(searchParams.toString());
    if (currentScroll > 0) {
      params.set("scroll", currentScroll.toString());
    } else {
      params.delete("scroll");
    }
    
    const newURL = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    
    window.history.replaceState(null, "", newURL);
  }, 300);

  // Listen to scroll events
  useEffect(() => {
    const handleScroll = () => {
      saveScrollPosition();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [saveScrollPosition]);

  // Restore scroll position when component mounts or URL changes
  useEffect(() => {
    if (urlScroll > 0) {
      isRestoringScroll.current = true;
      setTimeout(() => {
        window.scrollTo(0, urlScroll);
        isRestoringScroll.current = false;
      }, 100);
    }
  }, []); // Only on mount

  // Update URL with filters and page (debounced)
  const updateURL = useDebouncedCallback((newFilters, newPage = 1, preserveScroll = false) => {
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

    // Add page to URL if not first page
    if (newPage > 1) {
      params.set("page", newPage.toString());
    }

    // Preserve scroll position if requested
    if (preserveScroll && scrollPositionRef.current > 0) {
      params.set("scroll", scrollPositionRef.current.toString());
    }

    const newURL = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname;
    router.push(newURL, { scroll: false });
  }, 500);

  // Build API params from filters
  const buildAPIParams = (filters) => {
    const params = {};

    if (filters.searchQuery) params.search = filters.searchQuery;
    if (filters.sizeFilter !== "Any size") params.standardized_size = filters.sizeFilter;
    if (filters.ageFilter !== "Any age") params.age_category = filters.ageFilter;
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

  // Load initial dogs on mount or when URL filters/page change
  useEffect(() => {
    // Only fetch if we don't have initialDogs or URL has changed
    const needsFetch = 
      urlPage > 1 || // Need to load multiple pages
      dogs.length === 0 || // No dogs loaded
      JSON.stringify(filters) !== JSON.stringify(initialParams); // Filters changed from initial
    
    if (needsFetch) {
      // If page > 1, we need to load all pages up to current page
      if (urlPage > 1) {
        const loadAllPages = async () => {
          setLoading(true);
          try {
            const allDogs = [];
            
            // Load all pages up to current page
            for (let p = 1; p <= urlPage; p++) {
              const params = {
                limit: ITEMS_PER_PAGE,
                offset: (p - 1) * ITEMS_PER_PAGE,
                ...buildAPIParams(filters),
              };
              
              const pageDogs = await getAnimals(params);
              allDogs.push(...pageDogs);
              
              // If we get less than a full page, we've reached the end
              if (pageDogs.length < ITEMS_PER_PAGE) {
                setHasMore(false);
                break;
              }
            }
            
            startTransition(() => {
              setDogs(allDogs);
              setPage(urlPage);
              setHasMore(allDogs.length === urlPage * ITEMS_PER_PAGE);
            });
            
            // Also fetch filter counts
            const counts = await getFilterCounts(buildAPIParams(filters));
            setFilterCounts(counts);
          } catch (err) {
            setError("Failed to load dogs");
          } finally {
            setLoading(false);
          }
        };
        
        loadAllPages();
      } else {
        // Regular single page load
        fetchDogsWithFilters(filters, 1);
      }
    }
  }, []); // Only on mount

  // Handle filter changes - support both single and batch updates
  const handleFilterChange = useCallback(
    (filterKey, value) => {
      // Check if filterKey is an object (batch update)
      let newFilters;
      
      if (typeof filterKey === 'object' && filterKey !== null) {
        // Batch update - filterKey is actually an object with multiple filter updates
        newFilters = { ...filters, ...filterKey };
      } else {
        // Single update
        newFilters = { ...filters, [filterKey]: value };
      }
      
      // When filters change, reset to page 1 and clear scroll
      updateURL(newFilters, 1, false);

      // Reset and reload with new filters
      startTransition(() => {
        setDogs([]);
        setPage(1);
        setHasMore(true);
        scrollPositionRef.current = 0;
      });

      // Fetch with new filters
      fetchDogsWithFilters(newFilters, 1);
    },
    [filters, updateURL],
  );

  // Fetch dogs with current filters and page
  const fetchDogsWithFilters = async (currentFilters, pageNum = 1) => {
    setLoading(pageNum === 1);
    setLoadingMore(pageNum > 1);
    setError(null);

    try {
      const params = {
        limit: ITEMS_PER_PAGE,
        offset: (pageNum - 1) * ITEMS_PER_PAGE,
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
        setPage(pageNum);
      });
    } catch (err) {
      setError("Failed to load dogs");
    } finally {
      setLoading(false);
      setLoadingMore(false);
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
        
        // Update URL with new page number, preserving scroll
        updateURL(filters, nextPage, true);
      });
    } catch (err) {
      setError("Failed to load more dogs");
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, filters, loadingMore, updateURL]);

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

  const breadcrumbItems = [{ name: "Home", url: "/" }, { name: "Find Dogs" }];

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) =>
      value && !value.includes("Any") && value !== "any" && value !== "",
  ).length;

  return (
    <Layout>
      <BreadcrumbSchema items={breadcrumbItems} />

      {/* Mobile Sticky Header with Breadcrumb and Filter Button */}
      <div className="lg:hidden sticky top-[80px] z-20 bg-background dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {/* Add spacing at the top */}
        <div className="h-2 bg-background dark:bg-gray-900"></div>

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
            {activeFilterCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 px-2 py-0.5 text-xs font-bold min-w-[20px] h-5"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      <div
        data-testid="dogs-page-container"
        className="container mx-auto px-4 py-6 lg:py-8"
      >
        {/* Desktop Breadcrumbs - Hidden on Mobile */}
        <div className="hidden lg:block">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        {/* Desktop Page header */}
        <div className="mb-6 hidden lg:block">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Find Your New Best Friend
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-400">
            Browse adoptable dogs from trusted rescue organizations
          </p>
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

            {/* Dogs Grid */}
            <div
              className="relative flex-1 pb-8 -mx-4 px-4 md:mx-0 md:px-0"
              id="dogs-catalog"
            >
              {/* Loading state */}
              {loading && !dogs.length && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <DogCardSkeletonOptimized key={i} />
                  ))}
                </div>
              )}

              {/* Dogs list */}
              {dogs.length > 0 && (
                <DogsPageViewportWrapper
                  dogs={dogs}
                  loading={loading}
                  loadingMore={loadingMore}
                  onOpenFilter={() => setIsSheetOpen(true)}
                  onLoadMore={loadMoreDogs}
                  hasMore={hasMore}
                  filters={filters}
                  onFilterChange={handleFilterChange}
                />
              )}

              {/* Empty state */}
              {!loading && dogs.length === 0 && <EmptyState />}

              {/* Load more button - Hidden on mobile since it's handled in PremiumMobileCatalog */}
              <div className="hidden lg:block">
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
        searchQuery={filters.searchQuery}
        handleSearchChange={(value) => handleFilterChange("searchQuery", value)}
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
        setAgeCategoryFilter={(value) => handleFilterChange("ageFilter", value)}
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
    </Layout>
  );
}