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
import { FilterModal } from "./FilterModal";
import SwipeFilters from "./SwipeFilters";
import { SwipeContainerEnhanced } from "./SwipeContainerEnhanced";
import useSwipeFilters from "../../hooks/useSwipeFilters";
import type { SwipeFilters as Filters } from "../../hooks/useSwipeFilters";
import { safeStorage } from "../../utils/safeStorage";
import { useTheme } from "../providers/ThemeProvider";

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
  const { theme } = useTheme();
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
  const [currentIndex, setCurrentIndex] = useState(() => {
    // Initialize from sessionStorage to preserve navigation state
    const stored = safeStorage.get("swipeCurrentIndex");
    if (stored) {
      try {
        return parseInt(stored, 10) || 0;
      } catch {
        return 0;
      }
    }
    return 0;
  });
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
  const swipedDogIdsRef = useRef(swipedDogIds);
  swipedDogIdsRef.current = swipedDogIds;
  const isProcessingSwipe = useRef(false);
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
    const imageElements: HTMLImageElement[] = [];
    let mounted = true;

    for (let i = 1; i <= preloadCount; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < dogs.length && dogs[nextIndex]?.image) {
        imagesToPreload.push(dogs[nextIndex].image);
      }
    }

    // Preload images using Image constructor with proper cleanup
    imagesToPreload.forEach((src) => {
      if (!mounted) return;

      const img = new Image();

      // Set up handlers before setting src to avoid race conditions
      img.onload = () => {
        if (!mounted) {
          img.src = "";
        }
      };

      img.onerror = () => {
        if (!mounted) {
          img.src = "";
        }
      };

      img.src = src;
      imageElements.push(img);
    });

    // Cleanup function to prevent memory leaks
    return () => {
      mounted = false;
      imageElements.forEach((img) => {
        // Cancel any in-flight image loads
        img.src = "";
        img.onload = null;
        img.onerror = null;
      });
    };
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
          // Preserve current position or clamp if needed when filters change
          setCurrentIndex((prevIndex) => {
            const clampedIndex = Math.min(
              prevIndex,
              Math.max(0, newDogs.length - 1),
            );
            safeStorage.set("swipeCurrentIndex", clampedIndex.toString());
            return clampedIndex;
          });
          setOffset(0);

          Sentry.addBreadcrumb({
            message: "swipe.queue.loaded",
            category: "swipe",
            level: "info",
            data: {
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

  // Allow natural scrolling - no swipe gestures used
  // Body scroll lock removed to enable vertical scrolling to reach all controls

  // Log session start
  useEffect(() => {
    Sentry.addBreadcrumb({
      message: "swipe.session.started",
      category: "swipe",
      level: "info",
      data: { timestamp: new Date().toISOString() },
    });

    return () => {
      Sentry.addBreadcrumb({
        message: "swipe.session.ended",
        category: "swipe",
        level: "info",
        data: { timestamp: new Date().toISOString() },
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
      setCurrentIndex((prev) => {
        const newIndex = prev + 1;
        safeStorage.set("swipeCurrentIndex", newIndex.toString());
        return newIndex;
      });
      const nextDog = dogs[currentIndex + 1];
      if (nextDog) {
        Sentry.addBreadcrumb({
          message: "swipe.card.viewed",
          category: "swipe",
          level: "info",
          data: {
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

        // Add randomize parameter when fetching more dogs
        fetchDogs(queryString + `&offset=${newOffset}&randomize=true`)
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
      setCurrentIndex((prev) => {
        const newIndex = prev - 1;
        safeStorage.set("swipeCurrentIndex", newIndex.toString());
        return newIndex;
      });
    }
  }, [currentIndex]);

  const handleSwipeComplete = useCallback(
    async (direction: "left" | "right") => {
      // Prevent concurrent swipes
      if (isProcessingSwipe.current) return;
      isProcessingSwipe.current = true;

      const currentDog = dogs[currentIndex];
      if (!currentDog) {
        isProcessingSwipe.current = false;
        return;
      }

      // Track this dog as swiped AFTER we move to next index
      // to avoid filtering issues
      const currentDogId = currentDog.id;

      if (direction === "right") {
        await addFavorite(currentDog.id, currentDog.name);
        Sentry.addBreadcrumb({
          message: "swipe.card.favorited",
          category: "swipe",
          level: "info",
          data: {
            dogId: currentDog.id,
            dogName: currentDog.name,
            source: "double_tap",
          },
        });
      }

      if (onSwipe) {
        onSwipe(direction, currentDog);
      }

      // Update index FIRST, before updating swipedDogIds
      setCurrentIndex((prev) => {
        const newIndex = prev + 1;
        safeStorage.set("swipeCurrentIndex", newIndex.toString());
        return newIndex;
      });

      // Track the dog we just swiped BEFORE updating the index
      // This ensures we track the correct dog even if a re-render happens
      const dogToTrack = dogs[currentIndex];
      if (dogToTrack?.id) {
        setSwipedDogIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(dogToTrack.id);
          // Save to storage safely
          safeStorage.stringify("swipedDogIds", Array.from(newSet));
          return newSet;
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

        // Add randomize parameter when fetching more dogs
        fetchDogs(queryString + `&offset=${newOffset}&randomize=true`)
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
          })
          .finally(() => {
            // Reset processing flag after all operations complete
            isProcessingSwipe.current = false;
          });
      } else {
        // Reset processing flag if not loading more
        isProcessingSwipe.current = false;
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
      Sentry.addBreadcrumb({
        message: "swipe.card.double_tapped",
        category: "swipe",
        level: "info",
        data: {
          dogId: currentDog.id,
          dogName: currentDog.name,
        },
      });
    } else {
      // Single tap - expand details
      if (onCardExpanded) {
        onCardExpanded(currentDog);
      }
      Sentry.addBreadcrumb({
        message: "swipe.card.expanded",
        category: "swipe",
        level: "info",
        data: {
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
      <div className="flex flex-col items-center justify-center h-full p-8 bg-gradient-to-b from-orange-50/30 to-white dark:bg-gray-900">
        <div className="animate-pulse">
          <div className="w-80 h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // Empty state - but show loading if we're fetching more
  if (dogs.length === 0 || (currentIndex >= dogs.length && !isLoadingMore)) {
    return (
      <>
        <FilterModal
          show={showFilters}
          filters={filters}
          onClose={() => setShowFilters(false)}
          onFiltersChange={setFilters}
          isDarkMode={theme === "dark"}
        />
        <div className="flex flex-col items-center justify-center h-full p-8 bg-gradient-to-b from-orange-50/30 to-white dark:bg-gray-900">
          <div className="text-center">
            <div className="text-6xl mb-4">🐕</div>
            <h3 className="text-2xl font-bold mb-2 dark:text-gray-100">
              More dogs coming!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
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
      </>
    );
  }

  // If we're at the end but loading more, show a loading state
  if (currentIndex >= dogs.length && isLoadingMore) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-gradient-to-b from-orange-50/30 to-white dark:bg-gray-900">
        <div className="animate-pulse">
          <div className="w-80 h-96 bg-gray-200 dark:bg-gray-700 rounded-2xl mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-4">
          Loading more dogs...
        </p>
      </div>
    );
  }

  const currentDog = dogs[currentIndex];

  return (
    <>
      <FilterModal
        show={showFilters}
        filters={filters}
        onClose={() => setShowFilters(false)}
        onFiltersChange={setFilters}
        isDarkMode={theme === "dark"}
      />

      <div className="relative flex flex-col min-h-[100dvh] overflow-y-auto bg-gradient-to-b from-orange-50/30 to-white dark:bg-gray-900">
        {/* Header with Filter Bar and Exit Button */}
        <div className="flex-shrink-0 p-4 flex justify-between items-center bg-white dark:bg-gray-800 border-b dark:border-gray-700 relative">
          {/* Exit button - absolute positioned */}
          <button
            onClick={() => {
              // Use window.location to avoid Next.js 15 navigation bugs
              window.location.href = "/";
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors z-50"
            aria-label="Exit to home"
          >
            <Home className="w-5 h-5 text-gray-600 dark:text-gray-300" />
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
                  safeStorage.set("swipeCurrentIndex", "0");
                  setOffset(0);
                  setDogs([]);
                  setIsLoading(true);

                  // Fetch dogs after reset if we have valid filters
                  if (isValid && fetchDogs && queryString) {
                    // Add randomize parameter to re-randomize the queue
                    const randomizedQuery = queryString + "&randomize=true";
                    fetchDogs(randomizedQuery)
                      .then((fetchedDogs) => {
                        setDogs(fetchedDogs);
                        setCurrentIndex(0);
                        safeStorage.set("swipeCurrentIndex", "0");
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
                className="px-3 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
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
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                + Filters
              </button>
            </div>
          </div>
        </div>

        {/* Main swipe container - responsive for small screens */}
        <div className="flex-1 flex flex-col items-center justify-start p-2 sm:p-4 pb-8">
          <div
            className="relative w-full flex flex-col"
            style={{
              maxWidth: (() => {
                if (typeof window === "undefined") return "400px";
                const vw = window.innerWidth;
                if (vw < 640) return "calc(100vw - 2rem)"; // Phones: full width minus padding
                if (vw < 768) return "min(500px, calc(100vw - 3rem))"; // Large phones
                if (vw < 1024) return "min(600px, calc(100vw - 4rem))"; // Tablets
                return "700px"; // Large tablets
              })(),
              minHeight: "300px",
            }}
          >
            <div
              key={`dog-${currentDog.id}`}
              className="relative touch-none"
              onClick={handleCardTap}
              style={{ touchAction: "pan-y" }}
            >
              <SwipeCard dog={currentDog} />
            </div>

            {/* Progress Indicator */}
            <div className="flex flex-col items-center mt-4 mb-2">
              {/* Progress dots */}
              <div className="flex gap-1 mb-2">
                {Array.from({ length: Math.min(dogs.length, 10) }).map(
                  (_, idx) => (
                    <div
                      key={idx}
                      className={`rounded-full transition-all duration-200 ${
                        idx === currentIndex % 10
                          ? "bg-orange-500 w-3 h-3"
                          : idx < currentIndex % 10
                            ? "bg-orange-300 w-2 h-2"
                            : "bg-gray-300 dark:bg-gray-600 w-2 h-2"
                      }`}
                    />
                  ),
                )}
              </div>
              {/* Progress text */}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Dog {currentIndex + 1} of {dogs.length}
              </p>
            </div>

            {/* Paw Navigation - responsive sizes */}
            <div className="flex justify-center gap-4 sm:gap-8 mt-2 sm:mt-4 pb-[env(safe-area-inset-bottom)]">
              <button
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className="paw-btn paw-left w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white dark:bg-gray-600 shadow-lg dark:shadow-xl dark:shadow-black/50 border-2 border-gray-300 dark:border-gray-400 flex flex-col items-center justify-center hover:scale-110 hover:bg-gray-50 dark:hover:bg-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous dog"
              >
                <span className="text-2xl sm:text-3xl transform rotate-180">
                  🐾
                </span>
                <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-200 font-medium mt-1">
                  Back
                </span>
              </button>

              <button
                onClick={goToNext}
                disabled={currentIndex === dogs.length - 1}
                className="paw-btn paw-right w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white dark:bg-gray-600 shadow-lg dark:shadow-xl dark:shadow-black/50 border-2 border-gray-300 dark:border-gray-400 flex flex-col items-center justify-center hover:scale-110 hover:bg-gray-50 dark:hover:bg-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next dog"
              >
                <span className="text-2xl sm:text-3xl">🐾</span>
                <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-200 font-medium mt-1">
                  Next
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
