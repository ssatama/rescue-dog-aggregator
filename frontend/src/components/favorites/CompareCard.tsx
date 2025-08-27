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

  return (
    <div className="rounded-lg border shadow-sm bg-white dark:bg-gray-800 overflow-hidden">
      {/* Header with Image and Name */}
      <DogHeader dog={dog} tagline={tagline} />

      {/* Personality Traits */}
      {personalityTraits.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1">
            {personalityTraits.slice(0, 3).map((trait, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-full text-xs font-medium"
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Energy & Experience */}
      <div className="px-4 pb-3 flex gap-4 text-sm">
        {energyLevel && (
          <div className="flex items-center gap-1">
            {getEnergyIcon(energyLevel)}
            <span className="font-medium">
              {formatEnergyLevel(energyLevel)}
            </span>
          </div>
        )}
        {experienceLevel && (
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="font-medium">
              {formatExperienceLevel(experienceLevel)}
            </span>
          </div>
        )}
      </div>

      {/* Compatibility Scores */}
      <CompatibilitySection
        dogsScore={dogsScore}
        catsScore={catsScore}
        childrenScore={childrenScore}
      />

      {/* Perfect For Section */}
      {lifestyleMatches.length > 0 && (
        <div className="px-4 pb-3">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Perfect for:
          </div>
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
        </div>
      )}

      {/* Unique Quirk */}
      {uniqueQuirk && (
        <div className="px-4 pb-3 bg-orange-50 dark:bg-orange-900/10">
          <div className="flex items-center gap-1 text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
            <Sparkles size={14} />
            <span>What makes {dog.name} special</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {uniqueQuirk}
          </p>
        </div>
      )}

      {/* Footer with CTA */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {dog.organization_name || dog.organization?.name}
          </span>
          {dog.adoption_url && (
            <a
              href={dog.adoption_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              Visit {dog.name} →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
