"use client";

import React, { useMemo } from "react";
import MobileTopHeader from "./MobileTopHeader";
import MobileNavCards from "./MobileNavCards";
import MobileStats from "./MobileStats";
import { MobileAvailableNow } from "./MobileAvailableNow";
import { MobileBreedSpotlight } from "./MobileBreedSpotlight";
import MobileBottomNav from "../navigation/MobileBottomNav";

interface Dog {
  id: number | string;
  name: string;
  breed?: string;
  [key: string]: any;
}

interface Statistics {
  totalDogs?: number;
  totalOrganizations?: number;
  totalBreeds?: number;
}

interface FeaturedBreed {
  name: string;
  slug?: string;
  description?: string;
  availableCount?: number;
  imageUrl?: string;
}

interface InitialData {
  dogs?: Dog[];
  statistics?: Statistics;
  featuredBreed?: FeaturedBreed;
  breedStats?: any;
}

interface MobileHomePageProps {
  initialData?: InitialData;
}

// Helper function to get random breeds
const getRandomBreeds = (breedStats: any, count: number = 3): FeaturedBreed[] => {
  if (!breedStats?.qualifying_breeds || !Array.isArray(breedStats.qualifying_breeds)) {
    return [];
  }

  const qualifyingBreeds = breedStats.qualifying_breeds;
  const shuffled = [...qualifyingBreeds].sort(() => 0.5 - Math.random());
  
  return shuffled.slice(0, count).map((breed: any) => ({
    name: breed.name || breed.breed_name,
    slug: breed.slug || breed.name?.toLowerCase().replace(/\s+/g, '-'),
    description: breed.description || `Discover wonderful ${breed.name || breed.breed_name}s looking for their forever homes.`,
    availableCount: breed.count || breed.available_count || 0,
    imageUrl: breed.image_url || breed.imageUrl || null,
  }));
};

export const MobileHomePage: React.FC<MobileHomePageProps> = ({
  initialData,
}) => {
  // Get 3 random breeds for the carousel
  const randomBreeds = useMemo(
    () => getRandomBreeds(initialData?.breedStats, 3),
    [initialData?.breedStats]
  );

  return (
    <div
      data-testid="mobile-home-page"
      className="md:hidden min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 overflow-x-hidden"
    >
      {/* Sticky header */}
      <MobileTopHeader />

      {/* Main content */}
      <main className="relative">
        {/* Breed spotlight carousel - moved above navigation cards */}
        <MobileBreedSpotlight breeds={randomBreeds} />

        {/* Navigation cards */}
        <MobileNavCards />

        {/* Statistics */}
        <MobileStats
          statistics={
            initialData?.statistics
              ? {
                  total_dogs: initialData.statistics.totalDogs || 0,
                  total_organizations:
                    initialData.statistics.totalOrganizations || 0,
                  total_breeds: initialData.statistics.totalBreeds || 0,
                }
              : null
          }
        />

        {/* Available dogs section - now called "Recently Added" */}
        <MobileAvailableNow
          dogs={initialData?.dogs || []}
          totalCount={initialData?.statistics?.totalDogs}
        />
      </main>

      {/* Bottom navigation */}
      <MobileBottomNav />
    </div>
  );
};