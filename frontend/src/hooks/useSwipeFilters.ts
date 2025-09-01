import { useState, useEffect, useCallback, useMemo } from "react";

export interface SwipeFilters {
  country: string;
  sizes: string[];
}

interface UseSwipeFiltersReturn {
  filters: SwipeFilters;
  setCountry: (country: string) => void;
  setSizes: (sizes: string[]) => void;
  toggleSize: (size: string) => void;
  setFilters: (filters: SwipeFilters) => void;
  resetFilters: () => void;
  isValid: boolean;
  toQueryString: () => string;
  needsOnboarding: boolean;
  completeOnboarding: (filters: SwipeFilters) => void;
}

const DEFAULT_FILTERS: SwipeFilters = {
  country: "",
  sizes: [],
};

const STORAGE_KEY = "swipeFilters";
const ONBOARDING_KEY = "swipeOnboardingComplete";

export default function useSwipeFilters(): UseSwipeFiltersReturn {
  const [filters, setFiltersState] = useState<SwipeFilters>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load filters from localStorage:", error);
    }
    return DEFAULT_FILTERS;
  });

  const [needsOnboarding, setNeedsOnboarding] = useState(() => {
    const onboardingComplete = localStorage.getItem(ONBOARDING_KEY) === "true";
    const hasFilters = Boolean(filters.country);
    return !onboardingComplete || !hasFilters;
  });

  // Save to localStorage immediately (tests expect this)
  useEffect(() => {
    if (filters.country || filters.sizes.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    }
  }, [filters]);

  const setCountry = useCallback((country: string) => {
    setFiltersState((prev) => ({ ...prev, country }));
  }, []);

  const setSizes = useCallback((sizes: string[]) => {
    setFiltersState((prev) => ({ ...prev, sizes }));
  }, []);

  const toggleSize = useCallback((size: string) => {
    setFiltersState((prev) => {
      const sizes = prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size];
      return { ...prev, sizes };
    });
  }, []);

  const setFilters = useCallback((newFilters: SwipeFilters) => {
    setFiltersState(newFilters);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const completeOnboarding = useCallback((newFilters: SwipeFilters) => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFilters));
    setFiltersState(newFilters);
    setNeedsOnboarding(false);
  }, []);

  const isValid = useMemo(() => {
    return Boolean(filters.country);
  }, [filters.country]);

  const toQueryString = useCallback(() => {
    const params = new URLSearchParams();

    if (filters.country) {
      params.append("country", filters.country);
    }

    filters.sizes.forEach((size) => {
      params.append("size", size);
    });

    return params.toString();
  }, [filters]);

  return {
    filters,
    setCountry,
    setSizes,
    toggleSize,
    setFilters,
    resetFilters,
    isValid,
    toQueryString,
    needsOnboarding,
    completeOnboarding,
  };
}
