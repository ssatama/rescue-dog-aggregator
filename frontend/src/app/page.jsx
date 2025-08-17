'use client';

import { Suspense } from 'react';
import Layout from "../components/layout/Layout";
import HeroSection from "../components/home/HeroSection";
import DogSection from "../components/home/DogSection";
import TrustSection from "../components/home/TrustSection";
import DogSectionErrorBoundary from "../components/error/DogSectionErrorBoundary";
import Loading from "../components/ui/Loading";

// Home page with client-side data fetching and SSR-ready components
export default function Home() {
  return (
    <Layout>
      {/* Hero Section */}
      <HeroSection priority={true} />

      {/* Just Added Section */}
      <DogSectionErrorBoundary>
        <Suspense fallback={<Loading className="h-64" />}>
          <DogSection
            title="Just Added"
            subtitle="New dogs looking for homes"
            curationType="recent_with_fallback"
            viewAllHref="/dogs?curation=recent"
            priority={true}
          />
        </Suspense>
      </DogSectionErrorBoundary>

      {/* From Different Rescues Section */}
      <DogSectionErrorBoundary>
        <Suspense fallback={<Loading className="h-64" />}>
          <DogSection
            title="From Different Rescues"
            subtitle="Dogs from each organization"
            curationType="diverse"
            viewAllHref="/dogs?curation=diverse"
          />
        </Suspense>
      </DogSectionErrorBoundary>

      {/* Trust Section */}
      <TrustSection />
    </Layout>
  );
}
