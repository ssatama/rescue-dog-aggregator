"use client";

import React from "react";
import Image from "next/image";
import {
  Dog as DogIcon,
  Cat,
  Baby,
  Sparkles,
  Zap,
  Battery,
  BatteryLow,
  Shield,
  Heart,
  Star,
} from "lucide-react";
import type { Dog } from "./types";

interface CompareCardProps {
  dog: Dog;
}

function getCompatibilityScore(value: string | boolean | undefined): number {
  if (value === true || value === "yes") return 5;
  if (value === "maybe") return 3;
  if (value === false || value === "no") return 1;
  return 0;
}

function getEnergyIcon(level: string | undefined) {
  switch (level) {
    case "very_high":
    case "high":
      return <Zap className="w-4 h-4 text-orange-500" data-testid="energy-icon-high" />;
    case "medium":
    case "moderate":
      return <Battery className="w-4 h-4 text-yellow-500" data-testid="energy-icon-medium" />;
    case "low":
    case "minimal":
      return <BatteryLow className="w-4 h-4 text-green-500" data-testid="energy-icon-low" />;
    default:
      return null;
  }
}

function formatEnergyLevel(level: string | undefined): string {
  switch (level) {
    case "very_high":
      return "Very High Energy";
    case "high":
      return "High Energy";
    case "medium":
    case "moderate":
      return "Moderate Energy";
    case "low":
    case "minimal":
      return "Low Energy";
    default:
      return "Energy Unknown";
  }
}

function formatExperienceLevel(level: string | undefined): string {
  switch (level) {
    case "beginner_friendly":
      return "Beginner Friendly";
    case "some_experience_needed":
      return "Some Experience Needed";
    case "experienced_only":
      return "Experienced Only";
    default:
      return "";
  }
}

function getLifestyleMatches(dog: Dog): string[] {
  const matches: string[] = [];
  const energy = dog.dog_profiler_data?.energy_level;
  const size = dog.standardized_size || dog.size || dog.dog_profiler_data?.standardized_size;
  
  if (energy === "low" || energy === "minimal") {
    if (!size || size === "Small" || size === "Medium") {
      matches.push("Apartment living");
    }
    matches.push("Seniors");
  }
  
  if (energy === "high" || energy === "very_high") {
    matches.push("Active families");
    matches.push("Runners");
  }
  
  if (dog.dog_profiler_data?.good_with_children === "yes") {
    matches.push("Families with kids");
  }
  
  if (dog.dog_profiler_data?.experience_level === "beginner_friendly") {
    matches.push("First-time owners");
  }
  
  return matches.slice(0, 3);
}

function CompatibilityPaws({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((paw) => (
        <Heart
          key={paw}
          size={12}
          className={
            paw <= score
              ? "fill-orange-500 text-orange-500"
              : "fill-gray-200 text-gray-200"
          }
        />
      ))}
    </div>
  );
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
  const imageUrl = dog.main_image || dog.primary_image_url;
  
  const getAgeDisplay = () => {
    if (dog.age_text) return dog.age_text;
    if (dog.age_min_months && dog.age_max_months) {
      const minYears = Math.floor(dog.age_min_months / 12);
      const maxYears = Math.floor(dog.age_max_months / 12);
      return `${minYears}-${maxYears} years`;
    }
    if (dog.age_months) {
      const years = Math.floor(dog.age_months / 12);
      return `${years} year${years !== 1 ? "s" : ""}`;
    }
    return "Unknown age";
  };

  return (
    <div className="rounded-lg border shadow-sm bg-white dark:bg-gray-800 overflow-hidden">
      {/* Header with Image and Name */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {imageUrl ? (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src={imageUrl}
                alt={dog.name}
                fill={true}
                className="object-cover"
                sizes="80px"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
              <DogIcon size={32} className="text-gray-400" data-testid="dog-placeholder-icon" />
            </div>
          )}
          
          <div className="flex-1">
            <h3 className="text-xl font-bold">{dog.name}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {dog.standardized_breed || dog.breed || "Mixed breed"} • {getAgeDisplay()}
            </p>
            {dog.sex && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{dog.sex}</p>
            )}
          </div>
        </div>
        
        {/* Prominent Tagline */}
        {tagline && (
          <div className="mt-3">
            <p className="text-base font-semibold text-gray-800 dark:text-gray-200 italic">
              "{tagline}"
            </p>
          </div>
        )}
      </div>
      
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
            <span className="font-medium">{formatEnergyLevel(energyLevel)}</span>
          </div>
        )}
        {experienceLevel && (
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{formatExperienceLevel(experienceLevel)}</span>
          </div>
        )}
      </div>
      
      {/* Compatibility Scores */}
      <div className="px-4 pb-3 border-t border-gray-200 dark:border-gray-700 pt-3">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Compatibility</div>
        <div className="grid grid-cols-3 gap-2">
          <div data-testid="compat-dogs" className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <DogIcon size={14} className="text-gray-500" />
              <span className="text-xs">Dogs</span>
            </div>
            <div data-testid="compat-dogs-score" data-score={dogsScore}>
              <CompatibilityPaws score={dogsScore} />
            </div>
          </div>
          
          <div data-testid="compat-cats" className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Cat size={14} className="text-gray-500" />
              <span className="text-xs">Cats</span>
            </div>
            <div data-testid="compat-cats-score" data-score={catsScore}>
              <CompatibilityPaws score={catsScore} />
            </div>
          </div>
          
          <div data-testid="compat-children" className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Baby size={14} className="text-gray-500" />
              <span className="text-xs">Kids</span>
            </div>
            <div data-testid="compat-children-score" data-score={childrenScore}>
              <CompatibilityPaws score={childrenScore} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Perfect For Section */}
      {lifestyleMatches.length > 0 && (
        <div className="px-4 pb-3">
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Perfect for:</div>
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
          <p className="text-sm text-gray-700 dark:text-gray-300">{uniqueQuirk}</p>
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