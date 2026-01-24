"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Layout from "../../components/layout/Layout";
import { useFavorites } from "../../hooks/useFavorites";
import { useToast } from "../../contexts/ToastContext";
import DogsGrid from "../../components/dogs/DogsGrid";
import Loading from "../../components/ui/Loading";
import EmptyState from "../../components/ui/EmptyState";
import { getEnhancedInsights } from "../../utils/dogProfilerAnalyzer";
import { Button } from "../../components/ui/button";
import { Trash2, GitCompare } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import ShareButton from "../../components/ui/ShareButton";
import FavoritesInsights from "../../components/favorites/FavoritesInsights";
import type { DogProfilerData } from "../../types/dogProfiler";
import { trackFavoritesPageView } from "@/lib/monitoring/breadcrumbs";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import { BreadcrumbSchema } from "../../components/seo";
import type { Dog } from "../../types/dog";
import FilterPanelSkeleton from "../../components/ui/FilterPanelSkeleton";
import CompareSkeleton from "../../components/ui/CompareSkeleton";

// Dynamic imports for large components (code splitting)
const FilterPanel = dynamic(
  () => import("../../components/favorites/FilterPanel"),
  {
    loading: () => <FilterPanelSkeleton />,
    ssr: false,
  },
);

const CompareMode = dynamic(
  () => import("../../components/favorites/CompareMode"),
  {
    loading: () => <CompareSkeleton />,
    ssr: false,
  },
);

// Type definitions - compatible with FavoritesInsights component
interface HiddenGemsQuirk {
  dogName: string;
  quirk: string;
}

interface Insights {
  hasEnhancedData: boolean;
  // Enhanced insights from dogProfilerAnalyzer (allow null for spread operator compatibility)
  personalityPattern?: {
    personalityTheme: string;
    dominantTraits: string[];
    commonTraits: string[];
  } | null;
  lifestyleCompatibility?: {
    messages: string[];
  } | null;
  experienceRequirements?: {
    recommendation: string;
  } | null;
  hiddenGems?: {
    uniqueQuirks: HiddenGemsQuirk[];
  } | null;
  careComplexity?: {
    description: string;
  } | null;
  energyProfile?: {
    recommendation: string;
  } | null;
  compatibilityMatrix?: {
    withDogs: { yes: number; no: number; maybe: number; unknown: number };
    withCats: { yes: number; no: number; maybe: number; unknown: number };
    withChildren: { yes: number; no: number; maybe: number; unknown: number };
  } | null;
  // Basic insights fields
  topOrganization?: string;
  sizePreference?: string;
  ageRange?: string;
  commonTraits?: string[] | null;
  totalCount?: number;
}

