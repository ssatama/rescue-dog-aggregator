"use client";

import React, { useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useViewport } from "@/hooks/useViewport";
import { useRouter, useSearchParams } from "next/navigation";

// Import JavaScript component without type checking
const DogCardOptimized = dynamic(() => import("./DogCardOptimized"), {
  ssr: true,
});

const DogCardErrorBoundary = dynamic(
  () => import("../error/DogCardErrorBoundary"),
  { ssr: true },
);

// Import the new PremiumMobileCatalog
const PremiumMobileCatalog = dynamic(
  () => import("./mobile/catalog/PremiumMobileCatalog"),
  {
    ssr: false,
    loading: () => <div className="min-h-screen bg-gray-50 animate-pulse" />,
  },
);

// Lazy load the modal for mobile/tablet (not needed on desktop)
const DogDetailModal = dynamic(
  () => import("./mobile/detail/DogDetailModalUpgraded"),
  {
    ssr: false,
    loading: () => null,
  },
);

// Lazy load the bottom navigation for mobile only
const DogBottomNav = dynamic(
  () =>
    import("./mobile/navigation/DogBottomNav").then((mod) => ({
      default: mod.DogBottomNav,
    })),
  {
    ssr: false,
    loading: () => null,
  },
);

interface Dog {
  id: string;
  slug?: string; // Add slug for navigation
  name: string;
  breed: string;
  breed_mix: string;
  age: string;
  sex: string;
  primary_image_url?: string; // Changed to match API
  main_image?: string; // Added as fallback
  photos?: string[]; // Keep for compatibility
  summary: string;
  organization: {
    id: number;
    name: string;
    config_id: string;
    slug?: string; // Organization slug
  };
  personality_traits?: string[];
  dog_profiler_data?: {
    personality?: string[];
  };
  properties?: {
    location_country?: string;
    available_countries?: string[];
    fostered_in?: string;
  };
}

interface DogsPageViewportWrapperProps {
  dogs: Dog[];
  loading?: boolean;
  loadingMore?: boolean;
  className?: string;
  onOpenFilter?: () => void; // Add this prop
  onLoadMore?: () => void; // Add load more handler
  hasMore?: boolean; // Add hasMore prop
  filters?: Record<string, any>; // Add filters prop
  onFilterChange?: (filterKeyOrBatch: string | Record<string, string>, value?: string) => void; // Updated to match PremiumMobileCatalog
}

/**
 * Viewport-aware wrapper component that routes to appropriate UI
 * Desktop (1024px+): Uses existing DogCardOptimized components
 * Mobile/Tablet (<1024px): Uses new DogGrid with compact cards
 */
