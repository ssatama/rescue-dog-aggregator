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
} from "lucide-react";
import { Dog } from "./types";
import Image from "next/image";

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

const getTraitColor = (index: number): string => {
  const colors = [
    "bg-green-100 text-green-800",
    "bg-blue-100 text-blue-800",
    "bg-yellow-100 text-yellow-800",
    "bg-purple-100 text-purple-800",
    "bg-pink-100 text-pink-800",
    "bg-indigo-100 text-indigo-800",
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
}: {
  dog: Dog;
  onRemoveFavorite: (id: number) => void;
}) => {
  const imageUrl = dog.primary_image_url || dog.main_image;
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
    <motion.div
      className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50 shadow-2xl"
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      data-testid="card-container"
    >
      {/* Hero Image with Gradient Overlay */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
        {imageUrl ? (
          <>
            <div className="relative w-full h-full">
              <Image
                src={imageUrl}
                alt={dog.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            data-testid="dog-icon-placeholder"
          >
            <DogIcon size={64} className="text-gray-400 dark:text-gray-600" />
          </div>
        )}

        {/* Favorite Heart */}
        <motion.button
          onClick={() => onRemoveFavorite(dog.id)}
          className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Remove from favorites"
        >
          <Heart className="w-5 h-5 text-red-500 fill-current" />
        </motion.button>

        {/* Name and Age Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-2xl font-bold text-white mb-1">{dog.name}</h3>
          <div className="flex items-center space-x-3 text-white/90">
            <span className="text-sm">{dog.breed || "Mixed Breed"}</span>
            {dog.age_text && (
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span className="text-sm">{dog.age_text}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Personality Tagline */}
        {tagline && (
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl p-4 border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-gray-700 dark:text-gray-300 italic">
              &quot;{tagline}&quot;
            </p>
          </div>
        )}

        {/* Personality Traits */}
        {traits.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Personality Traits
            </h4>
            <div className="flex flex-wrap gap-2">
              {traits.map((trait, index) => (
                <motion.span
                  key={index}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getTraitColor(
                    index,
                  )} dark:bg-opacity-20`}
                  whileHover={{ scale: 1.05 }}
                >
                  {trait}
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {/* Energy Level */}
        {dog.dog_profiler_data?.energy_level && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Energy Level ({dog.dog_profiler_data.energy_level})
            </h4>
            <EnergyLevelBar level={energyLevel} />
          </div>
        )}

        {/* Experience Required */}
        {dog.dog_profiler_data?.experience_level && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Experience Required
            </h4>
            <ExperienceIndicator
              level={dog.dog_profiler_data.experience_level}
            />
          </div>
        )}

        {/* Compatibility Matrix */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Good with
          </h4>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <CompatibilityIcon type="kids" compatible={compatibility.kids} />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Kids
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <CompatibilityIcon type="cats" compatible={compatibility.cats} />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Cats
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <CompatibilityIcon type="dogs" compatible={compatibility.dogs} />
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Dogs
              </span>
            </div>
          </div>
        </div>

        {/* Special Quirk */}
        {uniqueQuirk && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-2xl p-4 border border-yellow-200 dark:border-yellow-800">
            <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-1">
              Special Quirk
            </h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {uniqueQuirk}
            </p>
          </div>
        )}

        {/* Organization */}
        {dog.organization_name && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {dog.organization_name}
            </span>
          </div>
        )}

        {/* Action Button */}
        <motion.button
          onClick={handleVisit}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-2xl font-semibold text-sm shadow-lg flex items-center justify-center space-x-2"
          whileHover={{
            scale: 1.02,
            boxShadow: "0 10px 25px rgba(147, 51, 234, 0.3)",
          }}
          whileTap={{ scale: 0.98 }}
          aria-label={`Visit ${dog.name}`}
        >
          <span>Visit {dog.name}</span>
          <ExternalLink className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
};

const ComparisonView = ({
  dogs,
  onClose,
  onRemoveFavorite,
}: ComparisonViewProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState(2);
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateVisibleCards = () => {
      if (window.innerWidth >= 1024) setVisibleCards(3);
      else if (window.innerWidth >= 768) setVisibleCards(2);
      else setVisibleCards(1);
    };

    updateVisibleCards();
    window.addEventListener("resize", updateVisibleCards);
    return () => window.removeEventListener("resize", updateVisibleCards);
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Compare Your Favorites
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Find the perfect match by comparing your favorited rescue dogs side
            by side. Each profile shows personality insights, compatibility, and
            special traits.
          </p>
        </motion.div>

        {/* Navigation Controls */}
        <div className="flex justify-between items-center mb-6">
          <motion.button
            onClick={goPrev}
            disabled={!canGoPrev}
            className={`p-3 rounded-full backdrop-blur-sm border ${
              canGoPrev
                ? "bg-white/20 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-700/50 border-gray-300/50 dark:border-gray-600/50"
                : "bg-gray-100/50 dark:bg-gray-800/30 text-gray-400 dark:text-gray-600 cursor-not-allowed border-gray-200/50 dark:border-gray-700/50"
            }`}
            whileHover={canGoPrev ? { scale: 1.1 } : {}}
            whileTap={canGoPrev ? { scale: 0.9 } : {}}
            aria-label="Previous dog"
          >
            <ChevronLeft className="w-6 h-6" />
          </motion.button>

          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {Math.min(visibleCards, dogs.length)} of {dogs.length}{" "}
              favorites
            </span>
          </div>

          <motion.button
            onClick={goNext}
            disabled={!canGoNext}
            className={`p-3 rounded-full backdrop-blur-sm border ${
              canGoNext
                ? "bg-white/20 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 hover:bg-white/30 dark:hover:bg-gray-700/50 border-gray-300/50 dark:border-gray-600/50"
                : "bg-gray-100/50 dark:bg-gray-800/30 text-gray-400 dark:text-gray-600 cursor-not-allowed border-gray-200/50 dark:border-gray-700/50"
            }`}
            whileHover={canGoNext ? { scale: 1.1 } : {}}
            whileTap={canGoNext ? { scale: 0.9 } : {}}
            aria-label="Next dog"
          >
            <ChevronRight className="w-6 h-6" />
          </motion.button>
        </div>

        {/* Cards Container */}
        <div className="overflow-hidden" ref={containerRef}>
          <motion.div
            className="flex gap-6"
            animate={{ x: `-${currentIndex * (100 / visibleCards)}%` }}
            transition={{
              type: shouldReduceMotion ? "tween" : "spring",
              stiffness: 300,
              damping: 30,
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
          >
            {dogs.map((dog) => (
              <motion.div
                key={dog.id}
                className={`flex-shrink-0 ${
                  visibleCards === 1
                    ? "w-full"
                    : visibleCards === 2
                      ? "w-full md:w-1/2"
                      : "w-full md:w-1/2 lg:w-1/3"
                }`}
                style={{ width: `${100 / visibleCards}%` }}
                data-testid="card-wrapper"
              >
                <DogComparisonCard
                  dog={dog}
                  onRemoveFavorite={onRemoveFavorite}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center mt-8 space-x-2">
          {Array.from({ length: maxIndex + 1 }, (_, index) => (
            <motion.button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-purple-600 scale-125"
                  : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
              }`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ComparisonView;
