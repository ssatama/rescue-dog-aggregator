import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  startTransition,
  type Dispatch,
  type SetStateAction,
  type MutableRefObject,
} from "react";
import { getAnimals, getFilterCounts } from "../../services/animalsService";
import { reportError } from "../../utils/logger";
import type { Dog, Filters, DogsPageInitialParams, FilterCountsResponse } from "../../types/dogsPage";

const ITEMS_PER_PAGE = 20;

const assertNoDuplicateDogIds = (dogs: ReadonlyArray<{ id: number | string }>, context = '') => {
  if (process.env.NODE_ENV === 'development') {
    const ids = dogs.map(d => d.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
      console.error(`DUPLICATE DOG IDS ${context}`, {
        totalDogs: ids.length,
        uniqueDogs: uniqueIds.size,
        duplicateIds: [...new Set(duplicates)],
        allIds: ids,
      });
    }
  }
};

interface UseDogsPaginationParams {
  initialDogs: Dog[];
  initialParams: DogsPageInitialParams;
  filters: Filters;
  buildAPIParams: (filters: Filters) => Record<string, string>;
  scrollPositionRef: MutableRefObject<number>;
  searchParams: URLSearchParams;
  pathname: string;
}

interface UseDogsPaginationReturn {
  dogs: Dog[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  filterCounts: FilterCountsResponse | null;
  isFilterTransition: boolean;
  setIsFilterTransition: Dispatch<SetStateAction<boolean>>;
  setDogs: Dispatch<SetStateAction<Dog[]>>;
  setPage: Dispatch<SetStateAction<number>>;
  setHasMore: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  fetchDogsWithFilters: (filters: Filters, pageNum?: number, shouldAppend?: boolean) => Promise<void>;
  loadMoreDogs: () => Promise<void>;
  abortCurrentFetch: () => void;
}

export default function useDogsPagination({
  initialDogs,
  initialParams,
  filters,
  buildAPIParams,
  scrollPositionRef,
  searchParams,
  pathname,
}: UseDogsPaginationParams): UseDogsPaginationReturn {
  const urlPage = parseInt(searchParams.get("page") || "1", 10);

  const [dogs, setDogs] = useState<Dog[]>(() => {
    if (typeof window === 'undefined') return initialDogs;

    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    params.delete('scroll');
    const hasFilters = params.toString().length > 0;

    return (urlPage === 1 && !hasFilters) ? initialDogs : [];
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isFilterTransition, setIsFilterTransition] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialDogs.length === ITEMS_PER_PAGE);
  const [filterCounts, setFilterCounts] = useState<FilterCountsResponse | null>(null);
  const [page, setPage] = useState(urlPage);

  const isPaginatingRef = useRef(false);
  const currentAbortControllerRef = useRef<AbortController | null>(null);
  const isInitialMount = useRef(true);
  const fetchDogsWithFiltersRef = useRef<((filters: Filters, pageNum?: number, shouldAppend?: boolean) => Promise<void>) | null>(null);
  const hydrateDeepLinkPagesRef = useRef<((targetPage: number, currentFilters: Filters) => Promise<void>) | null>(null);
  const lastQueryKey = useRef("");

  const abortCurrentFetch = useCallback(() => {
    if (currentAbortControllerRef.current) {
      currentAbortControllerRef.current.abort();
      currentAbortControllerRef.current = null;
    }
  }, []);

  const queryKey = useMemo(() => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("scroll");
    return sp.toString();
  }, [searchParams]);

