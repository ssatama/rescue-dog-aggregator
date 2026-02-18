import { useState, useCallback } from "react";

const cache = new Map<string, unknown>();
const cacheTimeout = new Map<string, number>();

interface UseMetadataCacheReturn<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
  fetchData: (params?: Record<string, unknown>) => Promise<T>;
  clearCache: () => void;
}

export function useMetadataCache<T>(
  cacheKey: string,
  apiFunction: (params: Record<string, unknown>) => Promise<T>,
  duration = 5 * 60 * 1000,
): UseMetadataCacheReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const getCacheKey = useCallback(
    (key: string, params: Record<string, unknown> = {}): string => {
      return `${key}-${JSON.stringify(params)}`;
    },
    [],
  );

  const getFromCache = useCallback((key: string): T | null => {
    const cached = cache.get(key);
    const timeout = cacheTimeout.get(key);

    if (cached && timeout && Date.now() < timeout) {
      return cached as T;
    }

    if (cached) {
      cache.delete(key);
      cacheTimeout.delete(key);
    }

    return null;
  }, []);

  const setToCache = useCallback(
    (key: string, value: T, cacheDuration = duration): void => {
      cache.set(key, value);
      cacheTimeout.set(key, Date.now() + cacheDuration);
    },
    [duration],
  );

  const fetchData = useCallback(
    async (params: Record<string, unknown> = {}): Promise<T> => {
      const fullCacheKey = getCacheKey(cacheKey, params);

      const cachedData = getFromCache(fullCacheKey);
      if (cachedData) {
        setData(cachedData);
        return cachedData;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await apiFunction(params);
        setData(result);
        setToCache(fullCacheKey, result);
        return result;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [cacheKey, apiFunction, getCacheKey, getFromCache, setToCache],
  );

  return {
    data,
    loading,
    error,
    fetchData,
    clearCache: () => {
      cache.clear();
      cacheTimeout.clear();
    },
  };
}
