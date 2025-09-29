"use client";

import React, { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import Image from "next/image";
import type { Dog } from "./types";
import { getAgeDisplay } from "./compareUtils";

interface CompareSelectionProps {
  dogs: Dog[];
  selectedDogs: Set<number>;
  onSelectionChange: (selected: Set<number>) => void;
  onCompare: () => void;
}

const MAX_SELECTIONS = 3;
const MIN_SELECTIONS = 2;

export default function CompareSelection({
  dogs,
  selectedDogs,
  onSelectionChange,
  onCompare,
}: CompareSelectionProps) {
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const toggleDogSelection = useCallback(
    (dogId: number) => {
      const newSet = new Set(selectedDogs);
      if (newSet.has(dogId)) {
        newSet.delete(dogId);
      } else if (newSet.size < MAX_SELECTIONS) {
        newSet.add(dogId);
      }
      onSelectionChange(newSet);
    },
    [selectedDogs, onSelectionChange],
  );

  const handleImageError = useCallback((dogId: number) => {
    setImageErrors((prev) => new Set(prev).add(dogId));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, dogId: number, isDisabled: boolean) => {
      if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        toggleDogSelection(dogId);
      }
    },
    [toggleDogSelection],
  );

  const canCompare = selectedDogs.size >= MIN_SELECTIONS;
  const selectionCount = selectedDogs.size;

  return (
    <div className="space-y-6">
      {/* Selection Counter */}
      <AnimatePresence>
        {selectionCount > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20 rounded-full text-sm font-semibold text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-700/50"
          >
            <div className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full animate-pulse" />
            <span>
              {selectionCount} of {MAX_SELECTIONS} selected
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dogs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {dogs.map((dog, index) => {
          const isSelected = selectedDogs.has(dog.id);
          const isDisabled = !isSelected && selectedDogs.size >= MAX_SELECTIONS;
          const hasImageError = imageErrors.has(dog.id);
          const imageUrl = hasImageError
            ? "/placeholder-dog.jpg"
            : dog.primary_image_url || "/placeholder-dog.jpg";
          const breed = dog.standardized_breed || dog.breed || "Unknown breed";
          const ageDisplay = getAgeDisplay(dog);

          return (
            <motion.div
              key={dog.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.05,
                type: "spring",
                stiffness: 200,
              }}
              whileHover={!isDisabled ? { y: -4 } : undefined}
              className="relative group"
            >
              <div
                data-testid={`dog-card-${dog.id}`}
                onClick={() => !isDisabled && toggleDogSelection(dog.id)}
                onKeyDown={(e) => handleKeyDown(e, dog.id, isDisabled)}
                role="button"
                tabIndex={isDisabled ? -1 : 0}
                aria-label={`${isSelected ? "Deselect" : "Select"} ${dog.name} for comparison`}
                aria-pressed={isSelected}
                aria-disabled={isDisabled}
                className={`relative cursor-pointer rounded-xl overflow-hidden transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 ${
                  isSelected
                    ? "ring-2 ring-orange-500 dark:ring-orange-400 border-2 border-orange-500 dark:border-orange-400 bg-gradient-to-br from-orange-50 to-transparent dark:from-orange-900/20 dark:to-transparent shadow-xl shadow-orange-500/20 dark:shadow-orange-400/20"
                    : "border-2 border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600"
                } ${
                  isDisabled
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:shadow-lg dark:hover:shadow-2xl hover:shadow-gray-400/20 dark:hover:shadow-black/40"
                }`}
              >
                {/* Image Container */}
                <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <Image
                    src={imageUrl}
                    alt={`${dog.name} - ${breed}`}
                    fill
                    className={`object-cover transition-transform duration-500 ${
                      !isDisabled ? "group-hover:scale-105" : ""
                    }`}
                    sizes="(max-width: 768px) 50vw, 33vw"
                    loading="lazy"
                    onError={() => handleImageError(dog.id)}
                  />

                  {/* Selection Overlay */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-gradient-to-t from-orange-500/30 via-orange-500/20 to-transparent dark:from-orange-400/40 dark:via-orange-400/25 flex items-center justify-center backdrop-blur-[1px]"
                      >
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 180 }}
                          transition={{ type: "spring", damping: 15 }}
                          className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-400 dark:to-orange-500 rounded-full flex items-center justify-center shadow-2xl"
                        >
                          <Check
                            size={28}
                            className="text-white"
                            strokeWidth={3}
                          />
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Hover Gradient Overlay */}
                  {!isDisabled && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  )}

                  {/* Selection Badge */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, x: -20 }}
                        animate={{ scale: 1, x: 0 }}
                        exit={{ scale: 0, x: -20 }}
                        className="absolute top-2 left-2 bg-orange-500 dark:bg-orange-400 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg"
                      >
                        Selected
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Dog Info */}
                <div className="p-4 bg-white dark:bg-gray-800">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-1 truncate">
                    {dog.name}
                  </h3>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {ageDisplay}
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {breed}
                    </p>
                  </div>
                </div>

                {/* Animated Selection Ring */}
                <motion.div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  animate={{
                    boxShadow: isSelected
                      ? "0 0 0 4px rgba(249, 115, 22, 0.2), 0 0 20px rgba(249, 115, 22, 0.3)"
                      : "0 0 0 0px rgba(249, 115, 22, 0)",
                  }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
          {selectionCount === 0 &&
            `Select at least ${MIN_SELECTIONS} dogs to compare`}
          {selectionCount === 1 &&
            `Select ${MIN_SELECTIONS - 1} more dog to compare`}
          {selectionCount >= MIN_SELECTIONS && (
            <span className="text-green-600 dark:text-green-400">
              Ready to compare {selectionCount} dogs
            </span>
          )}
        </div>

        <motion.button
          onClick={onCompare}
          disabled={!canCompare}
          animate={{
            scale: canCompare ? 1 : 0.95,
            opacity: canCompare ? 1 : 0.7,
          }}
          whileHover={canCompare ? { scale: 1.05 } : undefined}
          whileTap={canCompare ? { scale: 0.98 } : undefined}
          transition={{ type: "spring", duration: 0.2 }}
          className={`px-8 py-3 rounded-lg font-semibold text-white transition-all duration-300 ${
            canCompare
              ? "bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-400 dark:to-orange-500 hover:from-orange-600 hover:to-orange-700 dark:hover:from-orange-500 dark:hover:to-orange-600 shadow-lg hover:shadow-xl shadow-orange-500/25 dark:shadow-orange-400/25"
              : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
          }`}
        >
          Compare Selected
          {canCompare && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-2 inline-flex items-center justify-center w-6 h-6 bg-white/20 dark:bg-black/20 rounded-full text-sm"
            >
              {selectionCount}
            </motion.span>
          )}
        </motion.button>
      </div>
    </div>
  );
}
