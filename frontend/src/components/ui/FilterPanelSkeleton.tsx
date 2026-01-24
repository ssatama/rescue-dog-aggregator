import React from "react";

/**
 * Skeleton component for FilterPanel loading state
 * Matches the FilterPanel button dimensions for dynamic import loading
 */
const FilterPanelSkeleton: React.FC = () => {
  return (
    <div
      data-testid="filter-panel-skeleton"
      role="status"
      aria-label="Loading filters"
      className="skeleton-element rounded-lg h-10 w-24"
    />
  );
};

export default FilterPanelSkeleton;
