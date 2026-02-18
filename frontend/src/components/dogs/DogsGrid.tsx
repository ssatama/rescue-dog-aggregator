import React from "react";
import DogCardOptimized from "./DogCardOptimized";
import DogCardErrorBoundary from "../error/DogCardErrorBoundary";
import DogCardSkeletonOptimized from "../ui/DogCardSkeletonOptimized";
import EmptyState from "../ui/EmptyState";
import type { DogsGridProps } from "@/types/dogComponents";

const DogsGrid = React.memo(function DogsGrid({
  dogs = [],
  loading = false,
  skeletonCount = 8,
  className = "",
  emptyStateVariant = "noDogsOrganization",
  onClearFilters,
  onBrowseOrganizations,
  loadingType = "initial",
  listContext = "home",
  ...props
}: DogsGridProps): React.ReactElement {
  if (loading) {
    const animationClass =
      loadingType === "filter"
        ? "animate-in fade-in duration-200"
        : "animate-in fade-in duration-300";
    const adjustedSkeletonCount =
      loadingType === "filter" ? Math.min(skeletonCount, 6) : skeletonCount;

    return (
      <div
        data-testid="dogs-grid-skeleton"
        className={`grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),340px))] justify-center gap-4 md:gap-6 ${className} ${animationClass}`}
        aria-label="Dogs available for adoption"
        {...props}
      >
        {Array.from({ length: adjustedSkeletonCount }, (_, index) => (
          <DogCardSkeletonOptimized
            key={`skeleton-${index}`}
            priority={index < 4}
          />
        ))}
      </div>
    );
  }

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

  return (
    <div
      data-testid="dogs-grid"
      className={`grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),340px))] justify-center gap-4 md:gap-6 ${className}`}
      aria-label="Dogs available for adoption"
      {...props}
    >
      {dogs.map((dog, index) => {
        if (!dog || !dog.id) {
          return null;
        }

        return (
          <DogCardErrorBoundary key={dog.id} dogId={dog.id}>
            <DogCardOptimized
              dog={dog}
              priority={index < 4}
              position={index}
              listContext={listContext}
            />
          </DogCardErrorBoundary>
        );
      })}
    </div>
  );
});

export default DogsGrid;
