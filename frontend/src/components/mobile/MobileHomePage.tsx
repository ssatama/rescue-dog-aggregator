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
  primary_breed?: string;
  standardized_breed?: string;
  age?: string;
  age_text?: string;
  sex?: string;
  primary_image_url?: string;
  main_image?: string;
  photos?: string[];
  organization?: {
    id: number;
    name: string;
    config_id: string;
    slug?: string;
  };
  personality_traits?: string[];
  dog_profiler_data?: {
    description?: string;
    tagline?: string;
    personality_traits?: string[];
  };
  created_at?: string;
  slug?: string;
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

interface BreedStatsItem {
  name?: string;
  breed_name?: string;
  slug?: string;
  description?: string;
  count?: number;
  available_count?: number;
  image_url?: string;
  imageUrl?: string;
}

interface BreedStats {
  qualifying_breeds?: BreedStatsItem[];
  total_breeds?: number;
}

interface InitialData {
  dogs?: Dog[];
  statistics?: Statistics;
  featuredBreed?: FeaturedBreed;
  breedStats?: BreedStats;
}

interface MobileHomePageProps {
  initialData?: InitialData;
}

// Helper function to get random breeds
const getRandomBreeds = (
  breedStats: BreedStats | undefined,
  count: number = 3,
): FeaturedBreed[] => {
  if (
    !breedStats?.qualifying_breeds ||
    !Array.isArray(breedStats.qualifying_breeds)
  ) {
    return [];
  }

  const qualifyingBreeds = breedStats.qualifying_breeds;
  const shuffled = [...qualifyingBreeds].sort(() => 0.5 - Math.random());

  return shuffled.slice(0, count).map((breed) => ({
    name: breed.name || breed.breed_name || '',
    slug: breed.slug || breed.name?.toLowerCase().replace(/\s+/g, "-"),
    description:
      breed.description ||
      `Discover wonderful ${breed.name || breed.breed_name}s looking for their forever homes.`,
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
    [initialData?.breedStats],
  );

  // Format breed count
  const breedCount = initialData?.statistics?.totalBreeds 
    ? initialData.statistics.totalBreeds.toString() + "+"
    : initialData?.breedStats?.total_breeds 
    ? initialData.breedStats.total_breeds.toString() + "+"
    : "50+";

  return (
    <div
      data-testid="mobile-home-page"
      className="min-h-screen bg-[#FFF4ED] dark:bg-gray-900 pb-16 md:hidden overflow-x-hidden"
    >
      {/* Sticky header */}
      <MobileTopHeader />

      {/* Main content */}
      <main className="relative">
        {/* Navigation cards */}
        <MobileNavCards />

        {/* Stats */}
        <MobileStats
          stats={[
            {
              label: "Dogs",
              value:
                initialData?.statistics?.totalDogs?.toLocaleString() || "0",
            },
            {
              label: "Rescues", 
              value:
                initialData?.statistics?.totalOrganizations?.toLocaleString() || "0",
            },
            { label: "Breeds", value: breedCount },
          ]}
        />

        {/* Breed Spotlight Carousel */}
        <MobileBreedSpotlight breeds={randomBreeds} />

        {/* Available Now */}
        <MobileAvailableNow
          dogs={initialData?.dogs}
          totalCount={initialData?.statistics?.totalDogs}
        />
      </main>

      {/* Bottom navigation */}
      <MobileBottomNav />
    </div>
  );
};