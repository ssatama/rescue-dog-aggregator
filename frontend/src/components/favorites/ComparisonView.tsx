"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, useReducedMotion, PanInfo } from "framer-motion";
import {
  Heart,
  Clock,
  Users,
  Dog as DogIcon,
  Cat,
  Baby,
  Star,
  Zap,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
} from "lucide-react";
import { Dog } from "./types";
import Image from "next/image";
import { FallbackImage } from "../ui/FallbackImage";

interface ComparisonViewProps {
  dogs: Dog[];
  onClose: () => void;
  onRemoveFavorite: (dogId: number) => void;
}

const getEnergyLevel = (level?: string): number => {
  const levels: { [key: string]: number } = {
    Low: 3,
    "Low-Medium": 4,
    Medium: 5,
    "Medium-High": 7,
    High: 9,
    "Very High": 10,
  };
  return levels[level || "Medium"] || 5;
};

const getExperienceLevel = (level?: string): string => {
  const mapping: { [key: string]: string } = {
    "Beginner Friendly": "Beginner",
    "Some Experience": "Intermediate",
    "Experienced Owner": "Advanced",
  };
  return mapping[level || ""] || "Beginner";
};

// Add text formatting helpers
const formatExperienceText = (experience?: string): string => {
  if (!experience) return "First Time OK";

  const formatMap: { [key: string]: string } = {
    first_time_ok: "First Time OK",
    some_experience: "Some Experience",
    experienced_owner: "Experienced Owner",
    "Beginner Friendly": "Beginner Friendly",
    "Some Experience": "Some Experience",
    "Experienced Owner": "Experienced Owner",
  };

  return formatMap[experience] || experience;
};

const formatPersonalityTrait = (trait: string): string => {
  return trait
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
    .replace(/\b(And|Or|The|A|An)\b/g, (match) => match.toLowerCase());
};

const getTraitColor = (index: number): string => {
  // Updated to use site's orange-based color scheme
  const colors = [
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  ];
  return colors[index % colors.length];
};

const EnergyLevelBar = ({ level }: { level: number }) => (
  <div className="flex items-center space-x-2">
    <Zap className="w-4 h-4 text-yellow-500" />
    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full transition-all duration-500"
        style={{ width: `${(level / 10) * 100}%` }}
      />
    </div>
    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
      {level}/10
    </span>
  </div>
);

const CompatibilityIcon = ({
  type,
  compatible,
}: {
  type: "kids" | "cats" | "dogs";
  compatible: boolean;
}) => {
  const icons = {
    kids: Baby,
    cats: Cat,
    dogs: DogIcon,
  };
  const Icon = icons[type];

  return (
    <div
      className={`flex items-center justify-center w-8 h-8 rounded-full ${
        compatible
          ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
      }`}
    >
      <Icon className="w-4 h-4" />
    </div>
  );
};

const ExperienceIndicator = ({ level }: { level: string }) => {
  const colors = {
    Beginner:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    Intermediate:
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    Advanced:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    "Beginner Friendly":
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
    "Some Experience":
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
    "Experienced Owner":
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  };

  return (
    <div
      className={`px-3 py-1 rounded-full text-xs font-medium border ${
        colors[level as keyof typeof colors] || colors.Beginner
      }`}
    >
      {level}
    </div>
  );
};

