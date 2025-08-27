"use client";

import React from "react";
import Image from "next/image";
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
        {dogs.map((dog) => {
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
                    {dog.standardized_size || dog.size || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">Sex:</span>
                  <span className="ml-2 font-medium">{dog.sex || "-"}</span>
                </div>
                {energyLevel && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      Energy:
                    </span>
                    <span className="ml-2 font-medium">
                      {formatEnergyLevel(energyLevel)}
                    </span>
                  </div>
                )}
                {experienceLevel && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-600 dark:text-gray-400">
                      Experience:
                    </span>
                    <span className="ml-2 font-medium">
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
        Swipe through {dogs.length} dogs •{" "}
        {comparisonData.organization?.allSame
          ? "Same organization"
          : "Multiple organizations"}
      </div>
    </>
  );
}
