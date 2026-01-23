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

      const data = await get("/api/dogs/swipe", params);
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
      className={`fixed inset-0 ${isDarkMode ? "bg-black/70" : "bg-black/50"} flex items-center justify-center p-4 z-[9999]`}
    >
      <div
        className={`${isDarkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"} rounded-2xl max-w-md w-full`}
      >
        <div
          className={`p-4 border-b ${isDarkMode ? "border-gray-700" : "border-gray-200"} flex justify-between items-center`}
        >
          <h2
            className={`text-xl font-bold ${isDarkMode ? "text-gray-100" : "text-gray-900"}`}
          >
            Filter Dogs
          </h2>
          <button
            onClick={onClose}
            className={`${isDarkMode ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"} text-2xl`}
          >
            ✕
          </button>
        </div>
        <SwipeFiltersComponent
          initialFilters={filters}
          onFiltersChange={(newFilters) => {
            onFiltersChange(newFilters);
            onClose();
            Sentry.captureEvent({
              message: "swipe.filter.changed",
              extra: {
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
