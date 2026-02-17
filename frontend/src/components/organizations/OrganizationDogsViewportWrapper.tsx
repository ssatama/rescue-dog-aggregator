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

interface OrganizationDogsViewportWrapperProps {
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
  emptyStateVariant?: import("@/components/ui/EmptyState").EmptyStateVariant;
  onClearFilters?: () => void;
  onBrowseOrganizations?: () => void;
  listContext?: import("@/types/dogComponents").ListContext;
}

/**
 * Viewport-aware wrapper for organization detail pages
 * Desktop (1024px+): Uses DogsGrid with traditional cards
 * Mobile/Tablet (<1024px): Uses PremiumMobileCatalog with grid overlay cards
 */
const OrganizationDogsViewportWrapper: React.FC<
  OrganizationDogsViewportWrapperProps
> = ({
  dogs,
  loading = false,
  loadingMore = false,
  onLoadMore,
  hasMore = false,
  filters = {},
  onFilterChange,
  onOpenFilter,
  emptyStateVariant = "noDogsOrganization",
  onClearFilters,
  onBrowseOrganizations,
  listContext = "org-page",
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

  // Map organization filter keys to mobile catalog keys
  const mappedFilters = React.useMemo(() => {
    return {
      sexFilter: filters.sex || "Any",
      ageFilter: filters.age || "Any age",
    };
  }, [filters.sex, filters.age]);

  // During SSR or initial mount, show responsive grid that works for all viewports
  // This prevents hydration mismatch and ensures mobile users see content immediately
  if (!mounted) {
    return (
      <div className="organization-dogs-viewport-wrapper">
        <DogsGrid
          dogs={dogs}
          loading={loading}
          loadingType="filter"
          emptyStateVariant={emptyStateVariant}
          onClearFilters={onClearFilters}
          onBrowseOrganizations={onBrowseOrganizations}
          listContext={listContext}
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
        emptyStateVariant={emptyStateVariant}
        onClearFilters={onClearFilters}
        onBrowseOrganizations={onBrowseOrganizations}
        listContext={listContext}
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
        filters={mappedFilters}
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

export default OrganizationDogsViewportWrapper;
