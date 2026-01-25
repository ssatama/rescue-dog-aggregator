"use client";

import React, { useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { useViewport } from "@/hooks/useViewport";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { type Dog } from "@/types/dog";
import DogDetailModalSkeleton from "@/components/ui/DogDetailModalSkeleton";
import { useVirtualizer } from "@tanstack/react-virtual";

// Type declaration for the JavaScript component
interface DogCardOptimizedProps {
  dog: Dog;
  onClick: () => void;
  priority?: boolean;
  isVirtualized?: boolean;
  position?: number;
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
    loading: () => <DogDetailModalSkeleton />,
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

// Constants for virtualization
const DESKTOP_COLUMNS = 4;
const ROW_HEIGHT = 620; // Card (~580px) + gap-4 (16px) + margin
const OVERSCAN = 2; // Number of extra rows to render above/below viewport

interface VirtualizedDesktopGridProps {
  dogs: Dog[];
  className?: string;
  onDogClick: (dog: Dog) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

function VirtualizedDesktopGrid({
  dogs,
  className = "",
  onDogClick,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
}: VirtualizedDesktopGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const rowCount = Math.ceil(dogs.length / DESKTOP_COLUMNS);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!onLoadMore || !hasMore || loadingMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          onLoadMore();
        }
      },
      { root: parentRef.current, rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loadingMore]);

  return (
    <div
      ref={parentRef}
      className={`h-[calc(100vh-200px)] overflow-auto ${className}`}
      style={{ contain: "strict" }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * DESKTOP_COLUMNS;
          const rowDogs = dogs.slice(startIndex, startIndex + DESKTOP_COLUMNS);

          return (
            <div
              key={virtualRow.key}
              className="absolute w-full grid grid-cols-4 gap-4"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
                height: `${virtualRow.size}px`,
              }}
            >
              {rowDogs.map((dog, i) => (
                <DogCardErrorBoundary key={dog.id}>
                  <DogCardOptimized
                    dog={dog}
                    onClick={() => onDogClick(dog)}
                    priority={startIndex + i < 8}
                    isVirtualized={true}
                    position={startIndex + i}
                  />
                </DogCardErrorBoundary>
              ))}
            </div>
          );
        })}
      </div>
      {/* Sentinel for infinite scroll detection */}
      <div ref={sentinelRef} className="h-1" aria-hidden="true" />
      {loadingMore && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
        </div>
      )}
    </div>
  );
}

interface DogsPageViewportWrapperProps {
  dogs: Dog[];
  loading?: boolean;
  loadingMore?: boolean;
  className?: string;
  onOpenFilter?: () => void; // Add this prop
  onResetFilters?: () => void; // Add reset filters handler
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
 * Desktop (1024px+): VirtualizedDesktopGrid with DogCardOptimized
 * Mobile/Tablet (<1024px): PremiumMobileCatalog
 */
const DogsPageViewportWrapper: React.FC<DogsPageViewportWrapperProps> = ({
  dogs,
  loading = false,
  loadingMore = false,
  className = "",
  onOpenFilter,
  onResetFilters,
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
          {dogs.map((dog, index) => (
            <DogCardErrorBoundary key={dog.id}>
              <DogCardOptimized
                dog={dog}
                onClick={() => handleDogClick(dog)}
                priority={index < 8}
              />
            </DogCardErrorBoundary>
          ))}
        </div>
      </div>
    );
  }

  // DESKTOP: Virtualized grid for improved TBT
  if (isDesktop) {
    return (
      <VirtualizedDesktopGrid
        dogs={dogs}
        className={className}
        onDogClick={handleDogClick}
        onLoadMore={onLoadMore}
        hasMore={hasMore}
        loadingMore={loadingMore}
      />
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
        onResetFilters={onResetFilters}
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
