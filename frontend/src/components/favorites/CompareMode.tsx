"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Check,
  ArrowLeft,
  Heart,
  MapPin,
  Calendar,
  Ruler,
  Users,
  Cat,
  Dog as DogIcon,
  Baby,
  Home,
  AlertCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  analyzeComparison,
  type Dog as AnalyzerDog,
} from "../../utils/comparisonAnalyzer";

interface Dog {
  id: number;
  name: string;
  breed?: string;
  standardized_breed?: string;
  age_months?: number;
  age_min_months?: number;
  age_max_months?: number;
  age_text?: string;
  sex?: string;
  size?: string;
  standardized_size?: string;
  organization_name?: string;
  organization?: {
    name: string;
    country: string;
  };
  location?: string;
  ships_to?: string[];
  description?: string;
  main_image?: string;
  primary_image_url?: string;
  adoption_url?: string;
  properties?: {
    personality?: string;
    good_with?: string;
    good_with_dogs?: boolean | string;
    good_with_cats?: boolean | string;
    good_with_children?: boolean | string;
    good_with_list?: string[];
    description?: string;
    location?: string;
    weight?: string;
    house_trained?: boolean;
    special_needs?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
}

interface CompareModeProps {
  dogs: Dog[];
  onClose: () => void;
}

export default function CompareMode({ dogs, onClose }: CompareModeProps) {
  const [selectedDogs, setSelectedDogs] = useState<Set<number>>(new Set());
  const [isComparing, setIsComparing] = useState(false);
  const MAX_SELECTIONS = 3;

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

  const toggleDogSelection = (dogId: number) => {
    setSelectedDogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dogId)) {
        newSet.delete(dogId);
      } else if (newSet.size < MAX_SELECTIONS) {
        newSet.add(dogId);
      }
      return newSet;
    });
  };

  const handleCompare = () => {
    if (selectedDogs.size >= 2) {
      setIsComparing(true);
    }
  };

  const handleBackToSelection = () => {
    setIsComparing(false);
  };

  const getSelectedDogData = (): Dog[] => {
    return dogs.filter((dog) => selectedDogs.has(dog.id));
  };

  const renderSelectionView = () => (
    <>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold">Select Dogs to Compare</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Choose 2-3 dogs to compare side by side
            </p>
          </div>
          {selectedDogs.size > 0 && (
            <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm font-medium">
              {selectedDogs.size} of 3 selected
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        {dogs.map((dog) => {
          const isSelected = selectedDogs.has(dog.id);
          const isDisabled = !isSelected && selectedDogs.size >= MAX_SELECTIONS;
          const imageUrl = dog.primary_image_url || dog.main_image;

          return (
            <div
              key={dog.id}
              onClick={() => !isDisabled && toggleDogSelection(dog.id)}
              className={`relative border-2 rounded-lg overflow-hidden transition-all cursor-pointer ${
                isSelected
                  ? "border-orange-600 bg-orange-50 dark:bg-orange-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              } ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-md hover:-translate-y-0.5"}`}
            >
              {/* Checkmark overlay for selected state */}
              {isSelected && (
                <div className="absolute top-3 right-3 z-10 w-7 h-7 bg-orange-600 rounded-full flex items-center justify-center">
                  <Check size={16} className="text-white" />
                </div>
              )}

              {/* Dog image */}
              {imageUrl && (
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={dog.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Dog info */}
              <div className="p-3">
                <h3 className="font-semibold text-sm md:text-base">
                  {dog.name}
                </h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {getAgeDisplay(dog)}
                </p>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  {dog.standardized_breed || dog.breed || "Mixed breed"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mini avatar bar and actions */}
      <div className="flex justify-between items-center border-t pt-4">
        <div className="flex items-center gap-2">
          {Array.from(selectedDogs).map((dogId) => {
            const dog = dogs.find((d) => d.id === dogId);
            if (!dog) return null;
            const imageUrl = dog.primary_image_url || dog.main_image;

            return (
              <div key={dogId} className="relative">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={dog.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-gray-800 shadow-sm"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-800 shadow-sm flex items-center justify-center">
                    <DogIcon size={16} className="text-gray-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCompare}
            disabled={selectedDogs.size < 2}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Compare {selectedDogs.size > 0 ? `(${selectedDogs.size})` : "Dogs"}
          </Button>
        </div>
      </div>
    </>
  );

  // Helper functions for extracting data from properties
  const getPersonalityTraits = (dog: Dog): string[] => {
    if (!dog.properties?.personality) return [];
    // Split personality string by common delimiters
    return dog.properties.personality
      .split(/[,;]/)
      .map((trait) => trait.trim())
      .filter((trait) => trait.length > 0);
  };

  const getCompatibility = (dog: Dog): string[] => {
    const compatibility = [];

    // Check properties for good_with data
    if (dog.properties?.good_with_list) {
      if (dog.properties.good_with_list.includes("dogs"))
        compatibility.push("Dogs");
      if (dog.properties.good_with_list.includes("cats"))
        compatibility.push("Cats");
      if (dog.properties.good_with_list.includes("children"))
        compatibility.push("Children");
    } else if (dog.properties?.good_with) {
      // Parse the good_with string
      const goodWith = dog.properties.good_with.toLowerCase();
      if (goodWith.includes("dog")) compatibility.push("Dogs");
      if (goodWith.includes("cat")) compatibility.push("Cats");
      if (goodWith.includes("child")) compatibility.push("Children");
    } else {
      // Check individual boolean fields
      if (
        dog.properties?.good_with_dogs === true ||
        dog.properties?.good_with_dogs === "yes"
      ) {
        compatibility.push("Dogs");
      }
      if (
        dog.properties?.good_with_cats === true ||
        dog.properties?.good_with_cats === "yes"
      ) {
        compatibility.push("Cats");
      }
      if (
        dog.properties?.good_with_children === true ||
        dog.properties?.good_with_children === "yes"
      ) {
        compatibility.push("Children");
      }
    }

    return compatibility;
  };

  const getAgeDisplay = (dog: Dog): string => {
    if (dog.age_text) return dog.age_text;
    if (dog.age_min_months && dog.age_max_months) {
      const minYears = Math.floor(dog.age_min_months / 12);
      const maxYears = Math.floor(dog.age_max_months / 12);
      if (minYears === maxYears) {
        return `${minYears} year${minYears !== 1 ? "s" : ""}`;
      }
      return `${minYears}-${maxYears} years`;
    }
    if (dog.age_months) {
      const years = Math.floor(dog.age_months / 12);
      const months = dog.age_months % 12;
      if (years > 0) {
        return `${years} year${years !== 1 ? "s" : ""}${months > 0 ? ` ${months} mo` : ""}`;
      }
      return `${months} month${months !== 1 ? "s" : ""}`;
    }
    return "Age unknown";
  };

  const renderComparisonView = () => {
    const dogsToCompare = getSelectedDogData();
    const comparisonData = analyzeComparison(dogsToCompare as AnalyzerDog[]);
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    if (isMobile) {
      // Mobile view - Table layout
      return (
        <>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-bold">Compare Dogs</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Side-by-side comparison of your favorites
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Mobile Comparison Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden mb-4">
            {/* Sticky header with dog photos */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `100px repeat(${dogsToCompare.length}, 1fr)`,
                }}
              >
                <div></div>
                {dogsToCompare.map((dog) => {
                  const imageUrl = dog.primary_image_url || dog.main_image;
                  return (
                    <div key={dog.id} className="p-3 text-center">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={dog.name}
                          className="w-12 h-12 rounded-full object-cover mx-auto mb-1"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-1 flex items-center justify-center">
                          <DogIcon size={20} className="text-gray-500" />
                        </div>
                      )}
                      <h3 className="font-semibold text-sm">{dog.name}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {dog.standardized_breed || dog.breed || "Mixed Breed"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comparison rows */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {/* Age row */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `100px repeat(${dogsToCompare.length}, 1fr)`,
                }}
              >
                <div className="p-3 text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Calendar size={14} />
                  <span>Age</span>
                </div>
                {comparisonData.age?.values.map((value, idx) => (
                  <div
                    key={idx}
                    className={`p-3 text-sm text-center ${
                      comparisonData.age.highlight[idx]
                        ? "text-orange-600 dark:text-orange-400 font-semibold"
                        : comparisonData.age.allSame
                          ? "text-gray-400 dark:text-gray-500"
                          : ""
                    }`}
                  >
                    {value}
                  </div>
                ))}
              </div>

              {/* Sex row */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `100px repeat(${dogsToCompare.length}, 1fr)`,
                }}
              >
                <div className="p-3 text-xs font-medium text-gray-600 dark:text-gray-400">
                  Sex
                </div>
                {comparisonData.sex?.values.map((value, idx) => (
                  <div
                    key={idx}
                    className={`p-3 text-sm text-center ${
                      comparisonData.sex.highlight[idx]
                        ? "text-orange-600 dark:text-orange-400 font-semibold"
                        : comparisonData.sex.allSame
                          ? "text-gray-400 dark:text-gray-500"
                          : ""
                    }`}
                  >
                    {value}
                  </div>
                ))}
              </div>

              {/* Size row */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `100px repeat(${dogsToCompare.length}, 1fr)`,
                }}
              >
                <div className="p-3 text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Ruler size={14} />
                  <span>Size</span>
                </div>
                {comparisonData.size?.values.map((value, idx) => (
                  <div
                    key={idx}
                    className={`p-3 text-sm text-center ${
                      comparisonData.size.allSame
                        ? "text-gray-400 dark:text-gray-500"
                        : ""
                    }`}
                  >
                    {value || "Unknown"}
                  </div>
                ))}
              </div>

              {/* Location row */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `100px repeat(${dogsToCompare.length}, 1fr)`,
                }}
              >
                <div className="p-3 text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <MapPin size={14} />
                  <span>Location</span>
                </div>
                {dogsToCompare.map((dog, idx) => {
                  const location =
                    dog.location ||
                    dog.properties?.location ||
                    dog.organization?.country ||
                    "Unknown";
                  return (
                    <div
                      key={dog.id}
                      className={`p-3 text-sm text-center ${
                        comparisonData.location?.highlight[idx]
                          ? "text-orange-600 dark:text-orange-400 font-semibold"
                          : comparisonData.location?.allSame
                            ? "text-gray-400 dark:text-gray-500"
                            : ""
                      }`}
                    >
                      {location}
                    </div>
                  );
                })}
              </div>

              {/* Good with section */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `100px repeat(${dogsToCompare.length}, 1fr)`,
                }}
              >
                <div className="p-3 text-xs font-medium text-gray-600 dark:text-gray-400">
                  Good with
                </div>
                {dogsToCompare.map((dog, idx) => (
                  <div
                    key={dog.id}
                    className="p-3 flex flex-col items-center gap-1"
                  >
                    {comparisonData.good_with_dogs?.values[idx] && (
                      <span className="text-green-600 dark:text-green-400 text-xs">
                        ✓ Dogs
                      </span>
                    )}
                    {comparisonData.good_with_cats?.values[idx] && (
                      <span className="text-green-600 dark:text-green-400 text-xs">
                        ✓ Cats
                      </span>
                    )}
                    {comparisonData.good_with_children?.values[idx] && (
                      <span className="text-green-600 dark:text-green-400 text-xs">
                        ✓ Kids
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Organization row */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `100px repeat(${dogsToCompare.length}, 1fr)`,
                }}
              >
                <div className="p-3 text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Users size={14} />
                  <span>Rescue</span>
                </div>
                {comparisonData.organization?.values.map((value, idx) => (
                  <div
                    key={idx}
                    className="p-3 text-xs text-center text-gray-600 dark:text-gray-400"
                  >
                    {value}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Individual descriptions */}
          <div className="space-y-4 mb-6">
            {dogsToCompare.map((dog) => {
              const description =
                dog.properties?.description || dog.description;
              if (!description) return null;

              return (
                <div
                  key={dog.id}
                  className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4"
                >
                  <h4 className="font-semibold text-sm mb-2">{dog.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {description}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <Users size={12} />
                    <span>
                      {dog.organization_name || dog.organization?.name}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Comparing {dogsToCompare.length} dogs from{" "}
            {comparisonData.organization?.allSame
              ? "1 organization"
              : "multiple organizations"}
          </div>
        </>
      );
    }

    // Desktop view - Cards + Table
    return (
      <>
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

        {/* Desktop Dog Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {dogsToCompare.map((dog) => {
            const imageUrl = dog.primary_image_url || dog.main_image;
            const orgName = dog.organization_name || dog.organization?.name;
            const location =
              dog.location ||
              dog.properties?.location ||
              dog.organization?.country ||
              "Unknown";
            const description = dog.properties?.description || dog.description;

            return (
              <div
                key={dog.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="flex p-4">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={dog.name}
                      className="w-24 h-24 rounded-lg object-cover mr-4"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold">{dog.name}</h3>
                      <Heart className="w-5 h-5 text-red-500 fill-current" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {dog.standardized_breed || dog.breed || "Mixed Breed"}
                    </p>
                    <div className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>
                          {getAgeDisplay(dog)} • {dog.sex}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Ruler size={12} />
                        <span>
                          {dog.standardized_size || dog.size || "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                    Location:
                  </div>
                  <p className="text-sm font-medium mb-3">{location}</p>

                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                    Good with
                  </div>
                  <div className="flex gap-2 mb-3">
                    {comparisonData.good_with_dogs?.values[
                      dogsToCompare.indexOf(dog)
                    ] && (
                      <span className="text-green-600 dark:text-green-400 text-sm">
                        ✓ Dogs
                      </span>
                    )}
                    {comparisonData.good_with_cats?.values[
                      dogsToCompare.indexOf(dog)
                    ] && (
                      <span className="text-green-600 dark:text-green-400 text-sm">
                        ✓ Cats
                      </span>
                    )}
                    {comparisonData.good_with_children?.values[
                      dogsToCompare.indexOf(dog)
                    ] && (
                      <span className="text-green-600 dark:text-green-400 text-sm">
                        ✓ Kids
                      </span>
                    )}
                  </div>

                  {description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                      {description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                        {orgName}
                      </div>
                    </div>
                    {dog.adoption_url ? (
                      <a
                        href={dog.adoption_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-8 px-3 text-sm font-medium rounded-md bg-orange-600 hover:bg-orange-700 text-white transition-colors"
                      >
                        Visit {dog.name}
                      </a>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                        disabled
                      >
                        Visit {dog.name}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Comparison Table */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span className="text-lg">📊</span>
            Quick Comparison
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                    Attribute
                  </th>
                  {dogsToCompare.map((dog) => (
                    <th
                      key={dog.id}
                      className="text-center py-2 px-3 font-medium"
                    >
                      {dog.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Age
                  </td>
                  {comparisonData.age?.values.map((value, idx) => (
                    <td
                      key={idx}
                      className={`py-2 px-3 text-center ${
                        comparisonData.age.highlight[idx]
                          ? "text-orange-600 dark:text-orange-400 font-semibold"
                          : comparisonData.age.allSame
                            ? "text-gray-400 dark:text-gray-500"
                            : ""
                      }`}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Sex
                  </td>
                  {comparisonData.sex?.values.map((value, idx) => (
                    <td
                      key={idx}
                      className={`py-2 px-3 text-center ${
                        comparisonData.sex.highlight[idx]
                          ? "text-orange-600 dark:text-orange-400 font-semibold"
                          : comparisonData.sex.allSame
                            ? "text-gray-400 dark:text-gray-500"
                            : ""
                      }`}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Size
                  </td>
                  {comparisonData.size?.values.map((value, idx) => (
                    <td
                      key={idx}
                      className={`py-2 px-3 text-center ${
                        comparisonData.size.allSame
                          ? "text-gray-400 dark:text-gray-500"
                          : ""
                      }`}
                    >
                      {value || "Unknown"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Breed
                  </td>
                  {comparisonData.breed?.values.map((value, idx) => (
                    <td
                      key={idx}
                      className={`py-2 px-3 text-center ${
                        comparisonData.breed.highlight[idx]
                          ? "text-orange-600 dark:text-orange-400 font-semibold"
                          : comparisonData.breed.allSame
                            ? "text-gray-400 dark:text-gray-500"
                            : ""
                      }`}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Location
                  </td>
                  {dogsToCompare.map((dog, idx) => {
                    const location =
                      dog.location ||
                      dog.properties?.location ||
                      dog.organization?.country ||
                      "Unknown";
                    return (
                      <td
                        key={dog.id}
                        className={`py-2 px-3 text-center ${
                          comparisonData.location?.allSame
                            ? "text-gray-400 dark:text-gray-500"
                            : ""
                        }`}
                      >
                        {location}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Organization
                  </td>
                  {comparisonData.organization?.values.map((value, idx) => (
                    <td
                      key={idx}
                      className="py-2 px-3 text-center text-gray-600 dark:text-gray-400"
                    >
                      {value}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Good with Dogs
                  </td>
                  {comparisonData.good_with_dogs?.values.map((value, idx) => (
                    <td key={idx} className="py-2 px-3 text-center">
                      {value ? (
                        <span className="text-green-600">✓ Yes</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Good with Cats
                  </td>
                  {comparisonData.good_with_cats?.values.map((value, idx) => (
                    <td key={idx} className="py-2 px-3 text-center">
                      {value ? (
                        <span className="text-green-600">✓ Yes</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                    Good with Kids
                  </td>
                  {comparisonData.good_with_children?.values.map(
                    (value, idx) => (
                      <td key={idx} className="py-2 px-3 text-center">
                        {value ? (
                          <span className="text-green-600">✓ Yes</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    ),
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
          Comparing {dogsToCompare.length} dogs •{" "}
          {comparisonData.organization?.allSame
            ? "1 organization"
            : "Multiple organizations"}
        </div>
      </>
    );
  };

  // Check for mobile viewport
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl ${
          isMobile ? "w-full h-full" : "w-full max-w-6xl max-h-[90vh]"
        } overflow-auto`}
        role="dialog"
        aria-label="Compare dogs"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {dogs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">
                Select 2-3 dogs to compare
              </p>
              <Button variant="outline" onClick={onClose} className="mt-4">
                Close
              </Button>
            </div>
          ) : isComparing ? (
            renderComparisonView()
          ) : (
            renderSelectionView()
          )}
        </div>
      </div>
    </div>
  );
}
