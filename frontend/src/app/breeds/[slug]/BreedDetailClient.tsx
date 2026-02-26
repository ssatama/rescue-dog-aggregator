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
import dynamic from "next/dynamic";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import BreedPhotoGallery from "@/components/breeds/BreedPhotoGallery";
import { BreedInfo } from "@/components/breeds/BreedStatistics";
import { getAnimals, getFilterCounts } from "@/services/animalsService";
import { logger, reportError } from "@/utils/logger";
import { useDebouncedCallback } from "use-debounce";
import BreedFilterBar from "@/components/breeds/BreedFilterBar";
import { getBreedFilterOptions } from "@/utils/breedFilterUtils";
import EmptyState from "@/components/ui/EmptyState";
import PersonalityBarChart from "@/components/breeds/PersonalityBarChart";
import CommonTraits from "@/components/breeds/CommonTraits";
import ExperienceLevelChart from "@/components/breeds/ExperienceLevelChart";
import BreedDogsViewportWrapper from "@/components/breeds/BreedDogsViewportWrapper";
import type { Dog } from "@/types/dog";
import type {
  BreedDetailClientProps,
  BreedDetailFilterKey,
  BreedDetailFilters,
  BreedPageData,
  SampleDog,
} from "@/types/breeds";
import type { FilterCountsResponse } from "@/schemas/common";

const MobileFilterDrawer = dynamic(
  () => import("@/components/filters/MobileFilterDrawer"),
  {
    loading: () => null,
    ssr: false,
  },
);

const ITEMS_PER_PAGE = 12;

const SIZE_MAPPING: Record<string, string> = {
  Tiny: "Tiny",
  Small: "Small",
  Medium: "Medium",
  Large: "Large",
  "Extra Large": "XLarge",
};

const PARAM_MAPPING: Record<BreedDetailFilterKey, string> = {
  searchQuery: "search",
  sizeFilter: "size",
  ageFilter: "age",
  sexFilter: "sex",
  organizationFilter: "organization_id",
  availableCountryFilter: "available_to_country",
};

const DEFAULT_FILTERS: BreedDetailFilters = {
  searchQuery: "",
  sizeFilter: "Any size",
  ageFilter: "Any age",
  sexFilter: "Any",
  organizationFilter: "any",
  availableCountryFilter: "Any country",
};

function isDefaultFilterValue(value: string): boolean {
  return (
    !value ||
    value === "Any" ||
    value === "Any size" ||
    value === "Any age" ||
    value === "Any country" ||
    value === "any" ||
    value === ""
  );
}

function buildURLFromFilters(
  filters: BreedDetailFilters,
  pathname: string,
): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters) as [BreedDetailFilterKey, string][]) {
    const paramKey = PARAM_MAPPING[key] || key;
    if (!isDefaultFilterValue(value)) {
      params.set(paramKey, value);
    }
  }

  return params.toString() ? `${pathname}?${params.toString()}` : pathname;
}

