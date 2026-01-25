"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import SwipeErrorBoundary from "../../components/swipe/SwipeErrorBoundary";
import { useSwipeDevice } from "../../hooks/useSwipeDevice";
import { swipeMetrics } from "../../utils/swipeMetrics";
import { get } from "../../utils/api";
import * as Sentry from "@sentry/nextjs";
import { type Dog } from "../../types/dog";
import { transformApiDogsToDogs } from "../../utils/dogTransformer";
import { safeStorage } from "../../utils/safeStorage";
import SwipeContainerSkeleton from "../../components/ui/SwipeContainerSkeleton";
import DogDetailModalSkeleton from "../../components/ui/DogDetailModalSkeleton";
import type { SwipeFilters } from "../../hooks/useSwipeFilters";
import type { CountryOption } from "../../services/serverSwipeService";
import {
  filtersToSearchParams,
  searchParamsToFilters,
} from "../../services/serverSwipeService";

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

interface SwipePageClientProps {
  initialDogs: Dog[] | null;
  initialFilters: SwipeFilters;
  hasUrlFilters: boolean;
  availableCountries: CountryOption[];
}

export default function SwipePageClient({
  initialDogs,
  initialFilters,
  hasUrlFilters,
  availableCountries,
}: SwipePageClientProps) {
  const router = useRouter();
  const canUseSwipe = useSwipeDevice();
  const [selectedDog, setSelectedDog] = useState<Dog | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [totalSwiped, setTotalSwiped] = useState(0);
  const [dogs, setDogs] = useState<Dog[]>(initialDogs || []);
  const [currentDogIndex, setCurrentDogIndex] = useState<number>(0);
  const migrationAttemptedRef = useRef(false);

  useEffect(() => {
    if (hasUrlFilters || migrationAttemptedRef.current) {
      return;
    }

    migrationAttemptedRef.current = true;

    const storedFilters = safeStorage.parse<SwipeFilters>("swipeFilters", {
      country: "",
      sizes: [],
      ages: [],
    });

    if (storedFilters.country) {
      const searchParams = filtersToSearchParams(storedFilters);
      router.replace(`/swipe?${searchParams}`);
    }
  }, [hasUrlFilters, router]);

  useEffect(() => {
    if (canUseSwipe) {
      swipeMetrics.trackLoadTime();
      swipeMetrics.startFPSMonitoring();

      const fpsInterval = setInterval(() => {
        swipeMetrics.checkFPSHealth();
      }, 5000);

      return () => {
        clearInterval(fpsInterval);
        swipeMetrics.stopFPSMonitoring();
      };
    }
  }, [canUseSwipe]);

  const fetchDogsWithFilters = useCallback(
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
    swipeMetrics.trackSwipe(direction, dog.id.toString());
    setTotalSwiped((prev) => {
      const newTotal = prev + 1;

      if (newTotal % 20 === 0) {
        swipeMetrics.trackQueueExhausted(newTotal);
      }

      return newTotal;
    });

    if (direction === "right") {
      swipeMetrics.trackFavoriteAdded(dog.id.toString(), "swipe");

      Sentry.addBreadcrumb({
        message: "swipe.favorite.added",
        category: "swipe",
        level: "info",
        data: {
          dogId: dog.id,
          dogName: dog.name,
          breed: dog.breed,
          source: "swipe_gesture",
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

  const handleFiltersChange = useCallback(
    (filters: SwipeFilters) => {
      safeStorage.stringify("swipeFilters", filters);
      safeStorage.set("swipeOnboardingComplete", "true");

      const searchParams = filtersToSearchParams(filters);
      router.push(`/swipe?${searchParams}`);
    },
    [router],
  );

  const needsOnboarding = !hasUrlFilters;

  return (
    <SwipeErrorBoundary>
      <div className="min-h-[100dvh] bg-gray-50">
        <SwipeContainer
          fetchDogs={fetchDogsWithFilters}
          onSwipe={handleSwipe}
          onCardExpanded={handleCardExpanded}
          onDogsLoaded={setDogs}
          initialDogs={initialDogs}
          initialFilters={initialFilters}
          needsOnboarding={needsOnboarding}
          onFiltersChange={handleFiltersChange}
          availableCountries={availableCountries}
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
