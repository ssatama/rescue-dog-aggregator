'use client';

import React, { useState, useCallback } from 'react';
import { MobileTopHeader } from './MobileTopHeader';
import { MobileNavCards } from './MobileNavCards';
import { MobileStats } from './MobileStats';
import { MobileAvailableNow } from './MobileAvailableNow';
import { MobileBreedSpotlight } from './MobileBreedSpotlight';
import MobileBottomNav from '../navigation/MobileBottomNav';

interface Dog {
  id: number;
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
  onLoadMore?: () => Promise<Dog[]>;
  hasMore?: boolean;
}

export const MobileHomePage: React.FC<MobileHomePageProps> = ({
  initialData,
  onLoadMore,
  hasMore = false,
}) => {
  const [dogs, setDogs] = useState<Dog[]>(initialData?.dogs || []);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentHasMore, setCurrentHasMore] = useState(hasMore);

  const handleLoadMore = useCallback(async () => {
    if (!onLoadMore || loadingMore) return;

    setLoadingMore(true);
    try {
      const newDogs = await onLoadMore();
      if (newDogs && newDogs.length > 0) {
        setDogs(prevDogs => [...prevDogs, ...newDogs]);
      } else {
        setCurrentHasMore(false);
      }
    } catch (error) {
      console.error('Failed to load more dogs:', error);
      setCurrentHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [onLoadMore, loadingMore]);

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
          dogsCount={initialData?.statistics?.totalDogs}
          rescuesCount={initialData?.statistics?.totalOrganizations}
          breedsCount={initialData?.statistics?.totalBreeds}
        />

        {/* Available dogs section */}
        <MobileAvailableNow
          dogs={dogs}
          hasMore={currentHasMore}
          onLoadMore={handleLoadMore}
          loadingMore={loadingMore}
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