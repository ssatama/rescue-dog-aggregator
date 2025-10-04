'use client';

import { useState, useEffect } from 'react';
import DogCardOptimizedComponent from '@/components/dogs/DogCardOptimized';
import DogCardSkeletonOptimized from '@/components/dogs/DogCardSkeletonOptimized';
import { getAnimals } from '@/services/serverAnimalsService';

// Cast to any to bypass TypeScript checks for .jsx component
const DogCardOptimized = DogCardOptimizedComponent as any;

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
  age?: string;

  // Location filters
  location_country?: string;
  available_to_country?: string;
  available_to_region?: string;

  // Organization filter
  organization_id?: number;

  // Status
  status?: 'available' | 'adopted' | 'pending' | 'all';

  // Display options
  limit?: number;
  caption?: string;
  layout?: 'grid' | 'carousel';
}

export function DogGrid({
  breed,
  standardized_breed,
  breed_group,
  primary_breed,
  breed_type,
  sex,
  size,
  age,
  location_country,
  available_to_country,
  available_to_region,
  organization_id,
  status = 'available',
  limit = 4,
  caption,
  layout = 'grid',
}: DogGridProps) {
  const [dogs, setDogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDogs() {
      try {
        setIsLoading(true);
        setError(null);

        const params: any = {
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
        if (age) params.age = age;
        if (location_country) params.location_country = location_country;
        if (available_to_country) params.available_to_country = available_to_country;
        if (available_to_region) params.available_to_region = available_to_region;
        if (organization_id) params.organization_id = organization_id;

        const data = await getAnimals(params);
        setDogs(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load dogs');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDogs();
  }, [breed, standardized_breed, breed_group, primary_breed, breed_type, sex, size, age, location_country, available_to_country, available_to_region, organization_id, status, limit]);

  if (isLoading) {
    return (
      <div className="my-8">
        {caption && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 italic">{caption}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <DogCardSkeletonOptimized key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-8 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-800 dark:text-red-200">
          Unable to load dogs. Please try again later.
        </p>
      </div>
    );
  }

  if (dogs.length === 0) {
    return (
      <div className="my-8 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-3">
          Currently no {breed || 'dogs'} available matching these criteria.
        </p>
        <a
          href={breed ? `/breeds/${breed}` : '/dogs'}
          className="text-orange-500 hover:underline"
        >
          Browse all {breed || 'available dogs'} →
        </a>
      </div>
    );
  }

  return (
    <div className="my-8">
      {caption && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 italic">
          {caption}
        </p>
      )}
      <div className={layout === 'grid'
        ? "grid grid-cols-1 md:grid-cols-2 gap-4"
        : "flex gap-4 overflow-x-auto"
      }>
        {dogs.map((dog, index) => (
          <DogCardOptimized
            key={dog.id}
            dog={dog}
            priority={index < 2}
            compact={layout === 'carousel'}
          />
        ))}
      </div>
    </div>
  );
}
