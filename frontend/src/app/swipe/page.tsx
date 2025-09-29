"use client";

import React, { useState, useEffect } from "react";
import { SwipeContainerWithFilters } from "../../components/swipe/SwipeContainerWithFilters";
import SwipeErrorBoundary from "../../components/swipe/SwipeErrorBoundary";
import { useSwipeDevice } from "../../hooks/useSwipeDevice";
import { swipeMetrics } from "../../utils/swipeMetrics";
import { get } from "../../utils/api";
import * as Sentry from "@sentry/nextjs";
import { type Dog } from "../../types/dog";
import DogDetailModalUpgraded from "../../components/dogs/mobile/detail/DogDetailModalUpgraded";

export default function SwipePage() {
  const canUseSwipe = useSwipeDevice();
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [totalSwiped, setTotalSwiped] = useState(0);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [currentDogIndex, setCurrentDogIndex] = useState<number>(0);

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

  const fetchDogsWithFilters = React.useCallback(
    async (queryString: string): Promise<Dog[]> => {
      try {
        const params = Object.fromEntries(new URLSearchParams(queryString));
        const data = await get("/api/dogs/swipe", params);

        const transformedDogs = (data.dogs || []).map((dog: any) => {
          // Transform camelCase dogProfilerData to snake_case dog_profiler_data
          const dogProfilerData = dog.dogProfilerData || dog.dog_profiler_data;
          const transformedProfilerData = dogProfilerData ? {
            name: dogProfilerData.name,
            breed: dogProfilerData.breed,
            tagline: dogProfilerData.tagline,
            description: dogProfilerData.description,
            personality_traits: dogProfilerData.personalityTraits || dogProfilerData.personality_traits,
            favorite_activities: dogProfilerData.favoriteActivities || dogProfilerData.favorite_activities,
            unique_quirk: dogProfilerData.uniqueQuirk || dogProfilerData.unique_quirk,
            energy_level: dogProfilerData.energyLevel || dogProfilerData.energy_level,
            trainability: dogProfilerData.trainability,
            experience_level: dogProfilerData.experienceLevel || dogProfilerData.experience_level,
            sociability: dogProfilerData.sociability,
            confidence: dogProfilerData.confidence,
            home_type: dogProfilerData.homeType || dogProfilerData.home_type,
            exercise_needs: dogProfilerData.exerciseNeeds || dogProfilerData.exercise_needs,
            grooming_needs: dogProfilerData.groomingNeeds || dogProfilerData.grooming_needs,
            yard_required: dogProfilerData.yardRequired ?? dogProfilerData.yard_required,
            good_with_dogs: dogProfilerData.goodWithDogs || dogProfilerData.good_with_dogs,
            good_with_cats: dogProfilerData.goodWithCats || dogProfilerData.good_with_cats,
            good_with_children: dogProfilerData.goodWithChildren || dogProfilerData.good_with_children,
            medical_needs: dogProfilerData.medicalNeeds || dogProfilerData.medical_needs,
            special_needs: dogProfilerData.specialNeeds || dogProfilerData.special_needs,
            neutered: dogProfilerData.neutered,
            vaccinated: dogProfilerData.vaccinated,
            ready_to_travel: dogProfilerData.readyToTravel ?? dogProfilerData.ready_to_travel,
            adoption_fee_euros: dogProfilerData.adoptionFeeEuros ?? dogProfilerData.adoption_fee_euros,
            confidence_scores: dogProfilerData.confidenceScores || dogProfilerData.confidence_scores,
            quality_score: dogProfilerData.qualityScore ?? dogProfilerData.quality_score,
            model_used: dogProfilerData.modelUsed || dogProfilerData.model_used,
            profiled_at: dogProfilerData.profiledAt || dogProfilerData.profiled_at,
            profiler_version: dogProfilerData.profilerVersion || dogProfilerData.profiler_version,
            prompt_version: dogProfilerData.promptVersion || dogProfilerData.prompt_version,
            processing_time_ms: dogProfilerData.processingTimeMs ?? dogProfilerData.processing_time_ms,
            source_references: dogProfilerData.sourceReferences || dogProfilerData.source_references,
          } : null;

          return {
            ...dog,
            // Keep organization as object for DogDetailModalUpgraded
            organization: dog.organization,
            image: dog.primary_image_url || dog.image,
            dog_profiler_data: transformedProfilerData,
            // Also preserve top-level fields for backward compatibility
            personality_traits: transformedProfilerData?.personality_traits || dog.personality_traits || [],
            traits: transformedProfilerData?.personality_traits || dog.traits || [],
            description: transformedProfilerData?.description || dog.description,
            energy_level: transformedProfilerData?.energy_level || dog.energy_level,
            special_characteristic: transformedProfilerData?.unique_quirk || dog.special_characteristic,
            quality_score: transformedProfilerData?.quality_score ?? dog.quality_score,
            additional_images: dog.images || dog.additional_images || [],
          };
        });

        return transformedDogs;
      } catch (error) {
        console.error("Error fetching dogs:", error);
        return [];
      }
    },
    [],
  );

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

  const handleCardExpanded = (dog: Dog, index: number) => {
    setSelectedDog(dog);
    setCurrentDogIndex(index);
    setShowDetails(true);
  };

  const handleNavigate = (direction: "prev" | "next") => {
    if (direction === "next" && currentDogIndex < dogs.length - 1) {
      const nextDog = dogs[currentDogIndex + 1];
      setSelectedDog(nextDog);
      setCurrentDogIndex(currentDogIndex + 1);
    } else if (direction === "prev" && currentDogIndex > 0) {
      const prevDog = dogs[currentDogIndex - 1];
      setSelectedDog(prevDog);
      setCurrentDogIndex(currentDogIndex - 1);
    }
  };

  return (
    <SwipeErrorBoundary>
      <div className="min-h-[100dvh] bg-gray-50">
        <SwipeContainerWithFilters
          fetchDogs={fetchDogsWithFilters}
          onSwipe={handleSwipe}
          onCardExpanded={handleCardExpanded}
          onDogsLoaded={setDogs}
        />

        {selectedDog && (
          <DogDetailModalUpgraded
            dog={selectedDog}
            isOpen={showDetails}
            onClose={() => {
              setShowDetails(false);
              setSelectedDog(null);
            }}
            onNavigate={handleNavigate}
            hasNext={currentDogIndex < dogs.length - 1}
            hasPrev={currentDogIndex > 0}
          />
        )}
      </div>
    </SwipeErrorBoundary>
  );
}