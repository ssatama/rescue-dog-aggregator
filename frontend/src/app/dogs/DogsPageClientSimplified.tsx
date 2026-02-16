"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  startTransition,
  useMemo,
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
import { reportError } from "../../utils/logger";
import { Button } from "@/components/ui/button";
import { Filter, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import { BreadcrumbSchema } from "../../components/seo";
import { useDebouncedCallback } from "use-debounce";
import type {
  DogsPageClientSimplifiedProps,
  Filters,
  Dog,
  FilterCountsResponse,
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

const PremiumMobileCatalog = dynamic(
  () => import("../../components/dogs/mobile/catalog/PremiumMobileCatalog"),
  {
    loading: () => <div className="min-h-screen bg-gray-50 animate-pulse" />,
    ssr: false,
  },
);

// Constants
const ITEMS_PER_PAGE = 20;
const DEBOUNCE_URL_UPDATE_MS = 500;
const DEBOUNCE_SCROLL_SAVE_MS = 300;

// Development-only assertion helper for detecting duplicate dog IDs
const assertNoDuplicateDogIds = (dogs: ReadonlyArray<{ id: number | string }>, context = '') => {
  if (process.env.NODE_ENV === 'development') {
    const ids = dogs.map(d => d.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
      console.error(`🐛 DUPLICATE DOG IDS ${context}`, {
        totalDogs: ids.length,
        uniqueDogs: uniqueIds.size,
        duplicateIds: [...new Set(duplicates)],
        allIds: ids,
      });
    }
  }
};

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

  // Validate organization_id parameter against available organizations
  const validateOrganizationId = useCallback((orgId: string | null): string => {
    if (!orgId || orgId === "any") return "any";

    const organizations = metadata?.organizations || [];
    const isValidOrg = organizations.some(
      (org) => org.id?.toString() === orgId || org.id === parseInt(orgId, 10),
    );

    return isValidOrg ? orgId : "any";
  }, [metadata?.organizations]);

  // Parse filters from URL including page and scroll - memoized to prevent recreation on every render
  const filters: Filters = useMemo(() => ({
    searchQuery: searchParams.get("search") || "",
    sizeFilter: searchParams.get("size") || "Any size",
    ageFilter:
      searchParams.get("age") || initialParams?.age_category || "Any age",
    sexFilter: searchParams.get("sex") || "Any",
    organizationFilter: validateOrganizationId(
      searchParams.get("organization_id"),
    ),
    breedFilter: searchParams.get("breed") || "Any breed",
    breedGroupFilter: searchParams.get("breed_group") || "Any group",
    locationCountryFilter:
      searchParams.get("location_country") ||
      initialParams?.location_country ||
      "Any country",
    availableCountryFilter:
      searchParams.get("available_country") ||
      initialParams?.available_country ||
      "Any country",
    availableRegionFilter: searchParams.get("available_region") || "Any region",
  }), [searchParams, initialParams?.age_category, initialParams?.location_country, initialParams?.available_country, validateOrganizationId]);

  // Parse page and scroll from URL
  const urlPage = parseInt(searchParams.get("page") || "1", 10);
  const urlScroll = parseInt(searchParams.get("scroll") || "0", 10);

  // State management with smart initialization to prevent SSR cache conflicts
  const [dogs, setDogs] = useState<Dog[]>(() => {
    // Smart initialization: only trust initialDogs for page=1 with no filters
    if (typeof window === 'undefined') return initialDogs; // SSR

    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    params.delete('scroll');
    const hasFilters = params.toString().length > 0;

    // Only trust initialDogs for page=1 with no filters
    return (urlPage === 1 && !hasFilters) ? initialDogs : [];
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFilterTransition, setIsFilterTransition] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialDogs.length === ITEMS_PER_PAGE);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [filterCounts, setFilterCounts] = useState<FilterCountsResponse | null>(null);
  const [availableRegions, setAvailableRegions] = useState<string[]>(["Any region"]);
  const [page, setPage] = useState(urlPage);
  const scrollPositionRef = useRef(urlScroll);
  const isRestoringScroll = useRef(false);

  // CRITICAL FIX: Track pagination state to prevent race conditions
  const isPaginatingRef = useRef(false);

  // Track current AbortController for cleanup
  const currentAbortControllerRef = useRef<AbortController | null>(null);

  // CRITICAL FIX: Prevent searchParams useEffect from running on initial mount
  // Mount useEffect already handles initial data loading
  const isInitialMount = useRef(true);

  // Refs for stable function references in effects
  const fetchDogsWithFiltersRef = useRef<((filters: Filters, pageNum?: number, shouldAppend?: boolean) => Promise<void>) | null>(null);
  const hydrateDeepLinkPagesRef = useRef<((targetPage: number, currentFilters: Filters) => Promise<void>) | null>(null);

  // Local breed input state for fallback handling
  const localBreedInput = useMemo(
    () => (filters.breedFilter === "Any breed" ? "" : filters.breedFilter),
    [filters.breedFilter]
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
  }, DEBOUNCE_SCROLL_SAVE_MS);

  // Listen to scroll events
  useEffect(() => {
    const handleScroll = () => {
      saveScrollPosition();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [saveScrollPosition]);

  // Restore scroll position when component mounts
  useEffect(() => {
    if (urlScroll > 0) {
      isRestoringScroll.current = true;
      setTimeout(() => {
        window.scrollTo(0, urlScroll);
        isRestoringScroll.current = false;
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mount-only: urlScroll is captured at mount time intentionally
  }, []);

  // Update URL with filters and page (debounced)
  const updateURL = useDebouncedCallback(
    (newFilters: Filters, newPage = 1, preserveScroll = false) => {
      const params = new URLSearchParams();

      // Map filter names to URL parameters - handle special cases
      const urlKeyMap: Record<string, string> = {
        searchQuery: "search",
        organizationFilter: "organization_id",
        locationCountryFilter: "location_country",
        availableCountryFilter: "available_country",
        availableRegionFilter: "available_region",
        breedGroupFilter: "breed_group",
        sizeFilter: "size",
        ageFilter: "age",
        sexFilter: "sex",
        breedFilter: "breed",
      };

      Object.entries(newFilters).forEach(([key, value]) => {
        // Use mapped key or fall back to snake_case conversion
        const paramKey =
          urlKeyMap[key] ||
          key
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
          value !== "Any group" &&
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
    },
    DEBOUNCE_URL_UPDATE_MS,
  );

  // Build API params from filters
  const buildAPIParams = (filterValues: Filters): Record<string, string> => {
    const params: Record<string, string> = {};

    // Guard all filter values - only send to API if non-empty and not "Any..." defaults
    const searchQuery = (filterValues.searchQuery || "").trim();
    if (searchQuery) {
      params.search = searchQuery;
    }

    const size = (filterValues.sizeFilter || "").trim();
    if (size && size !== "Any size") {
      params.standardized_size = size;
    }

    const age = (filterValues.ageFilter || "").trim();
    if (age && age !== "Any age") {
      params.age_category = age;
    }

    const sex = (filterValues.sexFilter || "").trim();
    if (sex && sex !== "Any") {
      params.sex = sex;
    }

    const orgId = (filterValues.organizationFilter || "").toString().trim();
    if (orgId && orgId !== "any") {
      params.organization_id = orgId;
    }

    // CRITICAL FIX: Guard breed to prevent empty string being sent to API
    const breed = (filterValues.breedFilter || "").trim();
    if (breed && breed !== "Any breed") {
      params.standardized_breed = breed;
    }

    const breedGroup = (filterValues.breedGroupFilter || "").trim();
    if (breedGroup && breedGroup !== "Any group") {
      params.breed_group = breedGroup;
    }

    const locationCountry = (filterValues.locationCountryFilter || "").trim();
    if (locationCountry && locationCountry !== "Any country") {
      params.location_country = locationCountry;
    }

    const availableCountry = (filterValues.availableCountryFilter || "").trim();
    if (availableCountry && availableCountry !== "Any country") {
      params.available_country = availableCountry;
    }

    const availableRegion = (filterValues.availableRegionFilter || "").trim();
    if (availableRegion && availableRegion !== "Any region") {
      params.available_region = availableRegion;
    }

    return params;
  };

  // CRITICAL FIX: Hydrate deep links by loading pages 1..targetPage
  // When URL has page=4, load ALL dogs from pages 1-4 so user can scroll through everything
  const hydrateDeepLinkPages = async (targetPage: number, currentFilters: Filters): Promise<void> => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[hydrateDeepLinkPages] START', {
        targetPage,
        currentFilters,
        currentDogs: dogs.length,
        isPaginating: isPaginatingRef.current,
      });
    }

    // Prevent the URL-change effect from overwriting while we hydrate
    isPaginatingRef.current = true;
    setLoading(true);
    setLoadingMore(false);
    setError(null);

    // Create AbortController for cleanup
    const abortController = new AbortController();
    currentAbortControllerRef.current = abortController;

    try {
      const baseParams = buildAPIParams(currentFilters);

      // Kick off counts immediately
      const countsPromise = getFilterCounts(baseParams);

      // BUG A FIX: Fetch ALL pages (1..targetPage) in parallel and accumulate locally
      // This prevents the setState race condition where prev might be stale SSR cache
      const requests = [];
      for (let p = 1; p <= targetPage; p++) {
        requests.push(
          getAnimals(
            {
              limit: ITEMS_PER_PAGE,
              offset: (p - 1) * ITEMS_PER_PAGE,
              ...baseParams,
            },
            { signal: abortController.signal },
          ),
        );
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[hydrateDeepLinkPages] Fetching pages 1 to', targetPage);
      }

      const allPages = await Promise.all(requests);

      if (process.env.NODE_ENV === 'development') {
        console.log('[hydrateDeepLinkPages] All pages fetched', {
          pageCount: allPages.length,
          pagesData: allPages.map((page, i) => ({
            pageNum: i + 1,
            dogCount: page.length,
            dogIds: page.map(d => d.id),
          })),
        });
      }

      // Accumulate all dogs locally BEFORE calling setState
      const allDogs = allPages.flat();

      if (process.env.NODE_ENV === 'development') {
        console.log('[hydrateDeepLinkPages] Dogs accumulated', {
          totalDogs: allDogs.length,
          dogIds: allDogs.map(d => d.id),
        });
        assertNoDuplicateDogIds(allDogs, '[hydrateDeepLinkPages] All dogs');
      }

      // Single setState with all accumulated dogs - no race condition
      startTransition(() => {
        setDogs(allDogs as Dog[]);
        setPage(targetPage);
        const lastPage = allPages[allPages.length - 1] || [];
        setHasMore(lastPage.length === ITEMS_PER_PAGE);
      });

      const counts = await countsPromise;
      setFilterCounts(counts);
    } catch (err) {
      // Ignore aborted requests
      if (err instanceof Error && err.name === 'AbortError') return;
      reportError(err, { context: "hydrateDeepLinkPages", targetPage });
      setError("Failed to load dogs");
    } finally {
      setLoading(false);
      isPaginatingRef.current = false;
      // Clear ref if this is still the current controller
      if (currentAbortControllerRef.current === abortController) {
        currentAbortControllerRef.current = null;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[hydrateDeepLinkPages] END', {
          finalDogCount: dogs.length,
          isPaginating: isPaginatingRef.current,
        });
      }
    }
  };

  // Keep ref updated with latest function
  hydrateDeepLinkPagesRef.current = hydrateDeepLinkPages;

  // Load initial dogs on mount or when URL filters/page change
  useEffect(() => {
    // Only fetch if we don't have initialDogs or URL has changed
    const needsFetch =
      urlPage > 1 || // Need to load page data
      dogs.length === 0 || // No dogs loaded
      JSON.stringify(filters) !== JSON.stringify(initialParams); // Filters changed from initial

    if (needsFetch) {
      if (urlPage > 1) {
        // CRITICAL FIX: Hydrate pages 1..urlPage so user can scroll through all results
        hydrateDeepLinkPagesRef.current?.(urlPage, filters);
      } else {
        // Regular single page load
        fetchDogsWithFiltersRef.current?.(filters, 1);
      }
    }

    // Cleanup: abort any ongoing requests on unmount
    return () => {
      if (currentAbortControllerRef.current) {
        currentAbortControllerRef.current.abort();
        currentAbortControllerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mount-only: refs provide stable access to latest functions, dependencies intentionally omitted
  }, []);

  // CRITICAL FIX: Listen to URL changes and refetch when searchParams change
  // This ensures reset and browser back/forward navigation trigger fresh fetches
  const lastQueryKey = useRef("");

  // Memoize query key computation to avoid recalculating on every render
  const queryKey = useMemo(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("scroll");
    return sp.toString();
  }, [searchParams]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[searchParams useEffect] FIRED', {
        isInitialMount: isInitialMount.current,
        isPaginating: isPaginatingRef.current,
        queryKey,
        lastQueryKey: lastQueryKey.current,
        searchParams: searchParams.toString(),
      });
    }

    // CRITICAL FIX: Skip on initial mount - mount useEffect handles initial load
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (process.env.NODE_ENV === 'development') {
        console.log('[searchParams useEffect] SKIPPED - initial mount');
      }
      return;
    }

    // CRITICAL FIX: Don't refetch if we're currently paginating
    // This prevents the race condition where loadMoreDogs appends data
    // but then this useEffect immediately overwrites it
    if (isPaginatingRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[searchParams useEffect] SKIPPED - isPaginating=true');
      }
      return;
    }

    // If query hasn't changed, skip refetch
    if (queryKey === lastQueryKey.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[searchParams useEffect] SKIPPED - query unchanged');
      }
      return;
    }
    lastQueryKey.current = queryKey;

    if (process.env.NODE_ENV === 'development') {
      console.log('[searchParams useEffect] PROCEEDING with fetch');
    }

    // Parse page from URL
    const newPage = parseInt(searchParams.get("page") || "1", 10);

    // Abort any ongoing request before starting a new one
    if (currentAbortControllerRef.current) {
      currentAbortControllerRef.current.abort();
      currentAbortControllerRef.current = null;
    }

    // Filters object is already updated from searchParams above
    // This will trigger when reset navigates to clean URL
    // CRITICAL FIX: Use same branching logic as mount useEffect
    // Hydrate pages 1-N when page > 1 to show accumulated results
    if (newPage > 1) {
      hydrateDeepLinkPagesRef.current?.(newPage, filters);
    } else {
      fetchDogsWithFiltersRef.current?.(filters, newPage, false);
    }
    // Refs provide stable access to latest functions without causing re-runs
  }, [searchParams, pathname, queryKey, filters]);

  // Handle filter changes - support both single and batch updates
  const handleFilterChange = useCallback(
    (filterKey: string | Record<string, string>, value?: string) => {
      // Abort any ongoing request before starting a new filter search
      if (currentAbortControllerRef.current) {
        currentAbortControllerRef.current.abort();
        currentAbortControllerRef.current = null;
      }

      // Check if filterKey is an object (batch update)
      let newFilters: Filters;

      if (typeof filterKey === "object" && filterKey !== null) {
        // Batch update - filterKey is actually an object with multiple filter updates
        newFilters = { ...filters, ...filterKey };
      } else {
        // Single update
        newFilters = { ...filters, [filterKey]: value };
      }

      // When filters change, reset to page 1 and clear scroll
      updateURL(newFilters, 1, false);

      // Show loading overlay but keep existing dogs visible to prevent shimmer
      startTransition(() => {
        setPage(1);
        setHasMore(true);
        scrollPositionRef.current = 0;
        setIsFilterTransition(true);
      });

      // Fetch with new filters - dogs will be replaced when data arrives
      fetchDogsWithFiltersRef.current?.(newFilters, 1);
    },
    [filters, updateURL],
  );

  // CRITICAL FIX: Fetch dogs with current filters and page
  // Added shouldAppend parameter to explicitly control append vs replace behavior
  // Wrapped in useCallback to provide stable reference for dependency arrays
  const fetchDogsWithFilters = useCallback(async (currentFilters: Filters, pageNum = 1, shouldAppend = false): Promise<void> => {
    setLoading(pageNum === 1 && !shouldAppend);
    setLoadingMore(pageNum > 1 || shouldAppend);
    setError(null);

    // Create AbortController for cleanup
    const abortController = new AbortController();
    currentAbortControllerRef.current = abortController;

    try {
      const params = {
        limit: ITEMS_PER_PAGE,
        offset: (pageNum - 1) * ITEMS_PER_PAGE,
        ...buildAPIParams(currentFilters),
      };
      const fetchOptions = { signal: abortController.signal };

      const [newDogs, counts] = await Promise.all([
        getAnimals(params, fetchOptions),
        getFilterCounts(params, fetchOptions),
      ]);

      startTransition(() => {
        // CRITICAL FIX: Append or replace based on explicit parameter
        if (shouldAppend) {
          setDogs((prev) => [...prev, ...(newDogs as Dog[])]);
        } else {
          setDogs(newDogs as Dog[]);
        }
        setHasMore(newDogs.length === ITEMS_PER_PAGE);
        setFilterCounts(counts);
        setPage(pageNum);
        setIsFilterTransition(false);
      });
    } catch (err) {
      // Ignore aborted requests but still reset transition state
      if (err instanceof Error && err.name === 'AbortError') {
        setIsFilterTransition(false);
        return;
      }
      reportError(err, { context: "fetchDogsWithFilters", pageNum });
      setError("Failed to load dogs");
      setIsFilterTransition(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      // Clear ref if this is still the current controller
      if (currentAbortControllerRef.current === abortController) {
        currentAbortControllerRef.current = null;
      }
    }
  }, []);

  // Keep ref updated with latest function
  fetchDogsWithFiltersRef.current = fetchDogsWithFilters;

  // Load more dogs
  // Note: dogs.length is only used for dev logging, using closure value is acceptable
  const loadMoreDogs = useCallback(async () => {
    // Guard against concurrent operations using both state and ref
    if (loadingMore || !hasMore || isPaginatingRef.current) return;

    if (process.env.NODE_ENV === 'development') {
      console.log('[loadMoreDogs] START', {
        scrollY: window.scrollY,
        isPaginating: isPaginatingRef.current,
        currentPage: page,
      });
    }

    // Set pagination flag BEFORE any async operations
    isPaginatingRef.current = true;

    setLoadingMore(true);

    // Create AbortController for cleanup
    const abortController = new AbortController();
    currentAbortControllerRef.current = abortController;

    try {
      const nextPage = page + 1;
      const offset = (nextPage - 1) * ITEMS_PER_PAGE;

      const apiParams = {
        limit: ITEMS_PER_PAGE,
        offset,
        ...buildAPIParams(filters),
      };

      if (process.env.NODE_ENV === 'development') {
        console.log('[loadMoreDogs] Fetching page', {
          nextPage,
          offset,
        });
      }

      const newDogs = await getAnimals(apiParams, { signal: abortController.signal });

      if (process.env.NODE_ENV === 'development') {
        console.log('[loadMoreDogs] Fetched dogs', {
          newDogsCount: newDogs.length,
          scrollY: window.scrollY,
        });
      }

      startTransition(() => {
        setDogs((prev) => {
          const updated = [...prev, ...(newDogs as Dog[])];
          if (process.env.NODE_ENV === 'development') {
            console.log('[loadMoreDogs] setDogs updating', {
              prevLength: prev.length,
              newDogsLength: newDogs.length,
              updatedLength: updated.length,
              scrollY: window.scrollY,
            });
            assertNoDuplicateDogIds(updated, '[loadMoreDogs] After append');
          }
          return updated;
        });
        setHasMore(newDogs.length === ITEMS_PER_PAGE);
        setPage(nextPage);

        // BUG B FIX: Use window.history.replaceState directly instead of debounced updateURL
        // This avoids triggering searchParams useEffect which would refetch and cause position jump
        const urlParams = new URLSearchParams(searchParams.toString());
        if (nextPage > 1) {
          urlParams.set("page", nextPage.toString());
        } else {
          urlParams.delete("page");
        }
        // Preserve scroll position in URL
        if (scrollPositionRef.current > 0) {
          urlParams.set("scroll", scrollPositionRef.current.toString());
        }

        const newURL = urlParams.toString()
          ? `${pathname}?${urlParams.toString()}`
          : pathname;

        window.history.replaceState(null, "", newURL);

        if (process.env.NODE_ENV === 'development') {
          console.log('[loadMoreDogs] Updated URL directly', {
            nextPage,
            newURL,
            scrollY: window.scrollY,
            isPaginating: isPaginatingRef.current,
          });
        }
      });
    } catch (err) {
      // Ignore aborted requests
      if (err instanceof Error && err.name === 'AbortError') return;
      reportError(err, { context: "loadMoreDogs", page });
      setError("Failed to load more dogs");
    } finally {
      setLoadingMore(false);
      // Reset pagination flag immediately to prevent race condition
      isPaginatingRef.current = false;
      // Clear ref if this is still the current controller
      if (currentAbortControllerRef.current === abortController) {
        currentAbortControllerRef.current = null;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[loadMoreDogs] END', {
          scrollY: window.scrollY,
          isPaginating: isPaginatingRef.current,
        });
      }
    }
  }, [page, hasMore, filters, loadingMore, pathname, searchParams]);

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
        .catch((err: unknown) => {
          reportError(err, { context: "getAvailableRegions", country: filters.availableCountryFilter });
          setAvailableRegions(["Any region"]);
        });
    } else {
      setAvailableRegions(["Any region"]);
    }
  }, [filters.availableCountryFilter]);

  // Local breed handlers to prevent heavy parent logic interference during typing
  const handleBreedSuggestionSelect = useCallback(
    (breed: string) => {
      // Only trigger heavy parent logic when user actually selects a suggestion
      handleFilterChange("breedFilter", breed);
    },
    [handleFilterChange],
  );

  const handleBreedSearch = useCallback(
    (breed: string) => {
      // Only trigger heavy parent logic when user performs explicit search (Enter key)
      handleFilterChange("breedFilter", breed);
    },
    [handleFilterChange],
  );

  // Handler for real-time typing that updates filter immediately like Name filter
  const handleBreedValueChange = useCallback(
    (breed: string) => {
      // Update actual filter, localBreedInput will be derived automatically
      handleFilterChange("breedFilter", breed);
    },
    [handleFilterChange],
  );

  const handleBreedClear = useCallback(() => {
    handleFilterChange("breedFilter", "Any breed");
  }, [handleFilterChange]);

  // Proper reset filters handler that clears state and forces fresh fetch
  const handleResetFilters = useCallback(() => {
    // Define default/empty filters
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

    // Cancel debounced updates to avoid stale URL pushes
    updateURL?.cancel?.();
    saveScrollPosition?.cancel?.();

    // Navigate to clean URL using replace (no extra history entry)
    router.replace("/dogs", { scroll: false });

    // Reset component state immediately
    startTransition(() => {
      setDogs([]);
      setPage(1);
      setHasMore(true);
      setError(null);
      scrollPositionRef.current = 0;
    });

    // Force fresh fetch with default filters now
    // The URL listener will also refetch, but this makes it immediate
    fetchDogsWithFiltersRef.current?.(defaultFilters, 1);
  }, [router, updateURL, saveScrollPosition]);

  // Cleanup effect: cancel debouncers on unmount
  useEffect(() => {
    return () => {
      updateURL?.cancel?.();
      saveScrollPosition?.cancel?.();
    };
  }, [updateURL, saveScrollPosition]);

  const breadcrumbItems = [{ name: "Home", url: "/" }, { name: "Find Dogs" }];

  const activeFilterCount = Object.entries(filters).filter(
    ([_key, value]) =>
      value && !value.includes("Any") && value !== "any" && value !== "",
  ).length;

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
              searchQuery={filters.searchQuery}
              handleSearchChange={(value: string) =>
                handleFilterChange("searchQuery", value)
              }
              clearSearch={() => handleFilterChange("searchQuery", "")}
              // Organization
              organizationFilter={filters.organizationFilter}
              setOrganizationFilter={(value: string) =>
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
              setSexFilter={(value: string) => handleFilterChange("sexFilter", value)}
              sexOptions={["Any", "Male", "Female"]}
              sizeFilter={filters.sizeFilter}
              setSizeFilter={(value: string) => handleFilterChange("sizeFilter", value)}
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
                handleFilterChange("ageFilter", value)
              }
              ageOptions={["Any age", "Puppy", "Young", "Adult", "Senior"]}
              // Location
              locationCountryFilter={filters.locationCountryFilter}
              setLocationCountryFilter={(value: string) =>
                handleFilterChange("locationCountryFilter", value)
              }
              locationCountries={metadata?.locationCountries || ["Any country"]}
              availableCountryFilter={filters.availableCountryFilter}
              setAvailableCountryFilter={(value: string) =>
                handleFilterChange("availableCountryFilter", value)
              }
              availableCountries={
                metadata?.availableCountries || ["Any country"]
              }
              availableRegionFilter={filters.availableRegionFilter}
              setAvailableRegionFilter={(value: string) =>
                handleFilterChange("availableRegionFilter", value)
              }
              availableRegions={availableRegions}
              // Filter management
              resetFilters={handleResetFilters}
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
              className="relative flex-1 pb-8 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-hidden"
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

              {/* Dogs list with filter transition overlay */}
              {dogs.length > 0 && (
                <div className="relative">
                  {isFilterTransition && (
                    <div className="absolute inset-0 bg-background/60 dark:bg-gray-900/60 z-10 flex items-start justify-center pt-20 backdrop-blur-[1px]">
                      <div className="flex items-center gap-2 bg-background dark:bg-gray-800 px-4 py-2 rounded-full shadow-lg">
                        <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                        <span className="text-sm text-muted-foreground">Updating results...</span>
                      </div>
                    </div>
                  )}
                  <DogsPageViewportWrapper
                    dogs={dogs}
                    loading={loading}
                    loadingMore={loadingMore}
                    onOpenFilter={() => setIsSheetOpen(true)}
                    onResetFilters={handleResetFilters}
                    onLoadMore={loadMoreDogs}
                    hasMore={hasMore}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                  />
                </div>
              )}

              {/* Empty state */}
              {!loading && dogs.length === 0 && (
                <EmptyState
                  variant="noDogsFiltered"
                  onClearFilters={handleResetFilters}
                />
              )}

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
        handleSearchChange={(value: string) => handleFilterChange("searchQuery", value)}
        clearSearch={() => handleFilterChange("searchQuery", "")}
        // Organization
        organizationFilter={filters.organizationFilter}
        setOrganizationFilter={(value: string) =>
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
        setSexFilter={(value: string) => handleFilterChange("sexFilter", value)}
        sexOptions={["Any", "Male", "Female"]}
        sizeFilter={filters.sizeFilter}
        setSizeFilter={(value: string) => handleFilterChange("sizeFilter", value)}
        sizeOptions={[
          "Any size",
          "Tiny",
          "Small",
          "Medium",
          "Large",
          "Extra Large",
        ]}
        ageCategoryFilter={filters.ageFilter}
        setAgeCategoryFilter={(value: string) => handleFilterChange("ageFilter", value)}
        ageOptions={["Any age", "Puppy", "Young", "Adult", "Senior"]}
        // Location
        availableCountryFilter={filters.availableCountryFilter}
        setAvailableCountryFilter={(value: string) =>
          handleFilterChange("availableCountryFilter", value)
        }
        availableCountries={metadata?.availableCountries || ["Any country"]}
        // Filter management
        resetFilters={handleResetFilters}
        // Dynamic filter counts
        filterCounts={filterCounts}
      />
    </>
  );

  return wrapWithLayout ? <Layout>{content}</Layout> : content;
}
