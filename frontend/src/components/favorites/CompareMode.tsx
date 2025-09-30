"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dog } from "./types";
import { X } from "lucide-react";
import ComparisonView from "./ComparisonView";
import CompareSelection from "./CompareSelection";

interface CompareModeProps {
  dogs: Dog[];
  onClose: () => void;
}

export default function CompareMode({ dogs, onClose }: CompareModeProps) {
  const [selectedDogs, setSelectedDogs] = useState<Set<string | number>>(
    new Set(),
  );
  const [isComparing, setIsComparing] = useState(false);

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

  const handleSelectionChange = (selected: Set<string | number>) => {
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

  const handleRemoveFavorite = (dogId: string | number) => {
    const newSelection = new Set(selectedDogs);
    newSelection.delete(dogId);
    setSelectedDogs(newSelection);

    // If less than 2 dogs selected, go back to selection
    if (newSelection.size < 2) {
      setIsComparing(false);
    }
  };

  // If comparing, show the new ComparisonView fullscreen
  if (isComparing) {
    return (
      <div className="fixed inset-0 z-50">
        <ComparisonView
          dogs={getSelectedDogs()}
          onClose={handleBackToSelection}
          onRemoveFavorite={handleRemoveFavorite}
        />
      </div>
    );
  }

  // Otherwise show the selection modal
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto content-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold dark:text-white">
                Select Dogs to Compare
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Choose 2-4 dogs to compare side by side
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={24} className="dark:text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <CompareSelection
            dogs={dogs}
            selectedDogs={selectedDogs}
            onSelectionChange={handleSelectionChange}
            onCompare={handleCompare}
          />
        </div>
      </div>
    </div>
  );
}
