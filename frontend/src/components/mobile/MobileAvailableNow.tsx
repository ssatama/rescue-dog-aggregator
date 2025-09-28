"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useFavorites } from "@/hooks/useFavorites";
import {
  formatAge,
  formatBreed,
  getPersonalityTraits,
  getAgeCategory,
} from "@/utils/dogHelpers";
import { IMAGE_SIZES } from "../../constants/imageSizes";

interface Dog {
  id: number | string;
  name: string;
  breed?: string;
  primary_breed?: string;
  standardized_breed?: string;
  age?: string;
  age_text?: string;
  sex?: string;
  primary_image_url?: string;
  main_image?: string;
  photos?: string[];
  organization?: {
    id: number;
    name: string;
    config_id: string;
    slug?: string;
  };
  personality_traits?: string[];
  dog_profiler_data?: {
    description?: string;
    tagline?: string;
    personality_traits?: string[];
  };
  created_at?: string;
  slug?: string;
  [key: string]: any;
}

interface MobileAvailableNowProps {
  dogs?: Dog[];
  loading?: boolean;
  totalCount?: number;
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
  if (dog.main_image) return dog.main_image;
  if (dog.photos && dog.photos.length > 0) return dog.photos[0];
  return "/placeholder_dog.svg";
};

// Dog Card Component (from PremiumMobileCatalog)
const DogCard: React.FC<{
  dog: Dog;
  onToggleFavorite: (id: number | string) => void;
  onClick: () => void;
  index: number;
  isFavorite: boolean;
}> = ({ dog, onToggleFavorite, onClick, index, isFavorite }) => {
  const imageUrl = getDogImage(dog);
  const displayTraits = getPersonalityTraits(dog).slice(0, 2);
  const extraTraitsCount = getPersonalityTraits(dog).length - 2;
  const ageGroup = getAgeCategory(dog);
  const formattedBreed = formatBreed(dog);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md dark:hover:shadow-lg transition-shadow"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (
          (e.key === "Enter" || e.key === " ") &&
          e.target === e.currentTarget
        ) {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`View details for ${dog.name}`}
    >
      <div className="relative aspect-square">
        <Image
          src={imageUrl}
          alt={dog.name}
          className="w-full h-full object-cover"
          loading="lazy"
          fill
          sizes={IMAGE_SIZES.CATALOG_CARD}
        />
        <button
          className="absolute top-2 right-2 w-8 h-8 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(dog.id);
          }}
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
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
};

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
  totalCount,
}) => {
  const { favorites, toggleFavorite } = useFavorites();
  const [isHydrated, setIsHydrated] = useState(false);

  // Track hydration for client-side features
  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Ensure dogs is always an array
  const safeDogs = Array.isArray(dogs) ? dogs : [];

  const handleToggleFavorite = async (dogId: number | string) => {
    const numericId = typeof dogId === "string" ? parseInt(dogId, 10) : dogId;
    if (!Number.isNaN(numericId)) {
      const dog = safeDogs.find((d) => d.id === dogId);
      await toggleFavorite(numericId, dog?.name);
    }
  };

  const handleDogClick = (dog: Dog) => {
    // For now, just log - can be extended to open detail modal
    console.log("Dog clicked:", dog);
  };

  return (
    <section
      className="px-4 py-6 bg-white dark:bg-gray-900 md:hidden"
      aria-label="Available dogs"
      role="region"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Available Now
          </h2>
          {totalCount !== undefined && totalCount > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {totalCount} dogs available
            </p>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading && safeDogs.length === 0 ? (
        <div data-testid="dogs-grid" className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
          {[...Array(8)].map((_, i) => (
            <DogCardSkeleton key={i} />
          ))}
        </div>
      ) : safeDogs.length > 0 ? (
        <>
          {/* Dogs grid */}
          <div data-testid="dogs-grid" className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto">
            {safeDogs.map((dog, index) => {
              const favId = typeof dog.id === "string" ? parseInt(dog.id, 10) : dog.id;
              return (
                <DogCard
                  key={String(dog.id)}
                  dog={dog}
                  index={index}
                  isFavorite={isHydrated && favorites.includes(favId)}
                  onToggleFavorite={handleToggleFavorite}
                  onClick={() => handleDogClick(dog)}
                />
              );
            })}
          </div>

          {/* See More Dogs button */}
          {totalCount && totalCount > 8 && (
            <div className="mt-6 flex justify-center">
              <Link href="/dogs" className="w-full max-w-xs">
                <Button
                  size="lg"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full shadow-lg"
                >
                  See More Dogs
                </Button>
              </Link>
            </div>
          )}
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
  );
};