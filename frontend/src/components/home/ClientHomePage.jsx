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
  const mobileInitialData = React.useMemo(() => {
    // Normalize whatever shape we get into a plain array
    const list = Array.isArray(initialRecentDogs?.dogs)
      ? initialRecentDogs.dogs
      : Array.isArray(initialRecentDogs?.results)
        ? initialRecentDogs.results
        : Array.isArray(initialRecentDogs)
          ? initialRecentDogs
          : [];

    const mobileDogs =
      list.slice(0, 8).map((d) => ({ ...d, id: String(d.id) }));

    return {
      dogs: mobileDogs,
      statistics: {
        totalDogs: initialStatistics?.total_dogs || 0,
        totalOrganizations: initialStatistics?.total_organizations || 0,
        totalBreeds: 50, // Default to 50+ as we don't have exact breed count in basic statistics
      },
      featuredBreed: {
        name: "Labrador Retriever",
        slug: "labrador-retriever",
        description:
          "Friendly, outgoing, and active dogs who love families and make perfect companions.",
        availableCount: 20, // Default count
      },
    };
  }, [initialRecentDogs, initialStatistics]);



  return (
    <>
      {/* Mobile Version - Shown only on mobile devices */}
      <div className="md:hidden">
        <Suspense fallback={<Loading className="h-screen" />}>
          <MobileHomePage initialData={mobileInitialData} />
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