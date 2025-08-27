"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  X,
  Filter,
  ChevronDown,
  Dog,
  Ruler,
  Calendar,
  Building2,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

// Debounce hook for filter performance
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface Dog {
  id: number;
  name: string;
  breed?: string;
  standardized_breed?: string;
  age_months?: number;
  age_min_months?: number;
  age_max_months?: number;
  age_text?: string;
  age_category?: string;
  sex?: string;
  size?: string;
  standardized_size?: string;
  organization_name?: string;
  organization?: {
    name: string;
    country: string;
  };
}

interface FilterPanelProps {
  dogs: Dog[];
  onFilter: (filteredDogs: Dog[], isUserInitiated?: boolean) => void;
}

// Helper function to get age category using the same logic as main catalog
const getAgeCategory = (dog: Dog): string => {
  // Use age_min and age_max if available (same as main catalog)
  const ageMin = dog.age_min_months || dog.age_months;
  const ageMax = dog.age_max_months || dog.age_months;

  // Handle Unknown age case
  if (!ageMin && ageMin !== 0 && !ageMax && !dog.age_category) return "Unknown";

  // If dog has explicit age_category, use it
  if (dog.age_category) return dog.age_category;

  // If no age data at all
  if (!ageMin && ageMin !== 0) return "Unknown";

  // Use the same boundaries as main catalog filters
  // Based on age_max for upper bound categories
  if (ageMax && ageMax < 12) return "Puppy"; // < 12 months
  if (ageMin >= 12 && ageMax && ageMax <= 36) return "Young"; // 12-36 months
  if (ageMin >= 36 && ageMax && ageMax <= 96) return "Adult"; // 36-96 months
  if (ageMin >= 96) return "Senior"; // 96+ months

  // Fallback based on ageMin only if ageMax not available
  if (!ageMax) {
    if (ageMin < 12) return "Puppy";
    if (ageMin < 36) return "Young";
    if (ageMin < 96) return "Adult";
    return "Senior";
  }

  return "Unknown";
};

