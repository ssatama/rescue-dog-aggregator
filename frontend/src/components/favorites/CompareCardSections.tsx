"use client";

import React from "react";
import Image from "next/image";
import {
  Dog as DogIcon,
  Cat,
  Baby,
  Zap,
  Battery,
  BatteryLow,
  Heart,
} from "lucide-react";
import type { Dog } from "./types";

export function getEnergyIcon(level: string | undefined) {
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

export function CompatibilityPaws({ score }: { score: number }) {
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

interface DogHeaderProps {
  dog: Dog;
  tagline?: string;
}

export function DogHeader({ dog, tagline }: DogHeaderProps) {
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
      
      {tagline && (
        <div className="mt-3">
          <p className="text-base font-semibold text-gray-800 dark:text-gray-200 italic">
            "{tagline}"
          </p>
        </div>
      )}
    </div>
  );
}

interface CompatibilitySectionProps {
  dogsScore: number;
  catsScore: number;
  childrenScore: number;
}

export function CompatibilitySection({ dogsScore, catsScore, childrenScore }: CompatibilitySectionProps) {
  return (
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
  );
}