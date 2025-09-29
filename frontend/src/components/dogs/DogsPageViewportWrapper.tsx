"use client";

import React, { useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useViewport } from "@/hooks/useViewport";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { type Dog } from "@/types/dog";

// Type declaration for the JavaScript component
interface DogCardOptimizedProps {
  dog: Dog;
  onClick: () => void;
}

// Import JavaScript component with proper typing
const DogCardOptimized = dynamic<DogCardOptimizedProps>(
  () => import("./DogCardOptimized"),
  { ssr: true },
);

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

// Import error boundary for mobile catalog
const MobileCatalogErrorBoundary = dynamic(
  () => import("../error/MobileCatalogErrorBoundary"),
  { ssr: false },
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

interface DogsPageViewportWrapperProps {
  dogs: Dog[];
  loading?: boolean;
  loadingMore?: boolean;
  className?: string;
  onOpenFilter?: () => void; // Add this prop
  onLoadMore?: () => void; // Add load more handler
  hasMore?: boolean; // Add hasMore prop
  filters?: Record<string, any>; // Add filters prop
  onFilterChange?: (
    filterKeyOrBatch: string | Record<string, string>,
    value?: string,
  ) => void; // Updated to match PremiumMobileCatalog
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
  const [mounted, setMounted] = React.useState(false);

  // Handle client-side mounting to avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // For desktop, handle navigation to detail page
  const handleDogClick = useCallback(
    (dog: Dog) => {
      const dogSlug = dog.slug || `unknown-dog-${dog.id}`;
      if (typeof window !== "undefined") {
        router.push(`/dogs/${dogSlug}`);
      }
    },
    [router],
  );

  // During SSR or initial mount, show responsive grid that works for all viewports
  // This prevents hydration mismatch and ensures mobile users see the grid immediately
  if (!mounted) {
    return (
      <div className="dog-viewport-wrapper">
        {/* Use responsive CSS classes that work on all viewports */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {dogs.map((dog) => (
            <DogCardErrorBoundary key={dog.id}>
              <DogCardOptimized dog={dog} onClick={() => handleDogClick(dog)} />
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
            <DogCardOptimized dog={dog} onClick={() => handleDogClick(dog)} />
          </DogCardErrorBoundary>
        ))}
      </div>
    );
  }

  // MOBILE/TABLET: Let PremiumMobileCatalog handle everything including modal
  return (
    <MobileCatalogErrorBoundary>
      <PremiumMobileCatalog
        dogs={dogs}
        loading={loading}
        error={null}
        filters={filters}
        onFilterChange={onFilterChange}
        onOpenFilter={onOpenFilter}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        loadingMore={loadingMore}
        totalCount={dogs.length}
        viewMode="grid"
      />
    </MobileCatalogErrorBoundary>
  );
};

export default DogsPageViewportWrapper;
