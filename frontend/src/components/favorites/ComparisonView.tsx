"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, useReducedMotion, PanInfo } from "framer-motion";
import {
  Heart,
  Users,
  Dog as DogIcon,
  Cat,
  Baby,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
} from "lucide-react";
import { Dog } from "./types";
import Image from "next/image";
import { FallbackImage } from "../ui/FallbackImage";
import { trackAdoptionLinkClicked } from "@/lib/analytics";
import { formatBreed } from "@/utils/dogHelpers";
import { companionAnswer } from "@/utils/dogFacts";

interface ComparisonViewProps {
  dogs: Dog[];
  onClose: () => void;
  onRemoveFavorite: (dogId: string | number) => void;
}

const ENERGY_LEVELS: Record<string, { label: string; width: string }> = {
  low: { label: "Low", width: "25%" },
  medium: { label: "Medium", width: "50%" },
  moderate: { label: "Medium", width: "50%" },
  high: { label: "High", width: "75%" },
  very_high: { label: "Very high", width: "100%" },
};

const EXPERIENCE_LABELS: Record<string, string> = {
  first_time_ok: "First-time owners OK",
  some_experience: "Some experience",
  experienced_only: "Experienced owners",
};

const COMPANIONS = [
  { field: "good_with_children", label: "Kids", Icon: Baby },
  { field: "good_with_cats", label: "Cats", Icon: Cat },
  { field: "good_with_dogs", label: "Dogs", Icon: DogIcon },
] as const;

const answerStyle = (answer: string): string =>
  answer === "yes" ? "bg-good-soft text-good" : answer === "no" ? "bg-bad-soft text-bad" : "bg-soft text-subtle";

const answerLabel = (answer: string): string =>
  answer === "yes" ? "Yes" : answer === "no" ? "No" : answer.charAt(0).toUpperCase() + answer.slice(1);

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

const DogComparisonCard = ({
  dog,
  onRemoveFavorite,
  index = 0,
}: {
  dog: Dog;
  onRemoveFavorite: (id: string | number) => void;
  index?: number;
}) => {
  const imageUrl = dog.primary_image_url;
  const tagline = dog.dog_profiler_data?.tagline;
  const traits = dog.dog_profiler_data?.personality_traits || [];
  const energy = ENERGY_LEVELS[dog.dog_profiler_data?.energy_level ?? ""];
  const experience = dog.dog_profiler_data?.experience_level;
  const breed = formatBreed(dog);
  const uniqueQuirk = dog.dog_profiler_data?.unique_quirk;

  // Unknown answers are left out, never shown as "no" (#484)
  const compatibility = COMPANIONS.flatMap(({ field, label, Icon }) => {
    const answer = companionAnswer(dog, field);
    return answer ? [{ key: field, label, Icon, answer }] : [];
  });
  const age = dog.age_text && dog.age_text.toLowerCase() !== "unknown" ? dog.age_text : null;

  const handleVisit = () => {
    if (dog.adoption_url) {
      trackAdoptionLinkClicked(dog, "comparison");
      window.open(dog.adoption_url, "_blank", "noopener");
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
            src={dog.primary_image_url || "/placeholder-dog.jpg"}
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
            {breed && <span>{breed}</span>}
            {age && (
              <>
                {breed && <span>•</span>}
                <span>{age}</span>
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
          {breed && <span>{breed}</span>}
          {age && (
            <>
              {breed && <span>•</span>}
              <span>{age}</span>
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

        {energy && (
          <div>
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
              Energy
            </h4>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-orange-500 h-1.5 rounded-full"
                  style={{ width: energy.width }}
                />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {energy.label}
              </span>
            </div>
          </div>
        )}

        {experience && EXPERIENCE_LABELS[experience] && (
          <div>
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
              Experience
            </h4>
            <span className="inline-block px-3 py-1.5 rounded-full text-xs font-medium bg-soft text-ink">
              {EXPERIENCE_LABELS[experience]}
            </span>
          </div>
        )}

        {compatibility.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
              Good with
            </h4>
            <ul className="flex flex-wrap items-center gap-3">
              {compatibility.map(({ key, label, Icon, answer }) => (
                <li key={key} className="flex items-center gap-1">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center ${answerStyle(answer)}`}
                    aria-hidden="true"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {label}: {answerLabel(answer)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

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
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
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

            {/* On a phone the dots below say where you are; no "Dog 1 of 20" (#504). */}
            {!isMobile && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {Math.min(currentIndex + 1, dogs.length)}-
                  {Math.min(currentIndex + visibleCards, dogs.length)} of{" "}
                  {dogs.length} favorites
                </span>
              </div>
            )}

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
