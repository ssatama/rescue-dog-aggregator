import React, { useEffect, useState } from "react";
import { SwipeFilters as Filters } from "../../hooks/useSwipeFilters";

interface SwipeFiltersProps {
  onFiltersChange: (filters: Filters) => void;
  onCancel?: () => void;
  initialFilters?: Filters;
  compact?: boolean;
  availableDogCount?: number;
  onPreviewCount?: (filters: Filters) => Promise<number | string>;
}

const COUNTRIES = [
  { value: "AT", label: "Austria", flag: "🇦🇹" },
  { value: "BE", label: "Belgium", flag: "🇧🇪" },
  { value: "BG", label: "Bulgaria", flag: "🇧🇬" },
  { value: "CA", label: "Canada", flag: "🇨🇦" },
  { value: "CH", label: "Switzerland", flag: "🇨🇭" },
  { value: "CY", label: "Cyprus", flag: "🇨🇾" },
  { value: "CZ", label: "Czech Republic", flag: "🇨🇿" },
  { value: "DE", label: "Germany", flag: "🇩🇪" },
  { value: "DK", label: "Denmark", flag: "🇩🇰" },
  { value: "EE", label: "Estonia", flag: "🇪🇪" },
  { value: "ES", label: "Spain", flag: "🇪🇸" },
  { value: "FI", label: "Finland", flag: "🇫🇮" },
  { value: "FR", label: "France", flag: "🇫🇷" },
  { value: "GR", label: "Greece", flag: "🇬🇷" },
  { value: "HR", label: "Croatia", flag: "🇭🇷" },
  { value: "HU", label: "Hungary", flag: "🇭🇺" },
  { value: "IE", label: "Ireland", flag: "🇮🇪" },
  { value: "IT", label: "Italy", flag: "🇮🇹" },
  { value: "LT", label: "Lithuania", flag: "🇱🇹" },
  { value: "LU", label: "Luxembourg", flag: "🇱🇺" },
  { value: "LV", label: "Latvia", flag: "🇱🇻" },
  { value: "MT", label: "Malta", flag: "🇲🇹" },
  { value: "NL", label: "Netherlands", flag: "🇳🇱" },
  { value: "NO", label: "Norway", flag: "🇳🇴" },
  { value: "PL", label: "Poland", flag: "🇵🇱" },
  { value: "PT", label: "Portugal", flag: "🇵🇹" },
  { value: "RO", label: "Romania", flag: "🇷🇴" },
  { value: "SE", label: "Sweden", flag: "🇸🇪" },
  { value: "SI", label: "Slovenia", flag: "🇸🇮" },
  { value: "SK", label: "Slovakia", flag: "🇸🇰" },
  { value: "UK", label: "United Kingdom", flag: "🇬🇧" },
  { value: "US", label: "United States", flag: "🇺🇸" },
];

const SIZES = [
  { value: "small", label: "Small", icon: "🐕" },
  { value: "medium", label: "Medium", icon: "🐕" },
  { value: "large", label: "Large", icon: "🐕" },
  { value: "giant", label: "Giant", icon: "🐕" },
];

const AGES = [
  { value: "puppy", label: "Puppy", icon: "🐶" },
  { value: "young", label: "Young", icon: "🐕" },
  { value: "adult", label: "Adult", icon: "🦮" },
  { value: "senior", label: "Senior", icon: "🐕‍🦺" },
];

export default function SwipeFilters({
  onFiltersChange,
  onCancel,
  initialFilters,
  compact = false,
  availableDogCount,
  onPreviewCount,
}: SwipeFiltersProps) {
  const [filters, setFilters] = useState<Filters>(() => {
    if (initialFilters) {
      return initialFilters;
    }
    try {
      const stored = localStorage.getItem("swipeFilters");
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure ages field exists (migration for old data)
        if (!parsed.ages) {
          parsed.ages = [];
        }
        return parsed;
      }
    } catch (error) {
      console.error("Failed to load filters:", error);
    }
    return { country: "", sizes: [], ages: [] };
  });

  // Save to localStorage when filters change, but don't call onFiltersChange automatically
  useEffect(() => {
    if (
      filters.country ||
      filters.sizes.length > 0 ||
      filters.ages.length > 0
    ) {
      localStorage.setItem("swipeFilters", JSON.stringify(filters));
    }
  }, [filters]);

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

  const toggleAge = (age: string) => {
    setFilters((prev) => {
      const ages = prev.ages.includes(age)
        ? prev.ages.filter((a) => a !== age)
        : [...prev.ages, age];
      return { ...prev, ages };
    });
  };

  const clearAges = () => {
    setFilters((prev) => ({ ...prev, ages: [] }));
  };

  const [previewCount, setPreviewCount] = useState<number | string | null>(
    null,
  );
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Update preview count when filters change
  useEffect(() => {
    if (onPreviewCount && filters.country) {
      const timer = setTimeout(() => {
        setIsLoadingPreview(true);
        onPreviewCount(filters)
          .then(setPreviewCount)
          .finally(() => setIsLoadingPreview(false));
      }, 300); // Debounce
      return () => clearTimeout(timer);
    }
  }, [filters, onPreviewCount]);

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
        {filters.ages.length > 0 && (
          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
            {filters.ages
              .map((a) => AGES.find((age) => age.value === a)?.label)
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
              {country.flag} {country.label}
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

      <div>
        <div className="flex justify-between items-center mb-2">
          <label
            className="text-sm font-medium text-gray-700"
            aria-label="Filter by dog age"
          >
            Age Group (optional)
          </label>
          {filters.ages.length > 0 && (
            <button
              onClick={clearAges}
              className="text-sm text-gray-500 hover:text-gray-700"
              aria-label="Clear ages"
            >
              Clear ages
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {AGES.map((age) => {
            const isSelected = filters.ages.includes(age.value);
            return (
              <button
                key={age.value}
                onClick={() => toggleAge(age.value)}
                className={`
                  px-4 py-2 rounded-lg border-2 transition-all
                  ${
                    isSelected
                      ? "border-orange-500 bg-orange-100 selected"
                      : "border-gray-300 bg-white hover:border-orange-300"
                  }
                `}
                style={isSelected ? { backgroundColor: "#fed7aa" } : {}}
                aria-label={age.label}
              >
                {age.icon} {age.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview count */}
      {!compact && previewCount !== null && (
        <div className="text-center py-2 text-sm text-gray-600">
          {isLoadingPreview ? (
            <span>Checking...</span>
          ) : previewCount === 0 ? (
            <span className="text-red-600 font-medium">
              No dogs match these filters - try different options
            </span>
          ) : (
            <span className="text-green-600 font-medium">
              {typeof previewCount === "string"
                ? `${previewCount} dogs available`
                : `${previewCount} dog${previewCount !== 1 ? "s" : ""} available`}
            </span>
          )}
        </div>
      )}

      {/* Apply and Cancel buttons */}
      {!compact && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => onFiltersChange(filters)}
            disabled={previewCount === 0}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
              previewCount === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-orange-500 text-white hover:bg-orange-600"
            }`}
            aria-label="Apply filters"
          >
            Apply Filters
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              aria-label="Cancel"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}
