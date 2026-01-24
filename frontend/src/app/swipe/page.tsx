"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import SwipeErrorBoundary from "../../components/swipe/SwipeErrorBoundary";
import { useSwipeDevice } from "../../hooks/useSwipeDevice";
import { swipeMetrics } from "../../utils/swipeMetrics";
import { get } from "../../utils/api";
import * as Sentry from "@sentry/nextjs";
import { type Dog } from "../../types/dog";
import { type ApiSwipeResponse } from "../../types/apiDog";
import { transformApiDogsToDogs } from "../../utils/dogTransformer";
import SwipeContainerSkeleton from "../../components/ui/SwipeContainerSkeleton";
import DogDetailModalSkeleton from "../../components/ui/DogDetailModalSkeleton";

// Dynamic imports for large components (code splitting)
const SwipeContainer = dynamic(
  () =>
    import("../../components/swipe/SwipeContainer").then(
      (mod) => mod.SwipeContainer,
    ),
  {
    loading: () => <SwipeContainerSkeleton />,
    ssr: false,
  },
);

const DogDetailModalUpgraded = dynamic(
  () => import("../../components/dogs/mobile/detail/DogDetailModalUpgraded"),
  {
    loading: () => <DogDetailModalSkeleton />,
    ssr: false,
  },
);

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

        const transformedDogs = transformApiDogsToDogs(data.dogs || []);
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
        <SwipeContainer
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
