import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

export interface DogCardSkeletonProps {
  /** Animation delay in milliseconds for staggered loading */
  animationDelay?: number;
}

/**
 * Skeleton loading component that matches the exact structure and dimensions of DogCard
 * Uses premium shimmer animation for smooth loading with orange-tinted effects
 */
const DogCardSkeleton = React.memo<DogCardSkeletonProps>(
  function DogCardSkeleton({ animationDelay = 0 }) {
    return (
      <Card
        data-testid="dog-card-skeleton"
        className="overflow-hidden flex flex-col h-full animate-shimmer-premium animate-fade-in duration-300"
        style={{ animationDelay: `${animationDelay}ms` }}
        role="status"
        aria-label="Loading dog information"
      >
        <CardHeader className="p-0 relative">
          {/* Image skeleton matching DogCard 4:3 aspect ratio */}
          <div
            data-testid="skeleton-image"
            className="w-full aspect-[4/3] skeleton relative"
          />

          {/* NEW Badge skeleton */}
          <div
            data-testid="skeleton-new-badge"
            className="absolute top-2 left-2 z-10 skeleton rounded text-xs font-bold px-2 py-1 w-10 h-5"
          />
        </CardHeader>

        <CardContent
          data-testid="skeleton-content"
          className="p-5 flex flex-col flex-grow space-y-3"
        >
          {/* Name skeleton */}
          <div
            data-testid="skeleton-name"
            className="h-6 skeleton rounded w-3/4"
          />

          {/* Age and Gender row skeleton */}
          <div
            data-testid="skeleton-age-gender"
            className="flex items-center gap-3"
          >
            <div className="h-4 skeleton rounded w-16" />
            <div className="h-4 skeleton rounded w-12" />
          </div>

          {/* Breed skeleton */}
          <div
            data-testid="skeleton-breed"
            className="h-4 skeleton rounded w-1/2"
          />

          {/* Breed group badge skeleton */}
          <div className="h-4 skeleton rounded w-20" />

          {/* Location skeleton with icon */}
          <div
            data-testid="skeleton-location"
            className="flex items-center gap-1"
          >
            <div className="w-4 h-4 skeleton rounded" />
            <div className="h-4 skeleton rounded w-2/3" />
          </div>

          {/* Ships to skeleton */}
          <div
            data-testid="skeleton-ships-to"
            className="flex items-center gap-2"
          >
            <div className="h-3 skeleton rounded w-12" />
            <div className="flex gap-1">
              <div className="w-4 h-3 skeleton rounded" />
              <div className="w-4 h-3 skeleton rounded" />
              <div className="w-4 h-3 skeleton rounded" />
            </div>
          </div>
        </CardContent>

        <CardFooter data-testid="skeleton-footer" className="p-5 pt-0">
          {/* Button skeleton */}
          <div
            data-testid="skeleton-button"
            className="h-10 skeleton rounded w-full"
          />
        </CardFooter>
      </Card>
    );
  },
);

export default DogCardSkeleton;
