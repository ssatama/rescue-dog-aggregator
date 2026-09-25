"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { X, ChevronLeft, ChevronRight, PawPrint, SlidersHorizontal } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useFavorites } from "../../hooks/useFavorites";
import { SwipeCard } from "./SwipeCard";
import SwipeOnboarding from "./SwipeOnboarding";
import { FilterModal } from "./FilterModal";
import SwipeFilters from "./SwipeFilters";
import useSwipeFilters from "../../hooks/useSwipeFilters";
import type { SwipeFilters as Filters } from "../../hooks/useSwipeFilters";
import { safeStorage } from "../../utils/safeStorage";
import { useTheme } from "../providers/ThemeProvider";
import { type Dog } from "../../types/dog";
import type { CountryOption } from "../../services/serverSwipeService";

interface SwipeContainerProps {
  fetchDogs?: (queryString: string) => Promise<Dog[]>;
  onCardExpanded?: (dog: Dog, index: number) => void;
  onDogsLoaded?: (dogs: Dog[]) => void;
  initialDogs?: Dog[] | null;
  initialFilters?: Filters;
  needsOnboarding?: boolean;
  onFiltersChange?: (filters: Filters) => void;
  availableCountries?: CountryOption[];
  /** Arrow keys, F and Enter act on the card; off while the details are open. */
  keyboardEnabled?: boolean;
}

// A drag this far, or this fast, changes the dog; anything less springs back
const SWIPE_DISTANCE = 80;
const SWIPE_VELOCITY = 500;
// Fetch the next batch while this many dogs are still ahead
const PREFETCH_AHEAD = 5;

const PILL_BUTTON =
  "inline-flex h-12 min-w-[7.5rem] items-center justify-center gap-1.5 rounded-full px-5 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40";
const SECONDARY = `${PILL_BUTTON} border border-line bg-surface text-ink hover:bg-soft`;
const PRIMARY = `${PILL_BUTTON} bg-orange-700 text-white hover:bg-orange-800`;

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function EndOfStack({
  empty,
  failed,
  onStartOver,
  onChangeFilters,
}: {
  empty: boolean;
  /** Nothing loaded because the request failed, not because nothing matched */
  failed: boolean;
  onStartOver: () => void;
  onChangeFilters: () => void;
}): React.ReactElement {
  if (failed) {
    return (
      <div className="flex max-w-sm flex-col items-center gap-3 text-center" data-testid="swipe-end">
        <h2 className="font-display text-2xl font-bold text-ink">We couldn&apos;t load the dogs</h2>
        <p className="text-subtle">Check your connection and try again.</p>
        <button type="button" onClick={onStartOver} className={`${PRIMARY} mt-2`}>
          Try again
        </button>
      </div>
    );
  }
  return (
    <div className="flex max-w-sm flex-col items-center gap-3 text-center" data-testid="swipe-end">
      <span className="grid h-16 w-16 place-items-center rounded-full bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">
        <PawPrint className="h-8 w-8" aria-hidden="true" />
      </span>
      <h2 className="font-display text-2xl font-bold text-ink">
        {empty ? "No dogs match these filters" : "You've seen every dog here"}
      </h2>
      <p className="text-subtle">
        {empty
          ? "Try more sizes or ages, or browse every dog in the catalog."
          : "That's everyone matching your filters for now. Rescues add new dogs three times a week."}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {!empty && (
          <button type="button" onClick={onStartOver} className={PRIMARY}>
            Start over
          </button>
        )}
        <button type="button" onClick={onChangeFilters} className={SECONDARY}>
          Change filters
        </button>
        <Link href="/dogs" className={SECONDARY}>
          Browse all dogs
        </Link>
      </div>
    </div>
  );
}

