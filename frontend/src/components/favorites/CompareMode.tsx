"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { useIsMobile } from "../../hooks/useMediaQuery";
import CompareSelection from "./CompareSelection";
import CompareDesktop from "./CompareDesktop";
import CompareMobile from "./CompareMobile";
import type { Dog } from "./types";

interface CompareModeProps {
  dogs: Dog[];
  onClose: () => void;
}

export default function CompareMode({ dogs, onClose }: CompareModeProps) {
  const [selectedDogs, setSelectedDogs] = useState<Set<number>>(new Set());
  const [isComparing, setIsComparing] = useState(false);
  const isMobile = useIsMobile();

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const handleSelectionChange = (selected: Set<number>) => {
    setSelectedDogs(selected);
  };

  const handleCompare = () => {
    if (selectedDogs.size >= 2) {
      setIsComparing(true);
    }
  };

  const handleBackToSelection = () => {
    setIsComparing(false);
  };

  const getSelectedDogs = (): Dog[] => {
    return dogs.filter((dog) => selectedDogs.has(dog.id));
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 md:p-6">
          {!isComparing ? (
            // Selection View
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Select Dogs to Compare</h2>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Choose 2-3 dogs to compare side by side
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X size={24} />
                </button>
              </div>
              <CompareSelection
                dogs={dogs}
                selectedDogs={selectedDogs}
                onSelectionChange={handleSelectionChange}
                onCompare={handleCompare}
              />
            </div>
          ) : (
            // Comparison View
            <div>
              <div className="mb-4">
                <button
                  onClick={handleBackToSelection}
                  className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                >
                  ← Back to Selection
                </button>
              </div>
              {isMobile ? (
                <CompareMobile dogs={getSelectedDogs()} onClose={onClose} />
              ) : (
                <CompareDesktop dogs={getSelectedDogs()} onClose={onClose} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}