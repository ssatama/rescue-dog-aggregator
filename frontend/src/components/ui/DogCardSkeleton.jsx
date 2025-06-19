import React from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

/**
 * Skeleton loading component that matches the exact structure and dimensions of DogCard
 * Uses animate-pulse for smooth loading animation with gray-200 skeleton elements
 */
const DogCardSkeleton = React.memo(function DogCardSkeleton() {
  return (
    <Card 
      data-testid="dog-card-skeleton"
      className="overflow-hidden flex flex-col h-full shadow-md bg-white animate-pulse"
      role="status"
      aria-label="Loading dog information"
    >
      <CardHeader className="p-0 relative">
        {/* Image skeleton matching DogCard responsive heights */}
        <div 
          data-testid="skeleton-image"
          className="w-full h-50 sm:h-50 md:h-60 bg-gray-200"
        />
        
        {/* NEW Badge skeleton */}
        <div 
          data-testid="skeleton-new-badge"
          className="absolute top-2 left-2 z-10 bg-gray-200 rounded text-xs font-bold px-2 py-1 w-10 h-5"
        />

        {/* Organization Badge skeleton */}
        <div 
          data-testid="skeleton-org-badge"
          className="absolute bottom-2 right-2 z-10 bg-gray-200 rounded text-xs w-20 h-5"
        />
      </CardHeader>

      <CardContent data-testid="skeleton-content" className="p-4 flex flex-col flex-grow space-y-3">
        {/* Name skeleton */}
        <div 
          data-testid="skeleton-name"
          className="h-6 bg-gray-200 rounded w-3/4"
        />
        
        {/* Age and Gender row skeleton */}
        <div 
          data-testid="skeleton-age-gender"
          className="flex items-center gap-3"
        >
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-12" />
        </div>
        
        {/* Breed skeleton */}
        <div 
          data-testid="skeleton-breed"
          className="h-4 bg-gray-200 rounded w-1/2"
        />
        
        {/* Breed group badge skeleton */}
        <div className="h-4 bg-gray-200 rounded w-20" />
        
        {/* Location skeleton with icon */}
        <div 
          data-testid="skeleton-location"
          className="flex items-center gap-1"
        >
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
        
        {/* Ships to skeleton */}
        <div 
          data-testid="skeleton-ships-to"
          className="flex items-center gap-2"
        >
          <div className="h-3 bg-gray-200 rounded w-12" />
          <div className="flex gap-1">
            <div className="w-4 h-3 bg-gray-200 rounded" />
            <div className="w-4 h-3 bg-gray-200 rounded" />
            <div className="w-4 h-3 bg-gray-200 rounded" />
          </div>
        </div>
      </CardContent>

      <CardFooter data-testid="skeleton-footer" className="p-4 pt-0">
        {/* Button skeleton */}
        <div 
          data-testid="skeleton-button"
          className="h-10 bg-gray-200 rounded w-full"
        />
      </CardFooter>
    </Card>
  );
});

export default DogCardSkeleton;