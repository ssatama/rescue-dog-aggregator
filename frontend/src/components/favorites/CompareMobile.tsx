"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useSwipeable } from "react-swipeable";
import {
  X,
  Dog as DogIcon,
  Cat,
  Baby,
  Sparkles,
  Check,
  AlertCircle,
} from "lucide-react";
import { analyzeComparison } from "../../utils/comparisonAnalyzer";
import {
  getAgeDisplay,
  getCompatibility,
  getPersonalityTraits,
  getPersonalityTraitColor,
  formatEnergyLevel,
  formatExperienceLevel,
} from "./compareUtils";
import type { Dog } from "./types";

interface CompareMobileProps {
  dogs: Dog[];
  onClose: () => void;
}

function getCompatibilityIcon(status?: string) {
  switch (status) {
    case "yes":
      return <Check className="w-4 h-4 text-green-600" />;
    case "no":
      return <X className="w-4 h-4 text-red-600" />;
    case "maybe":
      return <AlertCircle className="w-4 h-4 text-yellow-600" />;
    default:
      return <AlertCircle className="w-4 h-4 text-gray-400" />;
  }
}

// Helper function to check if ALL dogs have complete compatibility data
function allDogsHaveCompatibilityData(dogs: Dog[]): boolean {
  return dogs.every((dog) => {
    const compatibility = getCompatibility(dog);
    // Only consider yes/no/maybe as complete data
    const isValidValue = (value: string) =>
      value === "yes" || value === "no" || value === "maybe";

    return (
      isValidValue(compatibility.dogs) &&
      isValidValue(compatibility.cats) &&
      isValidValue(compatibility.children)
    );
  });
}

