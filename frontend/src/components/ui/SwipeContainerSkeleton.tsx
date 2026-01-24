import React from "react";
import SkeletonPulse from "./SkeletonPulse";

/**
 * Skeleton component for SwipeContainer loading state
 * Matches the swipe interface structure for dynamic import loading
 */
const SwipeContainerSkeleton: React.FC = () => {
  return (
    <div
      data-testid="swipe-container-skeleton"
      role="status"
      aria-label="Loading swipe interface"
      className="min-h-[100dvh] bg-gray-50 dark:bg-gray-900 flex flex-col"
    >
      {/* Filter bar skeleton */}
      <div
        data-testid="swipe-filter-skeleton"
        className="flex justify-center gap-2 p-4"
      >
        <SkeletonPulse standalone={false} className="h-10 w-24 rounded-full" />
        <SkeletonPulse standalone={false} className="h-10 w-24 rounded-full" />
        <SkeletonPulse standalone={false} className="h-10 w-24 rounded-full" />
      </div>

      {/* Main swipe card skeleton */}
      <div className="flex-1 flex items-center justify-center px-4 py-2">
        <div
          data-testid="swipe-card-skeleton"
          className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
        >
          {/* Card image skeleton */}
          <SkeletonPulse
            standalone={false}
            className="aspect-[3/4] w-full min-h-[400px]"
          />

          {/* Card content skeleton */}
          <div className="p-4 space-y-3">
            <SkeletonPulse standalone={false} className="h-7 w-3/4 rounded" />
            <SkeletonPulse
              standalone={false}
              className="h-5 w-1/2 rounded"
              intensity="subtle"
            />
            <div className="flex gap-2 pt-2">
              <SkeletonPulse
                standalone={false}
                className="h-6 w-16 rounded-full"
              />
              <SkeletonPulse
                standalone={false}
                className="h-6 w-20 rounded-full"
              />
              <SkeletonPulse
                standalone={false}
                className="h-6 w-14 rounded-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons skeleton */}
      <div
        data-testid="swipe-actions-skeleton"
        className="flex justify-center gap-6 pb-8 pt-4"
      >
        <SkeletonPulse
          standalone={false}
          className="w-16 h-16 rounded-full"
        />
        <SkeletonPulse
          standalone={false}
          className="w-16 h-16 rounded-full"
        />
        <SkeletonPulse
          standalone={false}
          className="w-16 h-16 rounded-full"
        />
      </div>
    </div>
  );
};

export default SwipeContainerSkeleton;