const DogsPageViewportWrapper: React.FC<DogsPageViewportWrapperProps> = ({
  dogs,
  loading = false,
  loadingMore = false,
  className = "",
  onOpenFilter,
  onLoadMore,
  hasMore = false,
  filters = {},
  onFilterChange,
}) => {
  const { isDesktop, isMobile, isTablet } = useViewport();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedDog, setSelectedDog] = React.useState<Dog | null>(null);
  const [mounted, setMounted] = React.useState(false);

  // Handle client-side mounting to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Update URL helper function - moved before useEffect
  const updateURL = useCallback((dogId: string | null) => {
    if (typeof window !== "undefined" && window.location.href.includes("://")) {
      try {
        const url = new URL(window.location.href);
        if (dogId) {
          url.searchParams.set("dog", dogId);
        } else {
          url.searchParams.delete("dog");
        }
        window.history.pushState({}, "", url.toString());
      } catch (error) {
        // Fallback for test environment or invalid URLs
        if (dogId) {
          window.history.pushState({}, "", `?dog=${dogId}`);
        } else {
          window.history.pushState({}, "", window.location.pathname);
        }
      }
    }
  }, []);

  // Get the dog ID from URL params on mount and when params change
  useEffect(() => {
    if (!isDesktop && searchParams) {
      const dogSlug = searchParams.get("dog");
      if (dogSlug && dogs.length > 0) {
        const dog = dogs.find((d) => {
          const slug = d.slug || `unknown-dog-${d.id}`;
          return slug === dogSlug;
        });
        if (dog) {
          setSelectedDog(dog);
        } else {
          // Clear the invalid dog param from URL
          updateURL(null);
        }
      } else {
        setSelectedDog(null);
      }
    }
  }, [searchParams, dogs, isDesktop, updateURL]);

  const handleDogClick = useCallback(
    (dog: Dog) => {
      console.log("handleDogClick called:", { dog, isDesktop });
      const dogSlug = dog.slug || `unknown-dog-${dog.id}`;

      if (isDesktop) {
        // Desktop: Navigate to separate detail page (existing behavior)
        if (typeof window !== "undefined") {
          router.push(`/dogs/${dogSlug}`);
        }
      } else {
        // Mobile/Tablet: Open modal (new behavior)
        console.log("Setting selectedDog:", dog);
        setSelectedDog(dog);
        updateURL(dogSlug);
      }
    },
    [isDesktop, router, updateURL],
  );

  const handleModalClose = useCallback(() => {
    setSelectedDog(null);
    updateURL(null);
  }, [updateURL]);

  const handleNavigate = useCallback(
    (direction: "prev" | "next") => {
      if (!selectedDog || dogs.length === 0) return;

      const currentIndex = dogs.findIndex((d) => d.id === selectedDog.id);
      if (currentIndex === -1) return;

      let newIndex: number;
      if (direction === "next") {
        newIndex = currentIndex + 1;
        if (newIndex >= dogs.length) return; // No next dog
      } else {
        newIndex = currentIndex - 1;
        if (newIndex < 0) return; // No previous dog
      }

      const newDog = dogs[newIndex];
      if (newDog) {
        setSelectedDog(newDog);
        const newSlug = newDog.slug || `unknown-dog-${newDog.id}`;
        updateURL(newSlug);
      }
    },
    [selectedDog, dogs, updateURL],
  );

  // Calculate navigation availability
  const currentDogIndex = selectedDog
    ? dogs.findIndex((d) => d.id === selectedDog.id)
    : -1;
  const hasPrev = currentDogIndex > 0;
  const hasNext = currentDogIndex >= 0 && currentDogIndex < dogs.length - 1;

  // During SSR or initial mount, show responsive grid that works for all viewports
  // This prevents hydration mismatch and ensures mobile users see the grid immediately
  if (!mounted) {
    return (
      <div className="dog-viewport-wrapper">
        {/* Use responsive CSS classes that work on all viewports */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {dogs.map((dog) => (
            <DogCardErrorBoundary key={dog.id}>
              {React.createElement(DogCardOptimized as any, {
                dog,
                onClick: () => handleDogClick(dog),
              })}
            </DogCardErrorBoundary>
          ))}
        </div>
      </div>
    );
  }

  // DESKTOP: Return existing implementation unchanged
  if (isDesktop) {
    return (
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${className}`}
      >
        {dogs.map((dog) => (
          <DogCardErrorBoundary key={dog.id}>
            {/* Cast as any to handle JavaScript component */}
            {React.createElement(DogCardOptimized as any, {
              dog,
              onClick: () => handleDogClick(dog),
            })}
          </DogCardErrorBoundary>
        ))}
      </div>
    );
  }

  // MOBILE/TABLET: New grid implementation with modal
  return (
    <>
      <PremiumMobileCatalog
        dogs={dogs}
        loading={loading}
        error={null}
        filters={filters}
        onFilterChange={onFilterChange} // Pass the filter change handler
        onOpenFilter={onOpenFilter}
        onLoadMore={onLoadMore} // Pass the load more handler
        hasMore={hasMore} // Pass hasMore state
        loadingMore={loadingMore} // Pass loadingMore state
        totalCount={dogs.length}
        viewMode="grid"
      />

      {/* Modal for mobile/tablet */}
      {selectedDog && (
        <DogDetailModal
          dog={selectedDog}
          isOpen={!!selectedDog}
          onClose={handleModalClose}
          onNavigate={handleNavigate}
          hasPrev={hasPrev}
          hasNext={hasNext}
        />
      )}
    </>
  );
};

export default DogsPageViewportWrapper;