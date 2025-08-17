import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { getAnimals, getFilterCounts } from "../services/animalsService";

const ITEMS_PER_PAGE = 20;

// SWR fetcher with error handling
const fetcher = async (url, params) => {
  try {
    const response = await getAnimals(params);
    return response;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

// Hook for infinite loading with SWR
export function useAnimalsInfinite(apiParams, initialData = []) {
  const getKey = (pageIndex, previousPageData) => {
    // Return null if we've reached the end
    if (previousPageData && previousPageData.length < ITEMS_PER_PAGE)
      return null;

    // Return the params for the next page
    return {
      url: "/api/animals",
      params: {
        ...apiParams,
        limit: ITEMS_PER_PAGE,
        offset: pageIndex * ITEMS_PER_PAGE,
      },
    };
  };

  const { data, error, size, setSize, mutate, isValidating } = useSWRInfinite(
    getKey,
    ({ params }) => fetcher("/api/animals", params),
    {
      initialSize: 1,
      revalidateFirstPage: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      fallbackData: initialData ? [initialData] : undefined,
      parallel: true, // Enable parallel requests for better performance
    },
  );

  const dogs = data ? data.flat() : [];
  const isLoading = !data && !error;
  const isLoadingMore =
    size > 0 && data && typeof data[size - 1] === "undefined";
  const isEmpty = data?.[0]?.length === 0;
  const isReachingEnd =
    isEmpty || (data && data[data.length - 1]?.length < ITEMS_PER_PAGE);

  const loadMore = () => {
    if (!isReachingEnd && !isLoadingMore) {
      setSize(size + 1);
    }
  };

  const refresh = () => {
    mutate();
  };

  return {
    dogs,
    error,
    isLoading,
    isLoadingMore,
    isReachingEnd,
    loadMore,
    refresh,
    size,
  };
}

// Hook for filter counts with deduplication
export function useFilterCounts(apiParams) {
  const { data, error, mutate } = useSWR(
    apiParams ? ["filter-counts", apiParams] : null,
    ([, params]) => getFilterCounts(params),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000, // Dedupe within 10 seconds
    },
  );

  return {
    filterCounts: data,
    filterCountsError: error,
    filterCountsLoading: !data && !error,
    refreshFilterCounts: mutate,
  };
}

// Prefetch hook for next page
export function usePrefetch(apiParams, currentPage, hasMore) {
  const nextPageKey = hasMore
    ? {
        url: "/api/animals",
        params: {
          ...apiParams,
          limit: ITEMS_PER_PAGE,
          offset: (currentPage + 1) * ITEMS_PER_PAGE,
        },
      }
    : null;

  // Prefetch next page
  useSWR(
    nextPageKey,
    nextPageKey ? ({ params }) => fetcher("/api/animals", params) : null,
    {
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 30000, // Cache for 30 seconds
    },
  );
}
