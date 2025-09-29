"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import FocusTrap from "focus-trap-react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  MapPin,
  Calendar,
  Users,
  Home,
  Globe,
  ChevronDown,
  PawPrint,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/useFavorites";
import { type Dog } from "@/types/dog";

interface DogDetailModalUpgradedProps {
  dog: Dog | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (direction: "prev" | "next") => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

const personalityColors = {
  reserved:
    "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700",
  affectionate:
    "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700",
  playful:
    "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700",
  gentle:
    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700",
  adaptable:
    "bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-700",
  default:
    "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
};

// Updated personality trait colors to match main page exactly
const PERSONALITY_TRAIT_COLORS = [
  "bg-blue-100 text-blue-800", // Index 0
  "bg-green-100 text-green-800", // Index 1
  "bg-purple-100 text-purple-800", // Index 2
  "bg-yellow-100 text-yellow-800", // Index 3
  "bg-pink-100 text-pink-800", // Index 4
] as const;

const infoCardColors = {
  age: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700",
  gender:
    "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700",
  breed:
    "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700",
  size: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700",
};

// Utility function to capitalize first letter
const capitalizeFirst = (str: string | undefined): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Activity colors matching main page
const ACTIVITY_COLORS = [
  "bg-orange-100 dark:bg-orange-800/40 text-orange-800 dark:text-orange-200",
  "bg-blue-100 dark:bg-blue-800/40 text-blue-800 dark:text-blue-200",
  "bg-green-100 dark:bg-green-800/40 text-green-800 dark:text-green-200",
  "bg-pink-100 dark:bg-pink-800/40 text-pink-800 dark:text-pink-200",
  "bg-purple-100 dark:bg-purple-800/40 text-purple-800 dark:text-purple-200",
  "bg-indigo-100 dark:bg-indigo-800/40 text-indigo-800 dark:text-indigo-200",
];

// Get activity emoji matching main page logic
const getActivityEmoji = (activity: string): string => {
  const lowerActivity = activity.toLowerCase();

  // Movement activities
  if (
    lowerActivity.includes("running") ||
    lowerActivity.includes("zooming") ||
    lowerActivity.includes("zoomies")
  )
    return "🏃";
  if (lowerActivity.includes("walk")) return "🚶";
  if (lowerActivity.includes("swimming") || lowerActivity.includes("swim"))
    return "🏊";

  // Play activities
  if (
    lowerActivity.includes("playing") ||
    lowerActivity.includes("play") ||
    lowerActivity.includes("toys") ||
    lowerActivity.includes("fetch") ||
    lowerActivity.includes("ball")
  )
    return "🎾";

  // Affection activities
  if (
    lowerActivity.includes("cuddl") ||
    lowerActivity.includes("snuggl") ||
    lowerActivity.includes("pamper")
  )
    return "🤗";
  if (lowerActivity.includes("kiss")) return "😘";

  // Adventure/exploration
  if (lowerActivity.includes("car") || lowerActivity.includes("ride"))
    return "🚗";
  if (
    lowerActivity.includes("beach") ||
    lowerActivity.includes("water") ||
    lowerActivity.includes("paddl")
  )
    return "🏖️";
  if (lowerActivity.includes("explor") || lowerActivity.includes("adventure"))
    return "🧭";

  // Food
  if (
    lowerActivity.includes("treat") ||
    lowerActivity.includes("eating") ||
    lowerActivity.includes("food")
  )
    return "🦴";

  // Learning
  if (
    lowerActivity.includes("learn") ||
    lowerActivity.includes("school") ||
    lowerActivity.includes("train")
  )
    return "🎓";

  // Social
  if (
    lowerActivity.includes("meet") ||
    lowerActivity.includes("people") ||
    lowerActivity.includes("interact")
  )
    return "👥";

  // Other
  if (lowerActivity.includes("photo") || lowerActivity.includes("model"))
    return "📸";
  if (lowerActivity.includes("rolling")) return "🌀";

  return "🐾"; // Default fallback
};

const DogDetailModalUpgraded: React.FC<DogDetailModalUpgradedProps> = ({
  dog,
  isOpen,
  onClose,
  onNavigate,
  hasNext = true,
  hasPrev = true,
}) => {
  const { isFavorited, toggleFavorite: toggleFav } = useFavorites();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Reset states when dog changes
  useEffect(() => {
    setCurrentPhotoIndex(0);
    setIsDescriptionExpanded(false);
  }, [dog?.id]);

  // Reset image error when photo changes
  useEffect(() => {
    setImageError(false);
  }, [currentPhotoIndex, dog]);

  // Focus management - set initial focus when modal opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;

      // Lock body scroll
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";

      // Cleanup on close or unmount
      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowLeft":
          if (hasPrev && onNavigate) onNavigate("prev");
          break;
        case "ArrowRight":
          if (hasNext && onNavigate) onNavigate("next");
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, onNavigate, hasNext, hasPrev]);

  // Touch handling for swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && hasNext && onNavigate) {
      onNavigate("next");
    } else if (isRightSwipe && hasPrev && onNavigate) {
      onNavigate("prev");
    }
  }, [touchStart, touchEnd, hasNext, hasPrev, onNavigate]);

  // Photo carousel navigation
  const nextPhoto = () => {
    if (dog?.photos && dog.photos.length > 1) {
      setCurrentPhotoIndex((prev) => (prev + 1) % dog.photos!.length);
    }
  };

  const prevPhoto = () => {
    if (dog?.photos && dog.photos.length > 1) {
      setCurrentPhotoIndex((prev) =>
        prev === 0 ? dog.photos!.length - 1 : prev - 1,
      );
    }
  };

  const handleShare = () => {
    // Use the ShareButton logic or native share
    if (navigator.share && dog) {
      navigator.share({
        title: `Meet ${dog.name}`,
        text: `Check out ${dog.name}, a ${dog.age_text || dog.age} ${dog.breed} looking for a loving home!`,
        url: window.location.href,
      });
    }
  };

  const toggleFavorite = async () => {
    if (!dog) return;
    const numericId = parseInt(String(dog.id), 10);
    if (!isNaN(numericId)) {
      await toggleFav(numericId, dog.name);
    }
  };

  const renderEnergyLevel = (level: string | undefined) => {
    const numLevel =
      level === "High" ? 5 : level === "Medium" ? 3 : level === "Low" ? 2 : 3;
    return Array.from({ length: 5 }, (_, i) => (
      <div
        key={i}
        className={cn(
          "w-3 h-3 rounded-full",
          i < numLevel ? "bg-orange-400" : "bg-gray-200 dark:bg-gray-700",
        )}
      />
    ));
  };

  const renderTrainingLevel = (level: string | undefined) => {
    const numLevel =
      level === "Advanced"
        ? 5
        : level === "Intermediate"
          ? 3
          : level === "Basic"
            ? 2
            : 3;
    return Array.from({ length: 5 }, (_, i) => (
      <div
        key={i}
        className={cn(
          "w-3 h-3 rounded-full",
          i < numLevel ? "bg-blue-400" : "bg-gray-200 dark:bg-gray-700",
        )}
      />
    ));
  };

  const getTraitColor = (trait: string) => {
    const traitLower = trait.toLowerCase();
    if (traitLower.includes("reserved") || traitLower.includes("calm"))
      return personalityColors.reserved;
    if (traitLower.includes("affectionate") || traitLower.includes("loving"))
      return personalityColors.affectionate;
    if (traitLower.includes("playful") || traitLower.includes("energetic"))
      return personalityColors.playful;
    if (traitLower.includes("gentle") || traitLower.includes("sweet"))
      return personalityColors.gentle;
    if (traitLower.includes("adaptable") || traitLower.includes("flexible"))
      return personalityColors.adaptable;
    return personalityColors.default;
  };

  if (!dog) return null;

  // Get photo array
  const photos =
    dog.photos || [dog.primary_image_url].filter(Boolean);
  const currentPhoto = imageError
    ? "/placeholder_dog.svg"
    : photos[currentPhotoIndex] || "/placeholder_dog.svg";

  // Get all the data we need
  const traits =
    dog.dog_profiler_data?.personality_traits || dog.personality_traits || [];
  const size =
    dog.standardized_size || dog.size || dog.properties?.size || "Unknown";
  const description =
    dog.dog_profiler_data?.description ||
    dog.llm_description ||
    dog.summary ||
    dog.properties?.description ||
    dog.properties?.raw_description ||
    "";
  const favoriteActivities = dog.dog_profiler_data?.favorite_activities || [];
  const uniqueQuirk = dog.dog_profiler_data?.unique_quirk;
  const tagline = dog.dog_profiler_data?.tagline;
  const energyLevel = dog.dog_profiler_data?.energy_level;
  const trainingLevel = dog.dog_profiler_data?.trainability;

  // Get age display text - convert to age groups
  const getAgeDisplay = () => {
    // First try to get age group from age_text or age field
    const ageValue = dog.age_text || dog.age || "";

    // If it's already an age group, return it
    if (["Young", "Adult", "Senior", "Puppy", "Baby"].includes(ageValue)) {
      return ageValue;
    }

    // Parse the age string to determine age group
    const ageStr = ageValue.toLowerCase();

    // Check for keywords first
    if (ageStr.includes("puppy") || ageStr.includes("baby")) return "Puppy";
    if (ageStr.includes("young")) return "Young";
    if (ageStr.includes("adult")) return "Adult";
    if (ageStr.includes("senior") || ageStr.includes("old")) return "Senior";

    // Try to extract numeric age and convert to age group
    const ageMatch = ageStr.match(/(\d+(?:\.\d+)?)/);
    if (ageMatch) {
      const ageNum = parseFloat(ageMatch[1]);

      // Check if it's in months
      if (ageStr.includes("month") || ageStr.includes("mo")) {
        if (ageNum < 12) return "Puppy";
        if (ageNum <= 24) return "Young";
        return "Adult";
      }

      // Check if it's in years (default assumption)
      if (
        ageStr.includes("year") ||
        ageStr.includes("yr") ||
        !ageStr.includes("month")
      ) {
        if (ageNum < 1) return "Puppy";
        if (ageNum <= 2) return "Young";
        if (ageNum <= 7) return "Adult";
        return "Senior";
      }
    }

    // If we can't determine the age group, return Unknown
    return "Unknown";
  };

  // Check if favorited
  const isFav = dog ? isFavorited(parseInt(String(dog.id), 10)) : false;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[1000]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <FocusTrap
            active={isOpen}
            focusTrapOptions={{
              initialFocus: () => closeButtonRef.current,
              allowOutsideClick: true,
              returnFocusOnDeactivate: true,
              escapeDeactivates: false, // We handle ESC ourselves
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
            >
              <motion.div
                className="bg-white dark:bg-gray-900 rounded-2xl w-[90vw] max-w-[600px] md:max-w-[700px] lg:max-w-[800px] h-[90vh] max-h-[800px] overflow-hidden shadow-2xl border border-gray-200/20 dark:border-gray-700/30"
                layoutId={`dog-card-${dog.id}`}
                onClick={(e) => e.stopPropagation()}
                ref={modalContentRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-dog-name"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
                  <h1
                    id="modal-dog-name"
                    className="text-xl font-bold text-gray-900 dark:text-white"
                  >
                    {dog.name}
                  </h1>
                  <button
                    ref={closeButtonRef}
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    aria-label="Close modal"
                  >
                    <X className="w-4 h-4 dark:text-gray-400" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="h-[calc(100%-80px)] overflow-y-auto p-5 md:p-6 lg:p-8 space-y-6 md:space-y-8 scrollbar-hide">
                  {/* Dog Image with Actions */}
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-lg">
                    <Image
                      src={currentPhoto}
                      alt={`${dog.name}'s photo`}
                      fill
                      className="object-cover"
                      priority
                      onError={() => setImageError(true)}
                    />

                    {/* Photo navigation */}
                    {photos.length > 1 && (
                      <>
                        <button
                          onClick={prevPhoto}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-md"
                          aria-label="Previous photo"
                        >
                          <ChevronLeft className="w-5 h-5 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={nextPhoto}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-800 transition-colors shadow-md"
                          aria-label="Next photo"
                        >
                          <ChevronRight className="w-5 h-5 dark:text-gray-400" />
                        </button>

                        {/* Photo indicators */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {photos.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setCurrentPhotoIndex(i)}
                              className={cn(
                                "w-2 h-2 rounded-full transition-all duration-200",
                                i === currentPhotoIndex
                                  ? "w-6 bg-white"
                                  : "bg-white/50 dark:bg-gray-600/50 hover:bg-white/70 dark:hover:bg-gray-500/70",
                              )}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* Action Buttons */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button
                        onClick={handleShare}
                        className="w-10 h-10 bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-800 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
                      >
                        <Share2 className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      </button>
                      <button
                        onClick={toggleFavorite}
                        className={cn(
                          "w-10 h-10 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95",
                          isFav
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-white/90 dark:bg-gray-900/90 hover:bg-white dark:hover:bg-gray-800",
                        )}
                      >
                        <Heart
                          className={cn(
                            "w-4 h-4",
                            isFav
                              ? "fill-white text-white"
                              : "text-gray-700 dark:text-gray-300",
                          )}
                        />
                      </button>
                    </div>

                    {/* Gradient Overlay for better text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                  </div>

                  {/* Info Cards Grid */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div
                      className={cn(
                        "p-4 rounded-xl border flex flex-col items-center",
                        infoCardColors.age,
                      )}
                    >
                      <div className="text-2xl mb-2">🎂</div>
                      <div className="font-semibold text-sm mb-1 dark:text-white">
                        Age
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                        {getAgeDisplay()}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "p-4 rounded-xl border flex flex-col items-center",
                        infoCardColors.gender,
                      )}
                    >
                      <div className="text-2xl mb-2">
                        {dog.sex?.toLowerCase() === "female" ? "♀️" : "♂️"}
                      </div>
                      <div className="font-semibold text-sm mb-1 dark:text-white">
                        Gender
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                        {dog.sex || "Unknown"}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "p-4 rounded-xl border flex flex-col items-center",
                        infoCardColors.breed,
                      )}
                    >
                      <div className="text-2xl mb-2">🐕</div>
                      <div className="font-semibold text-sm mb-1 dark:text-white">
                        Breed
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                        {dog.primary_breed ||
                          dog.standardized_breed ||
                          dog.breed ||
                          "Mixed"}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "p-4 rounded-xl border flex flex-col items-center",
                        infoCardColors.size,
                      )}
                    >
                      <div className="text-2xl mb-2">📏</div>
                      <div className="font-semibold text-sm mb-1 dark:text-white">
                        Size
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                        {size}
                      </div>
                    </div>
                  </div>

                  {/* About Section */}
                  {description && (
                    <div>
                      <h3 className="font-semibold mb-2 dark:text-white">
                        About {dog.name}
                      </h3>
                      <p
                        className={cn(
                          "text-sm text-gray-700 dark:text-gray-300 leading-relaxed",
                          !isDescriptionExpanded && "line-clamp-4",
                        )}
                      >
                        {description}
                      </p>
                      {description.length > 200 && (
                        <button
                          onClick={() =>
                            setIsDescriptionExpanded(!isDescriptionExpanded)
                          }
                          className="text-orange-500 dark:text-orange-400 text-sm mt-2 hover:underline"
                        >
                          {isDescriptionExpanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Personality */}
                  {traits.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3 dark:text-white">
                        Personality
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {traits.slice(0, 5).map((trait, index) => (
                          <span
                            key={index}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-sm font-medium",
                              PERSONALITY_TRAIT_COLORS[
                                index % PERSONALITY_TRAIT_COLORS.length
                              ],
                            )}
                          >
                            {capitalizeFirst(trait)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Energy & Training */}
                  {(energyLevel || trainingLevel) && (
                    <div className="grid grid-cols-2 gap-4">
                      {energyLevel && (
                        <div>
                          <h4 className="font-medium mb-2 text-sm dark:text-gray-300">
                            Energy Level
                          </h4>
                          <div className="flex gap-1">
                            {renderEnergyLevel(energyLevel)}
                          </div>
                        </div>
                      )}
                      {trainingLevel && (
                        <div>
                          <h4 className="font-medium mb-2 text-sm dark:text-gray-300">
                            Training Level
                          </h4>
                          <div className="flex gap-1">
                            {renderTrainingLevel(trainingLevel)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Good With */}
                  {dog.dog_profiler_data && (
                    <div>
                      <h3 className="font-semibold mb-3 dark:text-white">
                        Good With
                      </h3>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center",
                              dog.dog_profiler_data.good_with_dogs === "yes"
                                ? "bg-green-100 dark:bg-green-900/30"
                                : "bg-gray-100 dark:bg-gray-800",
                            )}
                          >
                            {dog.dog_profiler_data.good_with_dogs === "yes" ? (
                              <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full" />
                            ) : (
                              <div className="w-3 h-0.5 bg-gray-400 dark:bg-gray-600" />
                            )}
                          </div>
                          <span className="text-sm dark:text-gray-300">
                            Dogs
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center",
                              dog.dog_profiler_data.good_with_cats === "yes"
                                ? "bg-green-100 dark:bg-green-900/30"
                                : "bg-gray-100 dark:bg-gray-800",
                            )}
                          >
                            {dog.dog_profiler_data.good_with_cats === "yes" ? (
                              <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full" />
                            ) : (
                              <div className="w-3 h-0.5 bg-gray-400 dark:bg-gray-600" />
                            )}
                          </div>
                          <span className="text-sm dark:text-gray-300">
                            Cats
                          </span>
                        </div>
                        {dog.dog_profiler_data.good_with_children !==
                          undefined && (
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center",
                                dog.dog_profiler_data.good_with_children ===
                                  "yes"
                                  ? "bg-green-100 dark:bg-green-900/30"
                                  : "bg-gray-100 dark:bg-gray-800",
                              )}
                            >
                              {dog.dog_profiler_data.good_with_children ===
                              "yes" ? (
                                <div className="w-2 h-2 bg-green-500 dark:bg-green-400 rounded-full" />
                              ) : (
                                <div className="w-3 h-0.5 bg-gray-400 dark:bg-gray-600" />
                              )}
                            </div>
                            <span className="text-sm dark:text-gray-300">
                              Kids
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Activities */}
                  {favoriteActivities.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-4 dark:text-white">
                        Favorite Activities
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {favoriteActivities.map((activity, index) => (
                          <span
                            key={index}
                            className={cn(
                              "px-3 py-2 rounded-full text-sm font-medium flex items-center gap-1 transition-all duration-200 hover:scale-105",
                              ACTIVITY_COLORS[index % ACTIVITY_COLORS.length],
                            )}
                          >
                            <span>{getActivityEmoji(activity)}</span>
                            <span>{capitalizeFirst(activity)}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* What Makes Me Special */}
                  {uniqueQuirk && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 dark:bg-gray-800/50 border border-purple-200 dark:border-purple-700/50 p-5 rounded-xl shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-800/50 rounded-full flex items-center justify-center">
                          <span className="text-lg">✨</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
                            What Makes Me Special
                          </h4>
                          <p className="text-sm text-purple-700 dark:text-gray-300 leading-relaxed">
                            {capitalizeFirst(uniqueQuirk)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Organization Info */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                        <span className="text-xs">🏠</span>
                      </div>
                      <h4 className="font-semibold text-gray-800 dark:text-gray-300">
                        Rescue Organization
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {dog.organization?.name}
                    </p>
                  </div>

                  {/* CTA Button */}
                  <button
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 dark:bg-orange-600 hover:from-orange-600 hover:to-orange-700 dark:hover:from-orange-700 dark:hover:to-orange-800 text-white py-4 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                    onClick={() => {
                      if (dog.adoption_url) {
                        window.open(
                          dog.adoption_url,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }
                    }}
                  >
                    <Heart className="w-5 h-5" />
                    Start Adoption Process
                  </button>

                  {/* Paw Navigation */}
                  {onNavigate && (
                    <div className="flex justify-between items-center pt-6 border-t border-gray-200/50 dark:border-gray-700/30">
                      <button
                        onClick={() => onNavigate("prev")}
                        disabled={!hasPrev}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 group transition-all duration-200",
                          hasPrev
                            ? "hover:scale-105 active:scale-95"
                            : "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <div
                          className={cn(
                            "w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 dark:bg-orange-900 rounded-full shadow-lg flex items-center justify-center text-lg transition-all duration-200",
                            hasPrev &&
                              "group-hover:shadow-xl group-hover:from-orange-200 group-hover:to-orange-300 dark:group-hover:from-orange-800 dark:group-hover:to-orange-900",
                          )}
                        >
                          🐾
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium transition-colors",
                            hasPrev
                              ? "text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-400"
                              : "text-gray-400 dark:text-gray-600",
                          )}
                        >
                          Previous
                        </span>
                      </button>

                      <div className="flex-1 text-center px-4">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Swipe to browse
                        </div>
                        <div className="flex justify-center gap-1 mt-1">
                          <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                          <div className="w-1.5 h-1.5 bg-orange-200 rounded-full" />
                          <div className="w-1.5 h-1.5 bg-orange-200 rounded-full" />
                          <div className="w-1.5 h-1.5 bg-orange-200 rounded-full" />
                        </div>
                      </div>

                      <button
                        onClick={() => onNavigate("next")}
                        disabled={!hasNext}
                        className={cn(
                          "flex flex-col items-center gap-2 p-3 group transition-all duration-200",
                          hasNext
                            ? "hover:scale-105 active:scale-95"
                            : "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <div
                          className={cn(
                            "w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 dark:bg-orange-900 rounded-full shadow-lg flex items-center justify-center text-lg transition-all duration-200",
                            hasNext &&
                              "group-hover:shadow-xl group-hover:from-orange-200 group-hover:to-orange-300 dark:group-hover:from-orange-800 dark:group-hover:to-orange-900",
                          )}
                        >
                          🐾
                        </div>
                        <span
                          className={cn(
                            "text-xs font-medium transition-colors",
                            hasNext
                              ? "text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-400"
                              : "text-gray-400 dark:text-gray-600",
                          )}
                        >
                          Next
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          </FocusTrap>
        </>
      )}
    </AnimatePresence>
  );
};

export default DogDetailModalUpgraded;
