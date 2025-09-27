'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Dog, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface BreedData {
  name: string;
  description?: string;
  availableCount?: number;
  imageUrl?: string;
  slug?: string;
}

interface MobileBreedSpotlightProps {
  breed?: BreedData;
  loading?: boolean;
}

// Helper function to pluralize breed names
const getBreedPlural = (breedName: string): string => {
  // Handle special cases
  const specialCases: Record<string, string> = {
    'German Shepherd': 'German Shepherds',
    'Labrador Retriever': 'Labradors',
    'Golden Retriever': 'Golden Retrievers',
    'French Bulldog': 'French Bulldogs',
    'Yorkshire Terrier': 'Yorkies',
  };

  if (specialCases[breedName]) {
    return specialCases[breedName];
  }

  // For single word breeds, just add 's'
  const words = breedName.split(' ');
  if (words.length === 1) {
    if (breedName.endsWith('y')) {
      return breedName.slice(0, -1) + 'ies';
    }
    return breedName + 's';
  }

  // For multi-word breeds, pluralize the last word
  return breedName + 's';
};

export const MobileBreedSpotlight: React.FC<MobileBreedSpotlightProps> = ({
  breed,
  loading = false,
}) => {
  const router = useRouter();

  const handleExploreClick = () => {
    if (breed?.slug) {
      router.push(`/breeds/${breed.slug}`);
    } else {
      router.push('/breeds');
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <section
        className="px-4 py-6 md:hidden"
        aria-label="Breed spotlight"
        role="region"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Breed Spotlight
        </h2>
        <div 
          data-testid="breed-spotlight-skeleton"
          className="rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse h-48"
        />
      </section>
    );
  }

  // Empty/fallback state
  if (!breed) {
    return (
      <section
        className="px-4 py-6 md:hidden"
        aria-label="Breed spotlight"
        role="region"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Breed Spotlight
        </h2>
        <div 
          data-testid="breed-spotlight-card"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white p-6 shadow-xl motion-safe:animate-fadeInUp"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-4">
              <Dog className="w-16 h-16 text-white/80" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Discover Popular Breeds</h3>
            <p className="text-white/90 mb-4">
              Explore different dog breeds and find your perfect match
            </p>
            <button
              onClick={() => router.push('/breeds')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 text-gray-900 hover:bg-white transition-all duration-300 font-medium"
              aria-label="Explore all breeds"
            >
              Explore Breeds
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  const breedPlural = getBreedPlural(breed.name);

  return (
    <section
      className="px-4 py-6 md:hidden"
      aria-label="Breed spotlight"
      role="region"
    >
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
        Breed Spotlight
      </h2>
      
      <div 
        data-testid="breed-spotlight-card"
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 text-white shadow-xl motion-safe:animate-fadeInUp"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        
        {/* Sparkles decoration */}
        <Sparkles className="absolute top-4 right-4 w-6 h-6 text-white/30" data-testid="sparkles-icon" />
        
        <div className="relative z-10 p-6">
          <div className="flex gap-4">
            {/* Image or icon */}
            <div className="flex-shrink-0">
              {breed.imageUrl ? (
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm">
                  <Image
                    src={breed.imageUrl}
                    alt={breed.name}
                    width={80}
                    height={80}
                    className="object-cover w-full h-full"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <Dog className="w-10 h-10 text-white/80" data-testid="dog-icon" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-2xl font-bold">{breed.name}</h3>
                {breed.availableCount && breed.availableCount > 0 && (
                  <span className="px-2 py-1 text-xs font-semibold bg-white/20 backdrop-blur-sm rounded-full">
                    {breed.availableCount} available
                  </span>
                )}
              </div>

              {breed.description && (
                <p 
                  data-testid="breed-description"
                  className="text-white/90 text-sm mb-4 line-clamp-3"
                >
                  {breed.description}
                </p>
              )}

              <button
                onClick={handleExploreClick}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 text-gray-900 hover:bg-white transition-all duration-300 font-medium"
                aria-label={`Explore ${breedPlural}`}
              >
                Explore {breedPlural}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};