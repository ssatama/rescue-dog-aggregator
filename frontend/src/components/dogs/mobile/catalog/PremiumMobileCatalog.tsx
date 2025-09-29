"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import Image from "next/image";
import {
  Heart,
  X,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronLeft,
  Filter,
  Grid3X3,
  Building2,
  Dog as DogIcon,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";
import { safeStorage } from "@/utils/safeStorage";

import DogDetailModalUpgraded from "../detail/DogDetailModalUpgraded";
import { getPersonalityTraitColor } from "@/utils/personalityColors";
import {
  formatBreed,
  getPersonalityTraits,
  getAgeCategory,
  formatAge,
} from "@/utils/dogHelpers";
import { IMAGE_SIZES } from "@/constants/imageSizes";
import { type Dog } from "@/types/dog";
import MobileFilterDrawer from "@/components/filters/MobileFilterDrawer";
import { Button } from "@/components/ui/button";
import { UI_CONSTANTS } from "@/constants/viewport";

interface FilterChip {
  id: string;
  label: string;
  value: string;
  type: "gender" | "age";
}

interface PremiumMobileCatalogProps {
  dogs: Dog[];
  loading?: boolean;
  error?: string | null;
  filters?: Record<string, any>;
  onFilterChange?: (
    filterKeyOrBatch: string | Record<string, string>,
    value?: string,
  ) => void;
  onOpenFilter?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  totalCount?: number;
  viewMode?: "grid" | "list";
}

// Filter chips configuration - reordered for 2-row layout
const filterChips: FilterChip[] = [
  // Row 1
  { id: "all", label: "All", value: "all", type: "gender" },
  { id: "male", label: "Male", value: "male", type: "gender" },
  { id: "female", label: "Female", value: "female", type: "gender" },
  { id: "puppy", label: "Puppy", value: "puppy", type: "age" },
  // Row 2
  { id: "young", label: "Young", value: "young", type: "age" },
  { id: "adult", label: "Adult", value: "adult", type: "age" },
  { id: "senior", label: "Senior", value: "senior", type: "age" },
];

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

// Dog Card Component
const DogCard: React.FC<{
  dog: Dog;
  onToggleFavorite: (id: string) => void;
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
      style={{ borderRadius: UI_CONSTANTS.BORDER_RADIUS }}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        // Only trigger on Enter or Space when focus is on the card itself
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
            onToggleFavorite(String(dog.id));
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
          {dog.name}{ageGroup !== "Unknown" && `, ${ageGroup}`}
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

// Main component
const PremiumMobileCatalog: React.FC<PremiumMobileCatalogProps> = ({
  dogs,
  loading = false,
  error = null,
  filters = {},
  onFilterChange,
  onOpenFilter,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  totalCount = 0,
  viewMode = "grid",
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { favorites, toggleFavorite } = useFavorites();
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize selected dog from hash on mount
  const [selectedDog, setSelectedDog] = useState<Dog | null>(() => {
    if (typeof window === "undefined") return null;
    const hash = window.location.hash.slice(1);
    if (!hash.startsWith("dog=")) return null;
    const slug = hash.split("=")[1];
    return (
      dogs.find((d) => d.slug === slug || `unknown-dog-${d.id}` === slug) ||
      null
    );
  });

  const [isModalOpen, setIsModalOpen] = useState(!!selectedDog);

  // Track hydration for client-side features
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Listen for hash changes (back/forward navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (!hash.startsWith("dog=")) {
        setIsModalOpen(false);
        setSelectedDog(null);
        return;
      }
      const slug = hash.split("=")[1];
      const dog = dogs.find(
        (d) => d.slug === slug || `unknown-dog-${d.id}` === slug,
      );
      if (dog) {
        setSelectedDog(dog);
        setIsModalOpen(true);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [dogs]);

  // Re-check hash when dogs array changes (for late-loading data)
  useEffect(() => {
    if (typeof window === "undefined" || !dogs.length) return;

    const hash = window.location.hash.slice(1);
    if (!hash.startsWith("dog=")) return;

    const slug = decodeURIComponent(hash.split("=")[1] || "");
    const dog = dogs.find(
      (d) => d.slug === slug || `unknown-dog-${d.id}` === slug,
    );

    if (dog && !selectedDog) {
      setSelectedDog(dog);
      setIsModalOpen(true);
    }
  }, [dogs]); // Only depend on dogs, not selectedDog to avoid loops

  // Quick filter toggle handler
  const handleQuickFilter = (chip: FilterChip) => {
    if (!onFilterChange) return;

    // Determine the filter key and value
    let filterKey = "";
    let filterValue = "";

    if (chip.type === "gender") {
      filterKey = "sexFilter";
      // For gender filters, clicking the same one again clears it, clicking a different one switches
      const isActive = filters.sexFilter?.toLowerCase() === chip.value;
      filterValue = isActive
        ? "Any"
        : chip.value.charAt(0).toUpperCase() + chip.value.slice(1);
    } else if (chip.type === "age") {
      filterKey = "ageFilter";
      // For age filters, clicking the same one again clears it, clicking a different one switches
      const isActive = filters.ageFilter?.toLowerCase() === chip.value;
      filterValue = isActive
        ? "Any age"
        : chip.value.charAt(0).toUpperCase() + chip.value.slice(1);
    }

    // Call parent's filter change handler - this will trigger server-side filtering
    if (filterKey && filterValue) {
      onFilterChange(filterKey, filterValue);
    }
  };

  const handleToggleFavorite = async (dogId: string) => {
    const numericId = parseInt(dogId, 10);
    if (!isNaN(numericId)) {
      const dog = dogs.find((d) => d.id === dogId);
      await toggleFavorite(numericId, dog?.name);
    }
  };

  const handleDogClick = (dog: Dog) => {
    setSelectedDog(dog);
    setIsModalOpen(true);

    // Update hash for sharing with proper encoding
    window.location.hash = `dog=${encodeURIComponent(dog.slug || `unknown-dog-${dog.id}`)}`;
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedDog(null);

    // Clear hash while preserving search params (use replaceState to avoid new history entry)
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  };

  const handleModalNavigate = (direction: "prev" | "next") => {
    if (!selectedDog || !dogs.length) return;

    const currentIndex = dogs.findIndex((d) => d.id === selectedDog.id);
    let newIndex;

    if (direction === "next") {
      newIndex =
        currentIndex < dogs.length - 1 ? currentIndex + 1 : currentIndex;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
    }

    if (newIndex !== currentIndex) {
      const newDog = dogs[newIndex];
      setSelectedDog(newDog);

      // Update hash with new dog (with encoding)
      window.location.hash = `dog=${encodeURIComponent(newDog.slug || `unknown-dog-${newDog.id}`)}`;
    }
  };

  // Calculate active quick filter count (sex + age only)
  const activeQuickFilterCount = useMemo(() => {
    let count = 0;
    if (filters.sexFilter && filters.sexFilter !== "Any") count++;
    if (filters.ageFilter && filters.ageFilter !== "Any age") count++;
    return count;
  }, [filters.sexFilter, filters.ageFilter]);

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        {/* Quick Filter Chips Section */}
        <div className="sticky top-0 z-10 bg-background dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 pb-3">
          <div className="px-4 pt-3">
            <div className="grid grid-cols-4 gap-2">
              {filterChips.map((chip) => {
                // Determine if this chip is active based on parent filters
                let isActive = false;

                if (chip.value === "all") {
                  // "All" is active when BOTH filters are cleared
                  isActive =
                    (!filters.sexFilter || filters.sexFilter === "Any") &&
                    (!filters.ageFilter || filters.ageFilter === "Any age");
                } else if (chip.type === "gender") {
                  isActive = filters.sexFilter?.toLowerCase() === chip.value;
                } else if (chip.type === "age") {
                  isActive = filters.ageFilter?.toLowerCase() === chip.value;
                }

                return (
                  <button
                    key={chip.id}
                    onClick={() => {
                      // Special handling for "All" button
                      if (chip.value === "all") {
                        // Clear both sex and age filters in a single batch update
                        if (onFilterChange) {
                          // Use batch update to avoid multiple fetches
                          onFilterChange({
                            sexFilter: "Any",
                            ageFilter: "Any age",
                          });
                        }
                      } else {
                        handleQuickFilter(chip);
                      }
                    }}
                    className={cn(
                      "px-3 py-2 rounded-full text-sm font-medium transition-all relative",
                      isActive
                        ? "bg-orange-500 dark:bg-orange-600 text-white"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600",
                    )}
                  >
                    {chip.label}
                    {chip.value === "all" && activeQuickFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {activeQuickFilterCount}
                      </span>
                    )}
                  </button>
                );
              })}
              {/* Empty cell for alignment in second row */}
              <div className="col-span-1"></div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 py-4">
          {loading && dogs.length === 0 ? (
            // Loading state
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
                >
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
              ))}
            </div>
          ) : error ? (
            // Error state
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-6xl mb-4">😔</div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Oops! Something went wrong
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center px-8">
                {error}
              </p>
            </div>
          ) : dogs.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-6xl mb-4">🐕</div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                No dogs found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center px-8">
                Try adjusting your filters to see more dogs
              </p>
            </div>
          ) : (
            <>
              {/* Dog Grid - Display ALL dogs passed from parent, no local filtering */}
              <div className="grid grid-cols-2 gap-3">
                {dogs.map((dog, index) => (
                  <DogCard
                    key={dog.id}
                    dog={dog}
                    index={index}
                    isFavorite={
                      isHydrated &&
                      favorites.includes(parseInt(String(dog.id), 10))
                    }
                    onToggleFavorite={handleToggleFavorite}
                    onClick={() => handleDogClick(dog)}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && onLoadMore && (
                <div className="flex justify-center mt-8">
                  <Button
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    variant="outline"
                    size="lg"
                    className="min-w-[150px]"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More Dogs"
                    )}
                  </Button>
                </div>
              )}

              {/* Loading indicator for load more */}
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Dog Detail Modal */}
      <DogDetailModalUpgraded
        dog={selectedDog}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onNavigate={handleModalNavigate}
        hasNext={
          selectedDog
            ? dogs.findIndex((d) => d.id === selectedDog.id) < dogs.length - 1
            : false
        }
        hasPrev={
          selectedDog
            ? dogs.findIndex((d) => d.id === selectedDog.id) > 0
            : false
        }
      />
    </>
  );
};

export default PremiumMobileCatalog;
