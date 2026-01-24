import React from "react";
import SkeletonPulse from "./SkeletonPulse";

/**
 * Skeleton component for CompareMode loading state
 * Matches the CompareMode modal structure for dynamic import loading
 */
const CompareSkeleton: React.FC = () => {
  return (
    <div
      data-testid="compare-skeleton"
      role="status"
      aria-label="Loading comparison view"
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header skeleton */}
        <div
          data-testid="compare-skeleton-header"
          className="border-b border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <SkeletonPulse
                standalone={false}
                className="h-8 w-64 mb-2 rounded"
              />
              <SkeletonPulse
                standalone={false}
                className="h-5 w-48 rounded"
                intensity="subtle"
              />
            </div>
            <SkeletonPulse
              standalone={false}
              className="w-10 h-10 rounded-lg"
            />
          </div>
        </div>

        {/* Content skeleton */}
        <div data-testid="compare-skeleton-content" className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                data-testid="compare-skeleton-card"
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg overflow-hidden"
              >
                <SkeletonPulse
                  standalone={false}
                  className="aspect-square w-full"
                />
                <div className="p-3 space-y-2">
                  <SkeletonPulse
                    standalone={false}
                    className="h-5 w-3/4 rounded"
                  />
                  <SkeletonPulse
                    standalone={false}
                    className="h-4 w-1/2 rounded"
                    intensity="subtle"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompareSkeleton;
