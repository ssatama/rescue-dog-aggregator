"use client";

import { Suspense } from "react";
import HeroSection from "./HeroSection";
import DogSection from "./DogSection";
import TrustSection from "./TrustSection";
import DogSectionErrorBoundary from "../error/DogSectionErrorBoundary";
import Loading from "../ui/Loading";

/**
 * Client-side home page component that receives server-fetched data as props
 * This allows us to have SSG/ISR while maintaining client interactivity
 */
export default function ClientHomePage({
  initialStatistics,
  initialRecentDogs,
  initialDiverseDogs,
}) {
  return (
    <>
      {/* Hero Section - with pre-fetched statistics */}
      <HeroSection initialStatistics={initialStatistics} priority={true} />

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
    </>
  );
}
