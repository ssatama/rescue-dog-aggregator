import React from "react";
import Image from "next/image";
import { PersonalityTraits } from "./PersonalityTraits";
import { EnergyIndicator } from "./EnergyIndicator";

interface SwipeCardProps {
  dog: {
    id?: number;
    name: string;
    breed?: string;
    age?: string;
    image?: string;
    organization?: string;
    location?: string;
    slug: string;
    description?: string;
    traits?: string[];
    energy_level?: number;
    special_characteristic?: string;
    quality_score?: number;
    created_at?: string;
  };
  isStacked?: boolean;
}

export function SwipeCard({ dog, isStacked = false }: SwipeCardProps) {
  const isNewDog = (createdAt?: string) => {
    if (!createdAt) return false;
    const daysSinceAdded =
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceAdded <= 7;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div
        className="relative aspect-video bg-gradient-to-br from-orange-400 to-orange-600"
        data-testid="image-container"
      >
        {isNewDog(dog.created_at) && (
          <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
            NEW
          </div>
        )}

        {dog.image ? (
          <Image
            src={dog.image}
            alt={dog.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white text-6xl">
            🐕
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h2 className="text-2xl font-bold">{dog.name}</h2>
            <p className="text-gray-600">
              {dog.breed && <span>{dog.breed}</span>}
              {dog.breed && dog.age && <span> • </span>}
              {dog.age && <span>{dog.age}</span>}
            </p>
          </div>
        </div>

        <div className="text-sm text-gray-500 mb-3">
          📍 {dog.organization}
          {dog.location && `, ${dog.location}`}
        </div>

        {dog.description && (
          <p className="text-gray-600 italic mb-4">
            &ldquo;{dog.description}&rdquo;
          </p>
        )}

        {dog.traits && dog.traits.length > 0 && (
          <div className="mb-4">
            <PersonalityTraits traits={dog.traits} />
          </div>
        )}

        {dog.energy_level !== undefined && (
          <div className="mb-3">
            <EnergyIndicator level={dog.energy_level} />
          </div>
        )}

        {dog.special_characteristic && (
          <div className="text-sm text-gray-600">
            🦴 {dog.special_characteristic}
          </div>
        )}
      </div>
    </div>
  );
}
