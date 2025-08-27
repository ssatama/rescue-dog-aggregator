"use client";

import React from "react";
import { Sparkles, Shield } from "lucide-react";
import type { Dog } from "./types";
import {
  getEnergyIcon,
  DogHeader,
  CompatibilitySection,
} from "./CompareCardSections";
import {
  getCompatibilityScore,
  formatEnergyLevel,
  formatExperienceLevel,
  getLifestyleMatches,
} from "./compareCardUtils";

interface CompareCardProps {
  dog: Dog;
}

export default function CompareCard({ dog }: CompareCardProps) {
  const profilerData = dog.dog_profiler_data;
  const tagline = profilerData?.tagline;
  const personalityTraits = profilerData?.personality_traits || [];
  const uniqueQuirk = profilerData?.unique_quirk;
  const energyLevel = profilerData?.energy_level;
  const experienceLevel = profilerData?.experience_level;

  const dogsScore = getCompatibilityScore(profilerData?.good_with_dogs);
  const catsScore = getCompatibilityScore(profilerData?.good_with_cats);
  const childrenScore = getCompatibilityScore(profilerData?.good_with_children);

  const lifestyleMatches = getLifestyleMatches(dog);

  // Get background tint based on energy level
  const getEnergyBackgroundTint = (level: string | undefined) => {
    const levelValue = level?.toLowerCase();
    if (levelValue?.includes("high") || levelValue?.includes("very_high")) {
      return "bg-green-50 dark:bg-green-900/10";
    } else if (levelValue?.includes("medium") || levelValue?.includes("moderate")) {
      return "bg-yellow-50 dark:bg-yellow-900/10";
    } else if (levelValue?.includes("low") || levelValue?.includes("minimal")) {
      return "bg-orange-50 dark:bg-orange-900/10";
    }
    return "bg-gray-50 dark:bg-gray-800";
  };

  return (
    <div
      data-testid="compare-card"
      className="rounded-lg border shadow-sm bg-white dark:bg-gray-800 overflow-hidden h-full transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 content-fade-in"
      style={{
        display: "grid",
        gridTemplateRows:
          "auto minmax(3rem, auto) minmax(4rem, auto) minmax(3rem, auto) auto minmax(3rem, auto) minmax(4rem, auto) auto",
        gridTemplateColumns: "1fr",
      }}
    >
      {/* Header with Image and Name - includes tagline */}
      <DogHeader dog={dog} tagline={tagline} />

      {/* Personality Traits - always show container with visual hierarchy */}
      <div className="px-4 pb-3 min-h-[4rem] gap-4" data-testid="personality-section">
        {personalityTraits.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {personalityTraits.slice(0, 2).map((trait, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200 rounded-full text-sm font-semibold shadow-sm"
              >
                {trait}
              </span>
            ))}
            {personalityTraits.slice(2, 4).map((trait, idx) => (
              <span
                key={idx + 2}
                className="px-2 py-1 bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400 rounded-full text-xs font-medium"
              >
                {trait}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-400 italic">
            No personality data
          </div>
        )}
      </div>

      {/* Energy & Experience - with background tint and more spacing */}
      <div
        className={`px-4 pb-3 flex gap-4 text-sm min-h-[3rem] ${getEnergyBackgroundTint(energyLevel)} gap-6`}
        data-testid="energy-section"
      >
        <div className="flex items-center gap-1">
          {getEnergyIcon(energyLevel)}
          <span className="font-medium">{formatEnergyLevel(energyLevel)}</span>
        </div>
        {experienceLevel && (
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="font-medium">
              {formatExperienceLevel(experienceLevel)}
            </span>
          </div>
        )}
      </div>

      {/* Compatibility Scores - always show */}
      <CompatibilitySection
        dogsScore={dogsScore}
        catsScore={catsScore}
        childrenScore={childrenScore}
      />

      {/* Perfect For Section - always show container with more spacing */}
      <div className="px-4 pb-3 min-h-[3rem] gap-6" data-testid="perfect-for-section">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Perfect for:
        </div>
        {lifestyleMatches.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {lifestyleMatches.map((match, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full text-xs"
              >
                {match}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-400 italic">
            No specific matches identified
          </div>
        )}
      </div>

      {/* Unique Quirk - always show container with more spacing */}
      <div
        className="px-4 pb-3 bg-orange-50 dark:bg-orange-900/10 min-h-[4rem] gap-6"
        data-testid="unique-quirk-section"
      >
        <div className="flex items-center gap-1 text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
          <Sparkles size={14} />
          <span>What makes {dog.name} special</span>
        </div>
        {uniqueQuirk ? (
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {uniqueQuirk}
          </p>
        ) : (
          <p className="text-sm text-gray-400 italic">
            Every dog is special in their own way
          </p>
        )}
      </div>

      {/* Footer with CTA - remove redundant organization name display */}
      <div
        className="px-4 py-3 border-t border-gray-200 dark:border-gray-700"
        data-testid="footer-section"
      >
        <div className="flex items-center justify-center">
          {dog.adoption_url ? (
            <a
              href={dog.adoption_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              Visit {dog.name} →
            </a>
          ) : (
            <span className="text-sm text-gray-400">Contact organization</span>
          )}
        </div>
      </div>
    </div>
  );
}
