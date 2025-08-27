"use client";

import React from "react";
import { Brain } from "lucide-react";
import { getCompatibility, formatEnergyLevel, formatExperienceLevel } from "./compareUtils";
import type { Dog } from "./types";

interface CompareTableProps {
  dogs: Dog[];
  comparisonData: any;
}

function getCompatibilityIcon(value: string) {
  switch (value) {
    case "yes":
      return <span className="text-green-600">✓</span>;
    case "no":
      return <span className="text-red-600">✗</span>;
    case "maybe":
      return <span className="text-yellow-600">?</span>;
    default:
      return <span className="text-gray-400">-</span>;
  }
}

export default function CompareTable({ dogs, comparisonData }: CompareTableProps) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Brain className="w-5 h-5 text-purple-600" />
        Detailed Comparison
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                Attribute
              </th>
              {dogs.map((dog) => (
                <th key={dog.id} className="text-center py-2 px-3 font-medium">
                  {dog.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {/* Tagline Row */}
            <tr>
              <td className="py-2 px-3 text-gray-600 dark:text-gray-400">Tagline</td>
              {dogs.map((dog) => (
                <td key={dog.id} className="py-2 px-3 text-center">
                  {dog.dog_profiler_data?.tagline ? (
                    <span className="text-xs italic text-gray-600 dark:text-gray-400">
                      &ldquo;{dog.dog_profiler_data.tagline}&rdquo;
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              ))}
            </tr>
            
            {/* Energy Level */}
            <tr>
              <td className="py-2 px-3 text-gray-600 dark:text-gray-400">Energy Level</td>
              {dogs.map((dog) => (
                <td key={dog.id} className="py-2 px-3 text-center">
                  {dog.dog_profiler_data?.energy_level ? (
                    <span>{formatEnergyLevel(dog.dog_profiler_data.energy_level)}</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              ))}
            </tr>
            
            {/* Experience Level */}
            <tr>
              <td className="py-2 px-3 text-gray-600 dark:text-gray-400">Experience Needed</td>
              {dogs.map((dog) => (
                <td key={dog.id} className="py-2 px-3 text-center">
                  {dog.dog_profiler_data?.experience_level ? (
                    <span>{formatExperienceLevel(dog.dog_profiler_data.experience_level)}</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              ))}
            </tr>

            {/* Age */}
            <tr>
              <td className="py-2 px-3 text-gray-600 dark:text-gray-400">Age</td>
              {comparisonData.age?.values.map((value: string, idx: number) => (
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

            {/* Size */}
            <tr>
              <td className="py-2 px-3 text-gray-600 dark:text-gray-400">Size</td>
              {comparisonData.size?.values.map((value: string, idx: number) => (
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

            {/* Good with Dogs */}
            <tr>
              <td className="py-2 px-3 text-gray-600 dark:text-gray-400">Good with Dogs</td>
              {dogs.map((dog) => {
                const compatibility = getCompatibility(dog);
                return (
                  <td key={dog.id} className="py-2 px-3 text-center">
                    <span className="flex items-center justify-center gap-1">
                      {getCompatibilityIcon(compatibility.dogs)}
                      <span className="text-xs">
                        {compatibility.dogs === "yes" && "Yes"}
                        {compatibility.dogs === "no" && "No"}
                        {compatibility.dogs === "maybe" && "Maybe"}
                        {compatibility.dogs === "unknown" && "Unknown"}
                      </span>
                    </span>
                  </td>
                );
              })}
            </tr>

            {/* Good with Cats */}
            <tr>
              <td className="py-2 px-3 text-gray-600 dark:text-gray-400">Good with Cats</td>
              {dogs.map((dog) => {
                const compatibility = getCompatibility(dog);
                return (
                  <td key={dog.id} className="py-2 px-3 text-center">
                    <span className="flex items-center justify-center gap-1">
                      {getCompatibilityIcon(compatibility.cats)}
                      <span className="text-xs">
                        {compatibility.cats === "yes" && "Yes"}
                        {compatibility.cats === "no" && "No"}
                        {compatibility.cats === "maybe" && "Maybe"}
                        {compatibility.cats === "unknown" && "Unknown"}
                      </span>
                    </span>
                  </td>
                );
              })}
            </tr>

            {/* Good with Children */}
            <tr>
              <td className="py-2 px-3 text-gray-600 dark:text-gray-400">Good with Children</td>
              {dogs.map((dog) => {
                const compatibility = getCompatibility(dog);
                return (
                  <td key={dog.id} className="py-2 px-3 text-center">
                    <span className="flex items-center justify-center gap-1">
                      {getCompatibilityIcon(compatibility.children)}
                      <span className="text-xs">
                        {compatibility.children === "yes" && "Yes"}
                        {compatibility.children === "no" && "No"}
                        {compatibility.children === "maybe" && "Maybe"}
                        {compatibility.children === "unknown" && "Unknown"}
                      </span>
                    </span>
                  </td>
                );
              })}
            </tr>

            {/* Organization */}
            <tr>
              <td className="py-2 px-3 text-gray-600 dark:text-gray-400">Organization</td>
              {comparisonData.organization?.values.map((value: string, idx: number) => (
                <td
                  key={idx}
                  className={`py-2 px-3 text-center ${
                    comparisonData.organization.allSame
                      ? "text-gray-400 dark:text-gray-500"
                      : ""
                  }`}
                >
                  {value}
                </td>
              ))}
            </tr>

            {/* Location */}
            <tr>
              <td className="py-2 px-3 text-gray-600 dark:text-gray-400">Location</td>
              {comparisonData.location?.values.map((value: string, idx: number) => (
                <td
                  key={idx}
                  className={`py-2 px-3 text-center ${
                    comparisonData.location.allSame
                      ? "text-gray-400 dark:text-gray-500"
                      : ""
                  }`}
                >
                  {value}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}