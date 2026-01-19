"use client";

import React, { Suspense, lazy } from "react";
import HeroSection from "./HeroSection";
import PlatformCapabilities from "./PlatformCapabilities";
import FeaturedDogsSection from "./FeaturedDogsSection";
import Loading from "../ui/Loading";
import MobileHomePage from "../mobile/MobileHomePage";
import ErrorBoundary from "../ui/ErrorBoundary";
import { transformMobileHomePageData } from "../../utils/homePageTransformers";

// Lazy load below-fold sections for better initial load performance
const CountryBrowseSection = lazy(() => import("./CountryBrowseSection"));
const AgeBrowseSection = lazy(() => import("./AgeBrowseSection"));
const TrustBand = lazy(() => import("./TrustBand"));
const TrustSection = lazy(() => import("./TrustSection"));
const FinalCTA = lazy(() => import("./FinalCTA"));
const BreedsCTA = lazy(() =>
  import("./BreedsCTA").then((module) => ({
    default: module.BreedsCTA,
  })),
);

export default function ClientHomePage({
  initialStatistics,
  initialRecentDogs,
  initialDiverseDogs,
  initialBreedsWithImages = null,
  initialOrganizations = [],
  initialCountryStats = [],
  initialAgeStats = [],
}) {
  // Prepare data for mobile version
  const mobileInitialData = React.useMemo(
    () =>
      transformMobileHomePageData({
        initialRecentDogs,
        initialStatistics,
        breedsWithImages: initialBreedsWithImages,
        countryStats: initialCountryStats,
        ageStats: initialAgeStats,
      }),
    [initialRecentDogs, initialStatistics, initialBreedsWithImages, initialCountryStats, initialAgeStats],
  );

  return (
    <>
      {/* Mobile Version - Shown only on mobile devices */}
      <div className="sm:hidden">
        <Suspense fallback={<Loading className="h-screen" />}>
          <MobileHomePage initialData={mobileInitialData} />
        </Suspense>
      </div>

      {/* Desktop Version - Hidden on mobile devices */}
      <div className="hidden sm:block">
        <HeroSection
          initialStatistics={initialStatistics}
          previewDogs={initialRecentDogs?.slice(0, 3) || []}
          priority={true}
        />

        {/* Platform Capabilities Section - Three Ways to Find Your Dog */}
        <ErrorBoundary fallbackMessage="Unable to load platform capabilities section. Please refresh the page.">
          <PlatformCapabilities />
        </ErrorBoundary>

        {/* Featured Dogs Section - 6 dogs (moved up for better UX) */}
        <ErrorBoundary fallbackMessage="Unable to load featured dogs. Please refresh the page.">
          <FeaturedDogsSection
            dogs={initialRecentDogs || []}
            totalCount={initialStatistics?.total_dogs || 0}
          />
        </ErrorBoundary>

        {/* Country Browse Section - Dogs from Across Europe */}
        <ErrorBoundary fallbackMessage="Unable to load country browse section. Please refresh the page.">
          <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />}>
            <CountryBrowseSection countryStats={initialCountryStats} />
          </Suspense>
        </ErrorBoundary>

        {/* Age Browse Section - Puppies & Seniors */}
        <ErrorBoundary fallbackMessage="Unable to load age browse section. Please refresh the page.">
          <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />}>
            <AgeBrowseSection ageStats={initialAgeStats} />
          </Suspense>
        </ErrorBoundary>

        {/* Trust Band - Organization Logos */}
        <ErrorBoundary fallbackMessage="Unable to load organization logos. Please refresh the page.">
          <Suspense fallback={<div className="h-32 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />}>
            <TrustBand initialOrganizations={initialOrganizations} />
          </Suspense>
        </ErrorBoundary>

        {/* Trust Section - Organization Statistics */}
        <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />}>
          <TrustSection initialStatistics={initialStatistics} />
        </Suspense>

        {/* Final CTA - Ready to Find Your Dog? */}
        <ErrorBoundary fallbackMessage="Unable to load call-to-action section. Please refresh the page.">
          <Suspense fallback={<div className="h-48 animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg" />}>
            <FinalCTA totalCount={initialStatistics?.total_dogs || 3186} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
}