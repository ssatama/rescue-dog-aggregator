"use client";

import React from "react";
import { X } from "lucide-react";
import CompareCard from "./CompareCard";
import CompareTable from "./CompareTable";
import { analyzeComparison } from "../../utils/comparisonAnalyzer";
import type { Dog } from "./types";

interface CompareDesktopProps {
  dogs: Dog[];
  onClose: () => void;
  onBack?: () => void;
}

export default function CompareDesktop({ dogs, onClose }: CompareDesktopProps) {
  const comparisonData = analyzeComparison(dogs);

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Compare Your Favorites</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Side-by-side comparison to help you decide
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

      {/* Enhanced Dog Cards with more spacing */}
      <div
        data-testid="dog-cards-grid"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 grid-rows-[min-content]"
        style={{ gridTemplateRows: "min-content" }}
      >
        {dogs.map((dog) => (
          <CompareCard key={dog.id} dog={dog} />
        ))}
      </div>

      {/* Enhanced Comparison Table */}
      <CompareTable dogs={dogs} comparisonData={comparisonData} />
    </>
  );
}
