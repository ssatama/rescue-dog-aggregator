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
    [currentIndex, breeds.length]
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
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
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Breed Spotlight
        </h2>
        <div
          data-testid="breed-spotlight-card"
          className="relative overflow-hidden rounded-2xl bg-[#FFF4ED] dark:bg-gray-800 text-gray-900 dark:text-white p-6 shadow-xl motion-safe:animate-fadeInUp"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-4">
              <Dog className="w-16 h-16 text-[#D4714A]" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Discover Popular Breeds</h3>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Explore different dog breeds and find your perfect match
            </p>
            <button
              onClick={() => router.push("/breeds")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4714A] text-white hover:bg-[#C05F3A] transition-all duration-300 font-medium"
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
  const breedPlural = getBreedPlural(currentBreed.name);

  return (
    <section
      className="px-4 pb-6 md:hidden"
      aria-label="Breed spotlight"
      role="region"
    >
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
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
            className="relative overflow-hidden rounded-2xl bg-[#FFF4ED] dark:bg-gray-800 text-gray-900 dark:text-white shadow-xl cursor-grab active:cursor-grabbing"
          >
            <div className="relative z-10 p-6">
              <div className="flex gap-4">
                {/* Image or icon */}
                <div className="flex-shrink-0">
                  {currentBreed.imageUrl ? (
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/20 dark:bg-gray-700">
                      <Image
                        src={currentBreed.imageUrl}
                        alt={currentBreed.name}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-white/20 dark:bg-gray-700 flex items-center justify-center">
                      <Dog
                        className="w-10 h-10 text-[#D4714A]"
                        data-testid="dog-icon"
                      />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-2xl font-bold">{currentBreed.name}</h3>
                    {currentBreed.availableCount && currentBreed.availableCount > 0 && (
                      <span className="px-2 py-1 text-xs font-semibold bg-[#D4714A]/20 text-[#D4714A] dark:bg-[#D4714A]/30 dark:text-[#E8805A] rounded-full">
                        {currentBreed.availableCount} available
                      </span>
                    )}
                  </div>

                  {currentBreed.description && (
                    <p
                      data-testid="breed-description"
                      className="text-gray-700 dark:text-gray-300 text-sm mb-4 line-clamp-3"
                    >
                      {currentBreed.description}
                    </p>
                  )}

                  <button
                    onClick={() => handleExploreClick(currentBreed)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4714A] text-white hover:bg-[#C05F3A] transition-all duration-300 font-medium"
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
                    ? "w-6 bg-[#D4714A]"
                    : "w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};