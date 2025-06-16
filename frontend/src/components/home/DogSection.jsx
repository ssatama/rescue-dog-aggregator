"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DogCard from '../dogs/DogCard';
import DogCardErrorBoundary from '../error/DogCardErrorBoundary';
import Loading from '../ui/Loading';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAnimalsByCuration } from '../../services/animalsService';
import { reportError } from '../../utils/logger';
import { preloadImages } from '../../utils/imageUtils';

const DogSection = React.memo(function DogSection({ 
  title, 
  subtitle, 
  curationType, 
  viewAllHref 
}) {
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAnimalsByCuration(curationType, 4);
      setDogs(data);
      
      if (data && data.length > 0) {
        const imageUrls = data.map(dog => dog.primary_image_url).filter(Boolean);
        preloadImages(imageUrls);
      }
    } catch (err) {
      reportError(`Error fetching ${curationType} dogs`, { error: err.message });
      setError(`Could not load dogs. Please try again later.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDogs();
  }, [curationType]);

  const sectionId = `${curationType}-section`;
  const titleId = `${curationType}-title`;

  return (
    <section 
      role="region" 
      aria-labelledby={titleId}
      className="my-12 md:my-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 id={titleId} className="text-section text-gray-900 mb-2">
              {title}
            </h2>
            <p className="text-body text-gray-600">
              {subtitle}
            </p>
          </div>
          <Link 
            href={viewAllHref}
            aria-label={`View all ${title.toLowerCase()}`}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
          >
            View all
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Loading State */}
        {loading && <Loading data-testid="loading" />}

        {/* Error State */}
        {error && !loading && (
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
              <Button 
                variant="link" 
                size="sm" 
                onClick={fetchDogs} 
                className="mt-2 text-red-700 hover:text-red-800 p-0 h-auto block"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Dogs Grid */}
        {!loading && !error && dogs.length > 0 && (
          <div 
            data-testid="dog-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {dogs.map((dog, index) => (
              <DogCardErrorBoundary key={dog.id} dogId={dog.id}>
                <DogCard dog={dog} priority={index === 0} />
              </DogCardErrorBoundary>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && dogs.length === 0 && (
          <p className="text-center text-body text-gray-500">
            No dogs available at the moment.
          </p>
        )}
      </div>
    </section>
  );
});

export default DogSection;