"use client";

import React from "react";

interface Insights {
  hasEnhancedData: boolean;
  personalityPattern?: {
    personalityTheme: string;
    dominantTraits: string[];
    commonTraits: string[];
  };
  lifestyleCompatibility?: {
    messages: string[];
  };
  experienceRequirements?: {
    recommendation: string;
  };
  hiddenGems?: {
    uniqueQuirks: Array<{ dogName: string; quirk: string }>;
  };
  careComplexity?: {
    description: string;
  };
  energyProfile?: {
    recommendation: string;
  };
  topOrganization?: string;
  sizePreference?: string;
  ageRange?: string;
  [key: string]: any;
}

interface FavoritesInsightsProps {
  insights: Insights;
  insightsLoading?: boolean;
}

export default function FavoritesInsights({
  insights,
  insightsLoading = false,
}: FavoritesInsightsProps) {
  if (insightsLoading) {
    return (
      <div className="container mx-auto px-4 mb-6">
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 shadow-sm animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4"></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 mb-6">
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 shadow-sm">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <span className="text-lg">💡</span>
            Your Favorites Insights
          </h2>
          {insights.hasEnhancedData && (
            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
              AI Enhanced
            </span>
          )}
        </div>

        {/* Main Grid Layout - 2 columns on desktop, 1 on mobile */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Personality Pattern */}
          {insights.personalityPattern && (
            <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <span className="text-sm">🎭</span> Personality Pattern
              </h3>
              <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-2">
                {insights.personalityPattern.personalityTheme}
              </p>
              {insights.personalityPattern.dominantTraits.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {insights.personalityPattern.dominantTraits
                    .slice(0, 4)
                    .map((trait: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs"
                      >
                        {trait}
                      </span>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Lifestyle Compatibility */}
          {(insights.lifestyleCompatibility?.messages?.length ?? 0) > 0 && (
            <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <span className="text-sm">🏠</span> Lifestyle Match
              </h3>
              <div className="text-xs space-y-1">
                {insights.lifestyleCompatibility?.messages
                  ?.slice(0, 2)
                  .map((message: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-1">
                      <span className="text-green-500 text-xs mt-0.5">✓</span>
                      <span className="text-xs leading-tight">{message}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Experience Requirements */}
          {insights.experienceRequirements && (
            <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <span className="text-sm">🎓</span> Experience Level
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                {insights.experienceRequirements.recommendation}
              </p>
            </div>
          )}

          {/* Special Traits - Compact */}
          {(insights.hiddenGems?.uniqueQuirks?.length ?? 0) > 0 && (
            <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <span className="text-sm">✨</span> Special Traits
              </h3>
              <div className="text-xs space-y-1">
                {insights.hiddenGems?.uniqueQuirks
                  ?.slice(0, 2)
                  .map((item: any, idx: number) => (
                    <p key={idx} className="text-xs leading-tight">
                      <span className="font-medium text-orange-600 dark:text-orange-400">
                        {item.dogName}:
                      </span>{" "}
                      <span className="text-gray-600 dark:text-gray-400">
                        {item.quirk.length > 40
                          ? `${item.quirk.slice(0, 40)}...`
                          : item.quirk}
                      </span>
                    </p>
                  ))}
              </div>
            </div>
          )}

          {/* Care Requirements */}
          {insights.careComplexity && (
            <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <span className="text-sm">🩺</span> Care Requirements
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                {insights.careComplexity.description.length > 80
                  ? `${insights.careComplexity.description.slice(0, 80)}...`
                  : insights.careComplexity.description}
              </p>
            </div>
          )}

          {/* Energy Profile */}
          {insights.energyProfile && (
            <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <span className="text-sm">⚡</span> Energy Level
              </h3>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {insights.energyProfile.recommendation}
              </p>
            </div>
          )}

          {/* Top Organization */}
          {insights.topOrganization && (
            <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <span className="text-sm">🏢</span> Top Organization
              </h3>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {insights.topOrganization}
              </p>
            </div>
          )}

          {/* Age Range */}
          {insights.ageRange && (
            <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <span className="text-sm">📅</span> Age Range
              </h3>
              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                {insights.ageRange}
              </p>
            </div>
          )}

          {/* Size Preference (only show if no enhanced data) */}
          {!insights.hasEnhancedData && insights.sizePreference && (
            <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <span className="text-sm">📏</span> Size Preference
              </h3>
              <p className="text-xs font-medium text-purple-600 dark:text-purple-400">
                {insights.sizePreference}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
