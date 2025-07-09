import React from 'react';

/**
 * Skeleton component for DogCard loading state
 * Matches exact structure and dimensions of real DogCard
 */
export function DogCardSkeleton(): React.JSX.Element {
  return (
    <div 
      data-testid="dog-card-skeleton"
      role="status"
      aria-label="Loading dog information"
      className="animate-pulse bg-white rounded-lg shadow-blue-sm overflow-hidden flex flex-col h-full"
    >
      {/* Image skeleton with exact 4:3 aspect ratio */}
      <div 
        data-testid="skeleton-image"
        className="aspect-[4/3] bg-gray-200 relative overflow-hidden"
      >
        <div 
          data-testid="skeleton-shimmer"
          className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-100 to-transparent skeleton-shimmer" 
        />
      </div>
      
      {/* Content skeleton matching real card layout */}
      <div data-testid="skeleton-content" className="p-4 flex flex-col flex-grow space-y-2">
        <div data-testid="skeleton-title" className="h-6 bg-gray-200 rounded w-3/4" />
        <div data-testid="skeleton-description" className="h-4 bg-gray-200 rounded w-1/2" />
        <div data-testid="skeleton-button" className="h-10 bg-gray-200 rounded w-full mt-auto" />
      </div>
    </div>
  );
}

/**
 * Skeleton component for Trust Section statistics
 * Shows 3 stat placeholders in responsive grid
 */
export function TrustStatsSkeleton(): React.JSX.Element {
  return (
    <div data-testid="trust-stats-skeleton" className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} data-testid="stat-skeleton" className="text-center animate-pulse">
          <div 
            data-testid="stat-icon-skeleton"
            className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"
          />
          <div className="h-12 w-20 bg-gray-200 rounded mx-auto mb-2" />
          <div className="h-6 w-32 bg-gray-200 rounded mx-auto" />
        </div>
      ))}
    </div>
  );
}