export default function FilterPanel({ dogs, onFilter }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [breedFilter, setBreedFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [ageGroupFilter, setAgeGroupFilter] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // Debounce filter values for performance (300ms delay)
  const debouncedBreedFilter = useDebounce(breedFilter, 300);
  const debouncedSizeFilter = useDebounce(sizeFilter, 300);
  const debouncedAgeGroupFilter = useDebounce(ageGroupFilter, 300);
  const debouncedOrganizationFilter = useDebounce(organizationFilter, 300);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Extract unique values for filters
  const uniqueBreeds = useMemo(() => {
    const breeds = dogs
      .map((dog) => dog.standardized_breed || dog.breed)
      .filter((breed): breed is string => !!breed);
    return [...new Set(breeds)].sort();
  }, [dogs]);

  const uniqueSizes = useMemo(() => {
    const sizes = dogs
      .map((dog) => dog.standardized_size || dog.size)
      .filter((size): size is string => !!size);
    const sizeOrder = ["Tiny", "Small", "Medium", "Large", "XLarge"];
    return [...new Set(sizes)].sort((a, b) => {
      const aIndex = sizeOrder.indexOf(a);
      const bIndex = sizeOrder.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  }, [dogs]);

  const uniqueOrganizations = useMemo(() => {
    const orgs = dogs
      .map((dog) => dog.organization_name || dog.organization?.name)
      .filter((org): org is string => !!org);
    return [...new Set(orgs)].sort();
  }, [dogs]);

  // Calculate filtered dogs using debounced values
  const filteredDogs = useMemo(() => {
    return dogs.filter((dog) => {
      // Breed filter
      if (debouncedBreedFilter && debouncedBreedFilter !== "_all") {
        const dogBreed = dog.standardized_breed || dog.breed;
        if (dogBreed !== debouncedBreedFilter) {
          return false;
        }
      }

      // Size filter
      if (debouncedSizeFilter && debouncedSizeFilter !== "_all") {
        const dogSize = dog.standardized_size || dog.size;
        if (dogSize !== debouncedSizeFilter) {
          return false;
        }
      }

      // Age group filter
      if (debouncedAgeGroupFilter && debouncedAgeGroupFilter !== "_all") {
        const ageCategory = getAgeCategory(dog);
        if (ageCategory !== debouncedAgeGroupFilter) {
          return false;
        }
      }

      // Organization filter
      if (
        debouncedOrganizationFilter &&
        debouncedOrganizationFilter !== "_all"
      ) {
        const orgName = dog.organization_name || dog.organization?.name;
        if (orgName !== debouncedOrganizationFilter) {
          return false;
        }
      }

      return true;
    });
  }, [
    dogs,
    debouncedBreedFilter,
    debouncedSizeFilter,
    debouncedAgeGroupFilter,
    debouncedOrganizationFilter,
  ]);

  // Get unique age groups (only show groups that exist in data)
  const uniqueAgeGroups = useMemo(() => {
    const ageGroups = new Set<string>();
    dogs.forEach((dog) => {
      const category = getAgeCategory(dog);
      if (category) {
        ageGroups.add(category);
      }
    });
    // Return in the standard order, but only if they exist in the data
    const orderedGroups = ["Puppy", "Young", "Adult", "Senior", "Unknown"];
    return orderedGroups.filter((g) => ageGroups.has(g));
  }, [dogs]);

  // Check if any filters are active
  const hasActiveFilters =
    (breedFilter && breedFilter !== "_all") ||
    (sizeFilter && sizeFilter !== "_all") ||
    (ageGroupFilter && ageGroupFilter !== "_all") ||
    (organizationFilter && organizationFilter !== "_all");

  const handleApplyFilters = () => {
    // Pass true to indicate user-initiated filter change
    onFilter(filteredDogs, true);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    setBreedFilter("");
    setSizeFilter("");
    setAgeGroupFilter("");
    setOrganizationFilter("");
    onFilter(dogs, true); // Reset to show all dogs (user-initiated)
  };

  // Use a ref to track the previous filteredDogs to avoid infinite loops
  const prevFilteredDogsRef = useRef<Dog[] | null>(null);

  // Auto-apply filters on desktop only (mobile uses Apply button)
  useEffect(() => {
    // Only trigger onFilter if filters were actively changed by user, not on initial load
    if (
      !isMobile &&
      prevFilteredDogsRef.current !== null &&
      prevFilteredDogsRef.current !== filteredDogs
    ) {
      onFilter(filteredDogs, true); // Pass true for user-initiated changes
    }
    prevFilteredDogsRef.current = filteredDogs;
  }, [filteredDogs, isMobile, onFilter]);

  // Handle escape key for mobile bottom sheet
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    if (isMobile) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen, isMobile]);

  // Desktop view: Enhanced inline horizontal dropdowns with icons
  if (!isMobile) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {/* Breed Filter */}
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Dog
              className={`w-4 h-4 transition-colors ${breedFilter ? "text-orange-600" : "text-gray-400"}`}
            />
          </div>
          <Select value={breedFilter} onValueChange={setBreedFilter}>
            <SelectTrigger
              className={`w-[180px] pl-10 pr-10 py-2.5 text-sm font-medium rounded-xl transition-all
              ${
                breedFilter
                  ? "bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-400 dark:border-orange-600 text-orange-900 dark:text-orange-100"
                  : "bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              }
              hover:border-orange-400 dark:hover:border-orange-600
              focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500
              cursor-pointer shadow-sm hover:shadow-md`}
              aria-label="Filter by breed"
            >
              <SelectValue placeholder="All Breeds" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600">
              <SelectItem value="_all" className="font-medium">
                All Breeds
              </SelectItem>
              {uniqueBreeds.map((breed) => (
                <SelectItem key={breed} value={breed}>
                  {breed}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Size Filter */}
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Ruler
              className={`w-4 h-4 transition-colors ${sizeFilter ? "text-purple-600" : "text-gray-400"}`}
            />
          </div>
          <Select value={sizeFilter} onValueChange={setSizeFilter}>
            <SelectTrigger
              className={`w-[180px] pl-10 pr-10 py-2.5 text-sm font-medium rounded-xl transition-all
              ${
                sizeFilter
                  ? "bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-400 dark:border-purple-600 text-purple-900 dark:text-purple-100"
                  : "bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              }
              hover:border-purple-400 dark:hover:border-purple-600
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500
              cursor-pointer shadow-sm hover:shadow-md`}
              aria-label="Filter by size"
            >
              <SelectValue placeholder="All Sizes" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600">
              <SelectItem value="_all" className="font-medium">
                All Sizes
              </SelectItem>
              {uniqueSizes.map((size) => (
                <SelectItem key={size} value={size}>
                  {size === "Tiny" && "🐕 "}
                  {size === "Small" && "🐕‍🦺 "}
                  {size === "Medium" && "🦮 "}
                  {size === "Large" && "🐕‍🦺 "}
                  {size === "XLarge" && "🦮 "}
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Age Group Filter */}
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Calendar
              className={`w-4 h-4 transition-colors ${ageGroupFilter ? "text-green-600" : "text-gray-400"}`}
            />
          </div>
          <Select value={ageGroupFilter} onValueChange={setAgeGroupFilter}>
            <SelectTrigger
              className={`w-[180px] pl-10 pr-10 py-2.5 text-sm font-medium rounded-xl transition-all
              ${
                ageGroupFilter
                  ? "bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-600 text-green-900 dark:text-green-100"
                  : "bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              }
              hover:border-green-400 dark:hover:border-green-600
              focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500
              cursor-pointer shadow-sm hover:shadow-md`}
              aria-label="Filter by age"
            >
              <SelectValue placeholder="All Ages" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600">
              <SelectItem value="_all" className="font-medium">
                All Ages
              </SelectItem>
              {uniqueAgeGroups.map((ageGroup) => {
                const getAgeLabel = (group: string) => {
                  switch (group) {
                    case "Puppy":
                      return "🐶 Puppy (<1 year)";
                    case "Young":
                      return "🐕 Young (1-3 years)";
                    case "Adult":
                      return "🦮 Adult (3-8 years)";
                    case "Senior":
                      return "🐕‍🦺 Senior (8+ years)";
                    case "Unknown":
                      return "❓ Age Unknown";
                    default:
                      return group;
                  }
                };
                return (
                  <SelectItem key={ageGroup} value={ageGroup}>
                    {getAgeLabel(ageGroup)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Organization Filter */}
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Building2
              className={`w-4 h-4 transition-colors ${organizationFilter ? "text-blue-600" : "text-gray-400"}`}
            />
          </div>
          <Select
            value={organizationFilter}
            onValueChange={setOrganizationFilter}
          >
            <SelectTrigger
              className={`w-[200px] pl-10 pr-10 py-2.5 text-sm font-medium rounded-xl transition-all
              ${
                organizationFilter
                  ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-600 text-blue-900 dark:text-blue-100"
                  : "bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300"
              }
              hover:border-blue-400 dark:hover:border-blue-600
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
              cursor-pointer shadow-sm hover:shadow-md`}
              aria-label="Filter by organization"
            >
              <SelectValue placeholder="All Organizations" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600">
              <SelectItem value="_all" className="font-medium">
                All Organizations
              </SelectItem>
              {uniqueOrganizations.map((org) => (
                <SelectItem key={org} value={org}>
                  {org}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-xl px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
          >
            <X size={16} className="mr-1.5" />
            Clear all
          </Button>
        )}

        {/* Active filter badge with animation */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 rounded-full animate-in fade-in slide-in-from-left-1 duration-200">
            <Sparkles className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
              {filteredDogs.length} matched
            </span>
          </div>
        )}
      </div>
    );
  }

  // Mobile view: Enhanced button that opens bottom sheet
  if (!isOpen) {
    const activeCount = [
      breedFilter && breedFilter !== "_all" ? breedFilter : null,
      sizeFilter && sizeFilter !== "_all" ? sizeFilter : null,
      ageGroupFilter && ageGroupFilter !== "_all" ? ageGroupFilter : null,
      organizationFilter && organizationFilter !== "_all"
        ? organizationFilter
        : null,
    ].filter(Boolean).length;
    return (
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className={`w-full sm:w-auto rounded-xl font-medium transition-all shadow-sm hover:shadow-md
          ${
            activeCount > 0
              ? "bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-200 dark:border-orange-800 hover:from-orange-100 hover:to-yellow-100 dark:hover:from-orange-900/30 dark:hover:to-yellow-900/30"
              : "bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700"
          }`}
      >
        <div className="flex items-center justify-center gap-2">
          <Filter
            size={16}
            className={activeCount > 0 ? "text-orange-600" : ""}
          />
          <span>Filter</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 bg-orange-600 text-white text-xs font-bold rounded-full">
              {activeCount}
            </span>
          )}
        </div>
      </Button>
    );
  }

  // Mobile bottom sheet with enhanced design
  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm backdrop animate-in fade-in duration-200"
        onClick={() => setIsOpen(false)}
      />

      {/* Bottom Sheet Panel with animation */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl bottom-sheet max-h-[85vh] overflow-auto animate-in slide-in-from-bottom duration-300"
        role="dialog"
        aria-label="Filter panel"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-14 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        <div className="px-6 pb-6">
          {/* Header with visual feedback */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-orange-500" />
                Filter Your Favorites
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <div
                  className={`text-sm font-medium px-3 py-1 rounded-full ${
                    filteredDogs.length === dogs.length
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                  }`}
                >
                  {filteredDogs.length} of {dogs.length} dogs
                </div>
                {hasActiveFilters && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {
                      [
                        breedFilter && breedFilter !== "_all"
                          ? breedFilter
                          : null,
                        sizeFilter && sizeFilter !== "_all" ? sizeFilter : null,
                        ageGroupFilter && ageGroupFilter !== "_all"
                          ? ageGroupFilter
                          : null,
                        organizationFilter && organizationFilter !== "_all"
                          ? organizationFilter
                          : null,
                      ].filter(Boolean).length
                    }{" "}
                    filters active
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>

          {/* Filters with enhanced styling */}
          <div className="space-y-6">
            {/* Breed Filter */}
            <div className="space-y-2">
              <label
                htmlFor="breed-filter-mobile"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                <Dog className="w-4 h-4 text-orange-500" />
                Breed
              </label>
              <Select value={breedFilter} onValueChange={setBreedFilter}>
                <SelectTrigger
                  id="breed-filter-mobile"
                  className={`w-full px-4 py-3 text-sm font-medium rounded-xl transition-all
                    ${
                      breedFilter
                        ? "bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-400 dark:border-orange-600"
                        : "bg-white dark:bg-gray-900/50 border-2 border-gray-300 dark:border-gray-600"
                    }
                    focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none shadow-sm`}
                >
                  <SelectValue placeholder="All Breeds" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600">
                  <SelectItem value="_all" className="font-medium">
                    All Breeds
                  </SelectItem>
                  {uniqueBreeds.map((breed) => (
                    <SelectItem key={breed} value={breed}>
                      {breed}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Size Filter */}
            <div className="space-y-2">
              <label
                htmlFor="size-filter-mobile"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                <Ruler className="w-4 h-4 text-purple-500" />
                Size
              </label>
              <Select value={sizeFilter} onValueChange={setSizeFilter}>
                <SelectTrigger
                  id="size-filter-mobile"
                  className={`w-full px-4 py-3 text-sm font-medium rounded-xl transition-all
                    ${
                      sizeFilter
                        ? "bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-400 dark:border-purple-600"
                        : "bg-white dark:bg-gray-900/50 border-2 border-gray-300 dark:border-gray-600"
                    }
                    focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none shadow-sm`}
                >
                  <SelectValue placeholder="All Sizes" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600">
                  <SelectItem value="_all" className="font-medium">
                    All Sizes
                  </SelectItem>
                  {uniqueSizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size === "Tiny" && "🐕 "}
                      {size === "Small" && "🐕‍🦺 "}
                      {size === "Medium" && "🦮 "}
                      {size === "Large" && "🐕‍🦺 "}
                      {size === "XLarge" && "🦮 "}
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Age Group Filter */}
            <div className="space-y-2">
              <label
                htmlFor="age-filter-mobile"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                <Calendar className="w-4 h-4 text-green-500" />
                Age Group
              </label>
              <Select value={ageGroupFilter} onValueChange={setAgeGroupFilter}>
                <SelectTrigger
                  id="age-filter-mobile"
                  className={`w-full px-4 py-3 text-sm font-medium rounded-xl transition-all
                    ${
                      ageGroupFilter
                        ? "bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-600"
                        : "bg-white dark:bg-gray-900/50 border-2 border-gray-300 dark:border-gray-600"
                    }
                    focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:outline-none shadow-sm`}
                >
                  <SelectValue placeholder="All Ages" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600">
                  <SelectItem value="_all" className="font-medium">
                    All Ages
                  </SelectItem>
                  {uniqueAgeGroups.map((ageGroup) => {
                    const getAgeLabel = (group: string) => {
                      switch (group) {
                        case "Puppy":
                          return "🐶 Puppy (<1 year)";
                        case "Young":
                          return "🐕 Young (1-3 years)";
                        case "Adult":
                          return "🦮 Adult (3-8 years)";
                        case "Senior":
                          return "🐕‍🦺 Senior (8+ years)";
                        case "Unknown":
                          return "❓ Age Unknown";
                        default:
                          return group;
                      }
                    };
                    return (
                      <SelectItem key={ageGroup} value={ageGroup}>
                        {getAgeLabel(ageGroup)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Organization Filter */}
            <div className="space-y-2">
              <label
                htmlFor="org-filter-mobile"
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                <Building2 className="w-4 h-4 text-blue-500" />
                Organization
              </label>
              <Select
                value={organizationFilter}
                onValueChange={setOrganizationFilter}
              >
                <SelectTrigger
                  id="org-filter-mobile"
                  className={`w-full px-4 py-3 text-sm font-medium rounded-xl transition-all
                    ${
                      organizationFilter
                        ? "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-600"
                        : "bg-white dark:bg-gray-900/50 border-2 border-gray-300 dark:border-gray-600"
                    }
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none shadow-sm`}
                >
                  <SelectValue placeholder="All Organizations" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600">
                  <SelectItem value="_all" className="font-medium">
                    All Organizations
                  </SelectItem>
                  {uniqueOrganizations.map((org) => (
                    <SelectItem key={org} value={org}>
                      {org}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons with enhanced styling */}
          <div className="mt-8 space-y-3 sticky bottom-0 bg-white dark:bg-gray-800 pt-4 pb-2">
            <Button
              onClick={handleApplyFilters}
              className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              Apply Filters
              {hasActiveFilters && ` (${filteredDogs.length} dogs)`}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="w-full border-gray-300 dark:border-gray-600 rounded-xl py-3 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                <X size={16} className="mr-2" />
                Clear All Filters
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
