"use client";

import React, { Suspense, lazy } from "react";
import HeroSection from "./HeroSection";
import DogSection from "./DogSection";
import DogSectionErrorBoundary from "../error/DogSectionErrorBoundary";
import TrustSection from "./TrustSection";
import Loading from "../ui/Loading";

// Lazy load BreedsCTA for better performance
const BreedsCTA = lazy(() =>
  import("./BreedsCTA").then((module) => ({
    default: module.BreedsCTA,
  })),
);

// Lazy load MobileHomePage for mobile devices
const MobileHomePage = lazy(() =>
  import("../mobile/MobileHomePage").then((module) => ({
    default: module.MobileHomePage,
  })),
);

export default function ClientHomePage({
  initialStatistics,
  initialRecentDogs,
  initialDiverseDogs,
}) {
  // Prepare data for mobile version
  const mobileInitialData = React.useMemo(
    () => ({
      dogs: initialRecentDogs?.dogs?.slice(0, 8) || [],
      statistics: initialStatistics,
      featuredBreed: {
        name: "Labrador Retriever",
        slug: "labrador-retriever",
        description:
          "Friendly, outgoing, and active dogs who love families and make perfect companions.",
        availableCount:
          initialStatistics?.breedCounts?.["Labrador Retriever"] || 20,
      },
    }),
    [initialRecentDogs, initialStatistics],
  );

  // Handler for loading more dogs on mobile
  const handleLoadMore = React.useCallback(async () => {
    // This would typically fetch more dogs from the API
    // For now, return empty array to indicate no more dogs
    return [];
  }, []);

  return (
    <>
      {/* Mobile Version - Shown only on mobile devices */}
      <div className="md:hidden">
        <Suspense fallback={<Loading className="h-screen" />}>
          <MobileHomePage
            initialData={mobileInitialData}
            onLoadMore={handleLoadMore}
            hasMore={initialRecentDogs?.dogs?.length > 8}
          />
        </Suspense>
      </div>

      {/* Desktop Version - Hidden on mobile devices */}
      <div className="hidden md:block">
        <HeroSection initialStatistics={initialStatistics} priority={true} />

        {/* Breeds CTA Section - New feature promotion */}
        <DogSectionErrorBoundary>
          <Suspense fallback={<Loading className="h-64" />}>
            <BreedsCTA />
          </Suspense>
        </DogSectionErrorBoundary>

        {/* Just Added Section - with pre-fetched dogs */}
        <DogSectionErrorBoundary>
          <Suspense fallback={<Loading className="h-64" />}>
            <DogSection
              title="Just Added"
              subtitle="New dogs looking for homes"
              curationType="recent_with_fallback"
              viewAllHref="/dogs?curation=recent"
              initialDogs={initialRecentDogs}
              priority={true}
            />
          </Suspense>
        </DogSectionErrorBoundary>

        {/* From Different Rescues Section - with pre-fetched dogs */}
        <DogSectionErrorBoundary>
          <Suspense fallback={<Loading className="h-64" />}>
            <DogSection
              title="From Different Rescues"
              subtitle="Dogs from each organization"
              curationType="diverse"
              viewAllHref="/dogs?curation=diverse"
              initialDogs={initialDiverseDogs}
            />
          </Suspense>
        </DogSectionErrorBoundary>

        {/* Trust Section - with pre-fetched statistics */}
        <TrustSection initialStatistics={initialStatistics} />
      </div>
    </>
  );
}
