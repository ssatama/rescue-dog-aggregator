"use client";

import React, { useState, useMemo, useCallback, lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useFavorites } from "@/hooks/useFavorites";
import {
  formatBreed,
  getPersonalityTraits,
  getAgeCategory,
} from "@/utils/dogHelpers";

// Lazy load modal to reduce initial bundle size
const DogDetailModalUpgraded = lazy(
  () => import("@/components/dogs/mobile/detail/DogDetailModalUpgraded"),
);
import { IMAGE_SIZES } from "../../constants/imageSizes";
import { type Dog } from "../../types/dog";
import Loading from "@/components/ui/Loading";

interface MobileAvailableNowProps {
  dogs?: Dog[];
  loading?: boolean;
}

// Personality trait colors
const traitColors = [
  "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-700",
  "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700",
  "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
  "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700",
  "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700",
  "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-700",
];

// Helper to get dog image
const getDogImage = (dog: Dog): string => {
  if (dog.primary_image_url) return dog.primary_image_url;
  if (dog.photos && dog.photos.length > 0) return dog.photos[0];
  return "/placeholder_dog.svg";
};

// Dog Card Component (from PremiumMobileCatalog) - wrapped in React.memo
const DogCard = React.memo<{
  dog: Dog;
  onFavoriteToggle?: (dogId: string) => Promise<void>;
  isFavorite?: boolean;
  onClick?: () => void;
  index?: number;
  priority?: boolean;
}>(({ dog, onFavoriteToggle, isFavorite = false, onClick, index = 0, priority = false }) => {
  const imageUrl = getDogImage(dog);
  const traits = useMemo(() => getPersonalityTraits(dog), [dog]);
  const displayTraits = traits.slice(0, 2);
  const extraTraitsCount = Math.max(0, traits.length - 2);
  const ageGroup = getAgeCategory(dog);
  const formattedBreed = formatBreed(dog);

  // Skip animation for priority images to improve LCP
  const shouldAnimate = !priority;

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
      transition={shouldAnimate ? { delay: index * 0.05 } : undefined}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.06)] border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md dark:hover:shadow-lg transition-shadow focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (
          (e.key === "Enter" || e.key === " ") &&
          e.target === e.currentTarget
        ) {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`View details for ${dog.name}`}
    >
      <div className="relative aspect-square">
        <Image
          src={imageUrl}
          alt={`Photo of ${dog.name}`}
          className="w-full h-full object-cover"
          priority={priority}
          loading={priority ? undefined : "lazy"}
          width={200}
          height={200}
          sizes={IMAGE_SIZES.CATALOG_CARD}
        />
        <button
          type="button"
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle?.(String(dog.id));
          }}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={isFavorite}
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-colors",
              isFavorite
                ? "fill-red-500 text-red-500"
                : "text-gray-600 dark:text-gray-400",
            )}
          />
        </button>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 dark:text-white truncate">
          {dog.name}, {ageGroup}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {formattedBreed}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {displayTraits.map((trait, i) => (
            <span
              key={i}
              className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                traitColors[i % traitColors.length],
              )}
            >
              {trait}
            </span>
          ))}
          {extraTraitsCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              +{extraTraitsCount}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});

DogCard.displayName = "DogCard";

// Skeleton loader component for loading state
const DogCardSkeleton = () => (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
    <div className="aspect-square bg-gray-200 dark:bg-gray-700 animate-pulse" />
    <div className="p-3 space-y-2">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
      <div className="flex gap-1">
        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
      </div>
    </div>
  </div>
);

export const MobileAvailableNow: React.FC<MobileAvailableNowProps> = ({
  dogs = [],
  loading = false,
}) => {
  const { isFavorited, toggleFavorite } = useFavorites();
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Ensure dogs is always an array - memoize to maintain stable reference
  const safeDogs = useMemo(
    () => (Array.isArray(dogs) ? dogs : []),
    [dogs],
  );

  const handleToggleFavorite = useCallback(
    async (dogId: string) => {
      const dog = safeDogs.find((d) => String(d.id) === dogId);
      if (dog) {
        await toggleFavorite(parseInt(dogId, 10), dog.name);
      }
    },
    [safeDogs, toggleFavorite],
  );

  const handleDogClick = useCallback((dog: Dog) => {
    // Just set the dog directly, ensuring ID is string when needed
    setSelectedDog(dog);
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedDog(null);
  }, []);

  const handleModalNavigate = useCallback(
    (direction: "prev" | "next") => {
      if (!selectedDog || !safeDogs.length) return;

      const currentIndex = safeDogs.findIndex(
        (d) => String(d.id) === String(selectedDog.id),
      );
      let newIndex;

      if (direction === "next") {
        newIndex =
          currentIndex < safeDogs.length - 1 ? currentIndex + 1 : currentIndex;
      } else {
        newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
      }

      if (newIndex !== currentIndex) {
        const newDog = safeDogs[newIndex];
        // Just set the dog directly
        setSelectedDog(newDog);
      }
    },
    [selectedDog, safeDogs],
  );

  return (
    <>
      <section className="bg-[#FFF4ED] dark:bg-gray-900 px-4 pb-3 pt-4 sm:hidden">
        {/* Header with Browse All link */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Meet Your Match
            </h2>
          </div>
        </div>

        {/* Loading state */}
        {loading && safeDogs.length === 0 ? (
          <div data-testid="dogs-grid" className="grid grid-cols-2 gap-3">
            {[...Array(8)].map((_, i) => (
              <DogCardSkeleton key={i} />
            ))}
          </div>
        ) : safeDogs.length > 0 ? (
          <>
            {/* Dogs grid - removed max-height and overflow-y-auto */}
            <div data-testid="dogs-grid" className="grid grid-cols-2 gap-3">
              {safeDogs.map((dog, index) => {
                return (
                  <DogCard
                    key={String(dog.id)}
                    dog={dog}
                    index={index}
                    priority={index < 2}
                    isFavorite={isFavorited(Number(dog.id))}
                    onFavoriteToggle={handleToggleFavorite}
                    onClick={() => handleDogClick(dog)}
                  />
                );
              })}
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              No dogs available at the moment
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Check back soon for new arrivals!
            </p>
          </div>
        )}
      </section>

      {/* Dog Detail Modal - lazy loaded */}
      {isModalOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Loading />
            </div>
          }
        >
          <DogDetailModalUpgraded
            dog={selectedDog}
            isOpen={isModalOpen}
            onClose={handleModalClose}
            onNavigate={handleModalNavigate}
            hasNext={
              selectedDog
                ? safeDogs.findIndex(
                    (d) => String(d.id) === String(selectedDog.id),
                  ) <
                  safeDogs.length - 1
                : false
            }
            hasPrev={
              selectedDog
                ? safeDogs.findIndex(
                    (d) => String(d.id) === String(selectedDog.id),
                  ) > 0
                : false
            }
          />
        </Suspense>
      )}
    </>
  );
};