function FavoritesPageContent() {
  const { favorites, count, clearFavorites, getShareableUrl, loadFromUrl } =
    useFavorites();
  const { showToast } = useToast();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [filteredDogs, setFilteredDogs] = useState<Dog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompareMode, setShowCompareMode] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Detect mobile viewport - use md breakpoint (768px) for consistency
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

    // Track favorites page view
    try {
      trackFavoritesPageView(favorites.length);
    } catch (error) {
      console.error("Failed to track favorites page view:", error);
    }
  }, [favorites]);

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to remove all favorites?")) {
      clearFavorites();
    }
  };

  const handleFilter = useCallback(
    (filtered: Dog[], isUserInitiated = false) => {
      setFilteredDogs(filtered);
      // Only show toast if user actively changed filters
      if (isUserInitiated) {
        showToast("success", `Filtered to ${filtered.length} dogs`);
      }
    },
    [showToast],
  );

  // Enhanced insights using LLM data
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);
  const showInsights = filteredDogs.length >= 2;
  const hasLLMData = filteredDogs.some((dog) => dog.dog_profiler_data);

  // Basic insights function (existing logic)
  const getBasicInsights = useCallback((dogList: Dog[]): Insights | null => {
    if (!dogList || dogList.length === 0) return null;

    // Organization insights
    const orgCounts: { [key: string]: number } = {};
    dogList.forEach((dog) => {
      const orgName =
        dog.organization_name || dog.organization?.name || "Unknown";
      orgCounts[orgName] = (orgCounts[orgName] || 0) + 1;
    });

    const topOrg = Object.entries(orgCounts).sort((a, b) => b[1] - a[1])[0];

    // Size preference insights
    const sizeCounts: { [key: string]: number } = {};
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
    let commonTraits: string[] = [];
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
      topOrganization: topOrg ? `${topOrg[0]} (${topOrg[1]} dogs)` : undefined,
      sizePreference: hasStrongSizePreference
        ? `Mostly ${topSize[0]} dogs`
        : "Mixed sizes",
      ageRange: ageRange,
      commonTraits: commonTraits.length > 0 ? commonTraits : null,
      totalCount: dogList.length,
      hasEnhancedData: false,
    };
  }, []);

  // Helper function to calculate age range using age_months
  function calculateAgeRange(dogList: Dog[]) {
    const agesInMonths = dogList
      .map((d) => d.age_months)
      .filter(
        (age): age is number => age !== undefined && age !== null && age > 0,
      );

    if (agesInMonths.length === 0) {
      // Fallback to age text if age_months not available
      return "Various ages";
    }

    const minMonths = Math.min(...agesInMonths);
    const maxMonths = Math.max(...agesInMonths);

    const formatAge = (months: number) => {
      if (months < 12) return `${months} month${months !== 1 ? "s" : ""}`;
      const years = Math.floor(months / 12);
      return `${years} year${years !== 1 ? "s" : ""}`;
    };

    if (minMonths === maxMonths) {
      return formatAge(minMonths);
    }
    return `${formatAge(minMonths)} - ${formatAge(maxMonths)}`;
  }

  // Effect to calculate enhanced insights
  useEffect(() => {
    if (!showInsights || filteredDogs.length < 2) {
      setInsights(null);
      return;
    }

    setInsightsLoading(true);

    // Use setTimeout to avoid blocking the UI
    const timer = setTimeout(() => {
      try {
        // Use statically imported function
        // Cast to DogWithProfiler[] since favorites are always fetched from API with numeric IDs
        // The Dog type has a union id type (number | string), but DogWithProfiler requires number
        const enhancedInsights = getEnhancedInsights(
          filteredDogs as unknown as import("@/types/dogProfiler").DogWithProfiler[],
        );
        const basicInsights = getBasicInsights(filteredDogs);

        setInsights({
          ...basicInsights,
          ...enhancedInsights,
          hasEnhancedData: filteredDogs.some((d) => d.dog_profiler_data),
        });
      } catch (error) {
        console.error("Error calculating enhanced insights:", error);
        // Fall back to basic insights on error
        setInsights(getBasicInsights(filteredDogs));
      } finally {
        setInsightsLoading(false);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [filteredDogs, showInsights, getBasicInsights]);

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
    const breadcrumbItems = [{ name: "Home", url: "/" }, { name: "Favorites" }];

    return (
      <Layout>
        <BreadcrumbSchema items={breadcrumbItems} />
        <div className="container mx-auto px-4 py-6">
          <Breadcrumbs items={breadcrumbItems} />
          <div className="min-h-[60vh] flex items-center justify-center">
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
        </div>
      </Layout>
    );
  }

  const breadcrumbItems = [{ name: "Home", url: "/" }, { name: "Favorites" }];

  return (
    <Layout>
      <BreadcrumbSchema items={breadcrumbItems} />
      <div>
        {/* Breadcrumbs */}
        <div className="container mx-auto px-4 pt-6">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

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

            {/* Action Buttons Row - Responsive Layout */}
            <div className="flex flex-col md:flex-row justify-center items-center gap-4 mt-8">
              {/* Primary Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
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
              </div>

              {/* Filter Controls - Separate Section */}
              <div className="w-full md:w-auto flex justify-center">
                <FilterPanel dogs={dogs} onFilter={handleFilter} />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Smart Insights - Compact Design */}
        {showInsights && insights && (
          <FavoritesInsights
            insights={insights}
            insightsLoading={insightsLoading}
          />
        )}

        {/* Dogs Section Header */}
        <div className="container mx-auto px-4 pt-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Your Saved Dogs
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {filteredDogs.length} dog{filteredDogs.length !== 1 ? "s" : ""}{" "}
              saved
            </p>
            {/* Visual divider */}
            <hr className="mx-auto mt-4 mb-0 w-24 h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent border-0" />
          </div>
        </div>

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
              listContext="favorites"
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
