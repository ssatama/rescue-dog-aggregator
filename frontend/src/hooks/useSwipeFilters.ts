import { useState, useEffect, useCallback, useMemo } from "react";
import { safeStorage } from "../utils/safeStorage";

export interface SwipeFilters {
  country: string;
  sizes: string[];
  ages: string[];
}

interface UseSwipeFiltersReturn {
  filters: SwipeFilters;
  setCountry: (country: string) => void;
  setSizes: (sizes: string[]) => void;
  toggleSize: (size: string) => void;
  setAges: (ages: string[]) => void;
  toggleAge: (age: string) => void;
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
  ages: [],
};

const STORAGE_KEY = "swipeFilters";
const ONBOARDING_KEY = "swipeOnboardingComplete";

// Migration map for old country names to country codes
const COUNTRY_MIGRATION: Record<string, string> = {
  Germany: "DE",
  "United Kingdom": "GB",
  "United States": "US",
};

export default function useSwipeFilters(): UseSwipeFiltersReturn {
  const [filters, setFiltersState] = useState<SwipeFilters>(() => {
    try {
      const stored = safeStorage.get(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migrate old country names to country codes
        if (parsed.country && COUNTRY_MIGRATION[parsed.country]) {
          parsed.country = COUNTRY_MIGRATION[parsed.country];
          // Save the migrated version back
          safeStorage.stringify(STORAGE_KEY, parsed);
        }
        // Ensure ages field exists (migration for old data)
        if (!parsed.ages) {
          parsed.ages = [];
        }
        return parsed;
      }
    } catch (error) {
      console.error("Failed to load filters from storage:", error);
    }
    return DEFAULT_FILTERS;
  });

  const [needsOnboarding, setNeedsOnboarding] = useState(() => {
    const onboardingComplete = safeStorage.get(ONBOARDING_KEY) === "true";
    const hasFilters = Boolean(filters.country);
    return !onboardingComplete || !hasFilters;
  });

  // Save to localStorage immediately (tests expect this)
  useEffect(() => {
    if (
      filters.country ||
      filters.sizes.length > 0 ||
      filters.ages.length > 0
    ) {
      safeStorage.stringify(STORAGE_KEY, filters);
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

  const setAges = useCallback((ages: string[]) => {
    setFiltersState((prev) => ({ ...prev, ages }));
  }, []);

  const toggleAge = useCallback((age: string) => {
    setFiltersState((prev) => {
      const ages = prev.ages.includes(age)
        ? prev.ages.filter((a) => a !== age)
        : [...prev.ages, age];
      return { ...prev, ages };
    });
  }, []);

  const setFilters = useCallback((newFilters: SwipeFilters) => {
    setFiltersState(newFilters);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    safeStorage.remove(STORAGE_KEY);
  }, []);

  const completeOnboarding = useCallback((newFilters: SwipeFilters) => {
    safeStorage.set(ONBOARDING_KEY, "true");
    safeStorage.stringify(STORAGE_KEY, newFilters);
    setFiltersState(newFilters);
    setNeedsOnboarding(false);
  }, []);

  const isValid = useMemo(() => {
    return Boolean(filters.country);
  }, [filters.country]);

  const toQueryString = useCallback(() => {
    const params = new URLSearchParams();

    if (filters.country) {
      params.append("adoptable_to_country", filters.country);
    }

    // Use array notation for sizes
    filters.sizes.forEach((size) => {
      params.append("size[]", size);
    });

    filters.ages.forEach((age) => {
      params.append("age", age);
    });

    return params.toString();
  }, [filters]);

  return {
    filters,
    setCountry,
    setSizes,
    toggleSize,
    setAges,
    toggleAge,
    setFilters,
    resetFilters,
    isValid,
    toQueryString,
    needsOnboarding,
    completeOnboarding,
  };
}
