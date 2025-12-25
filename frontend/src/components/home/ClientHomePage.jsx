"use client";

import React, { Suspense, lazy } from "react";
import HeroSection from "./HeroSection";
import PlatformCapabilities from "./PlatformCapabilities";
import CountryBrowseSection from "./CountryBrowseSection";
import TrustBand from "./TrustBand";
import FeaturedDogsSection from "./FeaturedDogsSection";
import TrustSection from "./TrustSection";
import FinalCTA from "./FinalCTA";
import Loading from "../ui/Loading";
import MobileHomePage from "../mobile/MobileHomePage";
import ErrorBoundary from "../ui/ErrorBoundary";
import { transformMobileHomePageData } from "../../utils/homePageTransformers";

// Lazy load BreedsCTA for better performance
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
}) {
  // Prepare data for mobile version
  const mobileInitialData = React.useMemo(
    () =>
      transformMobileHomePageData({
        initialRecentDogs,
        initialStatistics,
        breedsWithImages: initialBreedsWithImages,
        countryStats: initialCountryStats,
      }),
    [initialRecentDogs, initialStatistics, initialBreedsWithImages, initialCountryStats],
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
        <HeroSection initialStatistics={initialStatistics} priority={true} />

        {/* Platform Capabilities Section - Three Ways to Find Your Dog */}
        <ErrorBoundary fallbackMessage="Unable to load platform capabilities section. Please refresh the page.">
          <PlatformCapabilities />
        </ErrorBoundary>

        {/* Country Browse Section - Dogs from Across Europe */}
        <ErrorBoundary fallbackMessage="Unable to load country browse section. Please refresh the page.">
          <CountryBrowseSection countryStats={initialCountryStats} />
        </ErrorBoundary>

        {/* Trust Band - Organization Logos */}
        <ErrorBoundary fallbackMessage="Unable to load organization logos. Please refresh the page.">
          <TrustBand initialOrganizations={initialOrganizations} />
        </ErrorBoundary>

        {/* Featured Dogs Section - 6 dogs */}
        <ErrorBoundary fallbackMessage="Unable to load featured dogs. Please refresh the page.">
          <FeaturedDogsSection
            dogs={initialRecentDogs || []}
            totalCount={initialStatistics?.total_dogs || 0}
          />
        </ErrorBoundary>

        {/* Trust Section - Organization Statistics */}
        <TrustSection initialStatistics={initialStatistics} />

        {/* Final CTA - Ready to Find Your Dog? */}
        <ErrorBoundary fallbackMessage="Unable to load call-to-action section. Please refresh the page.">
          <FinalCTA totalCount={initialStatistics?.total_dogs || 3186} />
        </ErrorBoundary>
      </div>
    </>
  );
}