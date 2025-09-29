"use client";

import React, { useCallback } from "react";
import dynamic from "next/dynamic";
import { useViewport } from "@/hooks/useViewport";
import { useRouter } from "next/navigation";
import { type Dog } from "@/types/dog";

// Import DogsGrid for desktop
const DogsGrid = dynamic(() => import("../dogs/DogsGrid"), {
  ssr: true,
});

// Import PremiumMobileCatalog for mobile/tablet
const PremiumMobileCatalog = dynamic(
  () => import("../dogs/mobile/catalog/PremiumMobileCatalog"),
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

interface BreedDogsViewportWrapperProps {
  dogs: Dog[];
  loading?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  filters?: Record<string, any>;
  onFilterChange?: (
    filterKeyOrBatch: string | Record<string, string>,
    value?: string,
  ) => void;
  onOpenFilter?: () => void;
}

/**
 * Viewport-aware wrapper for breed detail pages
 * Desktop (1024px+): Uses DogsGrid with traditional cards
 * Mobile/Tablet (<1024px): Uses PremiumMobileCatalog with grid overlay cards
 */
const BreedDogsViewportWrapper: React.FC<BreedDogsViewportWrapperProps> = ({
  dogs,
  loading = false,
  loadingMore = false,
  onLoadMore,
  hasMore = false,
  filters = {},
  onFilterChange,
  onOpenFilter,
}) => {
  const { isDesktop } = useViewport();
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
  // This prevents hydration mismatch and ensures mobile users see content immediately
  if (!mounted) {
    return (
      <div className="breed-dogs-viewport-wrapper">
        <DogsGrid
          dogs={dogs}
          loading={loading}
          loadingType="filter"
          listContext="breed-page"
        />
      </div>
    );
  }

  // DESKTOP: Use DogsGrid for traditional card layout
  if (isDesktop) {
    return (
      <DogsGrid
        dogs={dogs}
        loading={loading}
        loadingType="filter"
        listContext="breed-page"
      />
    );
  }

  // MOBILE/TABLET: Use PremiumMobileCatalog with grid overlay cards
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

export default BreedDogsViewportWrapper;
