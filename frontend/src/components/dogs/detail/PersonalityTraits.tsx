import React from "react";
import type { DogProfilerData } from "../../../types/dogProfiler";

/**
 * PersonalityTraits component displays personality traits as colored badge pills
 * Only shows traits when confidence score > 0.5
 * Displays max 5 traits with rotating pastel colors
 *
 * Usage:
 * ```tsx
 * <PersonalityTraits profilerData={dog.dog_profiler_data} />
 * ```
 */
interface PersonalityTraitsProps {
  profilerData: DogProfilerData | null | undefined;
}

const PASTEL_COLORS = [
  { bg: "bg-blue-100", text: "text-blue-800" },
  { bg: "bg-green-100", text: "text-green-800" },
  { bg: "bg-purple-100", text: "text-purple-800" },
  { bg: "bg-yellow-100", text: "text-yellow-800" },
  { bg: "bg-pink-100", text: "text-pink-800" },
] as const;

// Pure functions for data transformation
const capitalizeFirst = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const getColorForIndex = (index: number) =>
  PASTEL_COLORS[index % PASTEL_COLORS.length];

const shouldShowTraits = (
  profilerData: DogProfilerData | null | undefined,
): boolean => {
  if (!profilerData) return false;

  const traits = profilerData.personality_traits;
  if (!Array.isArray(traits) || traits.length === 0) {
    return false;
  }

  // Show if confidence score is missing OR > 0.5
  // Only hide if confidence score is explicitly present AND low
  const confidenceScore = profilerData.confidence_scores?.personality_traits;
  if (typeof confidenceScore === "number" && confidenceScore <= 0.5) {
    return false;
  }

  return true;
};

export default function PersonalityTraits({
  profilerData,
}: PersonalityTraitsProps) {
  if (!shouldShowTraits(profilerData)) {
    return null;
  }

  const traits = profilerData!.personality_traits!.slice(0, 5);

  return (
    <div data-testid="personality-traits" className="flex flex-wrap gap-2">
      {traits.map((trait, index) => {
        const colors = getColorForIndex(index);

        return (
          <span
            key={trait}
            data-testid={`trait-${trait.toLowerCase()}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}
          >
            {capitalizeFirst(trait)}
          </span>
        );
      })}
    </div>
  );
}