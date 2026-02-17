"use client";

import React from "react";

interface FilterChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  count?: number;
  className?: string;
}

const FilterChip = ({
  label,
  active = false,
  onClick,
  count,
  className = "",
}: FilterChipProps) => {
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium
        transition-all duration-200 border
        ${
          active
            ? "bg-purple-600 text-white border-purple-600"
            : "bg-white text-gray-700 border-gray-300 hover:border-purple-300"
        }
        ${className}
      `}
    >
      {label}
      {count !== undefined && <span className="ml-1.5 text-xs">({count})</span>}
    </button>
  );
};

export default FilterChip;
