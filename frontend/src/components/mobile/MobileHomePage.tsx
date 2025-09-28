"use client";

import React from "react";
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
}

interface MobileHomePageProps {
  initialData?: InitialData;
}

export const MobileHomePage: React.FC<MobileHomePageProps> = ({
  initialData,
}) => {
  return (
    <div
      data-testid="mobile-home-page"
      className="md:hidden min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 overflow-x-hidden"
    >
      {/* Sticky header */}
      <MobileTopHeader />

      {/* Main content */}
      <main className="relative">
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

        {/* Available dogs section */}
        <MobileAvailableNow
          dogs={initialData?.dogs || []}
          totalCount={initialData?.statistics?.totalDogs}
        />

        {/* Breed spotlight */}
        <MobileBreedSpotlight breed={initialData?.featuredBreed} />

        {/* Extra bottom padding for MobileBottomNav */}
        <div className="h-4" />
      </main>

      {/* Bottom navigation */}
      <MobileBottomNav />
    </div>
  );
};