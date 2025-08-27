import React from "react";
import type { DogProfilerData } from "../../../types/dogProfiler";

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
  { bg: "bg-orange-100", text: "text-orange-800" },
  { bg: "bg-blue-100", text: "text-blue-800" },
  { bg: "bg-green-100", text: "text-green-800" },
  { bg: "bg-pink-100", text: "text-pink-800" },
  { bg: "bg-purple-100", text: "text-purple-800" },
  { bg: "bg-indigo-100", text: "text-indigo-800" },
] as const;

// Pure functions for data transformation
const capitalizeFirst = (str: string): string => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const getColorForIndex = (index: number) => ACTIVITY_COLORS[index % ACTIVITY_COLORS.length];

const getActivityEmoji = (activity: string): string => {
  const lowerActivity = activity.toLowerCase();
  
  if (lowerActivity.includes("running") || lowerActivity.includes("zooming")) {
    return "🏃";
  }
  if (lowerActivity.includes("swimming")) {
    return "🏊";
  }
  if (lowerActivity.includes("playing") || lowerActivity.includes("toys") || lowerActivity.includes("fetch")) {
    return "🎾";
  }
  if (lowerActivity.includes("cuddling") || lowerActivity.includes("snuggling")) {
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

const shouldShowActivities = (profilerData: DogProfilerData | null | undefined): boolean => {
  if (!profilerData) return false;
  
  const confidenceScore = profilerData.confidence_scores?.favorite_activities;
  if (typeof confidenceScore !== "number" || confidenceScore <= 0.5) {
    return false;
  }

  const activities = profilerData.favorite_activities;
  return Array.isArray(activities) && activities.length > 0;
};

const shouldShowQuirk = (profilerData: DogProfilerData | null | undefined): boolean => {
  if (!profilerData) return false;
  
  const confidenceScore = profilerData.confidence_scores?.unique_quirk;
  if (typeof confidenceScore !== "number" || confidenceScore <= 0.5) {
    return false;
  }

  const quirk = profilerData.unique_quirk;
  return typeof quirk === "string" && quirk.trim().length > 0;
};

const shouldShowComponent = (profilerData: DogProfilerData | null | undefined): boolean => {
  return shouldShowActivities(profilerData) || shouldShowQuirk(profilerData);
};

export default function ActivitiesQuirks({ profilerData }: ActivitiesQuirksProps) {
  if (!shouldShowComponent(profilerData)) {
    return null;
  }

  const showActivities = shouldShowActivities(profilerData);
  const showQuirk = shouldShowQuirk(profilerData);

  return (
    <div 
      data-testid="activities-quirks" 
      className="space-y-4"
    >
      {showActivities && (
        <div data-testid="activities-section">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
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
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            What Makes Me Special
          </h3>
          <div 
            data-testid="quirk-callout"
            className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded-r-lg"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">✨</span>
              </div>
              <div className="ml-3">
                <p className="text-purple-800 font-medium">
                  {profilerData!.unique_quirk}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}