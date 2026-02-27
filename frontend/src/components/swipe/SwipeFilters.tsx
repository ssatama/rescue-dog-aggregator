import React, { useEffect, useState } from "react";
import { SwipeFilters as Filters } from "../../hooks/useSwipeFilters";
import { reportError } from "../../utils/logger";

interface SwipeFiltersProps {
  onFiltersChange: (filters: Filters) => void;
  onCancel?: () => void;
  initialFilters?: Filters;
  compact?: boolean;
  availableDogCount?: number;
  onPreviewCount?: (filters: Filters) => Promise<number | string>;
  isDarkMode?: boolean;
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
  isDarkMode = false,
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
      reportError(error, { context: "SwipeFilters.loadFilters" });
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
    const pillClass = isDarkMode
      ? "bg-orange-950/20 border border-orange-800/40 text-orange-300"
      : "bg-[#FDFBF7] border border-orange-200/80 text-orange-800";

    return (
      <div className="flex gap-2 items-center flex-wrap">
        {selectedCountry && (
          <span className={`px-3 py-1 rounded-full text-sm ${pillClass}`}>
            {selectedCountry.flag} {selectedCountry.label}
          </span>
        )}
        {filters.sizes.length > 0 && (
          <span className={`px-3 py-1 rounded-full text-sm ${pillClass}`}>
            {filters.sizes
              .map((s) => SIZES.find((size) => size.value === s)?.label)
              .join(" & ")}
          </span>
        )}
        {filters.ages.length > 0 && (
          <span className={`px-3 py-1 rounded-full text-sm ${pillClass}`}>
            {filters.ages
              .map((a) => AGES.find((age) => age.value === a)?.label)
              .join(" & ")}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5">
      <div>
        <label
          htmlFor="country-select"
          className={`block text-sm font-medium mb-2 ${
            isDarkMode ? "text-gray-200" : "text-gray-700"
          }`}
          aria-label="Select adoption country"
        >
          Country
        </label>
        <select
          id="country-select"
          value={filters.country}
          onChange={handleCountryChange}
          required
          className={`w-full px-3 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-colors ${
            isDarkMode
              ? "bg-gray-800/50 border-gray-700 text-gray-100"
              : "bg-white border-gray-200 text-gray-900"
          }`}
          aria-label="Country"
        >
          <option value="">Select a country</option>
          {COUNTRIES.map((country) => (
            <option key={country.value} value={country.value}>
              {country.flag} {country.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label
            className={`text-sm font-medium ${
              isDarkMode ? "text-gray-200" : "text-gray-700"
            }`}
            aria-label="Filter by dog size"
          >
            Size Preference (optional)
          </label>
          {filters.sizes.length > 0 && (
            <button
              onClick={clearSizes}
              className="text-sm text-orange-500 hover:text-orange-600 transition-colors"
              aria-label="Clear sizes"
            >
              Clear
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
                  px-4 py-2.5 rounded-xl border transition-all
                  ${
                    isSelected
                      ? isDarkMode
                        ? "border-orange-500 bg-orange-900/20 text-gray-100"
                        : "border-orange-500 bg-orange-50 text-gray-900"
                      : isDarkMode
                        ? "border-gray-700 bg-gray-800/50 text-gray-100 hover:border-orange-500"
                        : "border-gray-200 bg-white text-gray-900 hover:border-orange-300"
                  }
                `}
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
            className={`text-sm font-medium ${
              isDarkMode ? "text-gray-200" : "text-gray-700"
            }`}
            aria-label="Filter by dog age"
          >
            Age Group (optional)
          </label>
          {filters.ages.length > 0 && (
            <button
              onClick={clearAges}
              className="text-sm text-orange-500 hover:text-orange-600 transition-colors"
              aria-label="Clear ages"
            >
              Clear
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
                  px-4 py-2.5 rounded-xl border transition-all
                  ${
                    isSelected
                      ? isDarkMode
                        ? "border-orange-500 bg-orange-900/20 text-gray-100"
                        : "border-orange-500 bg-orange-50 text-gray-900"
                      : isDarkMode
                        ? "border-gray-700 bg-gray-800/50 text-gray-100 hover:border-orange-500"
                        : "border-gray-200 bg-white text-gray-900 hover:border-orange-300"
                  }
                `}
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
        <div
          className={`text-center py-2 text-sm ${
            isDarkMode ? "text-gray-300" : "text-gray-600"
          }`}
        >
          {isLoadingPreview ? (
            <span>Checking...</span>
          ) : previewCount === 0 ? (
            <span
              className={`font-medium ${
                isDarkMode ? "text-red-400" : "text-red-600"
              }`}
            >
              No dogs match these filters - try different options
            </span>
          ) : (
            <span
              className={`font-medium ${
                isDarkMode ? "text-green-400" : "text-green-600"
              }`}
            >
              {typeof previewCount === "string"
                ? `${previewCount} dogs available`
                : `${previewCount} dog${previewCount !== 1 ? "s" : ""} available`}
            </span>
          )}
        </div>
      )}

      {/* Apply and Cancel buttons */}
      {!compact && (
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onFiltersChange(filters)}
            disabled={previewCount === 0}
            className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
              previewCount === 0
                ? isDarkMode
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-orange-500 text-white hover:bg-orange-600 shadow-[var(--shadow-orange-md)]"
            }`}
            aria-label="Apply filters"
          >
            Apply Filters
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className={`px-4 py-3 rounded-xl transition-colors ${
                isDarkMode
                  ? "text-gray-400 hover:text-gray-200"
                  : "text-gray-500 hover:text-gray-700"
              }`}
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
