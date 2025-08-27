"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  X,
  Check,
  ArrowLeft,
  Heart,
  MapPin,
  Calendar,
  Ruler,
  Users,
  Cat,
  Dog as DogIcon,
  Baby,
  Home,
  AlertCircle,
  Sparkles,
  Activity,
  Zap,
  Shield,
  Star,
  Brain,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  analyzeComparison,
  type Dog as AnalyzerDog,
} from "../../utils/comparisonAnalyzer";
import type { DogProfilerData } from "../../types/dogProfiler";
import { useIsMobile } from "../../hooks/useMediaQuery";

interface Dog {
  id: number;
  name: string;
  breed?: string;
  standardized_breed?: string;
  age_months?: number;
  age_min_months?: number;
  age_max_months?: number;
  age_text?: string;
  sex?: string;
  size?: string;
  standardized_size?: string;
  organization_name?: string;
  organization?: {
    name: string;
    country: string;
  };
  location?: string;
  ships_to?: string[];
  description?: string;
  main_image?: string;
  primary_image_url?: string;
  adoption_url?: string;
  dog_profiler_data?: DogProfilerData;
  properties?: {
    personality?: string;
    good_with?: string;
    good_with_dogs?: boolean | string;
    good_with_cats?: boolean | string;
    good_with_children?: boolean | string;
    good_with_list?: string[];
    description?: string;
    location?: string;
    weight?: string;
    house_trained?: boolean;
    special_needs?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

interface CompareModeProps {
  dogs: Dog[];
  onClose: () => void;
}

export default function CompareMode({ dogs, onClose }: CompareModeProps) {
  const [selectedDogs, setSelectedDogs] = useState<Set<number>>(new Set());
  const [isComparing, setIsComparing] = useState(false);
  const isMobile = useIsMobile(); // Move hook to top level
  const MAX_SELECTIONS = 3;

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const toggleDogSelection = (dogId: number) => {
    setSelectedDogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dogId)) {
        newSet.delete(dogId);
      } else if (newSet.size < MAX_SELECTIONS) {
        newSet.add(dogId);
      }
      return newSet;
    });
  };

  const handleCompare = () => {
    if (selectedDogs.size >= 2) {
      setIsComparing(true);
    }
  };

  const handleBackToSelection = () => {
    setIsComparing(false);
  };

  const getSelectedDogData = (): Dog[] => {
    return dogs.filter((dog) => selectedDogs.has(dog.id));
  };

  const renderSelectionView = () => (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Select Dogs to Compare</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Choose 2-3 dogs to compare side by side
            </p>
          </div>
          {selectedDogs.size > 0 && (
            <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium">
              {selectedDogs.size} of 3 selected
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        {dogs.map((dog) => {
          const isSelected = selectedDogs.has(dog.id);
          const isDisabled = !isSelected && selectedDogs.size >= MAX_SELECTIONS;
          const imageUrl = dog.primary_image_url || dog.main_image;

          return (
            <div
              key={dog.id}
              onClick={() => !isDisabled && toggleDogSelection(dog.id)}
              className={`relative border-2 rounded-lg overflow-hidden transition-all cursor-pointer ${
                isSelected
                  ? "border-orange-600 bg-orange-50 dark:bg-orange-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              } ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-md hover:-translate-y-0.5"}`}
            >
              {/* Checkmark overlay for selected state */}
              {isSelected && (
                <div className="absolute top-3 right-3 z-10 w-7 h-7 bg-orange-600 rounded-full flex items-center justify-center">
                  <Check size={16} className="text-white" />
                </div>
              )}

              {/* Dog image */}
              {imageUrl && (
                <div className="aspect-[4/3] overflow-hidden relative">
                  <Image
                    src={imageUrl}
                    alt={dog.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
              )}

              {/* Dog info */}
              <div className="p-3">
                <h3 className="font-semibold text-sm md:text-base">
                  {dog.name}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {getAgeDisplay(dog)}
                </p>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  {dog.standardized_breed || dog.breed || "Mixed breed"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mini avatar bar and actions */}
      <div className="flex justify-between items-center border-t pt-4">
        <div className="flex items-center gap-2">
          {Array.from(selectedDogs).map((dogId) => {
            const dog = dogs.find((d) => d.id === dogId);
            if (!dog) return null;
            const imageUrl = dog.primary_image_url || dog.main_image;

            return (
              <div key={dogId} className="relative">
                {imageUrl ? (
                  <div className="w-8 h-8 relative rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm">
                    <Image
                      src={imageUrl}
                      alt={dog.name}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 shadow-sm flex items-center justify-center">
                    <DogIcon size={16} className="text-gray-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCompare}
            disabled={selectedDogs.size < 2}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Compare {selectedDogs.size > 0 ? `(${selectedDogs.size})` : "Dogs"}
          </Button>
        </div>
      </div>
    </>
  );

  // Helper functions for extracting data from properties
  const getPersonalityTraits = (dog: Dog): string[] => {
    // First check dog_profiler_data for personality traits
    if (dog.dog_profiler_data?.personality_traits) {
      return dog.dog_profiler_data.personality_traits;
    }
    // Fallback to properties
    if (!dog.properties?.personality) return [];
    // Split personality string by common delimiters
    return dog.properties.personality
      .split(/[,;]/)
      .map((trait) => trait.trim())
      .filter((trait) => trait.length > 0);
  };

  const getPersonalityTraitColor = (trait: string): string => {
    const traitLower = trait.toLowerCase();
    if (
      ["friendly", "affectionate", "loving", "gentle"].some((t) =>
        traitLower.includes(t),
      )
    ) {
      return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300";
    }
    if (
      ["playful", "energetic", "active", "lively"].some((t) =>
        traitLower.includes(t),
      )
    ) {
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300";
    }
    if (
      ["calm", "relaxed", "quiet", "mellow"].some((t) => traitLower.includes(t))
    ) {
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
    }
    if (
      ["smart", "intelligent", "clever", "trainable"].some((t) =>
        traitLower.includes(t),
      )
    ) {
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300";
    }
    if (
      ["loyal", "devoted", "protective"].some((t) => traitLower.includes(t))
    ) {
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
    }
    if (
      ["independent", "confident", "brave"].some((t) => traitLower.includes(t))
    ) {
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
    }
    return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  };

  const getEnergyLevelIcon = (level?: string) => {
    switch (level) {
      case "low":
        return <Activity className="w-4 h-4 text-gray-400" />;
      case "medium":
        return <Activity className="w-4 h-4 text-orange-500" />;
      case "high":
        return <Zap className="w-4 h-4 text-yellow-500" />;
      case "very_high":
        return <Zap className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getExperienceLevelIcon = (level?: string) => {
    switch (level) {
      case "first_time_ok":
        return <Shield className="w-4 h-4 text-green-500" />;
      case "some_experience":
        return <Shield className="w-4 h-4 text-yellow-500" />;
      case "experienced_only":
        return <Shield className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const formatEnergyLevel = (level?: string): string => {
    if (!level) return "Unknown";
    return level.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const formatExperienceLevel = (level?: string): string => {
    switch (level) {
      case "first_time_ok":
        return "Beginner Friendly";
      case "some_experience":
        return "Some Experience";
      case "experienced_only":
        return "Experienced Only";
      default:
        return "Unknown";
    }
  };

  const getCompatibility = (
    dog: Dog,
  ): { dogs?: string; cats?: string; children?: string } => {
    const compatibility: { dogs?: string; cats?: string; children?: string } =
      {};

    // First check dog_profiler_data for more detailed compatibility info
    if (dog.dog_profiler_data) {
      compatibility.dogs = dog.dog_profiler_data.good_with_dogs || "unknown";
      compatibility.cats = dog.dog_profiler_data.good_with_cats || "unknown";
      compatibility.children =
        dog.dog_profiler_data.good_with_children || "unknown";
    } else {
      // Fallback to properties data
      if (dog.properties?.good_with_list) {
        compatibility.dogs = dog.properties.good_with_list.includes("dogs")
          ? "yes"
          : "no";
        compatibility.cats = dog.properties.good_with_list.includes("cats")
          ? "yes"
          : "no";
        compatibility.children = dog.properties.good_with_list.includes(
          "children",
        )
          ? "yes"
          : "no";
      } else if (dog.properties?.good_with) {
        const goodWith = dog.properties.good_with.toLowerCase();
        compatibility.dogs = goodWith.includes("dog") ? "yes" : "unknown";
        compatibility.cats = goodWith.includes("cat") ? "yes" : "unknown";
        compatibility.children = goodWith.includes("child") ? "yes" : "unknown";
      } else {
        compatibility.dogs =
          dog.properties?.good_with_dogs === true ||
          dog.properties?.good_with_dogs === "yes"
            ? "yes"
            : "unknown";
        compatibility.cats =
          dog.properties?.good_with_cats === true ||
          dog.properties?.good_with_cats === "yes"
            ? "yes"
            : "unknown";
        compatibility.children =
          dog.properties?.good_with_children === true ||
          dog.properties?.good_with_children === "yes"
            ? "yes"
            : "unknown";
      }
    }

    return compatibility;
  };

  const getCompatibilityIcon = (status?: string) => {
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
  };

  const getAgeDisplay = (dog: Dog): string => {
    if (dog.age_text) return dog.age_text;
    if (dog.age_min_months && dog.age_max_months) {
      const minYears = Math.floor(dog.age_min_months / 12);
      const maxYears = Math.floor(dog.age_max_months / 12);
      if (minYears === maxYears) {
        return `${minYears} year${minYears !== 1 ? "s" : ""}`;
      }
      return `${minYears}-${maxYears} years`;
    }
    if (dog.age_months) {
      const years = Math.floor(dog.age_months / 12);
      const months = dog.age_months % 12;
      if (years > 0) {
        return `${years} year${years !== 1 ? "s" : ""}${months > 0 ? ` ${months} mo` : ""}`;
      }
      return `${months} month${months !== 1 ? "s" : ""}`;
    }
    return "Age unknown";
  };

  const renderComparisonView = () => {
    const dogsToCompare = getSelectedDogData();
    const comparisonData = analyzeComparison(dogsToCompare as AnalyzerDog[]);

    if (isMobile) {
      // Mobile view - Enhanced card layout
      return (
        <>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold">Compare Dogs</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Swipe to compare your favorites
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

          {/* Mobile Enhanced Comparison Cards */}
          <div className="space-y-4 mb-4">
            {dogsToCompare.map((dog, index) => {
              const imageUrl = dog.primary_image_url || dog.main_image;
              const compatibility = getCompatibility(dog);
              const personalityTraits = getPersonalityTraits(dog);
              const tagline = dog.dog_profiler_data?.tagline;
              const uniqueQuirk = dog.dog_profiler_data?.unique_quirk;
              const energyLevel = dog.dog_profiler_data?.energy_level;
              const experienceLevel = dog.dog_profiler_data?.experience_level;

              return (
                <div
                  key={dog.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
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
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{dog.name}</h3>
                        {tagline && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-1">
                            &ldquo;{tagline}&rdquo;
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <span className="text-gray-600 dark:text-gray-400">
                            {dog.standardized_breed ||
                              dog.breed ||
                              "Mixed breed"}
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
                            className={`px-2 py-1 rounded-full text-xs ${getPersonalityTraitColor(trait)}`}
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Attributes */}
                  <div className="px-4 py-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Size:
                      </span>
                      <span className="ml-2 font-medium">
                        {dog.standardized_size || dog.size || "Unknown"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Sex:
                      </span>
                      <span className="ml-2 font-medium">
                        {dog.sex || "Unknown"}
                      </span>
                    </div>
                    {energyLevel && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600 dark:text-gray-400">
                          Energy:
                        </span>
                        <span className="ml-2 font-medium flex items-center gap-1">
                          {getEnergyLevelIcon(energyLevel)}
                          {formatEnergyLevel(energyLevel)}
                        </span>
                      </div>
                    )}
                    {experienceLevel && (
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600 dark:text-gray-400">
                          Experience:
                        </span>
                        <span className="ml-2 font-medium flex items-center gap-1">
                          {getExperienceLevelIcon(experienceLevel)}
                          {formatExperienceLevel(experienceLevel)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Compatibility Matrix */}
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

                  {/* Unique Quirk */}
                  {uniqueQuirk && (
                    <div className="px-4 py-3 bg-orange-50 dark:bg-orange-900/10">
                      <div className="flex items-center gap-1 text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                        <Sparkles size={12} />
                        Unique Quirk
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        {uniqueQuirk}
                      </p>
                    </div>
                  )}

                  {/* Organization & CTA */}
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {dog.organization_name || dog.organization?.name}
                      </div>
                      {dog.adoption_url && (
                        <a
                          href={dog.adoption_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-medium text-orange-600 hover:text-orange-700"
                        >
                          Visit {dog.name} →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile Footer */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Swipe through {dogsToCompare.length} dogs •{" "}
            {comparisonData.organization?.allSame
              ? "Same organization"
              : "Multiple organizations"}
          </div>
        </>
      );
    }

    // Desktop view - Cards + Table
    return (
      <>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Compare Your Favorites</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Side-by-side comparison to help you decide
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Desktop Enhanced Dog Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {dogsToCompare.map((dog) => {
            const imageUrl = dog.primary_image_url || dog.main_image;
            const orgName = dog.organization_name || dog.organization?.name;
            const location =
              dog.location ||
              dog.properties?.location ||
              dog.organization?.country ||
              "Unknown";
            const description =
              dog.dog_profiler_data?.description ||
              dog.properties?.description ||
              dog.description;
            const tagline = dog.dog_profiler_data?.tagline;
            const uniqueQuirk = dog.dog_profiler_data?.unique_quirk;
            const personalityTraits = getPersonalityTraits(dog);
            const compatibility = getCompatibility(dog);
            const energyLevel = dog.dog_profiler_data?.energy_level;
            const experienceLevel = dog.dog_profiler_data?.experience_level;

            return (
              <div
                key={dog.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="flex p-4">
                  {imageUrl && (
                    <div className="w-24 h-24 relative rounded-lg overflow-hidden mr-4 flex-shrink-0">
                      <Image
                        src={imageUrl}
                        alt={dog.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold">{dog.name}</h3>
                      <Heart className="w-5 h-5 text-red-500 fill-current" />
                    </div>
                    {tagline && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-2">
                        &ldquo;{tagline}&rdquo;
                      </p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {dog.standardized_breed || dog.breed || "Mixed Breed"}
                    </p>
                    <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>
                          {getAgeDisplay(dog)} • {dog.sex}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Ruler size={12} />
                        <span>
                          {dog.standardized_size || dog.size || "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  {/* Personality Traits */}
                  {personalityTraits.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {personalityTraits.slice(0, 5).map((trait, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-1 rounded-full text-xs ${getPersonalityTraitColor(trait)}`}
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Energy & Experience Levels */}
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    {energyLevel && (
                      <div className="flex items-center gap-1">
                        {getEnergyLevelIcon(energyLevel)}
                        <span className="text-gray-600 dark:text-gray-400">
                          {formatEnergyLevel(energyLevel)}
                        </span>
                      </div>
                    )}
                    {experienceLevel && (
                      <div className="flex items-center gap-1">
                        {getExperienceLevelIcon(experienceLevel)}
                        <span className="text-gray-600 dark:text-gray-400">
                          {formatExperienceLevel(experienceLevel)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Compatibility Matrix */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                      Compatibility
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex items-center gap-1">
                        <DogIcon size={14} className="text-gray-400" />
                        {getCompatibilityIcon(compatibility.dogs)}
                        <span className="text-xs">Dogs</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Cat size={14} className="text-gray-400" />
                        {getCompatibilityIcon(compatibility.cats)}
                        <span className="text-xs">Cats</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Baby size={14} className="text-gray-400" />
                        {getCompatibilityIcon(compatibility.children)}
                        <span className="text-xs">Kids</span>
                      </div>
                    </div>
                  </div>

                  {/* Unique Quirk */}
                  {uniqueQuirk && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/10 rounded-lg p-2 mb-3">
                      <div className="flex items-center gap-1 text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                        <Sparkles size={12} />
                        Special Quality
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        {uniqueQuirk}
                      </p>
                    </div>
                  )}

                  {description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                      {description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                        {orgName}
                      </div>
                    </div>
                    {dog.adoption_url ? (
                      <a
                        href={dog.adoption_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-8 px-3 text-sm font-medium rounded-md bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                      >
                        Visit {dog.name}
                      </a>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                        disabled
                      >
                        Visit {dog.name}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Enhanced Comparison Table */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Detailed Comparison
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                    Attribute
                  </th>
                  {dogsToCompare.map((dog) => (
                    <th
                      key={dog.id}
                      className="text-center py-2 px-3 font-medium"
                    >
                      {dog.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {/* Tagline Row */}
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Tagline
                  </td>
                  {dogsToCompare.map((dog) => (
                    <td key={dog.id} className="py-2 px-3 text-center">
                      {dog.dog_profiler_data?.tagline ? (
                        <span className="text-xs italic text-gray-600 dark:text-gray-400">
                          &ldquo;{dog.dog_profiler_data.tagline}&rdquo;
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* Energy Level Row */}
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Energy Level
                  </td>
                  {dogsToCompare.map((dog) => (
                    <td key={dog.id} className="py-2 px-3 text-center">
                      {dog.dog_profiler_data?.energy_level ? (
                        <span className="flex items-center justify-center gap-1">
                          {getEnergyLevelIcon(
                            dog.dog_profiler_data.energy_level,
                          )}
                          {formatEnergyLevel(
                            dog.dog_profiler_data.energy_level,
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* Experience Level Row */}
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Experience Needed
                  </td>
                  {dogsToCompare.map((dog) => (
                    <td key={dog.id} className="py-2 px-3 text-center">
                      {dog.dog_profiler_data?.experience_level ? (
                        <span className="flex items-center justify-center gap-1">
                          {getExperienceLevelIcon(
                            dog.dog_profiler_data.experience_level,
                          )}
                          {formatExperienceLevel(
                            dog.dog_profiler_data.experience_level,
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Age
                  </td>
                  {comparisonData.age?.values.map((value, idx) => (
                    <td
                      key={idx}
                      className={`py-2 px-3 text-center ${
                        comparisonData.age.highlight[idx]
                          ? "text-orange-600 dark:text-orange-400 font-semibold"
                          : comparisonData.age.allSame
                            ? "text-gray-400 dark:text-gray-500"
                            : ""
                      }`}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Size
                  </td>
                  {comparisonData.size?.values.map((value, idx) => (
                    <td
                      key={idx}
                      className={`py-2 px-3 text-center ${
                        comparisonData.size.allSame
                          ? "text-gray-400 dark:text-gray-500"
                          : ""
                      }`}
                    >
                      {value || "Unknown"}
                    </td>
                  ))}
                </tr>
                {/* Enhanced Compatibility Row */}
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Good with Dogs
                  </td>
                  {dogsToCompare.map((dog) => {
                    const compatibility = getCompatibility(dog);
                    return (
                      <td key={dog.id} className="py-2 px-3 text-center">
                        <span className="flex items-center justify-center gap-1">
                          {getCompatibilityIcon(compatibility.dogs)}
                          <span className="text-xs">
                            {compatibility.dogs === "yes" && "Yes"}
                            {compatibility.dogs === "no" && "No"}
                            {compatibility.dogs === "maybe" && "Maybe"}
                            {compatibility.dogs === "unknown" && "Unknown"}
                          </span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Good with Cats
                  </td>
                  {dogsToCompare.map((dog) => {
                    const compatibility = getCompatibility(dog);
                    return (
                      <td key={dog.id} className="py-2 px-3 text-center">
                        <span className="flex items-center justify-center gap-1">
                          {getCompatibilityIcon(compatibility.cats)}
                          <span className="text-xs">
                            {compatibility.cats === "yes" && "Yes"}
                            {compatibility.cats === "no" && "No"}
                            {compatibility.cats === "maybe" && "Maybe"}
                            {compatibility.cats === "unknown" && "Unknown"}
                          </span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Good with Kids
                  </td>
                  {dogsToCompare.map((dog) => {
                    const compatibility = getCompatibility(dog);
                    return (
                      <td key={dog.id} className="py-2 px-3 text-center">
                        <span className="flex items-center justify-center gap-1">
                          {getCompatibilityIcon(compatibility.children)}
                          <span className="text-xs">
                            {compatibility.children === "yes" && "Yes"}
                            {compatibility.children === "no" && "No"}
                            {compatibility.children === "maybe" && "Maybe"}
                            {compatibility.children === "unknown" && "Unknown"}
                          </span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Organization
                  </td>
                  {comparisonData.organization?.values.map((value, idx) => (
                    <td
                      key={idx}
                      className="py-2 px-3 text-center text-gray-600 dark:text-gray-400"
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Comparing {dogsToCompare.length} dogs •{" "}
          {comparisonData.organization?.allSame
            ? "1 organization"
            : "Multiple organizations"}
        </div>
      </>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${
          isMobile ? "w-full h-full" : "w-full max-w-6xl max-h-[90vh]"
        } overflow-auto`}
        role="dialog"
        aria-label="Compare dogs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {dogs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                Select 2-3 dogs to compare
              </p>
              <Button variant="outline" onClick={onClose} className="mt-4">
                Close
              </Button>
            </div>
          ) : isComparing ? (
            renderComparisonView()
          ) : (
            renderSelectionView()
          )}
        </div>
      </div>
    </div>
  );
}
