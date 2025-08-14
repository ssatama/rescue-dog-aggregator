/**
 * Hook for API response caching with expiration
 * TDD Implementation for Performance Optimization
 */
import { useState, useCallback, useMemo } from 'react';

// In-memory cache with expiration
const cache = new Map();
const cacheTimeout = new Map();

export function useMetadataCache(cacheKey, apiFunction, duration = 5 * 60 * 1000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getCacheKey = useCallback((key, params = {}) => {
    return `${key}-${JSON.stringify(params)}`;
  }, []);

  const getFromCache = useCallback((cacheKey) => {
    const cached = cache.get(cacheKey);
    const timeout = cacheTimeout.get(cacheKey);
    
    if (cached && timeout && Date.now() < timeout) {
      return cached;
    }
    
    if (cached) {
      cache.delete(cacheKey);
      cacheTimeout.delete(cacheKey);
    }
    
    return null;
  }, []);

  const setCache = useCallback((cacheKey, data, cacheDuration = duration) => {
    cache.set(cacheKey, data);
    cacheTimeout.set(cacheKey, Date.now() + cacheDuration);
  }, [duration]);

  const fetchData = useCallback(async (params = {}) => {
    const fullCacheKey = getCacheKey(cacheKey, params);
    
    // Check cache first
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
      setCache(fullCacheKey, result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [cacheKey, apiFunction, getCacheKey, getFromCache, setCache]);

  return {
    data,
    loading,
    error,
    fetchData,
    clearCache: () => {
      cache.clear();
      cacheTimeout.clear();
    }
  };
}