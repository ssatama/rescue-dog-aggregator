"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  PanInfo,
} from "framer-motion";
import { useFavorites } from "../../hooks/useFavorites";
import * as Sentry from "@sentry/nextjs";
import { Heart, X } from "lucide-react";
import { SwipeCard } from "./SwipeCard";
import SwipeOnboarding from "./SwipeOnboarding";
import SwipeFilters from "./SwipeFilters";
import { SwipeContainerEnhanced } from "./SwipeContainerEnhanced";
import useSwipeFilters from "../../hooks/useSwipeFilters";
import type { SwipeFilters as Filters } from "../../hooks/useSwipeFilters";

// Constants
const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.5;
const ROTATION_MULTIPLIER = 0.2;
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
  const [showFilters, setShowFilters] = useState(false);
  const [lastTap, setLastTap] = useState<number>(0);
  const [dragX, setDragX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-45, 45]);
  const opacity = useTransform(x, [-200, -50, 0, 50, 200], [0, 1, 1, 1, 0]);

  // Fetch dogs when filters change
  useEffect(() => {
    if (isValid && fetchDogs) {
      const loadDogs = async () => {
        setIsLoading(true);
        try {
          const queryString = toQueryString();
          const fetchedDogs = await fetchDogs(queryString);
          setDogs(fetchedDogs);
          setCurrentIndex(0);

          Sentry.captureEvent({
            message: "swipe.queue.loaded",
            extra: {
              filtersData: filters,
              dogCount: fetchedDogs.length,
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
  }, [filters, isValid, toQueryString, fetchDogs]);

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

  const handleSwipeComplete = useCallback(
    async (direction: "left" | "right") => {
      const currentDog = dogs[currentIndex];
      if (!currentDog) return;

      if (direction === "right") {
        await addFavorite(currentDog.id, currentDog.name);
        Sentry.captureEvent({
          message: "swipe.card.swiped_right",
          extra: {
            dogId: currentDog.id,
            dogName: currentDog.name,
          },
        });
      } else {
        Sentry.captureEvent({
          message: "swipe.card.swiped_left",
          extra: {
            dogId: currentDog.id,
            dogName: currentDog.name,
          },
        });
      }

      if (onSwipe) {
        onSwipe(direction, currentDog);
      }

      setCurrentIndex((prev) => prev + 1);

      // Check if we need to load more dogs
      if (currentIndex === dogs.length - 5 && fetchDogs) {
        const queryString = toQueryString();
        fetchDogs(queryString + `&offset=${dogs.length}`)
          .then((newDogs) => {
            setDogs((prev) => [...prev, ...newDogs]);
          })
          .catch(console.error);
      }
    },
    [currentIndex, dogs, addFavorite, onSwipe, fetchDogs, toQueryString],
  );

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      setIsDragging(false);
      const threshold = SWIPE_THRESHOLD;
      const velocity = VELOCITY_THRESHOLD;

      if (
        Math.abs(info.offset.x) > threshold ||
        Math.abs(info.velocity.x) > velocity
      ) {
        const direction = info.offset.x > 0 ? "right" : "left";
        handleSwipeComplete(direction);
      }
    },
    [handleSwipeComplete],
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

  // Empty state
  if (dogs.length === 0 || currentIndex >= dogs.length) {
    return (
      <>
        {needsOnboarding && (
          <SwipeOnboarding onComplete={handleOnboardingComplete} />
        )}
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
      </>
    );
  }

  const currentDog = dogs[currentIndex];

  return (
    <>
      {/* Onboarding Modal */}
      {needsOnboarding && (
        <SwipeOnboarding onComplete={handleOnboardingComplete} />
      )}

      {/* Filter Modal */}
      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Filter Dogs</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <SwipeFilters
              onFiltersChange={(newFilters) => {
                setFilters(newFilters);
                setShowFilters(false);
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
        {/* Filter Bar */}
        <div className="p-4 flex justify-between items-center bg-white border-b">
          <SwipeFilters compact onFiltersChange={() => {}} />
          <button
            onClick={() => setShowFilters(true)}
            className="px-4 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            + Filters
          </button>
        </div>

        {/* Main swipe container */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-sm">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentDog.id}
                className="relative"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDrag={(_, info) => {
                  setDragX(info.offset.x);
                  setIsDragging(true);
                  x.set(info.offset.x);
                }}
                onDragEnd={handleDragEnd}
                onClick={handleCardTap}
                style={{ x, rotate }}
                initial={{ scale: 0.8, opacity: 0, y: 100 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{
                  x: dragX > 0 ? 500 : -500,
                  rotate: dragX > 0 ? 45 : -45,
                  opacity: 0,
                  transition: { duration: 0.3 },
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                whileTap={{ scale: 0.98 }}
                whileDrag={{ scale: 1.05 }}
              >
                <SwipeCard dog={currentDog} />

                {/* Swipe indicators */}
                {isDragging && (
                  <>
                    {dragX > SWIPE_THRESHOLD && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-green-500 text-white px-6 py-3 rounded-lg text-2xl font-bold rotate-12">
                          LIKE
                        </div>
                      </div>
                    )}
                    {dragX < -SWIPE_THRESHOLD && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-red-500 text-white px-6 py-3 rounded-lg text-2xl font-bold -rotate-12">
                          NOPE
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex justify-center gap-4 mt-8">
              <button
                onClick={() => handleSwipeComplete("left")}
                className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                aria-label="Pass"
              >
                <X className="w-8 h-8 text-red-500" />
              </button>

              <button
                onClick={() => handleSwipeComplete("right")}
                className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                aria-label="Add to favorites"
              >
                <Heart className="w-8 h-8 text-green-500" />
              </button>
            </div>

            {/* Progress indicator */}
            <div className="text-center mt-4 text-sm text-gray-500">
              {currentIndex + 1} / {dogs.length}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
