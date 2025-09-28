"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-advance carousel every 8 seconds
  useEffect(() => {
    if (breeds.length <= 1) return;

    const startAutoAdvance = () => {
      autoAdvanceRef.current = setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % breeds.length);
      }, 8000);
    };

    startAutoAdvance();

    return () => {
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
      }
    };
  }, [currentIndex, breeds.length]);

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 50;

      if (info.offset.x < -threshold && currentIndex < breeds.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (info.offset.x > threshold && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }

      // Reset auto-advance timer after manual interaction
      if (autoAdvanceRef.current) {
        clearTimeout(autoAdvanceRef.current);
      }
    },
    [currentIndex, breeds.length],
  );

  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
    // Reset auto-advance timer after manual interaction
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
    }
  };

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
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">Discover Popular Breeds</h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Explore different dog breeds and find your perfect match
            </p>
            <button
              onClick={() => router.push("/breeds")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E678A8] text-white hover:bg-[#D668A8] transition-all duration-300 font-medium"
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
    >
      <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
        Breed Spotlight
      </h2>

      <div className="relative" ref={containerRef}>
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
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                      <Image
                        src={currentBreed.imageUrl}
                        alt={currentBreed.name}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Dog
                        className="w-10 h-10 text-gray-400 dark:text-gray-500"
                        data-testid="dog-icon"
                      />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{currentBreed.name}</h3>
                    {currentBreed.availableCount &&
                      currentBreed.availableCount > 0 && (
                        <span className="px-2 py-1 text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full">
                          {currentBreed.availableCount} available
                        </span>
                      )}
                  </div>

                  {currentBreed.description && (
                    <p
                      data-testid="breed-description"
                      className="text-zinc-600 dark:text-zinc-400 text-sm mb-4 line-clamp-3 px-2"
                    >
                      {currentBreed.description}
                    </p>
                  )}

                  <button
                    onClick={() => handleExploreClick(currentBreed)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#E678A8] text-white hover:bg-[#D668A8] transition-all duration-300 font-medium"
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
                onClick={() => handleDotClick(index)}
                aria-label={`Go to breed ${index + 1}`}
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