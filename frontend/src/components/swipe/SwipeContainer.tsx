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
import { X, PawPrint } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { SwipeCard } from "./SwipeCard";
import SwipeOnboarding from "./SwipeOnboarding";
import { FilterModal } from "./FilterModal";
import SwipeFilters from "./SwipeFilters";
import useSwipeFilters from "../../hooks/useSwipeFilters";
import type { SwipeFilters as Filters } from "../../hooks/useSwipeFilters";
import { safeStorage } from "../../utils/safeStorage";
import { useTheme } from "../providers/ThemeProvider";
import { safeToNumber } from "../../utils/dogImageHelpers";
import { type Dog } from "../../types/dog";
import type { CountryOption } from "../../services/serverSwipeService";

// Constants
const DOUBLE_TAP_DELAY = 300;

interface SwipeContainerProps {
  fetchDogs?: (queryString: string) => Promise<Dog[]>;
  onSwipe?: (direction: "left" | "right", dog: Dog) => void;
  onCardExpanded?: (dog: Dog, index: number) => void;
  onDogsLoaded?: (dogs: Dog[]) => void;
  initialDogs?: Dog[] | null;
  initialFilters?: Filters;
  needsOnboarding?: boolean;
  onFiltersChange?: (filters: Filters) => void;
  availableCountries?: CountryOption[];
}

