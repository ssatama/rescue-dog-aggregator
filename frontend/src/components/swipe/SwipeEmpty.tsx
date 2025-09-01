import React from "react";

interface SwipeEmptyProps {
  onChangeFilters: () => void;
}

export function SwipeEmpty({ onChangeFilters }: SwipeEmptyProps) {
  return (
    <div
      data-testid="swipe-empty"
      className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center"
    >
      <div className="text-8xl mb-6">🦮</div>

      <h2 className="text-2xl font-bold mb-3">More dogs coming!</h2>

      <p className="text-gray-600 mb-6 max-w-sm">
        We&apos;re adding new dogs every day. Check back soon or try adjusting
        your filters to see more matches.
      </p>

      <button
        onClick={onChangeFilters}
        className="text-orange-600 hover:text-orange-700 font-medium transition-colors"
      >
        Change Filters →
      </button>
    </div>
  );
}
