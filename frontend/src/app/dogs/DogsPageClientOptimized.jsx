"use client";

import React, { useState, useEffect, useCallback, useRef, startTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { FixedSizeGrid as Grid } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";
import AutoSizer from "react-virtualized-auto-sizer";
import Layout from "../../components/layout/Layout";
import DogCardOptimized from "../../components/dogs/DogCardOptimized";
import DogCardErrorBoundary from "../../components/error/DogCardErrorBoundary";
import DogCardSkeletonOptimized from "../../components/ui/DogCardSkeletonOptimized";
import EmptyState from "../../components/ui/EmptyState";
import { getAnimals, getFilterCounts, getAvailableRegions } from "../../services/animalsService";
import { Button } from "@/components/ui/button";
import { Filter, X, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import { BreadcrumbSchema } from "../../components/seo";
import { useDebouncedCallback } from "use-debounce";

// Lazy load filter components for better initial load
const FilterControls = dynamic(() => import("../../components/dogs/FilterControls"), {
  loading: () => <div className="h-12 bg-muted animate-pulse rounded" />,
  ssr: false,
});

const DesktopFilters = dynamic(() => import("../../components/filters/DesktopFilters"), {
  loading: () => <div className="w-64 h-96 bg-muted animate-pulse rounded" />,
  ssr: false,
});

const MobileFilterDrawer = dynamic(() => import("../../components/filters/MobileFilterDrawer"), {
  loading: () => null,
  ssr: false,
});

const ITEMS_PER_PAGE = 20;
const PREFETCH_THRESHOLD = 5; // Prefetch when 5 items from end

export default function DogsPageClientOptimized({ 
  initialDogs = [], 
  metadata = {},
  initialParams = {} 
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // State management
  const [dogs, setDogs] = useState(initialDogs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(initialDogs.length === ITEMS_PER_PAGE);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [filterCounts, setFilterCounts] = useState(null);
  const [availableRegions, setAvailableRegions] = useState(["Any region"]);
  
  // Refs for infinite loading
  const loadMoreRef = useRef(null);
  const nextPageDataRef = useRef(null);
  const isLoadingMoreRef = useRef(false);
  const currentPageRef = useRef(1);
  
  // Parse filters from URL
  const filters = {
    searchQuery: searchParams.get("search") || "",
    sizeFilter: searchParams.get("size") || "Any size",
    ageFilter: searchParams.get("age") || "Any age",
    sexFilter: searchParams.get("sex") || "Any",
    organizationFilter: searchParams.get("organization_id") || "any",
    breedFilter: searchParams.get("breed") || "Any breed",
    locationCountryFilter: searchParams.get("location_country") || "Any country",
    availableCountryFilter: searchParams.get("available_country") || "Any country",
    availableRegionFilter: searchParams.get("available_region") || "Any region",
  };

  // Update URL with filters (debounced)
  const updateURL = useDebouncedCallback((newFilters) => {
    const params = new URLSearchParams();
    
    Object.entries(newFilters).forEach(([key, value]) => {
      const paramKey = key.replace("Filter", "").replace(/([A-Z])/g, "_$1").toLowerCase();
      if (value && value !== "Any" && value !== "Any size" && value !== "Any age" && 
          value !== "Any breed" && value !== "Any country" && value !== "Any region" && 
          value !== "any") {
        params.set(paramKey, value);
      }
    });

    const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newURL, { scroll: false });
  }, 500);

  // Prefetch next page data
  const prefetchNextPage = useCallback(async () => {
    if (nextPageDataRef.current || !hasMore) return;
    
    const nextPage = currentPageRef.current + 1;
    const offset = (nextPage - 1) * ITEMS_PER_PAGE;
    
    try {
      const params = {
        limit: ITEMS_PER_PAGE,
        offset,
        ...buildAPIParams(filters),
      };
      
      const data = await getAnimals(params);
      nextPageDataRef.current = data;
    } catch (err) {
      console.error("Prefetch error:", err);
    }
  }, [hasMore, filters]);

  // Load more dogs (with prefetched data if available)
  const loadMoreDogs = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMore) return;
    
    isLoadingMoreRef.current = true;
    setLoading(true);
    
    try {
      let newDogs;
      
      if (nextPageDataRef.current) {
        // Use prefetched data
        newDogs = nextPageDataRef.current;
        nextPageDataRef.current = null;
      } else {
        // Fetch on demand
        const nextPage = currentPageRef.current + 1;
        const offset = (nextPage - 1) * ITEMS_PER_PAGE;
        
        const params = {
          limit: ITEMS_PER_PAGE,
          offset,
          ...buildAPIParams(filters),
        };
        
        newDogs = await getAnimals(params);
      }
      
      startTransition(() => {
        setDogs(prev => [...prev, ...newDogs]);
        setHasMore(newDogs.length === ITEMS_PER_PAGE);
        currentPageRef.current += 1;
      });
      
      // Prefetch next page
      if (newDogs.length === ITEMS_PER_PAGE) {
        setTimeout(prefetchNextPage, 100);
      }
    } catch (err) {
      setError("Failed to load more dogs");
    } finally {
      isLoadingMoreRef.current = false;
      setLoading(false);
    }
  }, [hasMore, filters, prefetchNextPage]);

  // Build API params from filters
  const buildAPIParams = (filters) => {
    const params = {};
    
    if (filters.searchQuery) params.search = filters.searchQuery;
    if (filters.sizeFilter !== "Any size") params.size = filters.sizeFilter;
    if (filters.ageFilter !== "Any age") params.age = filters.ageFilter;
    if (filters.sexFilter !== "Any") params.sex = filters.sexFilter;
    if (filters.organizationFilter !== "any") params.organization_id = filters.organizationFilter;
    if (filters.breedFilter !== "Any breed") params.breed = filters.breedFilter;
    if (filters.locationCountryFilter !== "Any country") params.location_country = filters.locationCountryFilter;
    if (filters.availableCountryFilter !== "Any country") params.available_country = filters.availableCountryFilter;
    if (filters.availableRegionFilter !== "Any region") params.available_region = filters.availableRegionFilter;
    
    return params;
  };

  // Handle filter changes
  const handleFilterChange = useCallback((filterKey, value) => {
    const newFilters = { ...filters, [filterKey]: value };
    updateURL(newFilters);
    
    // Reset and reload with new filters
    startTransition(() => {
      setDogs([]);
      currentPageRef.current = 1;
      nextPageDataRef.current = null;
    });
    
    // Fetch with new filters
    fetchDogsWithFilters(newFilters);
  }, [filters, updateURL]);

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
        currentPageRef.current = 1;
      });
      
      // Prefetch next page if we have a full page
      if (newDogs.length === ITEMS_PER_PAGE) {
        setTimeout(prefetchNextPage, 100);
      }
    } catch (err) {
      setError("Failed to load dogs");
    } finally {
      setLoading(false);
    }
  };

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMoreRef.current) {
          loadMoreDogs();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    
    observer.observe(loadMoreRef.current);
    
    return () => observer.disconnect();
  }, [hasMore, loadMoreDogs]);

  // Virtualized grid renderer
  const Cell = ({ columnIndex, rowIndex, style, data }) => {
    const { items, columnCount } = data;
    const index = rowIndex * columnCount + columnIndex;
    
    if (index >= items.length) return null;
    
    const dog = items[index];
    const isLastRow = index >= items.length - columnCount;
    
    return (
      <div style={style} className="p-3">
        <DogCardErrorBoundary>
          <DogCardOptimized
            dog={dog}
            priority={index < 4}
            animationDelay={0}
            isVirtualized={true}
          />
        </DogCardErrorBoundary>
        
        {/* Trigger prefetch when near end */}
        {isLastRow && index === items.length - PREFETCH_THRESHOLD && (
          <div ref={loadMoreRef} className="sr-only">Load more trigger</div>
        )}
      </div>
    );
  };

  // Calculate grid dimensions
  const getColumnCount = (width) => {
    if (width < 640) return 1; // Mobile
    if (width < 1024) return 2; // Tablet
    if (width < 1280) return 3; // Desktop
    return 4; // Wide desktop
  };

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Find Dogs", href: "/dogs", current: true },
  ];

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value && !value.includes("Any") && value !== "any" && value !== ""
  ).length;

  return (
    <Layout>
      <BreadcrumbSchema items={breadcrumbItems} />
      <div className="container mx-auto px-4 py-6 lg:py-8">
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
              handleSearchChange={(value) => handleFilterChange("searchQuery", value)}
              clearSearch={() => handleFilterChange("searchQuery", "")}
              
              // Organization
              organizationFilter={filters.organizationFilter}
              setOrganizationFilter={(value) => handleFilterChange("organizationFilter", value)}
              organizations={metadata?.organizations || [{ id: null, name: 'Any organization' }]}
              
              // Breed
              standardizedBreedFilter={filters.breedFilter}
              setStandardizedBreedFilter={(value) => handleFilterChange("breedFilter", value)}
              standardizedBreeds={metadata?.standardizedBreeds || ["Any breed"]}
              
              // Pet Details
              sexFilter={filters.sexFilter}
              setSexFilter={(value) => handleFilterChange("sexFilter", value)}
              sexOptions={["Any", "Male", "Female"]}
              
              sizeFilter={filters.sizeFilter}
              setSizeFilter={(value) => handleFilterChange("sizeFilter", value)}
              sizeOptions={["Any size", "Tiny", "Small", "Medium", "Large", "Extra Large"]}
              
              ageCategoryFilter={filters.ageFilter}
              setAgeCategoryFilter={(value) => handleFilterChange("ageFilter", value)}
              ageOptions={["Any age", "Puppy", "Young", "Adult", "Senior"]}
              
              // Location
              locationCountryFilter={filters.locationCountryFilter}
              setLocationCountryFilter={(value) => handleFilterChange("locationCountryFilter", value)}
              locationCountries={metadata?.locationCountries || ["Any country"]}
              
              availableCountryFilter={filters.availableCountryFilter}
              setAvailableCountryFilter={(value) => handleFilterChange("availableCountryFilter", value)}
              availableCountries={metadata?.availableCountries || ["Any country"]}
              
              availableRegionFilter={filters.availableRegionFilter}
              setAvailableRegionFilter={(value) => handleFilterChange("availableRegionFilter", value)}
              availableRegions={availableRegions}
              
              // Filter management
              resetFilters={() => router.push("/dogs")}
              
              // Dynamic filter counts
              filterCounts={filterCounts}
            />
          </aside>

          {/* Main content area with virtualized grid */}
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
              <div className="virtual-scroll-container" style={{ height: "calc(100vh - 200px)" }}>
                <AutoSizer>
                  {({ height, width }) => {
                    const columnCount = getColumnCount(width);
                    const rowCount = Math.ceil(dogs.length / columnCount);
                    const rowHeight = width < 640 ? 180 : 420;
                    
                    return (
                      <InfiniteLoader
                        isItemLoaded={(index) => index < dogs.length}
                        itemCount={hasMore ? dogs.length + ITEMS_PER_PAGE : dogs.length}
                        loadMoreItems={loadMoreDogs}
                      >
                        {({ onItemsRendered, ref }) => (
                          <Grid
                            ref={ref}
                            columnCount={columnCount}
                            columnWidth={width / columnCount}
                            height={height}
                            rowCount={rowCount}
                            rowHeight={rowHeight}
                            width={width}
                            onItemsRendered={({ visibleRowStartIndex, visibleRowStopIndex }) => {
                              onItemsRendered({
                                visibleStartIndex: visibleRowStartIndex * columnCount,
                                visibleStopIndex: visibleRowStopIndex * columnCount + columnCount - 1,
                              });
                            }}
                            itemData={{ items: dogs, columnCount }}
                            className="scrollbar-thin"
                          >
                            {Cell}
                          </Grid>
                        )}
                      </InfiniteLoader>
                    );
                  }}
                </AutoSizer>
              </div>
            )}

            {loading && dogs.length === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <DogCardSkeletonOptimized key={i} />
                ))}
              </div>
            )}

            {loading && dogs.length > 0 && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
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
          setOrganizationFilter={(value) => handleFilterChange("organizationFilter", value)}
          organizations={metadata?.organizations || [{ id: null, name: 'Any organization' }]}
          
          // Breed
          standardizedBreedFilter={filters.breedFilter}
          setStandardizedBreedFilter={(value) => handleFilterChange("breedFilter", value)}
          standardizedBreeds={metadata?.standardizedBreeds || ["Any breed"]}
          
          // Pet Details
          sexFilter={filters.sexFilter}
          setSexFilter={(value) => handleFilterChange("sexFilter", value)}
          sexOptions={["Any", "Male", "Female"]}
          
          sizeFilter={filters.sizeFilter}
          setSizeFilter={(value) => handleFilterChange("sizeFilter", value)}
          sizeOptions={["Any size", "Tiny", "Small", "Medium", "Large", "Extra Large"]}
          
          ageCategoryFilter={filters.ageFilter}
          setAgeCategoryFilter={(value) => handleFilterChange("ageFilter", value)}
          ageOptions={["Any age", "Puppy", "Young", "Adult", "Senior"]}
          
          // Location
          locationCountryFilter={filters.locationCountryFilter}
          setLocationCountryFilter={(value) => handleFilterChange("locationCountryFilter", value)}
          locationCountries={metadata?.locationCountries || ["Any country"]}
          
          availableCountryFilter={filters.availableCountryFilter}
          setAvailableCountryFilter={(value) => handleFilterChange("availableCountryFilter", value)}
          availableCountries={metadata?.availableCountries || ["Any country"]}
          
          availableRegionFilter={filters.availableRegionFilter}
          setAvailableRegionFilter={(value) => handleFilterChange("availableRegionFilter", value)}
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