const DogComparisonCard = ({
  dog,
  onRemoveFavorite,
  index = 0,
}: {
  dog: Dog;
  onRemoveFavorite: (id: number) => void;
  index?: number;
}) => {
  const imageUrl = dog.primary_image_url;
  const tagline = dog.dog_profiler_data?.tagline;
  const traits = dog.dog_profiler_data?.personality_traits || [];
  const energyLevel = getEnergyLevel(dog.dog_profiler_data?.energy_level);
  const experienceLevel =
    dog.dog_profiler_data?.experience_level ||
    getExperienceLevel(dog.dog_profiler_data?.experience_level);
  const uniqueQuirk = dog.dog_profiler_data?.unique_quirk;

  const compatibility = {
    kids:
      typeof dog.dog_profiler_data?.good_with_children === "boolean"
        ? dog.dog_profiler_data.good_with_children
        : dog.dog_profiler_data?.good_with_children === "yes",
    cats:
      typeof dog.dog_profiler_data?.good_with_cats === "boolean"
        ? dog.dog_profiler_data.good_with_cats
        : dog.dog_profiler_data?.good_with_cats === "yes",
    dogs:
      typeof dog.dog_profiler_data?.good_with_dogs === "boolean"
        ? dog.dog_profiler_data.good_with_dogs
        : dog.dog_profiler_data?.good_with_dogs === "yes",
  };

  const handleVisit = () => {
    if (dog.adoption_url) {
      window.open(dog.adoption_url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden h-full flex flex-col"
      data-testid="card-container"
    >
      {/* Hero Image with Responsive Height */}
      <div className="relative h-[30vh] min-h-[200px] max-h-[300px] md:h-56 w-full bg-gray-100 dark:bg-gray-700">
        {imageUrl ? (
          <FallbackImage
            src={dog.primary_image_url || dog.image}
            alt={dog.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={index === 0}
            fallbackSrc="/placeholder_dog.svg"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            data-testid="dog-icon-placeholder"
          >
            <DogIcon size={64} className="text-gray-400 dark:text-gray-600" />
          </div>
        )}

        {/* Overlay Info - Desktop only */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent hidden md:block" />

        {/* Favorite Heart */}
        <button
          onClick={() => onRemoveFavorite(dog.id)}
          className="absolute top-3 right-3 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
          aria-label="Remove from favorites"
        >
          <Heart className="w-5 h-5 text-red-500 fill-current" />
        </button>

        {/* Name and Info Overlay - Desktop only */}
        <div className="absolute bottom-3 left-3 right-3 hidden md:block">
          <h3 className="text-xl font-bold text-white mb-1">{dog.name}</h3>
          <div className="flex items-center gap-2 text-white/90 text-sm">
            <span>{dog.breed || "Mixed Breed"}</span>
            {dog.age_text && (
              <>
                <span>•</span>
                <span>{dog.age_text}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Name/Breed/Age - shown at top of content */}
      <div className="md:hidden px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {dog.name}
        </h3>
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mt-1">
          <span>{dog.breed || "Mixed Breed"}</span>
          {dog.age_text && (
            <>
              <span>•</span>
              <span>{dog.age_text}</span>
            </>
          )}
        </div>
      </div>

      {/* Content - better spacing for mobile */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {/* Personality Tagline */}
        {tagline && (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 border border-orange-100 dark:border-orange-800">
            <p className="text-sm text-gray-700 dark:text-gray-300 italic">
              &quot;{tagline}&quot;
            </p>
          </div>
        )}

        {/* Personality Traits */}
        {traits.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
              Personality Traits
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {traits.slice(0, 5).map((trait, index) => (
                <span
                  key={index}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium ${getTraitColor(
                    index,
                  )}`}
                >
                  {formatPersonalityTrait(trait)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Energy Level - compact */}
        {dog.dog_profiler_data?.energy_level && (
          <div>
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
              Energy Level
            </h4>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-gradient-to-r from-orange-400 to-orange-500 h-1.5 rounded-full"
                  style={{ width: `${(energyLevel / 10) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {energyLevel}/10
              </span>
            </div>
          </div>
        )}

        {/* Experience Required - compact */}
        {dog.dog_profiler_data?.experience_level && (
          <div>
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
              Experience Required
            </h4>
            <span className="inline-block px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
              {formatExperienceText(dog.dog_profiler_data.experience_level)}
            </span>
          </div>
        )}

        {/* Compatibility - compact icons */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
            Good with
          </h4>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  compatibility.kids
                    ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                <Baby className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Kids
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  compatibility.cats
                    ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                <Cat className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Cats
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  compatibility.dogs
                    ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                <DogIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Dogs
              </span>
            </div>
          </div>
        </div>

        {/* Special Quirk - only show if space allows */}
        {uniqueQuirk && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 border border-yellow-200 dark:border-yellow-800">
            <h4 className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1 uppercase tracking-wide">
              Special Quirk
            </h4>
            <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
              {uniqueQuirk}
            </p>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleVisit}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          aria-label={`Visit ${dog.name}`}
        >
          <span>Visit {dog.name}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

const ComparisonView = ({
  dogs,
  onClose,
  onRemoveFavorite,
}: ComparisonViewProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState(2);
  const [isMobile, setIsMobile] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateLayout = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (window.innerWidth >= 1024) setVisibleCards(3);
      else if (window.innerWidth >= 768) setVisibleCards(2);
      else setVisibleCards(1);
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  // Hide mobile sticky navigation when component mounts
  useEffect(() => {
    // Try multiple selectors to find the mobile nav
    const selectors = [
      ".bottom-navigation",
      ".mobile-nav",
      ".mobile-sticky-nav",
      "[data-mobile-nav]",
      'nav[role="navigation"].fixed.bottom-0',
      ".fixed.bottom-0.w-full",
    ];

    let mobileNav: HTMLElement | null = null;
    for (const selector of selectors) {
      mobileNav = document.querySelector(selector);
      if (mobileNav) break;
    }

    if (mobileNav && isMobile) {
      mobileNav.style.display = "none";
    }

    // Prevent body scroll when modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      if (mobileNav) {
        mobileNav.style.display = "";
      }
      // Restore body scroll
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobile]);

  const maxIndex = Math.max(0, dogs.length - visibleCards);
  const canGoNext = currentIndex < maxIndex;
  const canGoPrev = currentIndex > 0;

  const goNext = () => {
    if (canGoNext) setCurrentIndex((prev) => prev + 1);
  };

  const goPrev = () => {
    if (canGoPrev) setCurrentIndex((prev) => prev - 1);
  };

  const handleDragEnd = useCallback(
    (event: any, info: PanInfo) => {
      const { offset } = info;
      const swipeThreshold = 50;

      if (offset.x < -swipeThreshold && canGoNext) {
        setCurrentIndex((prev) => prev + 1);
      } else if (offset.x > swipeThreshold && canGoPrev) {
        setCurrentIndex((prev) => prev - 1);
      }
    },
    [canGoNext, canGoPrev],
  );

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-orange-50 via-white to-yellow-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-y-auto">
      <div className="min-h-screen p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="relative text-center mb-6 pt-4">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-0 right-0 md:top-0 md:right-0 p-2 md:p-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50 shadow-lg hover:shadow-xl transition-all hover:scale-110 z-10"
              aria-label="Close comparison"
            >
              <X className="w-5 h-5 md:w-6 md:h-6 text-gray-700 dark:text-gray-300" />
            </button>

            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent mb-2 px-12 md:px-0">
              Compare Your Favorites
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-12 md:px-4">
              Find the perfect match by comparing your favorited rescue dogs
              side by side
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={goPrev}
              disabled={!canGoPrev}
              className={`p-3 rounded-full backdrop-blur-sm border ${
                canGoPrev
                  ? "bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-gray-700/90 border-gray-300/50 dark:border-gray-600/50 shadow-md hover:shadow-lg transition-all"
                  : "bg-gray-100/50 dark:bg-gray-800/30 text-gray-400 dark:text-gray-600 cursor-not-allowed border-gray-200/50 dark:border-gray-700/50"
              }`}
              aria-label="Previous dog"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isMobile ? (
                  <>
                    Dog {currentIndex + 1} of {dogs.length}
                  </>
                ) : (
                  <>
                    Showing {Math.min(currentIndex + 1, dogs.length)}-
                    {Math.min(currentIndex + visibleCards, dogs.length)} of{" "}
                    {dogs.length} favorites
                  </>
                )}
              </span>
            </div>

            <button
              onClick={goNext}
              disabled={!canGoNext}
              className={`p-3 rounded-full backdrop-blur-sm border ${
                canGoNext
                  ? "bg-white/70 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-gray-700/90 border-gray-300/50 dark:border-gray-600/50 shadow-md hover:shadow-lg transition-all"
                  : "bg-gray-100/50 dark:bg-gray-800/30 text-gray-400 dark:text-gray-600 cursor-not-allowed border-gray-200/50 dark:border-gray-700/50"
              }`}
              aria-label="Next dog"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Cards Container */}
          <div className="overflow-hidden px-2 md:px-0" ref={containerRef}>
            <motion.div
              className="flex gap-4 md:gap-6"
              animate={{ x: `-${currentIndex * (100 / visibleCards)}%` }}
              transition={{
                type: shouldReduceMotion ? "tween" : "spring",
                stiffness: 300,
                damping: 30,
              }}
              drag={isMobile ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onDragEnd={handleDragEnd}
            >
              {dogs.map((dog, index) => (
                <div
                  key={dog.id}
                  className={`flex-shrink-0 ${
                    visibleCards === 1
                      ? "w-full px-2 md:px-0"
                      : visibleCards === 2
                        ? "w-[calc(50%-12px)]"
                        : "w-[calc(33.333%-16px)]"
                  }`}
                  data-testid="card-wrapper"
                >
                  <div className="h-auto md:min-h-[650px]">
                    <DogComparisonCard
                      dog={dog}
                      onRemoveFavorite={onRemoveFavorite}
                      index={index}
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Pagination Dots */}
          {maxIndex > 0 && (
            <div className="flex justify-center mt-8 gap-2 pb-8">
              {Array.from({ length: maxIndex + 1 }, (_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? "w-8 bg-orange-500"
                      : "w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                  }`}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Bottom padding for mobile nav if needed */}
          {isMobile && <div className="h-20" />}
        </div>
      </div>
    </div>
  );
};

export default ComparisonView;
