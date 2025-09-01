import React, { useEffect, useState } from "react";
import { SwipeFilters as Filters } from "../../hooks/useSwipeFilters";

interface SwipeFiltersProps {
  onFiltersChange: (filters: Filters) => void;
  compact?: boolean;
}

const COUNTRIES = [
  { value: "Germany", label: "Germany", flag: "🇩🇪", count: 486 },
  { value: "United Kingdom", label: "United Kingdom", flag: "🇬🇧", count: 1245 },
  { value: "United States", label: "United States", flag: "🇺🇸", count: 342 },
];

const SIZES = [
  { value: "small", label: "Small", icon: "🐕" },
  { value: "medium", label: "Medium", icon: "🐕" },
  { value: "large", label: "Large", icon: "🐕" },
  { value: "giant", label: "Giant", icon: "🐕" },
];

export default function SwipeFilters({
  onFiltersChange,
  compact = false,
}: SwipeFiltersProps) {
  const [filters, setFilters] = useState<Filters>(() => {
    try {
      const stored = localStorage.getItem("swipeFilters");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load filters:", error);
    }
    return { country: "", sizes: [] };
  });

  useEffect(() => {
    if (filters.country || filters.sizes.length > 0) {
      localStorage.setItem("swipeFilters", JSON.stringify(filters));
    }
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters((prev) => ({ ...prev, country: e.target.value }));
  };

  const toggleSize = (size: string) => {
    setFilters((prev) => {
      const sizes = prev.sizes.includes(size)
        ? prev.sizes.filter((s) => s !== size)
        : [...prev.sizes, size];
      return { ...prev, sizes };
    });
  };

  const clearSizes = () => {
    setFilters((prev) => ({ ...prev, sizes: [] }));
  };

  const selectedCountry = COUNTRIES.find((c) => c.value === filters.country);

  if (compact) {
    return (
      <div className="flex gap-2 items-center">
        {selectedCountry && (
          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
            {selectedCountry.flag} {selectedCountry.label}
          </span>
        )}
        {filters.sizes.length > 0 && (
          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
            {filters.sizes
              .map((s) => SIZES.find((size) => size.value === s)?.label)
              .join(" & ")}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <label
          htmlFor="country-select"
          className="block text-sm font-medium text-gray-700 mb-2"
          aria-label="Select adoption country"
        >
          Country
        </label>
        <select
          id="country-select"
          value={filters.country}
          onChange={handleCountryChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          aria-label="Country"
        >
          <option value="">Select a country</option>
          {COUNTRIES.map((country) => (
            <option key={country.value} value={country.value}>
              {country.label} ({country.count} dogs)
            </option>
          ))}
        </select>
        {selectedCountry && (
          <div className="mt-2 text-sm text-gray-600">
            {selectedCountry.flag} {selectedCountry.label}
          </div>
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label
            className="text-sm font-medium text-gray-700"
            aria-label="Filter by dog size"
          >
            Size Preference (optional)
          </label>
          {filters.sizes.length > 0 && (
            <button
              onClick={clearSizes}
              className="text-sm text-gray-500 hover:text-gray-700"
              aria-label="Clear sizes"
            >
              Clear sizes
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SIZES.map((size) => {
            const isSelected = filters.sizes.includes(size.value);
            return (
              <button
                key={size.value}
                onClick={() => toggleSize(size.value)}
                className={`
                  px-4 py-2 rounded-lg border-2 transition-all
                  ${
                    isSelected
                      ? "border-orange-500 bg-orange-100 selected"
                      : "border-gray-300 bg-white hover:border-orange-300"
                  }
                `}
                style={isSelected ? { backgroundColor: "#fed7aa" } : {}}
                aria-label={size.label}
              >
                {size.icon} {size.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
