"use client";

import { useState, useEffect } from "react";
import DogCardOptimized from "@/components/dogs/DogCardOptimized";
import DogCardSkeletonOptimized from "@/components/dogs/DogCardSkeletonOptimized";
import { getAnimals } from "@/services/serverAnimalsService";
import type { Dog } from "@/types/dog";

interface AnimalApiParams {
  limit: number;
  status: string;
  breed?: string;
  standardized_breed?: string;
  breed_group?: string;
  primary_breed?: string;
  breed_type?: string;
  sex?: string;
  size?: string;
  age_category?: string;
  location_country?: string;
  available_to_country?: string;
  available_to_region?: string;
  organization_id?: number;
}

interface DogGridProps {
  // Breed filters
  breed?: string;
  standardized_breed?: string;
  breed_group?: string;
  primary_breed?: string;
  breed_type?: string;

  // Physical characteristics
  sex?: string;
  size?: string;
  age_category?: string;

  // Location filters
  location_country?: string;
  available_to_country?: string;
  available_to_region?: string;

  // Organization filter
  organization_id?: number;

  // Status
  status?: "available" | "adopted" | "pending" | "all";

  // Display options
  limit?: number;
  caption?: string;
  layout?: "grid" | "carousel";
  embedded?: boolean; // Compact mode for guide pages (default true)
}

export function DogGrid({
  breed,
  standardized_breed,
  breed_group,
  primary_breed,
  breed_type,
  sex,
  size,
  age_category,
  location_country,
  available_to_country,
  available_to_region,
  organization_id,
  status = "available",
  limit = 4,
  caption,
  layout = "grid",
  embedded = true, // Default to compact for guide pages
}: DogGridProps) {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDogs() {
      try {
        setIsLoading(true);
        setError(null);

        const params: AnimalApiParams = {
          limit,
          status,
        };

        // Add only defined parameters
        if (breed) params.breed = breed;
        if (standardized_breed) params.standardized_breed = standardized_breed;
        if (breed_group) params.breed_group = breed_group;
        if (primary_breed) params.primary_breed = primary_breed;
        if (breed_type) params.breed_type = breed_type;
        if (sex) params.sex = sex;
        if (size) params.size = size;
        if (age_category) params.age_category = age_category;
        if (location_country) params.location_country = location_country;
        if (available_to_country)
          params.available_to_country = available_to_country;
        if (available_to_region)
          params.available_to_region = available_to_region;
        if (organization_id) params.organization_id = organization_id;

        const data = await getAnimals(params);
        setDogs(data || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load dogs");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDogs();
  }, [
    breed,
    standardized_breed,
    breed_group,
    primary_breed,
    breed_type,
    sex,
    size,
    age_category,
    location_country,
    available_to_country,
    available_to_region,
    organization_id,
    status,
    limit,
  ]);

  if (isLoading) {
    return (
      <div className="my-8 not-prose">
        {caption && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 italic">
            {caption}
          </p>
        )}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 sm:gap-6">
          {Array.from({ length: limit }).map((_, i) => (
            <DogCardSkeletonOptimized key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-8 not-prose p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-800 dark:text-red-200">
          Unable to load dogs. Please try again later.
        </p>
      </div>
    );
  }

  if (dogs.length === 0) {
    return (
      <div className="my-8 not-prose p-6 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-3">
          Currently no {breed || "dogs"} available matching these criteria.
        </p>
        <a
          href={breed ? `/breeds/${breed}` : "/dogs"}
          className="text-orange-500 hover:underline"
        >
          Browse all {breed || "available dogs"} →
        </a>
      </div>
    );
  }

  return (
    <div className="my-8 not-prose">
      {caption && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 italic">
          {caption}
        </p>
      )}
      {layout === "grid" ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 sm:gap-6">
          {dogs.map((dog, index) => (
            <DogCardOptimized
              key={dog.id}
              dog={dog}
              priority={index < 2}
              compact={false}
              embedded={embedded}
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory -mx-4 px-4">
          {dogs.map((dog, index) => (
            <div
              key={dog.id}
              className="flex-none min-w-[260px] max-w-[360px] w-[80%] sm:w-[320px] snap-start"
            >
              <DogCardOptimized
                dog={dog}
                priority={index < 2}
                compact={true}
                embedded={embedded}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
