/**
 * RelatedDogsSection - Lazy-loaded section showing related dogs from the same organization
 *
 * Features:
 * - Lazy loading with IntersectionObserver (only loads when visible)
 * - Comprehensive loading states with skeleton animation
 * - Error handling with user-friendly fallbacks
 * - Performance optimized with React.memo on child components
 *
 * Performance Benefits:
 * - Reduces initial page load time by deferring API calls
 * - Improves perceived performance with skeleton states
 * - Prevents unnecessary network requests for invisible content
 *
 * @param {number} organizationId - ID of the organization to fetch related dogs from
 * @param {string} currentDogId - ID of current dog (excluded from results)
 * @param {Object} organization - Organization object with name and other details
 */
"use client";
import React, { useState, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import DogCardOptimized from "./DogCardOptimized";
import { getRelatedDogs } from "../../services/relatedDogsService";
import { sanitizeText } from "../../utils/security";
import { reportError } from "../../utils/logger";
import { useScrollAnimation } from "../../hooks/useScrollAnimation";

// Memoized RelatedDogsSection to prevent unnecessary re-renders
const RelatedDogsSection = memo(
  function RelatedDogsSection({ organizationId, currentDogId, organization }) {
    const [relatedDogs, setRelatedDogs] = useState([]);
    const [loading, setLoading] = useState(false); // Start as false for lazy loading
    const [error, setError] = useState(false);
    const [hasStartedLoading, setHasStartedLoading] = useState(false);

    // Use intersection observer for lazy loading
    const [sectionRef, isVisible] = useScrollAnimation({
      threshold: 0.1,
      rootMargin: "50px",
      triggerOnce: true,
    });

    const fetchRelatedDogs = useCallback(async () => {
      // Don't fetch if required parameters are missing
      if (!organizationId || !currentDogId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(false);
        const dogs = await getRelatedDogs(organizationId, currentDogId);
        setRelatedDogs(dogs);
      } catch (err) {
        reportError("Error fetching related dogs", {
          error: err.message,
          organizationId,
          currentDogId,
        });
        setError(true);
      } finally {
        setLoading(false);
      }
    }, [organizationId, currentDogId]);

    // Trigger loading when section becomes visible
    useEffect(() => {
      if (isVisible && !hasStartedLoading) {
        setHasStartedLoading(true);
        fetchRelatedDogs();
      }
    }, [isVisible, hasStartedLoading, fetchRelatedDogs]);

    // Don't render section if required parameters are missing
    if (!organizationId || !currentDogId) {
      return null;
    }

    const organizationName = organization?.name || "this rescue";
    const limitedRelatedDogs = relatedDogs.slice(0, 3); // Limit to 3 dogs max

    return (
      <div ref={sectionRef} className="mb-8">
        {/* Section Title */}
        <h2 className="text-section text-gray-800 dark:text-gray-200 mb-6">
          More Dogs from {sanitizeText(organizationName)}
        </h2>

        {/* Enhanced Loading State */}
        {loading && (
          <div data-testid="related-dogs-loading" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden"
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 animate-pulse"></div>
                  <div className="p-4 space-y-3">
                    <div className="space-y-2">
                      <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded animate-pulse"></div>
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-3/4 animate-pulse"></div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-1/2 animate-pulse"></div>
                      <div className="w-6 h-6 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-6">
              <div className="w-32 h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded animate-pulse"></div>
            </div>
          </div>
        )}

        {/* Enhanced Error State */}
        {error && !loading && (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <div className="mb-4">
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <p className="text-gray-600 text-lg font-medium mb-2">
                Unable to load related dogs
              </p>
              <p className="text-gray-500 text-sm mb-6">
                There was an issue loading more dogs from this organization.
              </p>
            </div>
            <Link
              href={`/dogs?organization_id=${organizationId}`}
              className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-lg transition-all duration-300 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
            >
              View all available dogs
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
        )}

        {/* Success State with Dogs */}
        {!loading && !error && limitedRelatedDogs.length > 0 && (
          <>
            <div
              data-testid="related-dogs-grid"
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
            >
              {limitedRelatedDogs.map((dog, index) => (
                <DogCardOptimized
                  key={dog.id}
                  dog={dog}
                  priority={false}
                  animationDelay={index}
                  compact={false}
                />
              ))}
            </div>

            {/* View All Link */}
            <div className="text-center">
              <Link
                href={`/dogs?organization_id=${organizationId}`}
                className="text-orange-600 hover:text-orange-700 font-medium transition-colors duration-300"
              >
                View all available dogs →
              </Link>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && !error && limitedRelatedDogs.length === 0 && (
          <div
            data-testid="related-dogs-empty-state"
            className="text-center py-8"
          >
            <p className="text-gray-600 mb-4">
              No other dogs available from this rescue
            </p>
            <Link
              href={`/dogs?organization_id=${organizationId}`}
              className="text-orange-600 hover:text-orange-700 font-medium transition-colors duration-300"
            >
              View all available dogs →
            </Link>
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for better performance
    return (
      prevProps.organizationId === nextProps.organizationId &&
      prevProps.currentDogId === nextProps.currentDogId &&
      prevProps.organization?.id === nextProps.organization?.id &&
      prevProps.organization?.name === nextProps.organization?.name
    );
  },
);

RelatedDogsSection.displayName = "RelatedDogsSection";

export default RelatedDogsSection;
