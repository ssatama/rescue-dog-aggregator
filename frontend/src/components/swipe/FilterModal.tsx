import React from "react";
import * as Sentry from "@sentry/nextjs";
import SwipeFilters from "./SwipeFilters";
import { SwipeFilter } from "../../hooks/useSwipeFilters";

interface FilterModalProps {
  show: boolean;
  filters: SwipeFilter;
  onClose: () => void;
  onFiltersChange: (filters: SwipeFilter) => void;
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

  const handlePreviewCount = async (testFilters: SwipeFilter) => {
    try {
      const params = new URLSearchParams();
      if (testFilters.country) {
        params.append("adoptable_to_country", testFilters.country);
      }
      testFilters.sizes.forEach((size) => {
        params.append("size[]", size);
      });
      testFilters.ages.forEach((age) => {
        params.append("age[]", age);
      });

      const response = await fetch(
        `/api/dogs/swipe?${params.toString()}&limit=1`
      );
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.total === "number") {
          return data.total;
        }
        return 0;
      }
      return 0;
    } catch {
      return 0;
    }
  };

  return (
    <div className={`fixed inset-0 bg-black ${isDarkMode ? 'bg-opacity-70' : 'bg-opacity-50'} flex items-center justify-center p-4 z-[9999]`}>
      <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl max-w-md w-full`}>
        <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : ''} flex justify-between items-center`}>
          <h2 className={`text-xl font-bold ${isDarkMode ? 'text-gray-100' : ''}`}>
            Filter Dogs
          </h2>
          <button
            onClick={onClose}
            className={`${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} text-2xl`}
          >
            ✕
          </button>
        </div>
        <SwipeFilters
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
        />
      </div>
    </div>
  );
};