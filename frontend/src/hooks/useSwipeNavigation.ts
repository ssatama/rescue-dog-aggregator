import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSwipeable } from "react-swipeable";
import { getAnimals } from "../services/animalsService";

// Types
interface Dog {
  id: number;
  slug: string;
  name: string;
  breed?: string;
  [key: string]: any;
}

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

    // Check cache first
    const cachedDogs = navigationCache.get(cacheKey);
    if (cachedDogs) {
      setDogs(cachedDogs);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // First, get all dogs to find current position
      const allDogs = await getAnimals({
        ...searchParams,
        limit: 1000, // Get enough to find current position
      });

      if (!mountedRef.current) return;

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
      console.error("Error loading dogs for navigation:", error);
      setDogs([]);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [currentDogSlug, searchParams, cacheKey]);

  // Load dogs on mount and when dependencies change
  useEffect(() => {
    mountedRef.current = true;
    loadDogs();

    return () => {
      mountedRef.current = false;
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
    if (prevDog) {
      const url = buildNavigationUrl(prevDog.slug, searchParams);
      router.push(url);
    }
  }, [prevDog, searchParams, router]);

  const navigateToNext = useCallback(() => {
    if (nextDog) {
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

  // Swipe handlers
  const handlers = useSwipeable({
    onSwipedLeft: navigateToPrev, // Swipe left = go to previous
    onSwipedRight: navigateToNext, // Swipe right = go to next
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

// Export types for consumers
export type { Dog, UseSwipeNavigationProps, UseSwipeNavigationReturn };
