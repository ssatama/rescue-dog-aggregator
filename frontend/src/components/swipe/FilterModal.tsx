import React from "react";
import * as Sentry from "@sentry/nextjs";
import SwipeFiltersComponent from "./SwipeFilters";
import { SwipeFilters } from "../../hooks/useSwipeFilters";
import { get } from "../../utils/api";

interface FilterModalProps {
  show: boolean;
  filters: SwipeFilters;
  onClose: () => void;
  onFiltersChange: (filters: SwipeFilters) => void;
  isDarkMode?: boolean;
}

export const FilterModal: React.FC<FilterModalProps> = ({
  show,
  filters,
  onClose,
  onFiltersChange,
  isDarkMode = false,
}) => {
  if (!show) return null;

  const handlePreviewCount = async (testFilters: SwipeFilters) => {
    try {
      const params: Record<string, any> = {};
      if (testFilters.country) {
        params.adoptable_to_country = testFilters.country;
      }
      if (testFilters.sizes.length > 0) {
        params["size[]"] = testFilters.sizes;
      }
      if (testFilters.ages.length > 0) {
        params["age[]"] = testFilters.ages;
      }
      params.limit = 1;

      const data = await get<{ total?: number }>("/api/dogs/swipe", params);
      if (data && typeof data.total === "number") {
        return data.total;
      }
      return 0;
    } catch {
      return 0;
    }
  };

  return (
    <div
      className={`fixed inset-0 ${isDarkMode ? "bg-black/60" : "bg-black/30"} flex items-center justify-center p-4 z-[9999] backdrop-blur-[2px]`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`${isDarkMode ? "bg-gray-900" : "bg-[#FDFBF7]"} rounded-2xl max-w-md w-full shadow-2xl`}
      >
        <div className="p-5 pb-2 flex justify-between items-center">
          <h2
            className={`text-xl font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
          >
            Filter Dogs
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${
              isDarkMode
                ? "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
            aria-label="Close filter modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <SwipeFiltersComponent
          initialFilters={filters}
          onFiltersChange={(newFilters) => {
            onFiltersChange(newFilters);
            onClose();
            Sentry.addBreadcrumb({
              message: "swipe.filter.changed",
              category: "swipe",
              level: "info",
              data: {
                filters: newFilters,
              },
            });
          }}
          onCancel={onClose}
          onPreviewCount={handlePreviewCount}
          isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
};
