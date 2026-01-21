"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";

interface HiddenGemsQuirk {
  dogName: string;
  quirk: string;
}

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
    uniqueQuirks: HiddenGemsQuirk[];
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
}

interface FavoritesInsightsProps {
  insights: Insights;
  insightsLoading?: boolean;
}

export default function FavoritesInsights({
  insights,
  insightsLoading = false,
}: FavoritesInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind md breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Create array of available insights for mobile filtering
  const getInsightsArray = () => {
    const insightsArray = [];

    if (insights.personalityPattern) insightsArray.push("personalityPattern");
    if ((insights.lifestyleCompatibility?.messages?.length ?? 0) > 0)
      insightsArray.push("lifestyleCompatibility");
    if (insights.experienceRequirements)
      insightsArray.push("experienceRequirements");
    if ((insights.hiddenGems?.uniqueQuirks?.length ?? 0) > 0)
      insightsArray.push("hiddenGems");
    if (insights.careComplexity) insightsArray.push("careComplexity");
    if (insights.energyProfile) insightsArray.push("energyProfile");
    if (insights.topOrganization) insightsArray.push("topOrganization");
    if (insights.ageRange) insightsArray.push("ageRange");
    if (!insights.hasEnhancedData && insights.sizePreference)
      insightsArray.push("sizePreference");

    return insightsArray;
  };

  const insightsArray = getInsightsArray();
  const shouldShowExpandButton = isMobile && insightsArray.length > 3;
  const visibleInsights =
    isMobile && !isExpanded ? insightsArray.slice(0, 3) : insightsArray;

  if (insightsLoading) {
    return (
      <div className="container mx-auto px-4 mb-10">
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 shadow-lg border-b-2 border-gray-100 dark:border-gray-800 relative z-10 content-fade-in">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4 skeleton-element"></div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded skeleton-element animate-stagger-1"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded skeleton-element animate-stagger-2"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded skeleton-element animate-stagger-3"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded skeleton-element animate-stagger-4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="container mx-auto px-4 mb-10"
      data-testid="insights-container"
    >
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 shadow-lg border-b-2 border-gray-100 dark:border-gray-800 relative z-10 content-fade-in">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <span className="text-lg">💡</span>
            Your Favorites Insights
          </h2>
          <div className="flex flex-col items-end gap-1">
            {shouldShowExpandButton && (
              <>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {visibleInsights.length} of {insightsArray.length}{" "}
                  insights
                </span>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-300 rounded px-2 py-1"
                  aria-expanded={isExpanded}
                  aria-label={
                    isExpanded ? "Show less insights" : "Show more insights"
                  }
                >
                  <span className="hidden xs:inline">
                    {isExpanded ? "Show less" : "Show more"}
                  </span>
                  <Icon
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size="medium"
                    className="transition-transform duration-200"
                  />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Grid Layout - 2 columns on desktop, 1 on mobile */}
        <div
          className={`grid md:grid-cols-2 gap-4 transition-all duration-300 ease-in-out ${
            isMobile && !isExpanded ? "max-h-80 overflow-hidden relative" : ""
          }`}
          data-testid="insights-grid"
        >
          {/* Gradient fade overlay for mobile truncation */}
          {isMobile && !isExpanded && shouldShowExpandButton && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-yellow-50 dark:from-yellow-900/20 to-transparent pointer-events-none z-10" />
          )}
          {/* Personality Pattern */}
          {insights.personalityPattern &&
            visibleInsights.includes("personalityPattern") && (
              <div
                className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg transition-all duration-200 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-sm"
                role="group"
                aria-labelledby="personality-pattern-heading"
              >
                <h3
                  id="personality-pattern-heading"
                  className="text-sm font-medium mb-2 flex items-center gap-2"
                >
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
          {(insights.lifestyleCompatibility?.messages?.length ?? 0) > 0 &&
            visibleInsights.includes("lifestyleCompatibility") && (
              <div
                className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg transition-all duration-200 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-sm"
                role="group"
                aria-labelledby="lifestyle-compatibility-heading"
              >
                <h3
                  id="lifestyle-compatibility-heading"
                  className="text-sm font-medium mb-2 flex items-center gap-2"
                >
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
          {insights.experienceRequirements &&
            visibleInsights.includes("experienceRequirements") && (
              <div
                className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg transition-all duration-200 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-sm"
                role="group"
                aria-labelledby="experience-requirements-heading"
              >
                <h3
                  id="experience-requirements-heading"
                  className="text-sm font-medium mb-2 flex items-center gap-2"
                >
                  <span className="text-sm">🎓</span> Experience Level
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                  {insights.experienceRequirements.recommendation}
                </p>
              </div>
            )}

          {/* Special Traits - Compact */}
          {(insights.hiddenGems?.uniqueQuirks?.length ?? 0) > 0 &&
            visibleInsights.includes("hiddenGems") && (
              <div
                className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg transition-all duration-200 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-sm"
                role="group"
                aria-labelledby="special-traits-heading"
              >
                <h3
                  id="special-traits-heading"
                  className="text-sm font-medium mb-2 flex items-center gap-2"
                >
                  <span className="text-sm">✨</span> Special Traits
                </h3>
                <div className="text-xs space-y-1">
                  {insights.hiddenGems?.uniqueQuirks
                    ?.slice(0, 2)
                    .map((item: HiddenGemsQuirk, idx: number) => (
                      <p key={idx} className="text-xs leading-tight">
                        <span className="font-medium text-orange-600 dark:text-orange-400">
                          {item.dogName}:
                        </span>{" "}
                        <span className="text-gray-600 dark:text-gray-400">
                          {item.quirk}
                        </span>
                      </p>
                    ))}
                </div>
              </div>
            )}

          {/* Care Requirements */}
          {insights.careComplexity &&
            visibleInsights.includes("careComplexity") && (
              <div
                className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg transition-all duration-200 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-sm"
                role="group"
                aria-labelledby="care-requirements-heading"
              >
                <h3
                  id="care-requirements-heading"
                  className="text-sm font-medium mb-2 flex items-center gap-2"
                >
                  <span className="text-sm">🩺</span> Care Requirements
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-tight">
                  {insights.careComplexity.description}
                </p>
              </div>
            )}

          {/* Energy Profile */}
          {insights.energyProfile &&
            visibleInsights.includes("energyProfile") && (
              <div
                className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg transition-all duration-200 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-sm"
                role="group"
                aria-labelledby="energy-profile-heading"
              >
                <h3
                  id="energy-profile-heading"
                  className="text-sm font-medium mb-2 flex items-center gap-2"
                >
                  <span className="text-sm">⚡</span> Energy Level
                </h3>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {insights.energyProfile.recommendation}
                </p>
              </div>
            )}

          {/* Top Organization */}
          {insights.topOrganization &&
            visibleInsights.includes("topOrganization") && (
              <div
                className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg transition-all duration-200 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-sm"
                role="group"
                aria-labelledby="top-organization-heading"
              >
                <h3
                  id="top-organization-heading"
                  className="text-sm font-medium mb-2 flex items-center gap-2"
                >
                  <span className="text-sm">🏢</span> Top Organization
                </h3>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  {insights.topOrganization}
                </p>
              </div>
            )}

          {/* Age Range */}
          {insights.ageRange && visibleInsights.includes("ageRange") && (
            <div
              className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg transition-all duration-200 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-sm"
              role="group"
              aria-labelledby="age-range-heading"
            >
              <h3
                id="age-range-heading"
                className="text-sm font-medium mb-2 flex items-center gap-2"
              >
                <span className="text-sm">📅</span> Age Range
              </h3>
              <p className="text-xs font-medium text-green-600 dark:text-green-400">
                {insights.ageRange}
              </p>
            </div>
          )}

          {/* Size Preference (only show if no enhanced data) */}
          {!insights.hasEnhancedData &&
            insights.sizePreference &&
            visibleInsights.includes("sizePreference") && (
              <div
                className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg transition-all duration-200 hover:bg-white/70 dark:hover:bg-gray-800/70 hover:shadow-sm"
                role="group"
                aria-labelledby="size-preference-heading"
              >
                <h3
                  id="size-preference-heading"
                  className="text-sm font-medium mb-2 flex items-center gap-2"
                >
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
