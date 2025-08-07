import React from "react";

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
      className="skeleton-container bg-white rounded-lg shadow-blue-sm overflow-hidden flex flex-col h-full"
    >
      {/* Image skeleton with exact 4:3 aspect ratio */}
      <div
        data-testid="skeleton-image"
        className="aspect-[4/3] skeleton-element relative overflow-hidden"
      />

      {/* Content skeleton matching real card layout */}
      <div
        data-testid="skeleton-content"
        className="p-4 flex flex-col flex-grow space-y-2"
      >
        <div
          data-testid="skeleton-title"
          className="h-6 skeleton-element rounded w-3/4"
        />
        <div
          data-testid="skeleton-description"
          className="h-4 skeleton-element skeleton-subtle rounded w-1/2"
        />
        <div
          data-testid="skeleton-button"
          className="h-10 skeleton-element rounded w-full mt-auto"
        />
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
    <div
      data-testid="trust-stats-skeleton"
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
    >
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          data-testid="stat-skeleton"
          className="text-center skeleton-container"
        >
          <div
            data-testid="stat-icon-skeleton"
            className="w-16 h-16 skeleton-element rounded-full mx-auto mb-4"
          />
          <div className="h-12 w-20 skeleton-element skeleton-subtle rounded mx-auto mb-2" />
          <div className="h-6 w-32 skeleton-element skeleton-subtle rounded mx-auto" />
        </div>
      ))}
    </div>
  );
}
