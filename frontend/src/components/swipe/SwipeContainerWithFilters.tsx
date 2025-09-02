"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useFavorites } from "../../hooks/useFavorites";
import * as Sentry from "@sentry/nextjs";
import { Heart, ChevronRight, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { SwipeCard } from "./SwipeCard";
import SwipeOnboarding from "./SwipeOnboarding";
import SwipeFilters from "./SwipeFilters";
import { SwipeContainerEnhanced } from "./SwipeContainerEnhanced";
import useSwipeFilters from "../../hooks/useSwipeFilters";
import type { SwipeFilters as Filters } from "../../hooks/useSwipeFilters";
import { safeStorage } from "../../utils/safeStorage";

// Constants
const DOUBLE_TAP_DELAY = 300;

interface Dog {
  id: number;
  name: string;
  breed?: string;
  age?: string;
  image?: string;
  organization?: string;
  location?: string;
  slug: string;
  description?: string;
  traits?: string[];
  energy_level?: number;
  special_characteristic?: string;
  quality_score?: number;
  created_at?: string;
}

interface SwipeContainerWithFiltersProps {
  fetchDogs?: (queryString: string) => Promise<Dog[]>;
  onSwipe?: (direction: "left" | "right", dog: Dog) => void;
  onCardExpanded?: (dog: Dog) => void;
}

export function SwipeContainerWithFilters({
  fetchDogs,
  onSwipe,
  onCardExpanded,
}: SwipeContainerWithFiltersProps) {
  const router = useRouter();
  const { addFavorite, isFavorited } = useFavorites();
  const {
    filters,
    setFilters,
    isValid,
    toQueryString,
    needsOnboarding,
    completeOnboarding,
  } = useSwipeFilters();

  const [dogs, setDogs] = useState<Dog[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [lastTap, setLastTap] = useState<number>(0);
  const [swipedDogIds, setSwipedDogIds] = useState<Set<number>>(() => {
    const stored = safeStorage.get("swipedDogIds");
    if (stored) {
      try {
        return new Set(JSON.parse(stored));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });
  const [offset, setOffset] = useState(0);

  // Memoize the query string to prevent unnecessary re-renders
  const queryString = useMemo(() => {
    if (isValid) {
      return toQueryString();
    }
    return "";
  }, [isValid, toQueryString]);

  // Preload next images when dogs change or current index changes
  useEffect(() => {
    const preloadCount = 3; // Preload next 3 images
    const imagesToPreload: string[] = [];

    for (let i = 1; i <= preloadCount; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < dogs.length && dogs[nextIndex]?.image) {
        imagesToPreload.push(dogs[nextIndex].image);
      }
    }

    // Preload images using Image constructor
    imagesToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [currentIndex, dogs]);

  // Fetch dogs when filters change
  useEffect(() => {
    if (isValid && fetchDogs && queryString) {
      const loadDogs = async () => {
        setIsLoading(true);
        try {
          const fetchedDogs = await fetchDogs(queryString);
          // Get swiped IDs from storage instead of state to avoid stale closure
          const storedSwipedIds = safeStorage.get("swipedDogIds");
          const swipedIds = new Set(
            storedSwipedIds ? JSON.parse(storedSwipedIds) : [],
          );

          // Filter out only dogs that have been swiped
          const newDogs = fetchedDogs.filter((dog) => !swipedIds.has(dog.id));

          setDogs(newDogs);
          setCurrentIndex(0);
          setOffset(0);

          Sentry.captureEvent({
            message: "swipe.queue.loaded",
            extra: {
              filtersData: filters,
              dogCount: newDogs.length,
              filteredOut: fetchedDogs.length - newDogs.length,
            },
          });
        } catch (error) {
          console.error("Failed to fetch dogs:", error);
          Sentry.captureException(error);
        } finally {
          setIsLoading(false);
        }
      };
      loadDogs();
    }
  }, [filters, isValid, queryString, fetchDogs]);

  // Prevent body scroll on mobile while swiping
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Log session start
  useEffect(() => {
    Sentry.captureEvent({
      message: "swipe.session.started",
      extra: { timestamp: new Date().toISOString() },
    });

    return () => {
      Sentry.captureEvent({
        message: "swipe.session.ended",
        extra: {
          timestamp: new Date().toISOString(),
          dogsViewed: currentIndex,
        },
      });
    };
  }, [currentIndex]);

  const handleOnboardingComplete = useCallback(
    (skipped: boolean, onboardingFilters?: Filters) => {
      if (!skipped && onboardingFilters) {
        completeOnboarding(onboardingFilters);
      }
    },
    [completeOnboarding],
  );

  const goToNext = useCallback(() => {
    if (currentIndex < dogs.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      const nextDog = dogs[currentIndex + 1];
      if (nextDog) {
        Sentry.captureEvent({
          message: "swipe.card.viewed",
          extra: {
            dogId: nextDog.id,
            dogName: nextDog.name,
          },
        });
      }

      // Check if we need to load more dogs
      if (
        currentIndex >= dogs.length - 5 &&
        fetchDogs &&
        !isLoadingMore &&
        queryString
      ) {
        setIsLoadingMore(true);
        const newOffset = offset + dogs.length;
        setOffset(newOffset);

        fetchDogs(queryString + `&offset=${newOffset}`)
          .then((fetchedDogs) => {
            if (fetchedDogs && fetchedDogs.length > 0) {
              setDogs((prevDogs) => {
                const storedSwipedIds = safeStorage.get("swipedDogIds");
                const swipedIds = new Set(
                  storedSwipedIds ? JSON.parse(storedSwipedIds) : [],
                );
                const newDogs = fetchedDogs.filter((dog) => {
                  return !swipedIds.has(dog.id);
                });

                if (newDogs.length > 0) {
                  return [...prevDogs, ...newDogs];
                }
                return prevDogs;
              });
            }
            setIsLoadingMore(false);
          })
          .catch((error) => {
            console.error("Failed to load more dogs:", error);
            setIsLoadingMore(false);
          });
      }
    }
  }, [currentIndex, dogs, fetchDogs, queryString, isLoadingMore, offset]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleSwipeComplete = useCallback(
    async (direction: "left" | "right") => {
      const currentDog = dogs[currentIndex];
      if (!currentDog) return;

      // Track this dog as swiped AFTER we move to next index
      // to avoid filtering issues
      const currentDogId = currentDog.id;

      if (direction === "right") {
        await addFavorite(currentDog.id, currentDog.name);
        Sentry.captureEvent({
          message: "swipe.card.favorited",
          extra: {
            dogId: currentDog.id,
            dogName: currentDog.name,
          },
        });
      }

      if (onSwipe) {
        onSwipe(direction, currentDog);
      }

      // Update index FIRST, before updating swipedDogIds
      setCurrentIndex((prev) => prev + 1);

      // NOW track this dog as swiped (after index is updated)
      setSwipedDogIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(currentDogId);
        // Save to storage safely
        safeStorage.stringify("swipedDogIds", Array.from(newSet));
        return newSet;
      });

      // Check if we need to load more dogs
      if (
        currentIndex >= dogs.length - 5 &&
        fetchDogs &&
        !isLoadingMore &&
        queryString
      ) {
        setIsLoadingMore(true);
        const newOffset = offset + dogs.length;
        setOffset(newOffset);

        fetchDogs(queryString + `&offset=${newOffset}`)
          .then((fetchedDogs) => {
            if (fetchedDogs && fetchedDogs.length > 0) {
              // Use functional update to get latest swipedDogIds
              setDogs((prevDogs) => {
                // Get the current swiped IDs from storage to be safe
                const storedSwipedIds = safeStorage.get("swipedDogIds");
                const swipedIds = new Set(
                  storedSwipedIds ? JSON.parse(storedSwipedIds) : [],
                );

                // Filter out dogs that have been swiped, but NOT the dog at current viewing index
                const currentViewingIndex = prevDogs.length; // This will be the index after we append
                const newDogs = fetchedDogs.filter((dog, idx) => {
                  // Don't filter if this will be the immediate next dog to view
                  if (idx === 0 && currentViewingIndex === prevDogs.length) {
                    return true;
                  }
                  return !swipedIds.has(dog.id);
                });

                if (newDogs.length > 0) {
                  return [...prevDogs, ...newDogs];
                }
                return prevDogs;
              });
            }
            setIsLoadingMore(false);
          })
          .catch((error) => {
            console.error("Failed to load more dogs:", error);
            setIsLoadingMore(false);
          });
      }
    },
    [
      currentIndex,
      dogs,
      addFavorite,
      onSwipe,
      fetchDogs,
      queryString,
      isLoadingMore,
      offset,
    ],
  );

  const handleCardTap = useCallback(() => {
    const currentDog = dogs[currentIndex];
    if (!currentDog) return;

    const now = Date.now();
    if (now - lastTap < DOUBLE_TAP_DELAY) {
      // Double tap - quick favorite
      handleSwipeComplete("right");
      Sentry.captureEvent({
        message: "swipe.card.double_tapped",
        extra: {
          dogId: currentDog.id,
          dogName: currentDog.name,
        },
      });
    } else {
      // Single tap - expand details
      if (onCardExpanded) {
        onCardExpanded(currentDog);
      }
      Sentry.captureEvent({
        message: "swipe.card.expanded",
        extra: {
          dogId: currentDog.id,
          dogName: currentDog.name,
        },
      });
    }
    setLastTap(now);
  }, [currentIndex, dogs, lastTap, handleSwipeComplete, onCardExpanded]);

  // Onboarding state - check this first, before loading or empty states
  if (needsOnboarding) {
    return <SwipeOnboarding onComplete={handleOnboardingComplete} />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="animate-pulse">
          <div className="w-80 h-96 bg-gray-200 rounded-2xl mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Empty state - but show loading if we're fetching more
  if (dogs.length === 0 || (currentIndex >= dogs.length && !isLoadingMore)) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🐕</div>
          <h3 className="text-2xl font-bold mb-2">More dogs coming!</h3>
          <p className="text-gray-600 mb-4">
            Check back soon or adjust your filters
          </p>
          <button
            onClick={() => setShowFilters(true)}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Change Filters
          </button>
        </div>
      </div>
    );
  }

  // If we're at the end but loading more, show a loading state
  if (currentIndex >= dogs.length && isLoadingMore) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="animate-pulse">
          <div className="w-80 h-96 bg-gray-200 rounded-2xl mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <p className="text-gray-600 mt-4">Loading more dogs...</p>
      </div>
    );
  }

  const currentDog = dogs[currentIndex];

  return (
    <>
      {/* Filter Modal - increased z-index to ensure visibility */}
      {showFilters && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Filter Dogs</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>
            <SwipeFilters
              onFiltersChange={(newFilters) => {
                setFilters(newFilters);
                setShowFilters(false);
                // Reset index when filters change
                setCurrentIndex(0);
                setDogs([]);
                setIsLoading(true);
                Sentry.captureEvent({
                  message: "swipe.filter.changed",
                  extra: {
                    filters: newFilters,
                  },
                });
              }}
            />
          </div>
        </div>
      )}

      <div className="relative h-full flex flex-col">
        {/* Header with Filter Bar and Exit Button */}
        <div className="p-4 flex justify-between items-center bg-white border-b relative">
          {/* Exit button - absolute positioned */}
          <button
            onClick={() => {
              // Use window.location to avoid Next.js 15 navigation bugs
              window.location.href = "/";
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-50"
            aria-label="Exit to home"
          >
            <Home className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex-1 flex justify-between items-center pr-12">
            <div className="cursor-pointer">
              <SwipeFilters compact onFiltersChange={() => {}} />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Clear swiped dogs history
                  setSwipedDogIds(new Set());
                  safeStorage.remove("swipedDogIds");
                  setCurrentIndex(0);
                  setOffset(0);
                  setDogs([]);
                  setIsLoading(true);

                  // Fetch dogs after reset if we have valid filters
                  if (isValid && fetchDogs && queryString) {
                    fetchDogs(queryString)
                      .then((fetchedDogs) => {
                        setDogs(fetchedDogs);
                        setCurrentIndex(0);
                        setIsLoading(false);
                      })
                      .catch((error) => {
                        console.error(
                          "Failed to fetch dogs after reset:",
                          error,
                        );
                        setIsLoading(false);
                      });
                  } else {
                    setIsLoading(false);
                  }
                }}
                className="px-3 py-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                title="Start fresh with all dogs"
              >
                Reset
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowFilters(true);
                }}
                className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                + Filters
              </button>
            </div>
          </div>
        </div>

        {/* Main swipe container - responsive for small screens */}
        <div
          className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden"
          style={{
            height: "100dvh",
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          <div
            className="relative w-full flex flex-col"
            style={{
              maxWidth: "min(calc(100vw - 1rem), 400px)",
              height: "min(calc(100dvh - 160px), 700px)",
            }}
          >
            <div
              key={`dog-${currentDog.id}`}
              className="relative touch-none"
              onClick={handleCardTap}
              style={{ touchAction: "none" }}
            >
              <SwipeCard dog={currentDog} />
            </div>

            {/* Paw Navigation - responsive sizes */}
            <div className="flex justify-center gap-4 sm:gap-8 mt-2 sm:mt-4">
              <button
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className="paw-btn paw-left w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white shadow-lg flex flex-col items-center justify-center hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous dog"
              >
                <span className="text-2xl sm:text-3xl transform rotate-180">
                  🐾
                </span>
                <span className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  Back
                </span>
              </button>

              <button
                onClick={goToNext}
                disabled={currentIndex === dogs.length - 1}
                className="paw-btn paw-right w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white shadow-lg flex flex-col items-center justify-center hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next dog"
              >
                <span className="text-2xl sm:text-3xl">🐾</span>
                <span className="text-[10px] sm:text-xs text-gray-500 mt-1">
                  Next
                </span>
              </button>
            </div>

            {/* Progress indicator */}
            <div className="text-center mt-2 sm:mt-4 text-sm text-gray-500">
              {currentIndex + 1} / {dogs.length}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
