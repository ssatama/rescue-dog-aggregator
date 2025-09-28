"use client";

import React, { Suspense, lazy, useEffect, useState } from "react";
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
  // State for breeds with images
  const [breedsWithImages, setBreedsWithImages] = useState(null);

  // Fetch breeds with images on mount (client-side only)
  useEffect(() => {
    const fetchBreedsWithImages = async () => {
      try {
        // Fetch breeds that have at least 5 dogs and images
        const response = await fetch(
          "/api/animals/breeds/with-images?min_count=5&limit=20",
        );
        if (response.ok) {
          const breeds = await response.json();
          setBreedsWithImages(breeds);
        }
      } catch (error) {
        console.error("Error fetching breeds with images:", error);
      }
    };

    fetchBreedsWithImages();
  }, []);

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

    // Change from slice(0, 8) to slice(0, 8) - already correct, but ensure we fetch 8
    const mobileDogs = list
      .slice(0, 8)
      .map((d) => ({ ...d, id: String(d.id) }));

    // Transform breeds with images to the format expected by MobileHomePage
    let transformedBreedStats = null;
    if (breedsWithImages && Array.isArray(breedsWithImages)) {
      // Filter out breeds that don't have detail pages
      const validBreeds = breedsWithImages.filter((breed) => {
        const breedName = breed.primary_breed || breed.name || "";
        const lowerBreedName = breedName.toLowerCase();
        
        // Exclude mixed breeds and unknown breeds
        const isMixed = lowerBreedName.includes("mix") || 
                        breed.breed_type === "mixed" || 
                        breed.breed_group === "Mixed";
        const isUnknown = lowerBreedName === "unknown" || 
                          lowerBreedName === "" ||
                          !breedName;
        
        return !isMixed && !isUnknown && breed.count > 0;
      });
      
      // Select 3 random valid breeds from the available breeds
      const shuffled = [...validBreeds].sort(() => 0.5 - Math.random());
      const selectedBreeds = shuffled.slice(0, 3);

      transformedBreedStats = {
        qualifying_breeds: selectedBreeds.map((breed) => ({
          name: breed.primary_breed || breed.name,
          breed_name: breed.primary_breed || breed.name,
          slug: (breed.primary_breed || breed.name || "")
            .toLowerCase()
            .replace(/\s+/g, "-"),
          description:
            breed.description ||
            `Discover ${breed.count || 0} wonderful ${breed.primary_breed || breed.name}s looking for their forever homes.`,
          count: breed.count || 0,
          available_count: breed.count || 0,
          image_url: breed.sample_dogs?.[0]?.primary_image_url || null,
          imageUrl: breed.sample_dogs?.[0]?.primary_image_url || null,
        })),
      };
    }

    return {
      dogs: mobileDogs,
      statistics: {
        totalDogs: initialStatistics?.total_dogs || 0,
        totalOrganizations: initialStatistics?.total_organizations || 0,
        totalBreeds: 50, // Default to 50+ as we don't have exact breed count in basic statistics
      },
      breedStats: transformedBreedStats, // Pass transformed breed data for carousel
    };
  }, [initialRecentDogs, initialStatistics, breedsWithImages]);

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