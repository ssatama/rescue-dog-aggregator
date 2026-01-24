import React from "react";

const DogDetailModalSkeleton: React.FC = () => {
  return (
    <div
      data-testid="dog-detail-modal-skeleton"
      role="status"
      aria-label="Loading dog details"
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center gap-3 shadow-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-600" />
        <span className="text-gray-700 dark:text-gray-200">Loading details...</span>
      </div>
    </div>
  );
};

export default DogDetailModalSkeleton;
