import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSwipeable } from "react-swipeable";
import { getDogNeighbors, type DogNeighbor } from "../services/animalsService";
import { reportError } from "../utils/logger";

interface UseSwipeNavigationProps {
  currentDogSlug: string;
  searchParams: Record<string, string>;
}

interface UseSwipeNavigationReturn {
  handlers: ReturnType<typeof useSwipeable>;
  prevDog: DogNeighbor | null;
  nextDog: DogNeighbor | null;
  isLoading: boolean;
}

interface Loaded {
  key: string;
  prev: DogNeighbor | null;
  next: DogNeighbor | null;
}

// The filters that came with the page, minus empty and "Any" values
const cleanParams = (searchParams: Record<string, string>): URLSearchParams => {
  const params = new URLSearchParams();
  Object.entries(searchParams)
    .filter(([, value]) => value && value !== "Any")
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, value]) => params.set(key, value));
  return params;
};

const buildNavigationUrl = (slug: string, query: string): string =>
  `/dogs/${slug}${query ? `?${query}` : ""}`;

/**
 * Previous and next dog for the dog page, from one small request to
 * /api/animals/{slug}/neighbors (#490), in the list's order and under the
 * filters in the URL. Arrow keys and swipes navigate; both pages are prefetched.
 */
export function useSwipeNavigation({
  currentDogSlug,
  searchParams,
}: UseSwipeNavigationProps): UseSwipeNavigationReturn {
  const router = useRouter();
  const query = useMemo(() => cleanParams(searchParams).toString(), [searchParams]);
  const key = `${currentDogSlug}?${query}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDogNeighbors(currentDogSlug, Object.fromEntries(new URLSearchParams(query)))
      .then(({ prev, next }) => {
        if (!cancelled) setLoaded({ key, prev, next });
      })
      .catch((error) => {
        reportError(error, { context: "useSwipeNavigation", slug: currentDogSlug });
        if (!cancelled) setLoaded({ key, prev: null, next: null });
      });
    return () => {
      cancelled = true;
    };
  }, [currentDogSlug, query, key]);

  // Results for another dog or other filters are stale while the new ones load
  const current = loaded?.key === key ? loaded : null;
  const prevDog = current?.prev ?? null;
  const nextDog = current?.next ?? null;

  useEffect(() => {
    for (const dog of [prevDog, nextDog]) {
      if (dog) router.prefetch(buildNavigationUrl(dog.slug, query));
    }
  }, [prevDog, nextDog, query, router]);

  const navigateToPrev = useCallback(() => {
    if (prevDog) router.push(buildNavigationUrl(prevDog.slug, query));
  }, [prevDog, query, router]);

  const navigateToNext = useCallback(() => {
    if (nextDog) router.push(buildNavigationUrl(nextDog.slug, query));
  }, [nextDog, query, router]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // The photo gallery handles its own arrows and prevents the default;
      // React's root listener runs before this document one.
      if (event.defaultPrevented) return;
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigateToPrev();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        navigateToNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [navigateToPrev, navigateToNext]);

  // Swipe left = next, like turning a page forward
  const handlers = useSwipeable({
    onSwipedLeft: navigateToNext,
    onSwipedRight: navigateToPrev,
    preventScrollOnSwipe: true,
    trackMouse: false,
  });

  return { handlers, prevDog, nextDog, isLoading: current === null };
}

export type { UseSwipeNavigationProps, UseSwipeNavigationReturn };
