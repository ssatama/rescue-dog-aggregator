"use client";

import React from "react";
import Image from "next/image";
import { Check, Dog as DogIcon } from "lucide-react";
import { Button } from "../ui/button";
import type { Dog } from "./types";

interface CompareSelectionProps {
  dogs: Dog[];
  selectedDogs: Set<number>;
  onSelectionChange: (selected: Set<number>) => void;
  onCompare: () => void;
}

const MAX_SELECTIONS = 3;

export default function CompareSelection({
  dogs,
  selectedDogs,
  onSelectionChange,
  onCompare,
}: CompareSelectionProps) {
  const toggleDogSelection = (dogId: number) => {
    const newSet = new Set(selectedDogs);
    if (newSet.has(dogId)) {
      newSet.delete(dogId);
    } else if (newSet.size < MAX_SELECTIONS) {
      newSet.add(dogId);
    }
    onSelectionChange(newSet);
  };

  return (
    <div className="space-y-6">
      {/* Selection info */}
      {selectedDogs.size > 0 && (
        <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">
          {selectedDogs.size} selected
        </div>
      )}

      {/* Dogs grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {dogs.map((dog) => {
          const isSelected = selectedDogs.has(dog.id);
          const isDisabled = !isSelected && selectedDogs.size >= MAX_SELECTIONS;
          const imageUrl = dog.primary_image_url || dog.main_image;

          return (
            <div
              key={dog.id}
              data-testid={`dog-card-${dog.id}`}
              className={`relative border-2 rounded-lg overflow-hidden transition-all ${
                isSelected
                  ? "ring-2 ring-orange-500 border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                  : "border-gray-200 dark:border-gray-700"
              } ${
                isDisabled
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:shadow-md"
              }`}
            >
              {/* Selection checkbox */}
              <div className="absolute top-3 left-3 z-10">
                <input
                  type="checkbox"
                  id={`select-dog-${dog.id}`}
                  checked={isSelected}
                  disabled={isDisabled}
                  onChange={() => toggleDogSelection(dog.id)}
                  aria-label={`Select ${dog.name}`}
                  aria-disabled={isDisabled}
                  className="sr-only"
                />
                <label
                  htmlFor={`select-dog-${dog.id}`}
                  className={`flex items-center justify-center w-6 h-6 rounded border-2 transition-colors ${
                    isSelected
                      ? "bg-orange-500 border-orange-500"
                      : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                  } ${!isDisabled ? "cursor-pointer" : "cursor-not-allowed"}`}
                >
                  {isSelected && <Check size={16} className="text-white" />}
                </label>
              </div>

              {/* Dog image or placeholder */}
              <div className="relative h-48 bg-gray-100 dark:bg-gray-800">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={dog.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                ) : (
                  <div
                    data-testid={`dog-placeholder-${dog.id - 1}`}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <DogIcon size={48} className="text-gray-400" />
                  </div>
                )}
              </div>

              {/* Dog info */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => !isDisabled && toggleDogSelection(dog.id)}
              >
                <h3 className="font-semibold text-lg">{dog.name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {dog.breed || "Unknown breed"}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {dog.age_text} • {dog.sex}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  {dog.organization_name}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Compare button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={onCompare}
          disabled={selectedDogs.size < 2}
          className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
        >
          Compare {selectedDogs.size > 0 ? `(${selectedDogs.size})` : "Selected"}
        </Button>
      </div>
    </div>
  );
}