export default function CompareMobile({ dogs, onClose }: CompareMobileProps) {
  const comparisonData = analyzeComparison(dogs);
  const [currentDogIndex, setCurrentDogIndex] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [isSwipingLeft, setIsSwipingLeft] = useState(false);
  const [isSwipingRight, setIsSwipingRight] = useState(false);

  // Show swipe hint for first-time users with multiple dogs
  useEffect(() => {
    if (dogs.length > 1) {
      const hasSeenSwipeHint = localStorage.getItem("hasSeenSwipeHint");
      if (!hasSeenSwipeHint) {
        setShowSwipeHint(true);
        // Hide hint after 3 seconds or on first interaction
        const timer = setTimeout(() => {
          setShowSwipeHint(false);
          localStorage.setItem("hasSeenSwipeHint", "true");
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [dogs.length]);

  const hideSwipeHint = () => {
    setShowSwipeHint(false);
    localStorage.setItem("hasSeenSwipeHint", "true");
  };

  const goToNext = () => {
    hideSwipeHint(); // Hide hint on interaction
    if (currentDogIndex < dogs.length - 1) {
      setCurrentDogIndex(currentDogIndex + 1);
    }
  };

  const goToPrevious = () => {
    hideSwipeHint(); // Hide hint on interaction
    if (currentDogIndex > 0) {
      setCurrentDogIndex(currentDogIndex - 1);
    }
  };

  const goToDog = (index: number) => {
    hideSwipeHint(); // Hide hint on interaction
    if (index >= 0 && index < dogs.length) {
      setCurrentDogIndex(index);
    }
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      setIsSwipingLeft(false);
      goToNext();
    },
    onSwipedRight: () => {
      setIsSwipingRight(false);
      goToPrevious();
    },
    onSwiping: (eventData) => {
      // Show visual feedback during swipe
      if (eventData.deltaX > 10) {
        setIsSwipingRight(true);
        setIsSwipingLeft(false);
      } else if (eventData.deltaX < -10) {
        setIsSwipingLeft(true);
        setIsSwipingRight(false);
      }
    },
    onTap: () => {
      // Reset swipe states on tap
      setIsSwipingLeft(false);
      setIsSwipingRight(false);
    },
    trackMouse: true,
  });

  const currentDog = dogs[currentDogIndex];

  // Render single dog card
  const renderDogCard = (dog: Dog) => {
    const imageUrl = dog.primary_image_url;
    const compatibility = getCompatibility(dog);
    const personalityTraits = getPersonalityTraits(dog);
    const tagline = dog.dog_profiler_data?.tagline;
    const uniqueQuirk = dog.dog_profiler_data?.unique_quirk;
    const energyLevel = dog.dog_profiler_data?.energy_level;
    const experienceLevel = dog.dog_profiler_data?.experience_level;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Dog Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3">
            {imageUrl ? (
              <div className="w-16 h-16 relative rounded-lg overflow-hidden flex-shrink-0">
                <Image
                  src={imageUrl}
                  alt={dog.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <DogIcon size={24} className="text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg break-words">{dog.name}</h3>
              {tagline && (
                <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-1 break-words">
                  &ldquo;{tagline}&rdquo;
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
                <span className="text-gray-600 dark:text-gray-400 break-words">
                  {dog.standardized_breed || dog.breed || "Mixed breed"}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {getAgeDisplay(dog)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Personality Traits */}
        {personalityTraits.length > 0 && (
          <div className="px-4 py-3">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Personality
            </div>
            <div className="flex flex-wrap gap-1">
              {personalityTraits.slice(0, 5).map((trait, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-1 rounded-full text-xs break-words ${getPersonalityTraitColor(trait)}`}
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Key Attributes */}
        <div className="px-4 py-3 grid grid-cols-2 gap-3 text-xs">
          <div className="min-w-0">
            <span className="text-gray-600 dark:text-gray-400">Size:</span>
            <span className="ml-2 font-medium break-words">
              {dog.standardized_size || dog.size || "-"}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-gray-600 dark:text-gray-400">Sex:</span>
            <span className="ml-2 font-medium break-words">
              {dog.sex || "-"}
            </span>
          </div>
          {energyLevel && (
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-gray-600 dark:text-gray-400">Energy:</span>
              <span className="ml-2 font-medium break-words">
                {formatEnergyLevel(energyLevel)}
              </span>
            </div>
          )}
          {experienceLevel && (
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-gray-600 dark:text-gray-400">
                Experience:
              </span>
              <span className="ml-2 font-medium break-words">
                {formatExperienceLevel(experienceLevel)}
              </span>
            </div>
          )}
        </div>

        {/* Compatibility Matrix - only show if ALL dogs have complete compatibility data */}
        {allDogsHaveCompatibilityData(dogs) && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Good with
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-1">
                <DogIcon size={14} className="text-gray-400" />
                <span className="text-xs">Dogs</span>
                {getCompatibilityIcon(compatibility.dogs)}
              </div>
              <div className="flex items-center gap-1">
                <Cat size={14} className="text-gray-400" />
                <span className="text-xs">Cats</span>
                {getCompatibilityIcon(compatibility.cats)}
              </div>
              <div className="flex items-center gap-1">
                <Baby size={14} className="text-gray-400" />
                <span className="text-xs">Kids</span>
                {getCompatibilityIcon(compatibility.children)}
              </div>
            </div>
          </div>
        )}

        {/* Unique Quirk */}
        {uniqueQuirk && (
          <div className="px-4 py-3 bg-orange-50 dark:bg-orange-900/10">
            <div className="flex items-center gap-1 text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
              <Sparkles size={12} />
              Unique Quirk
            </div>
            <p className="text-xs text-gray-700 dark:text-gray-300 break-words">
              {uniqueQuirk}
            </p>
          </div>
        )}

        {/* Organization & CTA */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600 dark:text-gray-400 break-words min-w-0 mr-2">
              {dog.organization_name || dog.organization?.name}
            </div>
            {dog.adoption_url && (
              <a
                href={dog.adoption_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-orange-600 hover:text-orange-700 whitespace-nowrap"
              >
                Visit {dog.name} →
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold">Compare Dogs</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {dogs.length > 1
              ? "Swipe to compare your favorites"
              : "Your favorite dog"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Swipe Container */}
      <div
        {...handlers}
        data-testid="swipe-container"
        className={`mb-4 relative transition-transform duration-150 ${
          isSwipingLeft
            ? "-translate-x-2"
            : isSwipingRight
              ? "translate-x-2"
              : ""
        }`}
      >
        {renderDogCard(currentDog)}

        {/* Swipe Hint Overlay */}
        {showSwipeHint && dogs.length > 1 && (
          <div className="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center pointer-events-none z-10">
            <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 animate-pulse">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <span className="animate-bounce">👈</span>
                Swipe to compare
                <span className="animate-bounce">👉</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Progress Dots - only show for multiple dogs */}
      {dogs.length > 1 && (
        <div
          className="flex justify-center gap-3 mb-4"
          data-testid="progress-dots"
        >
          {dogs.map((_, index) => {
            const isActive = index === currentDogIndex;
            return (
              <button
                key={index}
                data-testid={`progress-dot-${index}`}
                onClick={() => goToDog(index)}
                className={`w-12 h-12 rounded-full border-2 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                  isActive
                    ? "bg-orange-500 border-orange-500 shadow-md"
                    : "bg-white border-gray-300 hover:border-orange-400 hover:bg-orange-50 dark:bg-gray-800 dark:border-gray-600 dark:hover:border-orange-400 dark:hover:bg-orange-900/20"
                }`}
                aria-label={`Go to dog ${index + 1}`}
                style={{
                  minWidth: "48px",
                  minHeight: "48px",
                }}
              >
                <span className="sr-only">Dog {index + 1}</span>
                <div
                  className={`w-2 h-2 rounded-full mx-auto ${
                    isActive ? "bg-white" : "bg-gray-400 dark:bg-gray-500"
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile Footer */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        {dogs.length > 1 ? (
          <>
            {currentDogIndex + 1} of {dogs.length} dogs •{" "}
            {comparisonData.organization?.allSame
              ? "Same organization"
              : "Multiple organizations"}
          </>
        ) : (
          <>
            1 dog •{" "}
            {comparisonData.organization?.allSame
              ? "Same organization"
              : "Multiple organizations"}
          </>
        )}
      </div>
    </>
  );
}
