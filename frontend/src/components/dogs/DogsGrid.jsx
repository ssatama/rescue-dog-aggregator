import React from 'react';
import DogCard from './DogCard';
import DogCardErrorBoundary from '../error/DogCardErrorBoundary';

/**
 * Responsive grid component for displaying dog cards
 * Implements CSS Grid with auto-fill and responsive breakpoints
 */
const DogsGrid = React.memo(function DogsGrid({ 
  dogs = [], 
  loading = false, 
  skeletonCount = 8,
  className = '',
  ...props 
}) {
  // Handle loading state with skeleton cards
  if (loading) {
    return (
      <div
        data-testid="dogs-grid"
        className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 ${className}`}
        aria-label="Dogs available for adoption"
        {...props}
      >
        {Array.from({ length: skeletonCount }, (_, index) => (
          <SkeletonCard key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  // Handle empty state
  if (!dogs || dogs.length === 0) {
    return (
      <div
        data-testid="dogs-grid-empty"
        className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200"
      >
        <svg 
          className="h-12 w-12 mx-auto text-gray-400 mb-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No dogs available</h3>
        <p className="text-gray-600">
          This organization doesn't have any dogs listed for adoption at the moment.
        </p>
      </div>
    );
  }

  // Render dogs grid
  return (
    <div
      data-testid="dogs-grid"
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 ${className}`}
      aria-label="Dogs available for adoption"
      {...props}
    >
      {dogs.map((dog, index) => {
        // Skip invalid dogs gracefully
        if (!dog || !dog.id) {
          return null;
        }

        return (
          <DogCardErrorBoundary key={dog.id} dogId={dog.id}>
            <DogCard 
              dog={dog} 
              priority={index < 4} // Prioritize loading for first 4 images
              animationDelay={index * 50} // Stagger animations
            />
          </DogCardErrorBoundary>
        );
      })}
    </div>
  );
});

/**
 * Skeleton loading card component
 */
const SkeletonCard = React.memo(function SkeletonCard() {
  return (
    <div
      data-testid="dog-card-skeleton"
      className="animate-pulse bg-white rounded-lg shadow-md overflow-hidden"
    >
      {/* Image skeleton */}
      <div className="h-50 sm:h-50 md:h-60 bg-gray-200" />
      
      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Name skeleton */}
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        
        {/* Age/Gender row skeleton */}
        <div className="flex items-center gap-3">
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-12" />
        </div>
        
        {/* Breed skeleton */}
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        
        {/* Location skeleton */}
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
        
        {/* Ships to skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-3 bg-gray-200 rounded w-12" />
          <div className="flex gap-1">
            <div className="w-4 h-3 bg-gray-200 rounded" />
            <div className="w-4 h-3 bg-gray-200 rounded" />
            <div className="w-4 h-3 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
      
      {/* Button skeleton */}
      <div className="p-4 pt-0">
        <div className="h-10 bg-gray-200 rounded w-full" />
      </div>
    </div>
  );
});

export default DogsGrid;