export default function BreedDetailClient({
  initialBreedData,
  initialDogs,
  lastUpdated,
}: BreedDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const [breedData] = useState<BreedPageData>(initialBreedData);

  const filters = useMemo(
    (): BreedDetailFilters => ({
      searchQuery: searchParams?.get("search") || "",
      sizeFilter: searchParams?.get("size") || "Any size",
      ageFilter: searchParams?.get("age") || "Any age",
      sexFilter: searchParams?.get("sex") || "Any",
      organizationFilter: searchParams?.get("organization_id") || "any",
      availableCountryFilter:
        searchParams?.get("available_to_country") || "Any country",
    }),
    [searchParams],
  );

  const [dogs, setDogs] = useState<Dog[]>(initialDogs || []);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(
    (initialDogs || []).length === ITEMS_PER_PAGE,
  );
  const [page, setPage] = useState(1);
  const [filterCounts, setFilterCounts] = useState<FilterCountsResponse | null>(
    null,
  );
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const buildAPIParams = useCallback(
    (currentFilters: BreedDetailFilters): Record<string, string | number> => {
      const params: Record<string, string | number> = {};

      if (
        breedData.breed_slug === "mixed" ||
        breedData.breed_type === "mixed"
      ) {
        params.breed_group = "Mixed";
      } else {
        params.breed = breedData.primary_breed;
      }

      if (currentFilters.searchQuery)
        params.search = currentFilters.searchQuery;
      if (currentFilters.sizeFilter !== "Any size")
        params.standardized_size =
          SIZE_MAPPING[currentFilters.sizeFilter] || currentFilters.sizeFilter;
      if (currentFilters.ageFilter !== "Any age")
        params.age_category = currentFilters.ageFilter;
      if (currentFilters.sexFilter !== "Any")
        params.sex = currentFilters.sexFilter;
      if (currentFilters.organizationFilter !== "any")
        params.organization_id = currentFilters.organizationFilter;
      if (currentFilters.availableCountryFilter !== "Any country")
        params.available_to_country = currentFilters.availableCountryFilter;

      return params;
    },
    [breedData.breed_slug, breedData.breed_type, breedData.primary_breed],
  );

  const updateURL = useDebouncedCallback((newFilters: BreedDetailFilters) => {
    router.push(buildURLFromFilters(newFilters, pathname), { scroll: false });
  }, 500);

  const fetchDogsWithFilters = useCallback(
    async (currentFilters: BreedDetailFilters) => {
      const requestId = ++requestIdRef.current;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const isInitialLoad = dogs.length === 0;
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);

      try {
        const params = {
          limit: ITEMS_PER_PAGE,
          offset: 0,
          ...buildAPIParams(currentFilters),
        };

        const [response, counts] = await Promise.all([
          getAnimals(params, {
            signal: abortControllerRef.current.signal,
          }),
          getFilterCounts(params, {
            signal: abortControllerRef.current.signal,
          }),
        ]);

        if (requestId !== requestIdRef.current) return;

        const newDogs = Array.isArray(response) ? response : [];

        startTransition(() => {
          setDogs(newDogs);
          setHasMore(newDogs.length === ITEMS_PER_PAGE);
          setFilterCounts(counts);
          setPage(1);
          if (isInitialLoad) {
            setLoading(false);
          }
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;

        reportError(err, { context: "fetchDogsWithFilters" });
        if (requestId === requestIdRef.current) {
          setError("Could not load dogs. Please try again.");
          if (isInitialLoad) {
            setLoading(false);
          }
        }
      }
    },
    [buildAPIParams, dogs.length],
  );

  const debouncedFetchDogs = useDebouncedCallback(fetchDogsWithFilters, 300);

  const handleFilterChange = useCallback(
    (filterKey: string, value: string) => {
      const newFilters = { ...filters, [filterKey]: value };
      updateURL(newFilters);

      startTransition(() => {
        setPage(1);
        setHasMore(true);
      });

      debouncedFetchDogs(newFilters);
    },
    [filters, updateURL, debouncedFetchDogs],
  );

  const handleMobileFilterChange = useCallback(
    (filterKeyOrBatch: string | Record<string, string>, value?: string) => {
      let newFilters: BreedDetailFilters;

      if (typeof filterKeyOrBatch === "object") {
        newFilters = { ...filters, ...filterKeyOrBatch as Partial<BreedDetailFilters> };
      } else {
        newFilters = { ...filters, [filterKeyOrBatch]: value ?? "" } as BreedDetailFilters;
      }

      router.push(buildURLFromFilters(newFilters, pathname), { scroll: false });

      fetchDogsWithFilters(newFilters);
    },
    [filters, pathname, router, fetchDogsWithFilters],
  );

  const loadMoreDogs = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError(null);

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
      const newDogs = Array.isArray(response) ? response : [];

      if (filtersSnapshot !== JSON.stringify(filters)) {
        if (process.env.NODE_ENV === "development") {
          logger.log("Filters changed during load more, discarding response");
        }
        return;
      }

      startTransition(() => {
        setDogs((prev) => [...prev, ...newDogs]);
        setHasMore(newDogs.length === ITEMS_PER_PAGE);
        setPage(nextPage);
      });
    } catch (err: unknown) {
      reportError(err, { context: "loadMoreDogs" });
      setError("Could not load more dogs. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, filters, loadingMore, buildAPIParams]);

  const handleResetFilters = useCallback(() => {
    if (updateURL.cancel) updateURL.cancel();
    if (debouncedFetchDogs.cancel) debouncedFetchDogs.cancel();

    router.replace(pathname, { scroll: false });

    startTransition(() => {
      setDogs([]);
      setPage(1);
      setHasMore(true);
      setError(null);
    });

    fetchDogsWithFilters(DEFAULT_FILTERS);
  }, [router, pathname, updateURL, debouncedFetchDogs, fetchDogsWithFilters]);

  useEffect(() => {
    return () => {
      if (updateURL.cancel) updateURL.cancel();
      if (debouncedFetchDogs.cancel) debouncedFetchDogs.cancel();
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [updateURL, debouncedFetchDogs]);

  const fetchDogsWithFiltersRef = useRef(fetchDogsWithFilters);
  fetchDogsWithFiltersRef.current = fetchDogsWithFilters;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const buildAPIParamsRef = useRef(buildAPIParams);
  buildAPIParamsRef.current = buildAPIParams;

  useEffect(() => {
    if (!initialDogs || initialDogs.length === 0) {
      fetchDogsWithFiltersRef.current(filtersRef.current);
    } else {
      const params = buildAPIParamsRef.current(filtersRef.current);
      getFilterCounts(params)
        .then((counts) => {
          setFilterCounts(counts);
        })
        .catch((err: unknown) => {
          reportError(err, { context: "getFilterCounts" });
        });
    }
  }, [initialDogs]);

  useEffect(() => {
    return () => {
      debouncedFetchDogs.cancel?.();
      updateURL.cancel?.();
    };
  }, [debouncedFetchDogs, updateURL]);

  const activeFilterCount = Object.values(filters).filter(
    (value) =>
      value &&
      !value.includes("Any") &&
      !value.includes("All") &&
      value !== "any" &&
      value !== "",
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

  const filterOptions = React.useMemo(
    () => getBreedFilterOptions(breedData, { organizations: [] }),
    [breedData],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs items={breadcrumbItems} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-8 lg:mb-12 mt-6 lg:mt-8">
          <BreedPhotoGallery
            dogs={(breedData.topDogs ?? [])
              .filter(
                (dog): dog is SampleDog & { primary_image_url: string } =>
                  Boolean(dog.primary_image_url),
              )
              .map((dog, index) => ({
                id: dog.slug || index,
                name: dog.name,
                slug: dog.slug,
                primary_image_url: dog.primary_image_url,
              }))}
            breedName={breedData.primary_breed}
            className="w-full order-2 lg:order-1"
          />

          <BreedInfo breedData={breedData} lastUpdated={lastUpdated} className="order-1 lg:order-2" />
        </div>

        {(breedData.personality_metrics ||
          (breedData.personality_traits && breedData.personality_traits.length > 0) ||
          breedData.experience_distribution) && (
          <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 sm:p-8 mb-10 space-y-6 divide-y divide-gray-100 dark:divide-gray-700/50 [&>div:not(:first-child)]:pt-6">
            {breedData.personality_metrics && (
              <div>
                <PersonalityBarChart breedData={breedData} />
              </div>
            )}

            {breedData.personality_traits &&
              breedData.personality_traits.length > 0 && (
                <div>
                  <CommonTraits personalityTraits={breedData.personality_traits} />
                </div>
              )}

            {breedData.experience_distribution && (
              <div>
                <ExperienceLevelChart
                  experienceDistribution={breedData.experience_distribution}
                />
              </div>
            )}
          </section>
        )}

        <BreedFilterBar
          breedData={breedData}
          filters={filters}
          filterCounts={filterCounts}
          onFilterChange={handleFilterChange}
          onClearFilters={handleResetFilters}
          onOpenMobileFilters={() => setIsFilterDrawerOpen(true)}
          activeFilterCount={activeFilterCount}
        />

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
            activeFilterCount > 0 ? (
              <EmptyState
                variant="noDogsFiltered"
                title={`No ${breedData.primary_breed}s match your filters`}
                description={`Try adjusting your filters to see more ${breedData.primary_breed} rescue dogs.`}
                onClearFilters={handleResetFilters}
              />
            ) : (
              <EmptyState
                title={`No ${breedData.primary_breed}s available`}
                description={`There are currently no ${breedData.primary_breed} dogs available for adoption at the moment. Check back soon!`}
              />
            )
          ) : (
            <div id="dogs-grid">
              <BreedDogsViewportWrapper
                dogs={dogs}
                loading={loading && dogs.length === 0}
                loadingMore={loadingMore}
                onLoadMore={loadMoreDogs}
                hasMore={hasMore}
                filters={filters}
                onFilterChange={handleMobileFilterChange}
                onOpenFilter={() => setIsFilterDrawerOpen(true)}
              />
            </div>
          )}

          {hasMore && !loading && dogs.length > 0 && (
            <div className="hidden lg:flex justify-center mt-8">
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

        <MobileFilterDrawer
          isOpen={isFilterDrawerOpen}
          onClose={() => {
            setIsFilterDrawerOpen(false);
            setTimeout(() => {
              const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              document.getElementById("dogs-grid")?.scrollIntoView({
                behavior: reducedMotion ? "auto" : "smooth",
                block: "start",
              });
            }, 300);
          }}
          filterConfig={{
            showAge: true,
            showBreed: false,
            showSize: true,
            showSex: true,
            showShipsTo: true,
            showOrganization: true,
            showSearch: true,
          }}
          totalDogsCount={dogs.length}
          searchQuery={filters.searchQuery}
          handleSearchChange={(value: string) =>
            handleMobileFilterChange("searchQuery", value)
          }
          clearSearch={() => handleMobileFilterChange("searchQuery", "")}
          organizationFilter={filters.organizationFilter}
          setOrganizationFilter={(value: string) =>
            handleMobileFilterChange("organizationFilter", value)
          }
          organizations={filterOptions.organizations}
          sexFilter={filters.sexFilter}
          setSexFilter={(value: string) =>
            handleMobileFilterChange("sexFilter", value)
          }
          sexOptions={["Any", "Male", "Female"]}
          sizeFilter={filters.sizeFilter}
          setSizeFilter={(value: string) =>
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
          setAgeCategoryFilter={(value: string) =>
            handleMobileFilterChange("ageFilter", value)
          }
          ageOptions={["Any age", "Puppy", "Young", "Adult", "Senior"]}
          availableCountryFilter={filters.availableCountryFilter}
          setAvailableCountryFilter={(value: string) =>
            handleMobileFilterChange("availableCountryFilter", value)
          }
          availableCountries={["Any country"]}
          resetFilters={handleResetFilters}
          filterCounts={filterCounts}
        />
    </div>
  );
}
