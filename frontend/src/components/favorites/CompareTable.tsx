"use client";

import React from "react";
import { Brain } from "lucide-react";
import {
  getCompatibility,
  formatEnergyLevel,
  formatExperienceLevel,
} from "./compareUtils";
import type { Dog } from "./types";

interface CompareTableProps {
  dogs: Dog[];
  comparisonData: any;
}

function getCompatibilityIcon(value: string) {
  switch (value) {
    case "yes":
      return (
        <span className="text-green-600 dark:text-green-400 text-lg font-bold">
          ✓
        </span>
      );
    case "no":
      return (
        <span className="text-red-600 dark:text-red-400 text-lg font-bold">
          ✗
        </span>
      );
    case "maybe":
      return (
        <span className="text-amber-600 dark:text-amber-400 text-lg font-bold">
          ?
        </span>
      );
    default:
      return <span className="text-gray-400 dark:text-gray-500">-</span>;
  }
}

function getEnergyIndicator(level: string) {
  const formattedLevel = formatEnergyLevel(level);
  const levelValue = level.toLowerCase();

  let barCount = 1;
  let colorClass = "bg-gray-300 dark:bg-gray-600";

  if (levelValue.includes("very_high")) {
    barCount = 5;
    colorClass = "bg-red-500 dark:bg-red-400";
  } else if (levelValue.includes("high")) {
    barCount = 4;
    colorClass = "bg-orange-500 dark:bg-orange-400";
  } else if (levelValue.includes("medium") || levelValue.includes("moderate")) {
    barCount = 3;
    colorClass = "bg-yellow-500 dark:bg-yellow-400";
  } else if (levelValue.includes("low") || levelValue.includes("minimal")) {
    barCount = 2;
    colorClass = "bg-green-500 dark:bg-green-400";
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((bar) => (
          <div
            key={bar}
            className={`w-2 h-3 rounded-sm ${
              bar <= barCount ? colorClass : "bg-gray-200 dark:bg-gray-700"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400">
        {formattedLevel}
      </span>
    </div>
  );
}

// Helper functions to check if ALL dogs have complete data for each field
function allDogsHaveTaglines(dogs: Dog[]): boolean {
  return dogs.every(
    (dog) =>
      dog.dog_profiler_data?.tagline &&
      dog.dog_profiler_data.tagline.trim().length > 0,
  );
}

function allDogsHaveEnergyLevel(dogs: Dog[]): boolean {
  return dogs.every(
    (dog) =>
      dog.dog_profiler_data?.energy_level &&
      dog.dog_profiler_data.energy_level.trim().length > 0,
  );
}

function allDogsHaveExperienceLevel(dogs: Dog[]): boolean {
  return dogs.every(
    (dog) =>
      dog.dog_profiler_data?.experience_level &&
      dog.dog_profiler_data.experience_level.trim().length > 0,
  );
}

function allDogsHaveCompatibilityData(dogs: Dog[]): boolean {
  return dogs.every((dog) => {
    const compatibility = getCompatibility(dog);
    // Only consider yes/no/maybe as complete data
    const isValidValue = (value: string) =>
      value === "yes" || value === "no" || value === "maybe";

    return (
      isValidValue(compatibility.dogs) &&
      isValidValue(compatibility.cats) &&
      isValidValue(compatibility.children)
    );
  });
}

export default function CompareTable({
  dogs,
  comparisonData,
}: CompareTableProps) {
  return (
    <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mb-6">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Detailed Comparison
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white text-sm tracking-wide">
                Attribute
              </th>
              {dogs.map((dog) => (
                <th
                  key={dog.id}
                  className="text-center py-4 px-4 min-w-[140px]"
                >
                  <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {dog.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Create rows with zebra striping */}
            {(() => {
              const rows = [];
              let rowIndex = 0;

              // Tagline Row - only show if ALL dogs have taglines
              if (allDogsHaveTaglines(dogs)) {
                rows.push(
                  <tr
                    key="tagline"
                    className={
                      rowIndex % 2 === 0
                        ? "bg-gray-50/50 dark:bg-gray-800/30"
                        : "bg-white dark:bg-transparent"
                    }
                  >
                    <td className="py-4 px-6 font-medium text-gray-700 dark:text-gray-300 text-sm">
                      Tagline
                    </td>
                    {dogs.map((dog) => (
                      <td key={dog.id} className="py-4 px-4 text-center">
                        <div className="text-xs italic text-gray-600 dark:text-gray-400 max-w-[120px] mx-auto leading-relaxed">
                          &ldquo;{dog.dog_profiler_data!.tagline}&rdquo;
                        </div>
                      </td>
                    ))}
                  </tr>,
                );
                rowIndex++;
              }

              // Energy Level - only show if ALL dogs have energy level data
              if (allDogsHaveEnergyLevel(dogs)) {
                rows.push(
                  <tr
                    key="energy"
                    className={
                      rowIndex % 2 === 0
                        ? "bg-gray-50/50 dark:bg-gray-800/30"
                        : "bg-white dark:bg-transparent"
                    }
                  >
                    <td className="py-4 px-6 font-medium text-gray-700 dark:text-gray-300 text-sm">
                      Energy Level
                    </td>
                    {dogs.map((dog) => (
                      <td key={dog.id} className="py-4 px-4 text-center">
                        {getEnergyIndicator(
                          dog.dog_profiler_data!.energy_level!,
                        )}
                      </td>
                    ))}
                  </tr>,
                );
                rowIndex++;
              }

              // Experience Level - only show if ALL dogs have experience level data
              if (allDogsHaveExperienceLevel(dogs)) {
                rows.push(
                  <tr
                    key="experience"
                    className={
                      rowIndex % 2 === 0
                        ? "bg-gray-50/50 dark:bg-gray-800/30"
                        : "bg-white dark:bg-transparent"
                    }
                  >
                    <td className="py-4 px-6 font-medium text-gray-700 dark:text-gray-300 text-sm">
                      Experience Needed
                    </td>
                    {dogs.map((dog) => (
                      <td key={dog.id} className="py-4 px-4 text-center">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatExperienceLevel(
                            dog.dog_profiler_data!.experience_level!,
                          )}
                        </span>
                      </td>
                    ))}
                  </tr>,
                );
                rowIndex++;
              }

              // Age
              rows.push(
                <tr
                  key="age"
                  className={
                    rowIndex % 2 === 0
                      ? "bg-gray-50/50 dark:bg-gray-800/30"
                      : "bg-white dark:bg-transparent"
                  }
                >
                  <td className="py-4 px-6 font-medium text-gray-700 dark:text-gray-300 text-sm">
                    Age
                  </td>
                  {comparisonData.age?.values.map(
                    (value: string, idx: number) => (
                      <td key={idx} className="py-4 px-4 text-center">
                        <span
                          className={`text-sm font-medium ${
                            comparisonData.age.highlight[idx]
                              ? "text-orange-600 dark:text-orange-400 font-semibold bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-md"
                              : comparisonData.age.allSame
                                ? "text-gray-500 dark:text-gray-400"
                                : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          {value}
                        </span>
                      </td>
                    ),
                  )}
                </tr>,
              );
              rowIndex++;

              // Size
              rows.push(
                <tr
                  key="size"
                  className={
                    rowIndex % 2 === 0
                      ? "bg-gray-50/50 dark:bg-gray-800/30"
                      : "bg-white dark:bg-transparent"
                  }
                >
                  <td className="py-4 px-6 font-medium text-gray-700 dark:text-gray-300 text-sm">
                    Size
                  </td>
                  {comparisonData.size?.values.map(
                    (value: string, idx: number) => (
                      <td key={idx} className="py-4 px-4 text-center">
                        <span
                          className={`text-sm font-medium ${
                            comparisonData.size.allSame
                              ? "text-gray-500 dark:text-gray-400"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          {value}
                        </span>
                      </td>
                    ),
                  )}
                </tr>,
              );
              rowIndex++;

              return rows;
            })()}

            {/* Compatibility Rows - only show if ALL dogs have complete compatibility data */}
            {allDogsHaveCompatibilityData(dogs) &&
              (() => {
                const compatibilityRows = [];
                const startRowIndex = (() => {
                  let count = 2; // Age and Size are always shown
                  if (allDogsHaveTaglines(dogs)) count++;
                  if (allDogsHaveEnergyLevel(dogs)) count++;
                  if (allDogsHaveExperienceLevel(dogs)) count++;
                  return count;
                })();

                // Good with Dogs
                compatibilityRows.push(
                  <tr
                    key="dogs-compat"
                    className={
                      startRowIndex % 2 === 0
                        ? "bg-gray-50/50 dark:bg-gray-800/30"
                        : "bg-white dark:bg-transparent"
                    }
                  >
                    <td className="py-4 px-6 font-medium text-gray-700 dark:text-gray-300 text-sm">
                      Good with Dogs
                    </td>
                    {dogs.map((dog) => {
                      const compatibility = getCompatibility(dog);
                      return (
                        <td key={dog.id} className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {getCompatibilityIcon(compatibility.dogs)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>,
                );

                // Good with Cats
                compatibilityRows.push(
                  <tr
                    key="cats-compat"
                    className={
                      (startRowIndex + 1) % 2 === 0
                        ? "bg-gray-50/50 dark:bg-gray-800/30"
                        : "bg-white dark:bg-transparent"
                    }
                  >
                    <td className="py-4 px-6 font-medium text-gray-700 dark:text-gray-300 text-sm">
                      Good with Cats
                    </td>
                    {dogs.map((dog) => {
                      const compatibility = getCompatibility(dog);
                      return (
                        <td key={dog.id} className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {getCompatibilityIcon(compatibility.cats)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>,
                );

                // Good with Children
                compatibilityRows.push(
                  <tr
                    key="children-compat"
                    className={
                      (startRowIndex + 2) % 2 === 0
                        ? "bg-gray-50/50 dark:bg-gray-800/30"
                        : "bg-white dark:bg-transparent"
                    }
                  >
                    <td className="py-4 px-6 font-medium text-gray-700 dark:text-gray-300 text-sm">
                      Good with Children
                    </td>
                    {dogs.map((dog) => {
                      const compatibility = getCompatibility(dog);
                      return (
                        <td key={dog.id} className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {getCompatibilityIcon(compatibility.children)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>,
                );

                return compatibilityRows;
              })()}

            {/* Organization and Location - always at the end */}
            {(() => {
              const finalRows = [];
              const finalStartIndex = (() => {
                let count = 2; // Age and Size are always shown
                if (allDogsHaveTaglines(dogs)) count++;
                if (allDogsHaveEnergyLevel(dogs)) count++;
                if (allDogsHaveExperienceLevel(dogs)) count++;
                if (allDogsHaveCompatibilityData(dogs)) count += 3; // 3 compatibility rows
                return count;
              })();

              // Organization
              finalRows.push(
                <tr
                  key="organization"
                  className={
                    finalStartIndex % 2 === 0
                      ? "bg-gray-50/50 dark:bg-gray-800/30"
                      : "bg-white dark:bg-transparent"
                  }
                >
                  <td className="py-4 px-6 font-medium text-gray-700 dark:text-gray-300 text-sm">
                    Organization
                  </td>
                  {comparisonData.organization?.values.map(
                    (value: string, idx: number) => (
                      <td key={idx} className="py-4 px-4 text-center">
                        <span
                          className={`text-sm font-medium ${
                            comparisonData.organization.allSame
                              ? "text-gray-500 dark:text-gray-400"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          {value}
                        </span>
                      </td>
                    ),
                  )}
                </tr>,
              );

              // Location
              finalRows.push(
                <tr
                  key="location"
                  className={
                    (finalStartIndex + 1) % 2 === 0
                      ? "bg-gray-50/50 dark:bg-gray-800/30"
                      : "bg-white dark:bg-transparent"
                  }
                >
                  <td className="py-4 px-6 font-medium text-gray-700 dark:text-gray-300 text-sm">
                    Location
                  </td>
                  {comparisonData.location?.values.map(
                    (value: string, idx: number) => (
                      <td key={idx} className="py-4 px-4 text-center">
                        <span
                          className={`text-sm font-medium ${
                            comparisonData.location.allSame
                              ? "text-gray-500 dark:text-gray-400"
                              : "text-gray-900 dark:text-gray-100"
                          }`}
                        >
                          {value}
                        </span>
                      </td>
                    ),
                  )}
                </tr>,
              );

              return finalRows;
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
}
