import {
  useInfiniteQuery,
  useQuery,
  InfiniteData,
} from "@tanstack/react-query";
import { getAnimals, getFilterCounts } from "../services/animalsService";
import { reportError } from "../utils/logger";

const ITEMS_PER_PAGE = 20;

interface Animal {
  id: number;
  name: string;
  slug: string;
  [key: string]: unknown;
}

interface ApiParams {
  [key: string]: unknown;
}

interface FilterCountsResponse {
  [key: string]: unknown;
}

interface UseAnimalsInfiniteResult {
  dogs: Animal[];
  error: Error | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  isReachingEnd: boolean;
  loadMore: () => void;
  refresh: () => void;
  size: number;
}

interface UseFilterCountsResult {
  filterCounts: FilterCountsResponse | undefined;
  filterCountsError: Error | null;
  filterCountsLoading: boolean;
  refreshFilterCounts: () => void;
}

export function useAnimalsInfinite(
  apiParams: ApiParams,
  initialData: Animal[] = []
): UseAnimalsInfiniteResult {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<Animal[], Error, InfiniteData<Animal[]>, string[], number>({
    queryKey: ["animals", "infinite", JSON.stringify(apiParams)],
    queryFn: async ({ pageParam }) => {
      try {
        const params = {
          ...apiParams,
          limit: ITEMS_PER_PAGE,
          offset: pageParam * ITEMS_PER_PAGE,
        };
        const result = await getAnimals(params);
        return result as Animal[];
      } catch (error) {
        reportError(error, { context: "useAnimalsInfinite", pageParam, apiParams: JSON.stringify(apiParams) });
        throw error;
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < ITEMS_PER_PAGE) {
        return undefined;
      }
      return allPages.length;
    },
    initialData: initialData.length > 0
      ? { pages: [initialData], pageParams: [0] }
      : undefined,
    staleTime: 5000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const dogs = data?.pages.flat() ?? [];
  const isLoading = !data && !error && isFetching;
  const isLoadingMore = isFetchingNextPage;
  const isEmpty = data?.pages[0]?.length === 0;
  const isReachingEnd = isEmpty || !hasNextPage;

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const refresh = () => {
    refetch();
  };

  return {
    dogs,
    error: error ?? null,
    isLoading,
    isLoadingMore,
    isReachingEnd,
    loadMore,
    refresh,
    size: data?.pages.length ?? 0,
  };
}

export function useFilterCounts(apiParams: ApiParams | null): UseFilterCountsResult {
  const {
    data,
    error,
    isLoading,
    refetch,
  } = useQuery<FilterCountsResponse, Error>({
    queryKey: ["filterCounts", JSON.stringify(apiParams)],
    queryFn: async () => {
      try {
        const result = await getFilterCounts(apiParams ?? {});
        return result as FilterCountsResponse;
      } catch (error) {
        reportError(error, { context: "useFilterCounts", apiParams: JSON.stringify(apiParams) });
        throw error;
      }
    },
    enabled: apiParams !== null,
    staleTime: 10000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    filterCounts: data,
    filterCountsError: error ?? null,
    filterCountsLoading: isLoading && apiParams !== null,
    refreshFilterCounts: refetch,
  };
}