  const hydrateDeepLinkPages = async (targetPage: number, currentFilters: Filters): Promise<void> => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[hydrateDeepLinkPages] START', {
        targetPage,
        currentFilters,
        currentDogs: dogs.length,
        isPaginating: isPaginatingRef.current,
      });
    }

    isPaginatingRef.current = true;
    setLoading(true);
    setLoadingMore(false);
    setError(null);

    const abortController = new AbortController();
    currentAbortControllerRef.current = abortController;

    try {
      const baseParams = buildAPIParams(currentFilters);
      const countsPromise = getFilterCounts(baseParams);

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

      const allDogs = allPages.flat();

      if (process.env.NODE_ENV === 'development') {
        console.log('[hydrateDeepLinkPages] Dogs accumulated', {
          totalDogs: allDogs.length,
          dogIds: allDogs.map(d => d.id),
        });
        assertNoDuplicateDogIds(allDogs, '[hydrateDeepLinkPages] All dogs');
      }

      startTransition(() => {
        setDogs(allDogs as Dog[]);
        setPage(targetPage);
        const lastPage = allPages[allPages.length - 1] || [];
        setHasMore(lastPage.length === ITEMS_PER_PAGE);
      });

      const counts = await countsPromise;
      setFilterCounts(counts);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      reportError(err, { context: "hydrateDeepLinkPages", targetPage });
      setError("Failed to load dogs");
    } finally {
      setLoading(false);
      isPaginatingRef.current = false;
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

  hydrateDeepLinkPagesRef.current = hydrateDeepLinkPages;

  const fetchDogsWithFilters = useCallback(async (currentFilters: Filters, pageNum = 1, shouldAppend = false): Promise<void> => {
    setLoading(pageNum === 1 && !shouldAppend);
    setLoadingMore(pageNum > 1 || shouldAppend);
    setError(null);

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
      if (currentAbortControllerRef.current === abortController) {
        currentAbortControllerRef.current = null;
      }
    }
  }, [buildAPIParams]);

  fetchDogsWithFiltersRef.current = fetchDogsWithFilters;

  const loadMoreDogs = useCallback(async () => {
    if (loadingMore || !hasMore || isPaginatingRef.current) return;

    if (process.env.NODE_ENV === 'development') {
      console.log('[loadMoreDogs] START', {
        scrollY: window.scrollY,
        isPaginating: isPaginatingRef.current,
        currentPage: page,
      });
    }

    isPaginatingRef.current = true;
    setLoadingMore(true);

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

        const urlParams = new URLSearchParams(searchParams.toString());
        if (nextPage > 1) {
          urlParams.set("page", nextPage.toString());
        } else {
          urlParams.delete("page");
        }
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
      if (err instanceof Error && err.name === 'AbortError') return;
      reportError(err, { context: "loadMoreDogs", page });
      setError("Failed to load more dogs");
    } finally {
      setLoadingMore(false);
      isPaginatingRef.current = false;
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
  }, [page, hasMore, filters, loadingMore, pathname, searchParams, buildAPIParams, scrollPositionRef]);

  // Mount effect: load initial dogs or hydrate deep link
  useEffect(() => {
    const needsFetch =
      urlPage > 1 ||
      dogs.length === 0 ||
      JSON.stringify(filters) !== JSON.stringify(initialParams);

    if (needsFetch) {
      if (urlPage > 1) {
        hydrateDeepLinkPagesRef.current?.(urlPage, filters);
      } else {
        fetchDogsWithFiltersRef.current?.(filters, 1);
      }
    }

    return () => {
      if (currentAbortControllerRef.current) {
        currentAbortControllerRef.current.abort();
        currentAbortControllerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mount-only: refs provide stable access to latest functions, dependencies intentionally omitted
  }, []);

  // SearchParams change effect
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

    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (process.env.NODE_ENV === 'development') {
        console.log('[searchParams useEffect] SKIPPED - initial mount');
      }
      return;
    }

    if (isPaginatingRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[searchParams useEffect] SKIPPED - isPaginating=true');
      }
      return;
    }

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

    const newPage = parseInt(searchParams.get("page") || "1", 10);

    if (currentAbortControllerRef.current) {
      currentAbortControllerRef.current.abort();
      currentAbortControllerRef.current = null;
    }

    if (newPage > 1) {
      hydrateDeepLinkPagesRef.current?.(newPage, filters);
    } else {
      fetchDogsWithFiltersRef.current?.(filters, newPage, false);
    }
  }, [searchParams, pathname, queryKey, filters]);

  return {
    dogs,
    page,
    hasMore,
    loading,
    loadingMore,
    error,
    filterCounts,
    isFilterTransition,
    setIsFilterTransition,
    setDogs,
    setPage,
    setHasMore,
    setError,
    fetchDogsWithFilters,
    loadMoreDogs,
    abortCurrentFetch,
  };
}
