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
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import RelatedDogsCard from './RelatedDogsCard';
import { getRelatedDogs } from '../../services/relatedDogsService';
import { sanitizeText } from '../../utils/security';
import { reportError } from '../../utils/logger';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

export default function RelatedDogsSection({ organizationId, currentDogId, organization }) {
  const [relatedDogs, setRelatedDogs] = useState([]);
  const [loading, setLoading] = useState(false); // Start as false for lazy loading
  const [error, setError] = useState(false);
  const [hasStartedLoading, setHasStartedLoading] = useState(false);
  
  // Use intersection observer for lazy loading
  const [sectionRef, isVisible] = useScrollAnimation({
    threshold: 0.1,
    rootMargin: '50px',
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
        currentDogId 
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

  const organizationName = organization?.name || 'this rescue';
  const limitedRelatedDogs = relatedDogs.slice(0, 3); // Limit to 3 dogs max

  return (
    <div ref={sectionRef} className="mb-8">
      {/* Section Title */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        More Dogs from {sanitizeText(organizationName)}
      </h2>

      {/* Loading State */}
      {loading && (
        <div data-testid="related-dogs-loading" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 rounded-lg animate-pulse">
                <div className="aspect-[4/3] bg-gray-300 rounded-t-lg"></div>
                <div className="p-4 space-y-2">
                  <div className="h-5 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            Unable to load related dogs at this time.
          </p>
          <Link 
            href={`/dogs?organization_id=${organizationId}`}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            View all available dogs
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
            {limitedRelatedDogs.map((dog) => (
              <RelatedDogsCard key={dog.id} dog={dog} />
            ))}
          </div>

          {/* View All Link */}
          <div className="text-center">
            <Link 
              href={`/dogs?organization_id=${organizationId}`}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
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
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
          >
            View all available dogs →
          </Link>
        </div>
      )}
    </div>
  );
}