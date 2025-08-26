"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Layout from "../../components/layout/Layout";
import { useFavorites } from "../../hooks/useFavorites";
import { useToast } from "../../contexts/ToastContext";
import DogsGrid from "../../components/dogs/DogsGrid";
import Loading from "../../components/ui/Loading";
import EmptyState from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/button";
import { Trash2, GitCompare } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import CompareMode from "../../components/favorites/CompareMode";
import ShareButton from "../../components/ui/ShareButton";
import FilterPanel from "../../components/favorites/FilterPanel";

// Dog interface is handled by PropTypes or runtime validation

function FavoritesPageContent() {
  const { favorites, count, clearFavorites, getShareableUrl, loadFromUrl } =
    useFavorites();
  const { showToast } = useToast();
  const [dogs, setDogs] = useState([]);
  const [filteredDogs, setFilteredDogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCompareMode, setShowCompareMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Load favorites from URL on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      // Check for any sharing parameters (new or old format)
      const hasSharedParams =
        urlParams.has("shared") || urlParams.has("ids") || urlParams.has("c");

      if (hasSharedParams) {
        loadFromUrl(window.location.href);
      }
    }
  }, [loadFromUrl]);

  // Fetch dog data for favorites
  useEffect(() => {
    async function fetchFavoriteDogs() {
      if (favorites.length === 0) {
        setDogs([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Batch fetch favorite dogs data to avoid N+1 queries
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

        // Create batches of 20 IDs to avoid URL length limits
        const batchSize = 20;
        const batches = [];
        for (let i = 0; i < favorites.length; i += batchSize) {
          batches.push(favorites.slice(i, i + batchSize));
        }

        // Fetch each batch in parallel
        const batchPromises = batches.map(async (batchIds) => {
          // For now, still use individual fetches but in controlled batches
          // TODO: When batch endpoint is available, replace with:
          // fetch(`${apiUrl}/api/animals/batch?ids=${batchIds.join(',')}`)
          const promises = batchIds.map((id) =>
            fetch(`${apiUrl}/api/animals/id/${id}`)
              .then((res) => (res.ok ? res.json() : null))
              .catch(() => null),
          );
          return Promise.all(promises);
        });

        const batchResults = await Promise.all(batchPromises);
        const allResults = batchResults.flat();
        const validDogs = allResults.filter((dog) => dog !== null);
        setDogs(validDogs);
        setFilteredDogs(validDogs); // Initialize filtered dogs
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to fetch favorite dogs:", err);
        }
        setError("Failed to load your favorite dogs. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchFavoriteDogs();
  }, [favorites]);

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to remove all favorites?")) {
      clearFavorites();
    }
  };

  const handleFilter = useCallback(
    (filtered, isUserInitiated = false) => {
      setFilteredDogs(filtered);
      // Only show toast if user actively changed filters
      if (isUserInitiated) {
        showToast("success", `Filtered to ${filtered.length} dogs`);
      }
    },
    [showToast],
  );

  // Enhanced insights using LLM data
  const showInsights = filteredDogs.length >= 2;
  const insights = showInsights ? getEnhancedInsights(filteredDogs) : null;
  const hasLLMData = filteredDogs.some(dog => dog.dog_profiler_data);

  // Helper function to get enhanced insights using new analyzer
  function getEnhancedInsights(dogList) {
    // Lazy load the analyzer to avoid bundle size impact on initial load
    const analyzer = require('../../utils/dogProfilerAnalyzer');
    const enhancedInsights = analyzer.getEnhancedInsights(dogList);

    // Also calculate basic insights as fallback
    const basicInsights = getBasicInsights(dogList);

    return {
      ...basicInsights,
      ...enhancedInsights,
      hasEnhancedData: dogList.some(d => d.dog_profiler_data)
    };
  }

  // Basic insights function (existing logic)
  function getBasicInsights(dogList) {
    if (!dogList || dogList.length === 0) return null;

    // Organization insights
    const orgCounts = {};
    dogList.forEach((dog) => {
      const orgName =
        dog.organization_name || dog.organization?.name || "Unknown";
      orgCounts[orgName] = (orgCounts[orgName] || 0) + 1;
    });

    const topOrg = Object.entries(orgCounts).sort((a, b) => b[1] - a[1])[0];

    // Size preference insights
    const sizeCounts = {};
    dogList.forEach((dog) => {
      const size = dog.standardized_size || dog.size || "Unknown";
      sizeCounts[size] = (sizeCounts[size] || 0) + 1;
    });

    const sizes = Object.entries(sizeCounts).sort((a, b) => b[1] - a[1]);
    const topSize = sizes[0];
    const hasStrongSizePreference =
      topSize && topSize[1] >= Math.ceil(dogList.length * 0.6);

    // Age insights
    const ageRange = calculateAgeRange(dogList);

    // Compatibility insights (if available in properties)
    let commonTraits = [];
    if (
      dogList.every(
        (d) =>
          d.properties?.good_with_dogs === true ||
          d.properties?.good_with_dogs === "yes" ||
          (d.properties?.good_with_list &&
            d.properties.good_with_list.includes("dogs")),
      )
    ) {
      commonTraits.push("All good with dogs");
    }
    if (
      dogList.every(
        (d) =>
          d.properties?.good_with_cats === true ||
          d.properties?.good_with_cats === "yes" ||
          (d.properties?.good_with_list &&
            d.properties.good_with_list.includes("cats")),
      )
    ) {
      commonTraits.push("All good with cats");
    }
    if (
      dogList.every(
        (d) =>
          d.properties?.good_with_children === true ||
          d.properties?.good_with_children === "yes" ||
          (d.properties?.good_with_list &&
            d.properties.good_with_list.includes("children")),
      )
    ) {
      commonTraits.push("All good with children");
    }

    return {
      topOrganization: topOrg ? `${topOrg[0]} (${topOrg[1]} dogs)` : null,
      sizePreference: hasStrongSizePreference
        ? `Mostly ${topSize[0]} dogs`
        : "Mixed sizes",
      ageRange: ageRange,
      commonTraits: commonTraits.length > 0 ? commonTraits : null,
      totalCount: dogList.length,
    };
  }

  // Helper function to calculate age range using age_months
  function calculateAgeRange(dogList) {
    const agesInMonths = dogList
      .map((d) => d.age_months)
      .filter((age) => age !== undefined && age !== null && age > 0);

    if (agesInMonths.length === 0) {
      // Fallback to age text if age_months not available
      return "Various ages";
    }

    const minMonths = Math.min(...agesInMonths);
    const maxMonths = Math.max(...agesInMonths);

    const formatAge = (months) => {
      if (months < 12) return `${months} month${months !== 1 ? "s" : ""}`;
      const years = Math.floor(months / 12);
      return `${years} year${years !== 1 ? "s" : ""}`;
    };

    if (minMonths === maxMonths) {
      return formatAge(minMonths);
    }
    return `${formatAge(minMonths)} - ${formatAge(maxMonths)}`;
  }

  if (isLoading) {
    return (
      <Layout>
        <Loading />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            title="Something went wrong"
            description={error}
            actionButton={{
              text: "Try Again",
              onClick: () => window.location.reload(),
            }}
          />
        </div>
      </Layout>
    );
  }

  // Empty state
  if (count === 0) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            {/* Paw Icon */}
            <div className="w-32 h-32 mx-auto mb-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
              <span className="text-6xl">🐾</span>
            </div>

            <h1 className="text-3xl font-bold mb-4">
              Start Building Your Collection
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Save dogs you&rsquo;re interested in to compare and share them.
              Every dog deserves consideration - find the ones that speak to
              your heart.
            </p>

            <Link href="/dogs">
              <Button className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 text-lg">
                Explore Dogs →
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        {/* Styled Header Section */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 py-12 mb-8">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold text-center mb-4">
              Your Favorite Dogs
            </h1>
            <p className="text-center text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              You&rsquo;ve saved {count} potential companion
              {count !== 1 ? "s" : ""}. Take your time to review and share with
              family.
            </p>

            {/* Action Buttons - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-8">
              <ShareButton
                url={getShareableUrl()}
                title="My Favorite Rescue Dogs"
                text={`Check out my collection of ${count} favorite rescue dogs!`}
                variant="default"
                className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Share Favorites
              </ShareButton>

              {/* Compare Button - Only show when 2+ dogs */}
              {count >= 2 && (
                <Button
                  variant="default"
                  size="default"
                  onClick={() => setShowCompareMode(true)}
                  className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Compare Dogs
                </Button>
              )}

              <FilterPanel dogs={dogs} onFilter={handleFilter} />
            </div>
          </div>
        </div>

        {/* Enhanced Smart Insights - Mobile Optimized */}
        {showInsights && insights && (
          <div className="container mx-auto px-4 mb-8">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">💡</span>
                Your Favorites Insights
                {insights.hasEnhancedData && (
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                    AI Enhanced
                  </span>
                )}
              </h2>

              {/* Enhanced Personality Insights */}
              {insights.personalityPattern && (
                <div className="mb-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <span>🎭</span> Personality Pattern
                  </h3>
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">
                    {insights.personalityPattern.personalityTheme}
                  </p>
                  {insights.personalityPattern.commonTraits.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {insights.personalityPattern.dominantTraits.slice(0, 5).map((trait, idx) => (
                        <span 
                          key={idx} 
                          className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Lifestyle Compatibility */}
              {insights.lifestyleCompatibility && insights.lifestyleCompatibility.messages.length > 0 && (
                <div className="mb-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <span>🏠</span> Lifestyle Match
                  </h3>
                  <div className="space-y-2">
                    {insights.lifestyleCompatibility.messages.map((message, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-green-500">✓</span>
                        <span className="text-sm">{message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience Requirements */}
              {insights.experienceRequirements && (
                <div className="mb-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <span>🎓</span> Experience Level
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {insights.experienceRequirements.recommendation}
                  </p>
                </div>
              )}

              {/* Hidden Gems */}
              {insights.hiddenGems && insights.hiddenGems.uniqueQuirks.length > 0 && (
                <div className="mb-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <span>✨</span> Special Traits
                  </h3>
                  <div className="space-y-1">
                    {insights.hiddenGems.uniqueQuirks.map((item, idx) => (
                      <p key={idx} className="text-sm">
                        <span className="font-medium">{item.dogName}:</span> {item.quirk}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Care Complexity */}
              {insights.careComplexity && (
                <div className="mb-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <span>🩺</span> Care Requirements
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {insights.careComplexity.description}
                  </p>
                </div>
              )}

              {/* Basic insights grid (fallback/additional) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Top Organization */}
                {insights.topOrganization && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">🏢</span>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Most dogs from
                      </div>
                      <div className="font-medium">
                        {insights.topOrganization}
                      </div>
                    </div>
                  </div>
                )}

                {/* Size Preference */}
                {!insights.hasEnhancedData && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">📏</span>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Size preference
                      </div>
                      <div className="font-medium">{insights.sizePreference}</div>
                    </div>
                  </div>
                )}

                {/* Age Range */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">📅</span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Age range
                    </div>
                    <div className="font-medium">{insights.ageRange}</div>
                  </div>
                </div>

                {/* Energy Profile */}
                {insights.energyProfile && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">⚡</span>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Energy level
                      </div>
                      <div className="font-medium">
                        {insights.energyProfile.recommendation}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dogs grid - use filtered dogs */}
        <div className="container mx-auto px-4">
          {filteredDogs.length === 0 && dogs.length > 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No dogs match your filters
              </p>
              <Button variant="outline" onClick={() => setFilteredDogs(dogs)}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <DogsGrid
              dogs={filteredDogs}
              loading={false}
              className="animate-in fade-in duration-200"
            />
          )}
        </div>

        {/* Compare Mode Modal - use filtered dogs */}
        {showCompareMode && (
          <CompareMode
            dogs={filteredDogs}
            onClose={() => setShowCompareMode(false)}
          />
        )}
      </div>
    </Layout>
  );
}

  // Empty state
  if (count === 0) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            {/* Paw Icon */}
            <div className="w-32 h-32 mx-auto mb-8 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
              <span className="text-6xl">🐾</span>
            </div>

            <h1 className="text-3xl font-bold mb-4">
              Start Building Your Collection
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Save dogs you&rsquo;re interested in to compare and share them.
              Every dog deserves consideration - find the ones that speak to
              your heart.
            </p>

            <Link href="/dogs">
              <Button className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 text-lg">
                Explore Dogs →
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        {/* Styled Header Section */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 py-12 mb-8">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold text-center mb-4">
              Your Favorite Dogs
            </h1>
            <p className="text-center text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              You&rsquo;ve saved {count} potential companion
              {count !== 1 ? "s" : ""}. Take your time to review and share with
              family.
            </p>

            {/* Action Buttons - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mt-8">
              <ShareButton
                url={getShareableUrl()}
                title="My Favorite Rescue Dogs"
                text={`Check out my collection of ${count} favorite rescue dogs!`}
                variant="default"
                className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Share Favorites
              </ShareButton>

              {/* Compare Button - Only show when 2+ dogs */}
              {count >= 2 && (
                <Button
                  variant="default"
                  size="default"
                  onClick={() => setShowCompareMode(true)}
                  className="bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Compare Dogs
                </Button>
              )}

              <FilterPanel dogs={dogs} onFilter={handleFilter} />
            </div>
          </div>
        </div>

        {/* Smart Insights - Mobile Optimized */}
        {showInsights && insights && (
          <div className="container mx-auto px-4 mb-8">
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">💡</span>
                Your Favorites Insights
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top Organization */}
                {insights.topOrganization && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">🏢</span>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Most dogs from
                      </div>
                      <div className="font-medium">
                        {insights.topOrganization}
                      </div>
                    </div>
                  </div>
                )}

                {/* Size Preference */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">📏</span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Size preference
                    </div>
                    <div className="font-medium">{insights.sizePreference}</div>
                  </div>
                </div>

                {/* Age Range */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">📅</span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Age range
                    </div>
                    <div className="font-medium">{insights.ageRange}</div>
                  </div>
                </div>

                {/* Common Traits */}
                {insights.commonTraits && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">✨</span>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Common traits
                      </div>
                      <div className="font-medium">
                        {insights.commonTraits.join(", ")}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dogs grid - use filtered dogs */}
        <div className="container mx-auto px-4">
          {filteredDogs.length === 0 && dogs.length > 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                No dogs match your filters
              </p>
              <Button variant="outline" onClick={() => setFilteredDogs(dogs)}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <DogsGrid
              dogs={filteredDogs}
              loading={false}
              className="animate-in fade-in duration-200"
            />
          )}
        </div>

        {/* Compare Mode Modal - use filtered dogs */}
        {showCompareMode && (
          <CompareMode
            dogs={filteredDogs}
            onClose={() => setShowCompareMode(false)}
          />
        )}
      </div>
    </Layout>
  );
}

export default function FavoritesPage() {
  return (
    <ErrorBoundary
      fallback={
        <div className="container mx-auto px-4 py-8">
          <EmptyState
            title="Something went wrong"
            description="There was an error loading your favorites. Please refresh the page."
            actionButton={{
              text: "Refresh Page",
              onClick: () => window.location.reload(),
            }}
          />
        </div>
      }
      onError={(error) => {
        if (process.env.NODE_ENV === "development") {
          console.error("Favorites page error:", error);
        }
      }}
    >
      <FavoritesPageContent />
    </ErrorBoundary>
  );
}
