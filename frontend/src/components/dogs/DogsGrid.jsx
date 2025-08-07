import React from "react";
import DogCard from "./DogCard";
import DogCardErrorBoundary from "../error/DogCardErrorBoundary";
import DogCardSkeleton from "../ui/DogCardSkeleton";
import EmptyState from "../ui/EmptyState";

/**
 * Responsive grid component for displaying dog cards
 * Implements CSS Grid with auto-fill and responsive breakpoints
 */
const DogsGrid = React.memo(function DogsGrid({
  dogs = [],
  loading = false,
  skeletonCount = 8,
  className = "",
  emptyStateVariant = "noDogsOrganization",
  onClearFilters,
  onBrowseOrganizations,
  loadingType = "initial", // 'initial' | 'filter' | 'pagination'
  ...props
}) {
  // Handle loading state with skeleton cards
  if (loading) {
    // Different loading animations based on type
    const animationClass =
      loadingType === "filter"
        ? "animate-in fade-in duration-200"
        : "animate-in fade-in duration-300";
    const adjustedSkeletonCount =
      loadingType === "filter" ? Math.min(skeletonCount, 6) : skeletonCount;

    return (
      <div
        data-testid="dogs-grid-skeleton"
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 ${className} ${animationClass}`}
        aria-label="Dogs available for adoption"
        {...props}
      >
        {Array.from({ length: adjustedSkeletonCount }, (_, index) => (
          <DogCardSkeleton
            key={`skeleton-${index}`}
            animationDelay={index * 50}
          />
        ))}
      </div>
    );
  }

  // Handle empty state
  if (!dogs || dogs.length === 0) {
    return (
      <EmptyState
        data-testid="dogs-grid-empty"
        variant={emptyStateVariant}
        onClearFilters={onClearFilters}
        onBrowseOrganizations={onBrowseOrganizations}
      />
    );
  }

  // Render dogs grid
  return (
    <div
      data-testid="dogs-grid"
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 ${className}`}
      aria-label="Dogs available for adoption"
      {...props}
    >
      {dogs.map((dog, index) => {
        // Skip invalid dogs gracefully
        if (!dog || !dog.id) {
          return null;
        }

        // Calculate staggered animation delay with 300ms maximum
        const animationDelay = Math.min(index * 50, 300);

        return (
          <DogCardErrorBoundary key={dog.id} dogId={dog.id}>
            <DogCard
              dog={dog}
              priority={index < 4} // Prioritize loading for first 4 images
              animationDelay={animationDelay} // Stagger animations with max limit
            />
          </DogCardErrorBoundary>
        );
      })}
    </div>
  );
});

export default DogsGrid;
