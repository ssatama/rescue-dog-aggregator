import React from "react";
import type { DogProfilerData } from "../../../types/dogProfiler";
import { capitalizeFirst } from "../../../utils/breedDisplayUtils";

/**
 * ActivitiesQuirks component displays favorite activities and unique quirks
 * Only shows data when confidence scores > 0.5
 * Activities displayed with relevant emojis, quirks as special callout
 *
 * Usage:
 * ```tsx
 * <ActivitiesQuirks profilerData={dog.dog_profiler_data} />
 * ```
 */
interface ActivitiesQuirksProps {
  profilerData: DogProfilerData | null | undefined;
}

const ACTIVITY_COLORS = [
  {
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-800 dark:text-orange-300",
  },
  {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-800 dark:text-blue-300",
  },
  {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-300",
  },
  {
    bg: "bg-pink-100 dark:bg-pink-900/30",
    text: "text-pink-800 dark:text-pink-300",
  },
  {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-800 dark:text-purple-300",
  },
  {
    bg: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-800 dark:text-indigo-300",
  },
] as const;

const getColorForIndex = (index: number) =>
  ACTIVITY_COLORS[index % ACTIVITY_COLORS.length];

const getActivityEmoji = (activity: string): string => {
  const lowerActivity = activity.toLowerCase();

  if (lowerActivity.includes("running") || lowerActivity.includes("zooming")) {
    return "🏃";
  }
  if (lowerActivity.includes("swimming")) {
    return "🏊";
  }
  if (
    lowerActivity.includes("playing") ||
    lowerActivity.includes("toys") ||
    lowerActivity.includes("fetch")
  ) {
    return "🎾";
  }
  if (
    lowerActivity.includes("cuddling") ||
    lowerActivity.includes("snuggling")
  ) {
    return "🤗";
  }
  if (lowerActivity.includes("walking")) {
    return "🚶";
  }
  if (lowerActivity.includes("rolling")) {
    return "🌀";
  }

  return "🐾"; // Default emoji
};

const shouldShowActivities = (
  profilerData: DogProfilerData | null | undefined,
): boolean => {
  if (!profilerData) return false;

  const activities = profilerData.favorite_activities;
  if (!Array.isArray(activities) || activities.length === 0) {
    return false;
  }

  // Show if confidence score is missing OR > 0.5
  // Only hide if confidence score is explicitly present AND low
  const confidenceScore = profilerData.confidence_scores?.favorite_activities;
  if (typeof confidenceScore === "number" && confidenceScore <= 0.5) {
    return false;
  }

  return true;
};

const shouldShowQuirk = (
  profilerData: DogProfilerData | null | undefined,
): boolean => {
  if (!profilerData) return false;

  const quirk = profilerData.unique_quirk;
  if (typeof quirk !== "string" || quirk.trim().length === 0) {
    return false;
  }

  // Show if confidence score is missing OR > 0.5
  // Only hide if confidence score is explicitly present AND low
  const confidenceScore = profilerData.confidence_scores?.unique_quirk;
  if (typeof confidenceScore === "number" && confidenceScore <= 0.5) {
    return false;
  }

  return true;
};

const shouldShowComponent = (
  profilerData: DogProfilerData | null | undefined,
): boolean => {
  return shouldShowActivities(profilerData) || shouldShowQuirk(profilerData);
};

export default function ActivitiesQuirks({
  profilerData,
}: ActivitiesQuirksProps) {
  if (!shouldShowComponent(profilerData)) {
    return null;
  }

  const showActivities = shouldShowActivities(profilerData);
  const showQuirk = shouldShowQuirk(profilerData);

  return (
    <div data-testid="activities-quirks" className="space-y-4">
      {showActivities && (
        <div data-testid="activities-section">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Favorite Activities
          </h3>
          <div className="flex flex-wrap gap-2">
            {profilerData!.favorite_activities!.map((activity, index) => {
              const colors = getColorForIndex(index);
              const emoji = getActivityEmoji(activity);

              return (
                <span
                  key={activity}
                  data-testid={`activity-${activity.toLowerCase()}`}
                  className={`px-3 py-2 rounded-full text-sm font-medium ${colors.bg} ${colors.text} flex items-center gap-1`}
                >
                  <span>{emoji}</span>
                  <span>{capitalizeFirst(activity)}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {showQuirk && (
        <div data-testid="quirk-section">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
            What Makes Me Special
          </h3>
          <div
            data-testid="quirk-callout"
            className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-400 dark:border-purple-500/50 p-4 rounded-r-lg"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">✨</span>
              </div>
              <div className="ml-3">
                <p className="text-purple-800 dark:text-purple-300 font-medium">
                  {capitalizeFirst(profilerData!.unique_quirk!)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}