'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useFavorites } from '@/hooks/useFavorites';
import * as Sentry from '@sentry/nextjs';
import { SwipeStack } from './SwipeStack';
import { SwipeActions } from './SwipeActions';
import { triggerSwipeHaptic, triggerDoubleTapHaptic } from '@/utils/haptic';
import { DogWithProfiler } from '@/types/dogProfiler';

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.5;
const ROTATION_FACTOR = 0.2;
const DOUBLE_TAP_DELAY = 300;

interface SwipeContainerEnhancedProps {
  dogs: DogWithProfiler[];
  currentIndex: number;
  onSwipe: (direction: 'left' | 'right', dog: DogWithProfiler) => void;
  onCardExpanded: (dog: DogWithProfiler) => void;
  isLoading?: boolean;
}

export function SwipeContainerEnhanced({
  dogs,
  currentIndex,
  onSwipe,
  onCardExpanded,
  isLoading = false,
}: SwipeContainerEnhancedProps) {
  const { addFavorite } = useFavorites();
  const [lastTap, setLastTap] = useState<number>(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-45, 45]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  // Track session start
  useEffect(() => {
    Sentry.captureEvent({
      message: 'swipe.session.started',
      level: 'info',
      extra: {
        initialDogCount: dogs.length,
      },
    });

    return () => {
      Sentry.captureEvent({
        message: 'swipe.session.ended',
        level: 'info',
        extra: {
          finalIndex: currentIndex,
        },
      });
    };
  }, []);

  const currentDog = dogs[currentIndex];

  // Handle swipe completion with animations
  const handleSwipeComplete = useCallback(
    async (direction: 'left' | 'right') => {
      if (!currentDog) return;

      // Trigger haptic feedback
      triggerSwipeHaptic(direction);

      if (direction === 'right') {
        // Show success animation
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 1500);
        
        await addFavorite(currentDog);
        Sentry.captureEvent({
          message: 'swipe.card.swiped_right',
          level: 'info',
          extra: {
            dogId: currentDog.id,
            dogName: currentDog.name,
          },
        });
      } else {
        Sentry.captureEvent({
          message: 'swipe.card.swiped_left',
          level: 'info',
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

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: any, info: PanInfo) => {
      const swipeDistance = Math.abs(info.offset.x);
      const swipeVelocity = Math.abs(info.velocity.x);

      if (swipeDistance > SWIPE_THRESHOLD || swipeVelocity > VELOCITY_THRESHOLD) {
        const direction = info.offset.x > 0 ? 'right' : 'left';
        handleSwipeComplete(direction);
      }
    },
    [handleSwipeComplete]
  );

  // Handle tap for expansion or double-tap for favorite
  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTap;

    if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
      // Double tap - add to favorites
      if (currentDog) {
        triggerDoubleTapHaptic();
        handleSwipeComplete('right');
      }
    } else {
      // Single tap - expand card
      setTimeout(() => {
        const currentTime = Date.now();
        if (currentTime - now >= DOUBLE_TAP_DELAY - 50) {
          if (currentDog) {
            onCardExpanded(currentDog);
            Sentry.captureEvent({
              message: 'swipe.card.expanded',
              level: 'info',
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
  }, [lastTap, currentDog, handleSwipeComplete, onCardExpanded]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="w-full max-w-sm mx-auto animate-pulse">
          <div className="bg-gray-200 rounded-2xl h-[500px] mb-4" />
          <div className="space-y-2 px-4">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
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
            Change Filters →
          </button>
        </div>
      </div>
    );
  }

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="relative h-full flex flex-col">
      {/* Card Stack */}
      <div className="flex-1 relative p-4">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentDog.id}
            className="absolute inset-4"
            style={prefersReducedMotion ? {} : { x, rotate }}
            drag={!prefersReducedMotion && "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            initial={{ scale: 0.8, opacity: 0, y: 100 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={(x.get() > 0) ? {
              x: 500,
              rotate: 45,
              opacity: 0,
              transition: { duration: 0.3, ease: 'easeOut' }
            } : {
              x: -500,
              rotate: -45,
              opacity: 0,
              transition: { duration: 0.3, ease: 'easeOut' }
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            whileDrag={{ scale: 1.05 }}
            onClick={handleTap}
          >
            <SwipeStack dogs={dogs} currentIndex={currentIndex} />
            
            {/* Swipe Overlays */}
            <motion.div
              className="absolute inset-0 bg-green-500 rounded-2xl flex items-center justify-center pointer-events-none"
              style={{ 
                opacity: useTransform(x, [0, 100], [0, 0.5])
              }}
            >
              <div className="text-white text-5xl font-bold transform rotate-12">
                MATCH
              </div>
            </motion.div>
            
            <motion.div
              className="absolute inset-0 bg-red-500 rounded-2xl flex items-center justify-center pointer-events-none"
              style={{ 
                opacity: useTransform(x, [-100, 0], [0.5, 0])
              }}
            >
              <div className="text-white text-5xl font-bold transform -rotate-12">
                PASS
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Success Animation */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-50"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-white rounded-full p-8 shadow-2xl">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                  className="text-6xl"
                >
                  ❤️
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-green-600 font-bold mt-2"
                >
                  Added to Favorites!
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <SwipeActions onSwipe={handleSwipeComplete} disabled={isLoading || !currentDog} />
    </div>
  );
}