export function SwipeContainer({
  fetchDogs,
  onSwipe,
  onCardExpanded,
  onDogsLoaded,
  initialDogs,
  initialFilters,
  needsOnboarding: needsOnboardingProp,
  onFiltersChange,
  availableCountries,
}: SwipeContainerProps) {
  const { theme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const { addFavorite, isFavorited } = useFavorites();
  const {
    filters,
    setFilters,
    isValid,
    toQueryString,
    needsOnboarding: needsOnboardingFromHook,
    completeOnboarding,
  } = useSwipeFilters();

  const showOnboarding = needsOnboardingProp ?? needsOnboardingFromHook;

  const [dogs, setDogs] = useState<Dog[]>(() => {
    if (initialDogs && initialDogs.length > 0) {
      const swipedIds = new Set(
        safeStorage.parse<number[]>("swipedDogIds", []),
      );
      return initialDogs.filter((dog) => {
        const dogId = safeToNumber(dog.id);
        return dogId !== null && !swipedIds.has(dogId);
      });
    }
    return [];
  });
  const [currentIndex, setCurrentIndex] = useState(() => {
    return safeStorage.parse("swipeCurrentIndex", 0);
  });
  const [isLoading, setIsLoading] = useState(!initialDogs);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [lastTap, setLastTap] = useState<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [swipedDogIds, setSwipedDogIds] = useState<Set<number>>(() => {
    const storedIds = safeStorage.parse<number[]>("swipedDogIds", []);
    return new Set(storedIds);
  });
  const swipedDogIdsRef = useRef(swipedDogIds);
  swipedDogIdsRef.current = swipedDogIds;
  const isProcessingSwipe = useRef(false);

  // Refs for callback and filter values to avoid stale closures in effects
  const onDogsLoadedRef = useRef(onDogsLoaded);
  onDogsLoadedRef.current = onDogsLoaded;
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const [offset, setOffset] = useState(0);

  // Memoize the query string to prevent unnecessary re-renders
  const queryString = useMemo(() => {
    if (isValid) {
      return toQueryString();
    }
    return "";
  }, [isValid, toQueryString]);

  // Sync initialFilters with hook state on mount
  useEffect(() => {
    if (initialFilters && initialFilters.country) {
      setFilters(initialFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only sync initialFilters on mount, setFilters is stable
  }, []);

  // Notify parent of initial dogs on mount
  useEffect(() => {
    if (initialDogs && initialDogs.length > 0 && onDogsLoadedRef.current) {
      const swipedIds = new Set(
        safeStorage.parse<number[]>("swipedDogIds", []),
      );
      const filteredDogs = initialDogs.filter((dog) => {
        const dogId = safeToNumber(dog.id);
        return dogId !== null && !swipedIds.has(dogId);
      });
      onDogsLoadedRef.current(filteredDogs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only notify parent of initial dogs on mount
  }, []);

  // Preload next images when dogs change or current index changes
  useEffect(() => {
    const preloadCount = 3; // Preload next 3 images
    const imagesToPreload: string[] = [];
    const imageElements: HTMLImageElement[] = [];
    let mounted = true;

    for (let i = 1; i <= preloadCount; i++) {
      const nextIndex = currentIndex + i;
      const nextDog = dogs[nextIndex];
      if (nextDog) {
        const imageUrl = nextDog.primary_image_url || nextDog.main_image;
        if (imageUrl) {
          imagesToPreload.push(imageUrl);
        }
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
    if (!isValid || !fetchDogs || !queryString) return;
    let cancelled = false;

    const loadDogs = async () => {
      setIsLoading(true);
      try {
        const fetchedDogs = await fetchDogs(queryString);
        if (cancelled) return;

        const swipedIds = new Set(
          safeStorage.parse<number[]>("swipedDogIds", []),
        );

        const newDogs = fetchedDogs.filter((dog) => {
          const dogId = safeToNumber(dog.id);
          return dogId !== null && !swipedIds.has(dogId);
        });

        setDogs(newDogs);
        if (onDogsLoadedRef.current) {
          onDogsLoadedRef.current(newDogs);
        }

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
            filtersData: filtersRef.current,
            dogCount: newDogs.length,
            filteredOut: fetchedDogs.length - newDogs.length,
          },
        });
      } catch (error) {
        Sentry.captureException(error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadDogs();
    return () => {
      cancelled = true;
    };
  }, [isValid, queryString, fetchDogs]);

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
      // Clear any pending tap timeout on unmount
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
        tapTimeoutRef.current = null;
      }

      Sentry.addBreadcrumb({
        message: "swipe.session.ended",
        category: "swipe",
        level: "info",
        data: { timestamp: new Date().toISOString() },
      });
    };
  }, []);

  const handleOnboardingComplete = useCallback(
    (skipped: boolean, onboardingFilters?: Filters) => {
      if (!skipped && onboardingFilters) {
        completeOnboarding(onboardingFilters);
        if (onFiltersChange) {
          onFiltersChange(onboardingFilters);
        }
      }
    },
    [completeOnboarding, onFiltersChange],
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
                const swipedIds = new Set(
                  safeStorage.parse<number[]>("swipedDogIds", []),
                );
                const newDogs = fetchedDogs.filter((dog) => {
                  const dogId = safeToNumber(dog.id);
                  return dogId !== null && !swipedIds.has(dogId);
                });

                if (newDogs.length > 0) {
                  const updatedDogs = [...prevDogs, ...newDogs];
                  // Notify parent of updated dogs array for modal navigation
                  if (onDogsLoaded) {
                    onDogsLoaded(updatedDogs);
                  }
                  return updatedDogs;
                }
                return prevDogs;
              });
            }
            setIsLoadingMore(false);
          })
          .catch((error) => {
            Sentry.captureException(error);
            setIsLoadingMore(false);
          });
      }
    }
  }, [
    currentIndex,
    dogs,
    fetchDogs,
    queryString,
    isLoadingMore,
    offset,
    onDogsLoaded,
  ]);

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
      const currentDogId = safeToNumber(currentDog.id);

      if (!currentDogId) {
        console.warn("Invalid dog ID:", currentDog.id);
        return;
      }

      if (direction === "right") {
        await addFavorite(currentDogId, currentDog.name);
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
        const trackId = safeToNumber(dogToTrack.id);
        if (trackId !== null) {
          setSwipedDogIds((prev) => {
            const newSet = new Set(prev);
            newSet.add(trackId);
            // Save to storage safely
            safeStorage.stringify("swipedDogIds", Array.from(newSet));
            return newSet;
          });
        }
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
                const swipedIds = new Set(
                  safeStorage.parse<number[]>("swipedDogIds", []),
                );

                // Filter out dogs that have been swiped, but NOT the dog at current viewing index
                const currentViewingIndex = prevDogs.length; // This will be the index after we append
                const newDogs = fetchedDogs.filter((dog, idx) => {
                  // Don't filter if this will be the immediate next dog to view
                  if (idx === 0 && currentViewingIndex === prevDogs.length) {
                    return true;
                  }
                  const dogId = safeToNumber(dog.id);
                  return dogId !== null && !swipedIds.has(dogId);
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
            Sentry.captureException(error);
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

    // Check if this is a double tap
    if (now - lastTap < DOUBLE_TAP_DELAY && tapTimeoutRef.current) {
      // Double tap detected - clear the pending single tap and favorite
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
      setLastTap(0);

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
      // First tap - set timeout to open details if no second tap comes
      setLastTap(now);

      tapTimeoutRef.current = setTimeout(() => {
        // Single tap confirmed - expand details
        if (onCardExpanded) {
          onCardExpanded(currentDog, currentIndex);
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
        tapTimeoutRef.current = null;
      }, DOUBLE_TAP_DELAY);
    }
  }, [dogs, currentIndex, lastTap, onCardExpanded, handleSwipeComplete]);

  // Onboarding state - check this first, before loading or empty states
  if (showOnboarding) {
    return (
      <SwipeOnboarding
        onComplete={handleOnboardingComplete}
        availableCountries={availableCountries}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-[#FDFBF7] dark:bg-gray-950">
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
        <div className="flex flex-col items-center justify-center h-full p-8 bg-[#FDFBF7] dark:bg-gray-950">
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
      <div className="flex flex-col items-center justify-center h-full p-8 bg-[#FDFBF7] dark:bg-gray-950">
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

      <div className="relative flex flex-col min-h-[100dvh] overflow-y-auto bg-[#FDFBF7] dark:bg-gray-950">
        {/* Header with Filter Bar and Exit Button */}
        <div className="flex-shrink-0 p-4 flex justify-between items-center bg-[#FDFBF7]/80 dark:bg-gray-950/80 backdrop-blur-sm relative">
          {/* Exit button - absolute positioned */}
          <button
            onClick={() => {
              // Use window.location to avoid Next.js 15 navigation bugs
              window.location.href = "/";
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors z-50"
            aria-label="Exit to home"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
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
                        Sentry.captureException(error);
                        setIsLoading(false);
                      });
                  } else {
                    setIsLoading(false);
                  }
                }}
                className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg transition-colors"
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
                className="px-4 py-2 text-sm bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
              >
                + Filters
              </button>
            </div>
          </div>
        </div>

        {/* Main swipe container - responsive for small screens */}
        <div className="flex-1 flex flex-col items-center justify-start p-2 sm:p-4 pb-8">
          <div
            className="relative w-full flex flex-col max-w-[calc(100vw-1rem)] sm:max-w-[min(500px,calc(100vw-1.5rem))] md:max-w-[min(600px,calc(100vw-2rem))] lg:max-w-[700px] xl:max-w-[600px] 2xl:max-w-[650px] min-h-[300px]"
          >
            <motion.div
              key={`dog-${currentDog.id}`}
              className="relative touch-none"
              onClick={handleCardTap}
              style={{ touchAction: "pan-y" }}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <SwipeCard dog={currentDog} />
            </motion.div>

            {/* Progress Indicator */}
            <div className="flex flex-col items-center mt-4 mb-2">
              {/* Progress dots */}
              <div className="flex gap-1.5 mb-2">
                {Array.from({ length: Math.min(dogs.length, 10) }).map(
                  (_, idx) => (
                    <div
                      key={idx}
                      className={`rounded-full w-2.5 h-2.5 transition-[transform,background-color,box-shadow] duration-200 ${
                        idx === currentIndex % 10
                          ? "bg-orange-500 scale-[1.75] shadow-[0_0_6px_rgba(249,115,22,0.4)]"
                          : idx < currentIndex % 10
                            ? "bg-orange-300 scale-100"
                            : "bg-gray-300 dark:bg-gray-600 scale-100"
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

            {/* Paw Navigation */}
            <div className="flex justify-center gap-6 sm:gap-10 mt-2 sm:mt-4 pb-[env(safe-area-inset-bottom)]">
              <button
                onClick={goToPrevious}
                disabled={currentIndex === 0}
                className="paw-btn paw-left w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-[transform,background-color,opacity,box-shadow] duration-200 bg-orange-500 dark:bg-orange-600 text-white shadow-[var(--shadow-orange-md)] hover:bg-orange-600 dark:hover:bg-orange-500 hover:scale-105 disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:text-gray-300 disabled:dark:text-gray-600 disabled:shadow-none disabled:cursor-not-allowed disabled:hover:scale-100"
                aria-label="Previous dog"
              >
                <PawPrint className="w-6 h-6 sm:w-7 sm:h-7 transform rotate-180" />
              </button>

              <button
                onClick={goToNext}
                disabled={currentIndex === dogs.length - 1}
                className="paw-btn paw-right w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-[transform,background-color,opacity,box-shadow] duration-200 bg-orange-500 dark:bg-orange-600 text-white shadow-[var(--shadow-orange-md)] hover:bg-orange-600 dark:hover:bg-orange-500 hover:scale-105 disabled:bg-gray-100 disabled:dark:bg-gray-800 disabled:text-gray-300 disabled:dark:text-gray-600 disabled:shadow-none disabled:cursor-not-allowed disabled:hover:scale-100"
                aria-label="Next dog"
              >
                <PawPrint className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
