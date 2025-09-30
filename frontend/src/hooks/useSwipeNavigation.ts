import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSwipeable } from "react-swipeable";
import { getAnimals } from "../services/animalsService";
import type { Dog } from "../types/dog";

// Types
interface UseSwipeNavigationProps {
  currentDogSlug: string;
  searchParams: Record<string, string>;
}

interface UseSwipeNavigationReturn {
  handlers: ReturnType<typeof useSwipeable>;
  prevDog: Dog | null;
  nextDog: Dog | null;
  isLoading: boolean;
}

// LRU Cache implementation
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value!);
      return value;
    }
    return undefined;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Update existing
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance (10-item limit)
const navigationCache = new LRUCache<string, Dog[]>(10);

// Pure function to build URL with search params
const buildNavigationUrl = (
  slug: string,
  searchParams: Record<string, string>,
): string => {
  const params = new URLSearchParams();

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value && value !== "" && value !== "Any") {
      params.set(key, value);
    }
  });

  const queryString = params.toString();
  return `/dogs/${slug}${queryString ? `?${queryString}` : ""}`;
};

// Pure function to find current dog index
const findCurrentDogIndex = (dogs: Dog[], currentSlug: string): number => {
  if (!Array.isArray(dogs) || !currentSlug) {
    return -1;
  }
  return dogs.findIndex((dog) => dog.slug === currentSlug);
};

// Pure function to get adjacent dogs
const getAdjacentDogs = (
  dogs: Dog[],
  currentIndex: number,
): { prevDog: Dog | null; nextDog: Dog | null } => {
  const prevDog = currentIndex > 0 ? dogs[currentIndex - 1] : null;
  const nextDog =
    currentIndex < dogs.length - 1 ? dogs[currentIndex + 1] : null;

  return { prevDog, nextDog };
};

export function useSwipeNavigation({
  currentDogSlug,
  searchParams,
}: UseSwipeNavigationProps): UseSwipeNavigationReturn {
  const router = useRouter();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Create cache key for current search context
  const cacheKey = useMemo(() => {
    const sortedParams = Object.keys(searchParams)
      .sort()
      .map((key) => `${key}:${searchParams[key]}`)
      .join("|");
    return `${currentDogSlug}-${sortedParams}`;
  }, [currentDogSlug, searchParams]);

  // Load dogs with preloading (current + 2 on each side = 5 total)
  const loadDogs = useCallback(async () => {
    if (!mountedRef.current) return;

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache first
    const cachedDogs = navigationCache.get(cacheKey);
    if (cachedDogs) {
      setDogs(cachedDogs);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      // Reduced limit from 1000 to 300 for better performance
      const response = await getAnimals({
        ...searchParams,
        limit: 300, // Reduced from 1000 for better performance
      });

      if (!mountedRef.current) return;

      // Ensure we have a valid array of dogs with valid objects
      const responseArray = Array.isArray(response) ? response : [];
      const allDogs = responseArray.filter(
        (dog) => dog && typeof dog === "object" && dog.slug,
      );
      const currentIndex = findCurrentDogIndex(allDogs, currentDogSlug);

      if (currentIndex === -1) {
        // Current dog not found, just set empty and stop loading
        setDogs([]);
        setIsLoading(false);
        return;
      }

      // Calculate range: current + 2 on each side
      const startIndex = Math.max(0, currentIndex - 2);
      const endIndex = Math.min(allDogs.length - 1, currentIndex + 2);
      const preloadedDogs = allDogs.slice(startIndex, endIndex + 1);

      // Cache the result
      navigationCache.set(cacheKey, preloadedDogs);

      setDogs(preloadedDogs);
    } catch (error) {
      // Don't log errors if request was aborted (user navigated away)
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error loading dogs for navigation:", error);
      } else if (!(error instanceof Error)) {
        console.error("Error loading dogs for navigation:", error);
      }
      if (mountedRef.current) {
        setDogs([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      abortControllerRef.current = null;
    }
  }, [currentDogSlug, searchParams, cacheKey]);

  // Load dogs on mount and when dependencies change
  useEffect(() => {
    mountedRef.current = true;
    loadDogs();

    return () => {
      mountedRef.current = false;
      // Cancel any ongoing request when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [loadDogs]);

  // Find adjacent dogs
  const { prevDog, nextDog } = useMemo(() => {
    if (dogs.length === 0) {
      return { prevDog: null, nextDog: null };
    }

    const currentIndex = findCurrentDogIndex(dogs, currentDogSlug);
    if (currentIndex === -1) {
      return { prevDog: null, nextDog: null };
    }

    return getAdjacentDogs(dogs, currentIndex);
  }, [dogs, currentDogSlug]);

  // Navigation functions
  const navigateToPrev = useCallback(() => {
    if (prevDog && prevDog.slug) {
      const url = buildNavigationUrl(prevDog.slug, searchParams);
      router.push(url);
    }
  }, [prevDog, searchParams, router]);

  const navigateToNext = useCallback(() => {
    if (nextDog && nextDog.slug) {
      const url = buildNavigationUrl(nextDog.slug, searchParams);
      router.push(url);
    }
  }, [nextDog, searchParams, router]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle arrow keys if no input is focused
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          navigateToPrev();
          break;
        case "ArrowRight":
          event.preventDefault();
          navigateToNext();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigateToPrev, navigateToNext]);

  // Swipe handlers - Fix: left swipe = next, right swipe = previous
  const handlers = useSwipeable({
    onSwipedLeft: navigateToNext, // Swipe left = go to next (like turning page forward)
    onSwipedRight: navigateToPrev, // Swipe right = go to previous (like turning page back)
    preventScrollOnSwipe: true,
    trackMouse: false, // Only track touch, not mouse
  });

  return {
    handlers,
    prevDog,
    nextDog,
    isLoading,
  };
}

// Export types and cache for consumers and testing
export type { Dog, UseSwipeNavigationProps, UseSwipeNavigationReturn };
export { navigationCache };
