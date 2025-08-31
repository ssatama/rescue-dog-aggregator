"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useFavorites } from "../../hooks/useFavorites";
import * as Sentry from "@sentry/nextjs";
import { Heart, X } from "lucide-react";

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

interface SwipeContainerProps {
  dogs: Dog[];
  currentIndex: number;
  onSwipe: (direction: "left" | "right", dog: Dog) => void;
  onCardExpanded: (dog: Dog) => void;
  isLoading?: boolean;
}

export function SwipeContainer({
  dogs,
  currentIndex,
  onSwipe,
  onCardExpanded,
  isLoading = false,
}: SwipeContainerProps) {
  const { addFavorite, isFavorited } = useFavorites();
  const [lastTap, setLastTap] = useState<number>(0);
  const [dragX, setDragX] = useState<number>(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-45, 45]);
  const opacity = useTransform(x, [-200, -50, 0, 50, 200], [0, 1, 1, 1, 0]);

  // Track session start
  useEffect(() => {
    Sentry.captureEvent({
      message: "swipe.session.started",
      extra: {
        initialDogCount: dogs.length,
      },
    });
  }, []);

  const currentDog = dogs[currentIndex];

  // Check if dog is new (added within 7 days)
  const isNewDog = useCallback((createdAt?: string) => {
    if (!createdAt) return false;
    const daysSinceAdded = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceAdded <= 7;
  }, []);

  // Handle swipe completion
  const handleSwipeComplete = useCallback(
    async (direction: "left" | "right") => {
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

      onSwipe(direction, currentDog);
    },
    [currentDog, addFavorite, onSwipe]
  );

  // Handle drag
  const handleDrag = useCallback((event: any, info: PanInfo) => {
    setDragX(info.offset.x);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: any, info: PanInfo) => {
      const swipeDistance = Math.abs(info.offset.x);
      const swipeVelocity = Math.abs(info.velocity.x);

      if (swipeDistance > SWIPE_THRESHOLD || swipeVelocity > VELOCITY_THRESHOLD) {
        const direction = info.offset.x > 0 ? "right" : "left";
        handleSwipeComplete(direction);
      }
      
      setDragX(0);
    },
    [handleSwipeComplete]
  );

  // Handle tap/click for expansion or double-tap for favorite
  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTap;

    if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
      // Double tap - add to favorites
      if (currentDog) {
        addFavorite(currentDog.id, currentDog.name);
      }
    } else {
      // Single tap - expand card after delay to check for double tap
      setTimeout(() => {
        const currentTime = Date.now();
        if (currentTime - now >= DOUBLE_TAP_DELAY - 50) {
          if (currentDog) {
            onCardExpanded(currentDog);
            Sentry.captureEvent({
              message: "swipe.card.expanded",
              extra: {
                dogId: currentDog.id,
                dogName: currentDog.name,
              },
            });
          }
        }
      }, DOUBLE_TAP_DELAY);
    }

    setLastTap(now);
  }, [lastTap, currentDog, addFavorite, onCardExpanded]);

  // Handle button controls
  const handlePass = useCallback(() => {
    handleSwipeComplete("left");
  }, [handleSwipeComplete]);

  const handleLike = useCallback(() => {
    handleSwipeComplete("right");
  }, [handleSwipeComplete]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div data-testid="skeleton-card" className="w-full max-w-sm mx-auto">
          <div className="bg-gray-200 rounded-2xl animate-pulse h-96"></div>
          <div className="mt-4 space-y-2">
            <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (dogs.length === 0 || !currentDog) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🐕</div>
          <h3 className="text-2xl font-bold mb-2">More dogs coming!</h3>
          <p className="text-gray-600 mb-4">Check back soon or adjust your filters</p>
          <button className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
            Change Filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentDog.id}
          className="relative w-full max-w-sm mx-auto"
          initial={{ scale: 0.8, opacity: 0, y: 100 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          style={{ x, rotate, opacity }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          whileDrag={{ scale: 1.05 }}
          data-testid="swipe-card"
          onClick={handleTap}
        >
          {/* Card Content */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Image Section */}
            <div className="relative aspect-video bg-gradient-to-br from-orange-400 to-orange-600">
              {isNewDog(currentDog.created_at) && (
                <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  NEW
                </div>
              )}
              
              {currentDog.image ? (
                <img
                  src={currentDog.image}
                  alt={currentDog.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white text-6xl">
                  🐕
                </div>
              )}

              {/* Swipe Overlays */}
              {dragX > SWIPE_THRESHOLD && (
                <div
                  data-testid="like-overlay"
                  className="absolute inset-0 bg-green-500 bg-opacity-50 flex items-center justify-center"
                >
                  <div className="text-white text-4xl font-bold transform rotate-12">
                    LIKE
                  </div>
                </div>
              )}

              {dragX < -SWIPE_THRESHOLD && (
                <div
                  data-testid="nope-overlay"
                  className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center"
                >
                  <div className="text-white text-4xl font-bold transform -rotate-12">
                    NOPE
                  </div>
                </div>
              )}
            </div>

            {/* Dog Information */}
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-2xl font-bold">{currentDog.name}</h2>
                  <p className="text-gray-600">
                    {currentDog.breed && <span>{currentDog.breed}</span>}
                    {currentDog.breed && currentDog.age && <span> • </span>}
                    {currentDog.age && <span>{currentDog.age}</span>}
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-500 mb-3">
                📍 {currentDog.organization}
                {currentDog.location && `, ${currentDog.location}`}
              </div>

              {currentDog.description && (
                <p className="text-gray-600 italic mb-4">"{currentDog.description}"</p>
              )}

              {/* Personality Traits */}
              {currentDog.traits && currentDog.traits.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {currentDog.traits.slice(0, 3).map((trait, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              )}

              {/* Energy Level */}
              {currentDog.energy_level && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-gray-600">Energy:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        data-testid={`energy-dot-${level}`}
                        className={`w-2 h-2 rounded-full ${
                          level <= currentDog.energy_level
                            ? "bg-orange-500"
                            : "bg-gray-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Special Characteristic */}
              {currentDog.special_characteristic && (
                <div className="text-sm text-gray-600">
                  🦴 {currentDog.special_characteristic}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-8">
        <button
          onClick={handlePass}
          aria-label="Pass"
          className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        >
          <X className="w-8 h-8 text-red-500" />
        </button>
        <button
          onClick={handleLike}
          aria-label="Like"
          className="w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        >
          <Heart className="w-8 h-8 text-green-500" />
        </button>
      </div>
    </div>
  );
}