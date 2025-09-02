"use client";

import React, { useState, useEffect } from "react";
import { SwipeContainerWithFilters } from "../../components/swipe/SwipeContainerWithFilters";
import { SwipeDetails } from "../../components/swipe/SwipeDetails";
import SwipeErrorBoundary from "../../components/swipe/SwipeErrorBoundary";
import { useRouter } from "next/navigation";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { swipeMetrics } from "../../utils/swipeMetrics";
import { get } from "../../utils/api";
import * as Sentry from "@sentry/nextjs";

interface Dog {
  id: number;
  name: string;
  breed?: string;
  age?: string;
  image?: string;
  organization?: string;
  location?: string;
  slug: string;
  description?: string;
  traits?: string[];
  energy_level?: number;
  special_characteristic?: string;
  quality_score?: number;
  created_at?: string;
  sex?: string;
  size?: string;
  good_with_dogs?: boolean | string;
  good_with_cats?: boolean | string;
  good_with_kids?: boolean | string;
  additional_images?: string[];
  adoption_url?: string;
}

export default function SwipePage() {
  const router = useRouter();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [totalSwiped, setTotalSwiped] = useState(0);

  // Initialize performance tracking on mount
  useEffect(() => {
    if (isMobile) {
      // Track load time
      swipeMetrics.trackLoadTime();

      // Start FPS monitoring for mobile
      swipeMetrics.startFPSMonitoring();

      // Check FPS health periodically
      const fpsInterval = setInterval(() => {
        swipeMetrics.checkFPSHealth();
      }, 5000);

      return () => {
        clearInterval(fpsInterval);
        swipeMetrics.stopFPSMonitoring();
      };
    }
  }, [isMobile]);

  // Helper function to map dog data to SwipeDetails format
  const mapDogForDetails = (dog: Dog): any => ({
    id: dog.id,
    name: dog.name,
    age: dog.age || "Unknown",
    sex: dog.sex || "Unknown",
    size: dog.size || "Medium",
    breed: dog.breed || "Mixed Breed",
    organization_name: dog.organization || "",
    location: dog.location || "",
    adoption_url: dog.adoption_url || "",
    image_url: dog.image || "",
    additional_images: dog.additional_images || [],
    dog_profiler_data: dog.description
      ? {
          description: dog.description,
          personality_traits: dog.traits || [],
          energy_level: dog.energy_level,
          good_with_dogs: dog.good_with_dogs,
          good_with_cats: dog.good_with_cats,
          good_with_kids: dog.good_with_kids,
          unique_quirk: dog.special_characteristic,
        }
      : undefined,
  });

  // Redirect desktop users
  if (!isMobile && typeof window !== "undefined") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">📱</div>
          <h1 className="text-3xl font-bold mb-4">Mobile Only Feature</h1>
          <p className="text-gray-600 mb-6">
            The swipe feature is designed for mobile devices. Please visit this
            page on your phone to start swiping!
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Back to Homepage
          </button>
        </div>
      </div>
    );
  }

  const fetchDogsWithFilters = async (queryString: string): Promise<Dog[]> => {
    try {
      // Parse query string into params object for the get function
      const params = Object.fromEntries(new URLSearchParams(queryString));
      const data = await get("/api/dogs/swipe", params);

      // Transform the dogs data to ensure organization is a string
      const transformedDogs = (data.dogs || []).map((dog: any) => ({
        ...dog,
        // Extract organization name from object if it exists
        organization:
          typeof dog.organization === "object" && dog.organization
            ? dog.organization.name
            : dog.organization,
        // Ensure other fields are properly mapped
        image: dog.primary_image_url || dog.image,
        traits: dog.dogProfilerData?.personalityTraits || dog.traits || [],
        description: dog.dogProfilerData?.description || dog.description,
        energy_level: dog.dogProfilerData?.energyLevel || dog.energy_level,
        special_characteristic:
          dog.dogProfilerData?.uniqueQuirk || dog.special_characteristic,
        quality_score: dog.dogProfilerData?.qualityScore || dog.quality_score,
        additional_images: dog.images || dog.additional_images || [],
      }));

      return transformedDogs;
    } catch (error) {
      console.error("Error fetching dogs:", error);
      return [];
    }
  };

  const handleSwipe = (direction: "left" | "right", dog: Dog) => {
    console.log(`Swiped ${direction} on ${dog.name}`);

    // Track swipe metrics
    swipeMetrics.trackSwipe(direction, dog.id.toString());
    setTotalSwiped((prev) => {
      const newTotal = prev + 1;

      // Track when queue is exhausted (every 20 swipes as a checkpoint)
      if (newTotal % 20 === 0) {
        swipeMetrics.trackQueueExhausted(newTotal);
      }

      return newTotal;
    });

    // Track favorite added separately from swipe
    if (direction === "right") {
      swipeMetrics.trackFavoriteAdded(dog.id.toString(), "swipe");

      // Also track this in Sentry for redundancy
      Sentry.captureEvent({
        message: "swipe.favorite.added",
        level: "info",
        contexts: {
          dog: {
            id: dog.id,
            name: dog.name,
            breed: dog.breed,
            source: "swipe_gesture",
          },
        },
      });
    }
  };

  const handleCardExpanded = (dog: Dog) => {
    setSelectedDog(dog);
    setShowDetails(true);
  };

  return (
    <SwipeErrorBoundary>
      <div className="min-h-[100dvh] bg-gray-50">
        <SwipeContainerWithFilters
          fetchDogs={fetchDogsWithFilters}
          onSwipe={handleSwipe}
          onCardExpanded={handleCardExpanded}
        />

        {selectedDog && (
          <SwipeDetails
            dog={mapDogForDetails(selectedDog)}
            isOpen={showDetails}
            onClose={() => {
              setShowDetails(false);
              setSelectedDog(null);
            }}
          />
        )}
      </div>
    </SwipeErrorBoundary>
  );
}
