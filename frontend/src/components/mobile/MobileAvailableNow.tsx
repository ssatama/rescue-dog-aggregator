"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import DogCardOptimized dynamically to avoid TypeScript issues
const DogCardOptimized = dynamic(() => import("../dogs/DogCardOptimized"), {
  ssr: false,
}) as any;

interface Dog {
  id: number;
  name: string;
  breed?: string;
  age?: string;
  organization?: {
    name: string;
    slug: string;
  };
  personality_traits?: string[];
  created_at?: string;
  primary_image_url?: string;
  main_image?: string;
  [key: string]: any;
}

interface MobileAvailableNowProps {
  dogs?: Dog[];
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  loading?: boolean;
  totalCount?: number;
}

// Skeleton loader component for loading state
const DogCardSkeleton = () => (
  <div
    data-testid="skeleton"
    className="bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse h-48"
  >
    <div className="aspect-[4/3] bg-gray-200 dark:bg-gray-700 rounded-t-xl" />
    <div className="p-3 space-y-2">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
    </div>
  </div>
);

export const MobileAvailableNow: React.FC<MobileAvailableNowProps> = ({
  dogs = [],
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  loading = false,
  totalCount,
}) => {
  const router = useRouter();

  // Ensure dogs is always an array
  const safeDogs = Array.isArray(dogs) ? dogs : [];

  const handleFilterClick = () => {
    router.push("/dogs");
  };

  // Check if a dog was created today
  const isNewToday = (createdAt?: string) => {
    if (!createdAt) return false;
    const today = new Date().toISOString().split("T")[0];
    return createdAt.startsWith(today);
  };

  return (
    <section
      className="px-4 py-6 bg-white dark:bg-gray-900 md:hidden"
      aria-label="Available dogs"
      role="region"
    >
      {/* Header with filter button */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Available Now
          </h2>
          {totalCount && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {totalCount} dogs available
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFilterClick}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          aria-label="Open filters"
        >
          <Filter className="w-5 h-5 mr-1" />
          Filters
        </Button>
      </div>

      {/* Loading state */}
      {loading && safeDogs.length === 0 && (
        <div data-testid="dogs-grid" className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <DogCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Dogs grid */}
      {!loading && safeDogs.length > 0 && (
        <>
          <div data-testid="dogs-grid" className="grid grid-cols-2 gap-3">
            {safeDogs.map((dog, index) => {
              const isNew = isNewToday(dog.created_at);

              return (
                <div key={dog.id} className="relative">
                  {isNew && (
                    <div className="absolute top-2 left-2 z-10 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      NEW TODAY
                    </div>
                  )}
                  <DogCardOptimized
                    dog={dog}
                    compact={true}
                    priority={index < 4}
                    animationDelay={index}
                  />
                </div>
              );
            })}
          </div>

          {/* Load More button */}
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <Button
                onClick={onLoadMore}
                disabled={loadingMore}
                size="lg"
                className="w-full max-w-xs bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full shadow-lg"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More Dogs"
                )}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && safeDogs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            No dogs available at the moment
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Check back soon for new arrivals!
          </p>
        </div>
      )}
    </section>
  );
};