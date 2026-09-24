"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { type Dog } from "@/types/dog";
import type { ListContext } from "@/types/dogComponents";
import DogCard from "@/components/dogs/DogCard";
import MobileFilterDrawer from "@/components/filters/MobileFilterDrawer";
import { Button } from "@/components/ui/button";
import DogDetailModalSkeleton from "@/components/ui/DogDetailModalSkeleton";

// Dynamic imports for large components (code splitting)
const DogDetailModalUpgraded = dynamic(
  () => import("../detail/DogDetailModalUpgraded"),
  {
    loading: () => <DogDetailModalSkeleton />,
    ssr: false,
  },
);

const MobileCatalogErrorBoundary = dynamic(
  () => import("@/components/error/MobileCatalogErrorBoundary"),
  { ssr: false },
);

interface PremiumMobileCatalogProps {
  dogs: Dog[];
  loading?: boolean;
  error?: string | null;
  filters?: Record<string, any>;
  onFilterChange?: (
    filterKeyOrBatch: string | Record<string, string>,
    value?: string,
  ) => void;
  onOpenFilter?: () => void;
  onResetFilters?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  totalCount?: number;
  viewMode?: "grid" | "list";
  listContext?: ListContext;
}

// Main component
const PremiumMobileCatalog: React.FC<PremiumMobileCatalogProps> = ({
  dogs,
  loading = false,
  error = null,
  filters = {},
  onFilterChange,
  onOpenFilter,
  onResetFilters,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  totalCount = 0,
  viewMode = "grid",
  listContext = "search",
}) => {
  const pathname = usePathname();

  // Initialize selected dog from hash on mount
  const [selectedDog, setSelectedDog] = useState<Dog | null>(() => {
    if (typeof window === "undefined") return null;
    const hash = window.location.hash.slice(1);
    if (!hash.startsWith("dog=")) return null;
    const slug = hash.split("=")[1];
    return (
      dogs.find((d) => d.slug === slug || `unknown-dog-${d.id}` === slug) ||
      null
    );
  });

  const [isModalOpen, setIsModalOpen] = useState(!!selectedDog);

  // Listen for hash changes (back/forward navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (!hash.startsWith("dog=")) {
        setIsModalOpen(false);
        setSelectedDog(null);
        return;
      }
      const slug = hash.split("=")[1];
      const dog = dogs.find(
        (d) => d.slug === slug || `unknown-dog-${d.id}` === slug,
      );
      if (dog) {
        setSelectedDog(dog);
        setIsModalOpen(true);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [dogs]);

  // Track selectedDog in ref to avoid dependency in effect
  const selectedDogRef = useRef(selectedDog);
  useEffect(() => {
    selectedDogRef.current = selectedDog;
  }, [selectedDog]);

  // Re-check hash when dogs array changes (for late-loading data)
  useEffect(() => {
    if (typeof window === "undefined" || !dogs.length) return;

    const hash = window.location.hash.slice(1);
    if (!hash.startsWith("dog=")) return;

    const slug = decodeURIComponent(hash.split("=")[1] || "");
    const dog = dogs.find(
      (d) => d.slug === slug || `unknown-dog-${d.id}` === slug,
    );

    if (dog && !selectedDogRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing with URL hash when dogs array changes (late-loading data)
      setSelectedDog(dog);
      setIsModalOpen(true);
    }
  }, [dogs]);

  const handleDogClick = (dog: Dog) => {
    setSelectedDog(dog);
    setIsModalOpen(true);

    // Update hash for sharing with proper encoding (use pushState to avoid ESLint warning)
    const hash = `#dog=${encodeURIComponent(dog.slug || `unknown-dog-${dog.id}`)}`;
    history.pushState(null, "", window.location.pathname + window.location.search + hash);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedDog(null);

    // Clear hash while preserving search params (use replaceState to avoid new history entry)
    history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  };

  const handleModalNavigate = (direction: "prev" | "next") => {
    if (!selectedDog || !dogs.length) return;

    const currentIndex = dogs.findIndex((d) => d.id === selectedDog.id);
    let newIndex;

    if (direction === "next") {
      newIndex =
        currentIndex < dogs.length - 1 ? currentIndex + 1 : currentIndex;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
    }

    if (newIndex !== currentIndex) {
      const newDog = dogs[newIndex];
      setSelectedDog(newDog);

      // Update hash with new dog (with encoding)
      window.location.hash = `dog=${encodeURIComponent(newDog.slug || `unknown-dog-${newDog.id}`)}`;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        {/* Main Content */}
        <div className="px-4 py-4">
          {loading && dogs.length === 0 ? (
            // Loading state
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
                >
                  <div className="aspect-square bg-gray-200 dark:bg-gray-700 animate-pulse" />
                  <div className="p-3 space-y-2">
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                    <div className="flex gap-1">
                      <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                      <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            // Error state
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-6xl mb-4">😔</div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Oops! Something went wrong
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center px-8">
                {error}
              </p>
            </div>
          ) : dogs.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-16">
              <div className="text-6xl mb-4">🐕</div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                No dogs found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center px-8 mb-6">
                Try adjusting your filters to see more dogs
              </p>
              {onResetFilters && (
                <Button
                  onClick={onResetFilters}
                  variant="default"
                  size="lg"
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  Clear All Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Dog Grid - Display ALL dogs passed from parent, no local filtering */}
              <div className="grid grid-cols-2 gap-3">
                {dogs.map((dog, index) => (
                  <DogCard
                    key={dog.id}
                    dog={dog}
                    priority={index < 4}
                    position={index}
                    listContext={listContext}
                    onOpen={handleDogClick}
                  />
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && onLoadMore && (
                <div className="flex justify-center mt-8">
                  <Button
                    onClick={onLoadMore}
                    disabled={loadingMore}
                    variant="outline"
                    size="lg"
                    className="min-w-[150px]"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load More Dogs"
                    )}
                  </Button>
                </div>
              )}

              {/* Loading indicator for load more */}
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Dog Detail Modal with error boundary */}
      <MobileCatalogErrorBoundary>
        <DogDetailModalUpgraded
          dog={selectedDog}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onNavigate={handleModalNavigate}
          hasNext={
            selectedDog
              ? dogs.findIndex((d) => d.id === selectedDog.id) < dogs.length - 1
              : false
          }
          hasPrev={
            selectedDog
              ? dogs.findIndex((d) => d.id === selectedDog.id) > 0
              : false
          }
        />
      </MobileCatalogErrorBoundary>
    </>
  );
};

export default PremiumMobileCatalog;