export function SwipeContainer({
  fetchDogs,
  onCardExpanded,
  onDogsLoaded,
  initialDogs,
  initialFilters,
  needsOnboarding: needsOnboardingProp,
  onFiltersChange,
  availableCountries,
  keyboardEnabled = true,
}: SwipeContainerProps) {
  const { theme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const { toggleFavorite } = useFavorites();
  const {
    filters,
    setFilters,
    isValid,
    toQueryString,
    needsOnboarding: needsOnboardingFromHook,
    completeOnboarding,
  } = useSwipeFilters();

  const showOnboarding = needsOnboardingProp ?? needsOnboardingFromHook;

  const [dogs, setDogs] = useState<Dog[]>(() => initialDogs ?? []);
  const [currentIndex, setCurrentIndex] = useState(() => safeStorage.parse("swipeCurrentIndex", 0));
  const [isLoading, setIsLoading] = useState(!initialDogs);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const dragged = useRef(false);
  // The first load restores the saved position; new filters start at the top
  const restorePosition = useRef(true);

  const onDogsLoadedRef = useRef(onDogsLoaded);
  useEffect(() => {
    onDogsLoadedRef.current = onDogsLoaded;
  }, [onDogsLoaded]);

  // The page keeps its own copy for the details modal's prev/next
  useEffect(() => {
    onDogsLoadedRef.current?.(dogs);
  }, [dogs]);

  const queryString = useMemo(() => (isValid ? toQueryString() : ""), [isValid, toQueryString]);

  const setIndex = useCallback((index: number) => {
    setCurrentIndex(index);
    safeStorage.set("swipeCurrentIndex", String(index));
  }, []);

  // Sync initialFilters with hook state on mount
  useEffect(() => {
    if (initialFilters && initialFilters.country) {
      setFilters(initialFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only sync initialFilters on mount, setFilters is stable
  }, []);

  // Fetch dogs when filters change
  useEffect(() => {
    if (!isValid || !fetchDogs || !queryString) return;
    let cancelled = false;

    const loadDogs = async () => {
      setIsLoading(true);
      try {
        const fetched = await fetchDogs(queryString);
        if (cancelled) return;
        const restore = restorePosition.current;
        restorePosition.current = false;
        setDogs(fetched);
        setLoadFailed(false);
        // Up to fetched.length: a visitor who had reached the end stays there
        setCurrentIndex((prev) => {
          const index = restore ? Math.min(prev, fetched.length) : 0;
          safeStorage.set("swipeCurrentIndex", String(index));
          return index;
        });
        setOffset(0);
        Sentry.addBreadcrumb({
          message: "swipe.queue.loaded",
          category: "swipe",
          level: "info",
          data: { dogCount: fetched.length },
        });
      } catch (error) {
        // Keep whatever stack is showing rather than an empty "no matches"
        Sentry.captureException(error);
        if (!cancelled) setLoadFailed(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadDogs();
    return () => {
      cancelled = true;
    };
  }, [isValid, queryString, fetchDogs]);

  const loadMore = useCallback(() => {
    if (!fetchDogs || isLoadingMore || !queryString) return;
    setIsLoadingMore(true);
    const newOffset = offset + dogs.length;
    setOffset(newOffset);
    fetchDogs(`${queryString}&offset=${newOffset}&randomize=true`)
      .then((fetched) => {
        // A random batch can repeat dogs already in the stack
        setDogs((prev) => {
          const seen = new Set(prev.map((dog) => dog.id));
          const fresh = fetched.filter((dog) => !seen.has(dog.id));
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
      })
      .catch((error) => Sentry.captureException(error))
      .finally(() => setIsLoadingMore(false));
  }, [fetchDogs, isLoadingMore, queryString, offset, dogs.length]);

  const currentDog: Dog | undefined = dogs[currentIndex];

  // Next can step past the last dog, onto the end of the stack
  const goToNext = useCallback(() => {
    if (currentIndex >= dogs.length) return;
    const next = currentIndex + 1;
    setIndex(next);
    if (next >= dogs.length - PREFETCH_AHEAD) loadMore();
    const nextDog = dogs[next];
    if (nextDog) {
      Sentry.addBreadcrumb({
        message: "swipe.card.viewed",
        category: "swipe",
        level: "info",
        data: { dogId: nextDog.id, dogName: nextDog.name },
      });
    }
  }, [currentIndex, dogs, setIndex, loadMore]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) setIndex(Math.min(currentIndex, dogs.length) - 1);
  }, [currentIndex, dogs.length, setIndex]);

  const openDetails = useCallback(() => {
    if (!currentDog) return;
    onCardExpanded?.(currentDog, currentIndex);
    Sentry.addBreadcrumb({
      message: "swipe.card.expanded",
      category: "swipe",
      level: "info",
      data: { dogId: currentDog.id, dogName: currentDog.name },
    });
  }, [currentDog, currentIndex, onCardExpanded]);

  const startOver = useCallback(() => {
    setIndex(0);
    setOffset(0);
    if (!fetchDogs || !queryString) return;
    setIsLoading(true);
    fetchDogs(`${queryString}&randomize=true`)
      .then((fetched) => {
        setDogs(fetched);
        setLoadFailed(false);
      })
      .catch((error) => {
        // On failure the current stack stays, from its first dog
        Sentry.captureException(error);
        setLoadFailed(true);
      })
      .finally(() => setIsLoading(false));
  }, [fetchDogs, queryString, setIndex]);

  // ← → browse, F saves, Enter opens the details (#499)
  useEffect(() => {
    if (!keyboardEnabled || showFilters || showOnboarding) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) return;
      switch (e.key) {
        case "ArrowRight":
          goToNext();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "f":
        case "F":
          if (!currentDog) return;
          void toggleFavorite(currentDog.id, currentDog.name, currentDog);
          break;
        case "Enter":
          // Enter on a focused button or link belongs to that control
          if (!currentDog || (e.target instanceof HTMLElement && e.target.closest("button, a"))) return;
          openDetails();
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [keyboardEnabled, showFilters, showOnboarding, currentDog, goToNext, goToPrevious, openDetails, toggleFavorite]);

  useEffect(() => {
    Sentry.addBreadcrumb({ message: "swipe.session.started", category: "swipe", level: "info" });
  }, []);

  const handleOnboardingComplete = useCallback(
    (skipped: boolean, onboardingFilters?: Filters) => {
      if (!skipped && onboardingFilters) {
        completeOnboarding(onboardingFilters);
        onFiltersChange?.(onboardingFilters);
      }
    },
    [completeOnboarding, onFiltersChange],
  );

  if (showOnboarding) {
    return <SwipeOnboarding onComplete={handleOnboardingComplete} availableCountries={availableCountries} />;
  }

  const atEnd = !isLoading && !currentDog && !isLoadingMore;

  return (
    <>
      <FilterModal
        show={showFilters}
        filters={filters}
        onClose={() => setShowFilters(false)}
        onFiltersChange={setFilters}
        isDarkMode={theme === "dark"}
      />

      <div className="flex h-[100dvh] flex-col overflow-hidden bg-background">
        <header className="flex flex-none items-center gap-2 px-3 py-3 sm:px-4">
          <div className="min-w-0 flex-1 overflow-hidden">
            <SwipeFilters compact onFiltersChange={() => {}} />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="inline-flex h-10 flex-none items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-ink hover:bg-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            Filters
          </button>
          <button
            type="button"
            onClick={() => {
              // Use window.location to avoid Next.js 15 navigation bugs
              window.location.href = "/";
            }}
            className="grid h-10 w-10 flex-none place-items-center rounded-full bg-soft text-ink hover:bg-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Exit to home"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
          {isLoading || (!currentDog && isLoadingMore) ? (
            <div
              className="h-full max-h-[48rem] w-full max-w-md animate-pulse rounded-2xl bg-soft"
              aria-busy="true"
              aria-label="Loading dogs"
            />
          ) : atEnd ? (
            <EndOfStack
              empty={dogs.length === 0}
              failed={loadFailed && dogs.length === 0}
              onStartOver={startOver}
              onChangeFilters={() => setShowFilters(true)}
            />
          ) : (
            currentDog && (
              <>
                <motion.div
                  key={`dog-${currentDog.id}`}
                  className="min-h-0 w-full max-w-md flex-1 lg:max-h-[48rem]"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.5}
                  onDragStart={() => {
                    dragged.current = true;
                  }}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -SWIPE_DISTANCE || info.velocity.x < -SWIPE_VELOCITY) goToNext();
                    else if (info.offset.x > SWIPE_DISTANCE || info.velocity.x > SWIPE_VELOCITY) goToPrevious();
                    // The click that ends a drag must not open the details
                    setTimeout(() => {
                      dragged.current = false;
                    }, 0);
                  }}
                  onClickCapture={(e) => {
                    if (dragged.current) {
                      e.stopPropagation();
                      e.preventDefault();
                    }
                  }}
                  onClick={openDetails}
                  style={{ touchAction: "pan-y" }}
                  initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <SwipeCard dog={currentDog} onOpenDetails={openDetails} />
                </motion.div>

                <div className="flex w-full max-w-md flex-none items-center justify-center gap-3 pt-3">
                  <button type="button" onClick={goToPrevious} disabled={currentIndex === 0} className={SECONDARY}>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    Back
                  </button>
                  <button type="button" onClick={goToNext} className={PRIMARY}>
                    Next
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
                <p className="hidden pt-2 text-xs text-subtle lg:block" data-testid="keyboard-hint">
                  <kbd className="font-sans">←</kbd> <kbd className="font-sans">→</kbd> browse ·{" "}
                  <kbd className="font-sans">F</kbd> save · <kbd className="font-sans">Enter</kbd> details
                </p>
              </>
            )
          )}
        </main>
      </div>
    </>
  );
}
