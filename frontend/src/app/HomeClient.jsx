"use client";

import Layout from '../components/layout/Layout';
import HeroSection from '../components/home/HeroSection';
import DogSection from '../components/home/DogSection';
import TrustSection from '../components/home/TrustSection';
import DogSectionErrorBoundary from '../components/error/DogSectionErrorBoundary';

export default function HomeClient() {
  // Component now uses DogSection components which handle their own state

  return (
    <Layout>
      {/* Hero Section with Statistics */}
      <HeroSection />

      {/* Just Added Section */}
      <DogSectionErrorBoundary>
        <DogSection
          title="Just Added"
          subtitle="New dogs looking for homes"
          curationType="recent_with_fallback"
          viewAllHref="/dogs?curation=recent"
        />
      </DogSectionErrorBoundary>

      {/* From Different Rescues Section */}
      <DogSectionErrorBoundary>
        <DogSection
          title="From Different Rescues"
          subtitle="Dogs from each organization"
          curationType="diverse"
          viewAllHref="/dogs?curation=diverse"
        />
      </DogSectionErrorBoundary>

      {/* Trust Section with Statistics and Organization Links */}
      <TrustSection />
    </Layout>
  );
}