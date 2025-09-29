"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Dog } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

interface BreedData {
  name: string;
  description?: string;
  availableCount?: number;
  imageUrl?: string;
  slug?: string;
}

interface MobileBreedSpotlightProps {
  breeds?: BreedData[];
  loading?: boolean;
}

// Constants for carousel behavior
const CAROUSEL_AUTO_ADVANCE_INTERVAL = 8000;
const CAROUSEL_DRAG_THRESHOLD = 50;
const CAROUSEL_PAUSE_DURATION = 2000;

// Helper function to pluralize breed names
const getBreedPlural = (breedName: string): string => {
  // Handle special cases
  const specialCases: Record<string, string> = {
    "German Shepherd": "German Shepherds",
    "Labrador Retriever": "Labradors",
    "Golden Retriever": "Golden Retrievers",
    "French Bulldog": "French Bulldogs",
    "Yorkshire Terrier": "Yorkies",
  };

  if (specialCases[breedName]) {
    return specialCases[breedName];
  }

  // For single word breeds, just add 's'
  const words = breedName.split(" ");
  if (words.length === 1) {
    if (breedName.endsWith("y")) {
      return breedName.slice(0, -1) + "ies";
    }
    return breedName + "s";
  }

  // For multi-word breeds, pluralize the last word
  return breedName + "s";
};

export const MobileBreedSpotlight: React.FC<MobileBreedSpotlightProps> = ({
  breeds = [],
  loading = false,
}) => {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance carousel with proper pause/resume
  useEffect(() => {
    if (breeds.length <= 1 || isPaused) return;

    const intervalId = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % breeds.length);
    }, CAROUSEL_AUTO_ADVANCE_INTERVAL);

    return () => clearInterval(intervalId);
  }, [currentIndex, breeds.length, isPaused]);

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsPaused(true);

      if (info.offset.x < -CAROUSEL_DRAG_THRESHOLD) {
        setCurrentIndex((prev) => (prev + 1) % breeds.length);
      } else if (info.offset.x > CAROUSEL_DRAG_THRESHOLD) {
        setCurrentIndex((prev) => (prev - 1 + breeds.length) % breeds.length);
      }

      // Resume auto-advance after delay
      setTimeout(() => setIsPaused(false), CAROUSEL_PAUSE_DURATION);
    },
    [breeds.length],
  );

  const handleDotClick = useCallback((index: number) => {
    setIsPaused(true);
    setCurrentIndex(index);
    // Resume auto-advance after delay
    setTimeout(() => setIsPaused(false), CAROUSEL_PAUSE_DURATION);
  }, []);

  const handleExploreClick = (breed: BreedData) => {
    if (breed?.slug) {
      router.push(`/breeds/${breed.slug}`);
    } else {
      router.push("/breeds");
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <section
        className="px-4 pb-6 md:hidden"
        aria-label="Breed spotlight"
        role="region"
      >
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Breed Spotlight
        </h2>
        <div
          data-testid="breed-spotlight-skeleton"
          className="rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse h-48"
        />
      </section>
    );
  }

  // Empty/fallback state
  if (!breeds || breeds.length === 0) {
    return (
      <section
        className="px-4 pb-6 md:hidden"
        aria-label="Breed spotlight"
        role="region"
      >
        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          Breed Spotlight
        </h2>
        <div
          data-testid="breed-spotlight-card"
          className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 p-6 shadow-sm"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-4">
              <Dog className="w-16 h-16 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              Discover Popular Breeds
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Explore different dog breeds and find your perfect match
            </p>
            <button
              onClick={() => router.push("/breeds")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D68FA3] text-white hover:bg-[#C67F93] transition-all duration-300 font-medium"
              aria-label="Explore all breeds"
            >
              Explore Breeds
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  const currentBreed = breeds[currentIndex];

  // Guard against undefined currentBreed
  if (!currentBreed) {
    return null;
  }

  const breedPlural = getBreedPlural(currentBreed.name);

  return (
    <section
      className="px-4 pb-6 md:hidden"
      aria-label="Breed spotlight"
      role="region"
      aria-roledescription="carousel"
      aria-live="polite"
    >
      <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
        Breed Spotlight
      </h2>

      <div className="relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            data-testid="breed-spotlight-card"
            className="relative overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm cursor-grab active:cursor-grabbing"
          >
            <div className="relative z-10 p-6">
              <div className="flex gap-4">
                {/* Image or icon */}
                <div className="flex-shrink-0">
                  {currentBreed.imageUrl ? (
                    <div className="w-28 h-28 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <Image
                        src={currentBreed.imageUrl}
                        alt={currentBreed.name}
                        width={112}
                        height={112}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-28 h-28 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Dog
                        className="w-14 h-14 text-gray-400 dark:text-gray-500"
                        data-testid="dog-icon"
                      />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                      {currentBreed.name}
                    </h3>
                    {currentBreed.availableCount &&
                      currentBreed.availableCount > 0 && (
                        <span className="inline-flex px-3 py-1 text-sm font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full self-start">
                          {currentBreed.availableCount} available
                        </span>
                      )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExploreClick(currentBreed)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D68FA3] text-white hover:bg-[#C67F93] transition-all duration-300 font-medium mt-4"
                    aria-label={`Explore ${breedPlural}`}
                  >
                    Explore {breedPlural}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Dots indicator */}
        {breeds.length > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {breeds.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleDotClick(index)}
                aria-label={`Go to breed ${index + 1}`}
                aria-current={index === currentIndex ? "true" : undefined}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? "w-6 bg-zinc-900 dark:bg-zinc-100"
                    : "w-2 bg-zinc-400 dark:bg-zinc-600 hover:bg-zinc-500 dark:hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
