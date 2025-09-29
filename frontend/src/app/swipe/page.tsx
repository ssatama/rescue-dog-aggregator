"use client";

import React, { useState, useEffect } from "react";
import { SwipeContainerWithFilters } from "../../components/swipe/SwipeContainerWithFilters";
import { SwipeDetails } from "../../components/swipe/SwipeDetails";
import SwipeErrorBoundary from "../../components/swipe/SwipeErrorBoundary";
import { useRouter } from "next/navigation";
import { useSwipeDevice } from "../../hooks/useSwipeDevice";
import { swipeMetrics } from "../../utils/swipeMetrics";
import { get } from "../../utils/api";
import * as Sentry from "@sentry/nextjs";
import { type Dog } from "../../types/dog";

export default function SwipePage() {
  const router = useRouter();
  const canUseSwipe = useSwipeDevice();
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [totalSwiped, setTotalSwiped] = useState(0);

  // Initialize performance tracking on mount
  useEffect(() => {
    if (canUseSwipe) {
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
  }, [canUseSwipe]);

  // Helper function to map dog data to SwipeDetails format
  const mapDogForDetails = (dog: Dog): any => ({
    id: dog.id,
    name: dog.name,
    age: dog.age || "Unknown",
    age_min_months: dog.age_min_months,
    age_max_months: dog.age_max_months,
    sex: dog.sex || "Unknown",
    size: dog.size || "Medium",
    breed: dog.breed || "Mixed Breed",
    primary_breed: dog.primary_breed,
    organization_name: dog.organization || "",
    location: dog.location || "",
    adoption_url: dog.adoption_url || "",
    image_url: dog.primary_image_url || dog.main_image || "",
    additional_images: dog.photos || [],
    dog_profiler_data:
      dog.dog_profiler_data ||
      (dog.description
        ? {
            description: dog.description,
            personality_traits: dog.personality_traits || [],
          }
        : undefined),
  });

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
