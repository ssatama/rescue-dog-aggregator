"use client";

import React, { useMemo } from "react";
import MobileTopHeader from "./MobileTopHeader";
import MobileNavCards from "./MobileNavCards";
import MobileStats from "./MobileStats";
import { MobileAvailableNow } from "./MobileAvailableNow";
import { MobileBreedSpotlight } from "./MobileBreedSpotlight";
import MobileBottomNav from "../navigation/MobileBottomNav";
import { MobileHomeSEO } from "../seo/MobileHomeSEO";
import { type Dog } from "../../types/dog";

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
const getRandomBreeds = (breedStats: any, count: number = 3) => {
  if (!breedStats?.breeds?.length) return [];

  // Filter breeds with good data
  const qualifyingBreeds = breedStats.breeds.filter((breed: any) => {
    return (
      breed.count > 0 &&
      (breed.name || breed.breed_name) &&
      (breed.image_url || breed.imageUrl)
    );
  });

  if (qualifyingBreeds.length === 0) return [];

  // Shuffle and take requested count
  const shuffled = [...qualifyingBreeds].sort(() => 0.5 - Math.random());

  return shuffled.slice(0, count).map((breed) => ({
    name: breed.name || breed.breed_name || "",
    slug: breed.slug || breed.name?.toLowerCase().replace(/\s+/g, "-"),
    description:
      breed.description ||
      `Discover wonderful ${breed.name || breed.breed_name}s looking for their forever homes.`,
    availableCount: breed.count || breed.available_count || 0,
    imageUrl: breed.image_url || breed.imageUrl || null,
  }));
};

export default function MobileHomePage({ initialData }: MobileHomePageProps) {
  // Get 3 random breeds for the carousel
  const randomBreeds = useMemo(
    () => getRandomBreeds(initialData?.breedStats, 3),
    [initialData?.breedStats],
  );

  // Calculate unique breeds count
  const uniqueBreedsCount = useMemo(() => {
    if (initialData?.statistics?.totalBreeds) {
      return initialData.statistics.totalBreeds;
    }
    if (initialData?.breedStats?.total_breeds) {
      return initialData.breedStats.total_breeds;
    }
    return 50; // Default fallback
  }, [initialData]);

  // Format breed count
  const breedCount = initialData?.statistics?.totalBreeds
    ? initialData.statistics.totalBreeds.toString() + "+"
    : initialData?.breedStats?.total_breeds
      ? initialData.breedStats.total_breeds.toString() + "+"
      : "50+";

  return (
    <div
      data-testid="mobile-home-page"
      className="min-h-screen bg-[#FFF4ED] dark:bg-gray-900 pb-16 sm:hidden overflow-x-hidden"
    >
      {/* SEO Component */}
      <MobileHomeSEO
        totalDogs={initialData?.statistics?.totalDogs || 0}
        totalOrganizations={initialData?.statistics?.totalOrganizations || 0}
        totalBreeds={uniqueBreedsCount}
      />

      {/* Top Header with branding */}
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
                initialData?.statistics?.totalOrganizations?.toLocaleString() ||
                "0",
            },
            { label: "Breeds", value: breedCount },
          ]}
        />

        {/* Breed Spotlight Carousel */}
        <MobileBreedSpotlight breeds={randomBreeds} />

        {/* Available Now */}
        <MobileAvailableNow dogs={initialData?.dogs} />
      </main>

      {/* Bottom navigation */}
      <MobileBottomNav />
    </div>
  );
}