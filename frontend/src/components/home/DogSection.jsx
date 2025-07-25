"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import DogCard from '../dogs/DogCard';
import DogCardErrorBoundary from '../error/DogCardErrorBoundary';
import Loading from '../ui/Loading';
import { DogCardSkeleton } from '../ui/LoadingSkeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAnimalsByCuration } from '../../services/animalsService';
import { reportError, logger } from '../../utils/logger';
import { preloadImages } from '../../utils/imageUtils';
import { isSlowConnection, getNetworkInfo } from '../../utils/networkUtils';

// Dynamically import MobileCarousel for code splitting
const MobileCarousel = React.lazy(() => import('../ui/MobileCarousel'));

const DogSection = React.memo(function DogSection({ 
  title, 
  subtitle, 
  curationType, 
  viewAllHref 
}) {
  const [dogs, setDogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSlowNet, setIsSlowNet] = useState(false);
  const [loadStartTime, setLoadStartTime] = useState(null);

  const fetchDogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Performance monitoring
      const startTime = performance.now();
      setLoadStartTime(startTime);
      if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark('dog-section-start');
      }
      
      const data = await getAnimalsByCuration(curationType, 4);
      
      // Batch state updates to avoid act() warnings
      React.startTransition(() => {
        setDogs(data);
        setLoading(false);
      });
      
      // Performance monitoring
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
        performance.mark('dog-section-end');
        performance.measure('dog-section-load-time', 'dog-section-start', 'dog-section-end');
      }
      
      // Report slow loading times using logger utility
      const SLOW_LOAD_THRESHOLD = 3000;
      if (loadTime > SLOW_LOAD_THRESHOLD) {
        logger.warn(`Slow loading detected: Dog section took ${loadTime.toFixed(0)}ms to load`);
      }
      
      if (data && data.length > 0) {
        const imageUrls = data.map(dog => dog.primary_image_url).filter(Boolean);
        preloadImages(imageUrls);
      }
    } catch (err) {
      reportError(`Error fetching ${curationType} dogs`, { error: err.message });
      // Set error state directly for better test reliability
      setError(`Could not load dogs. Please try again later.`);
      setLoading(false);
    }
  };

  // Mobile and network detection
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.matchMedia('(max-width: 768px)').matches;
      setIsMobile(isMobileDevice);
    };

    const checkNetwork = () => {
      const slowConnection = isSlowConnection();
      setIsSlowNet(slowConnection);
    };

    checkMobile();
    checkNetwork();
    
    window.addEventListener('resize', checkMobile);
    
    // Listen for network changes if available
    if (typeof navigator !== 'undefined' && navigator.connection && navigator.connection.addEventListener) {
      try {
        navigator.connection.addEventListener('change', checkNetwork);
      } catch (error) {
        // Handle environments where addEventListener is not available (e.g., some mobile browsers)
        logger.debug('Network connection addEventListener not supported:', error.message);
      }
    }
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      if (typeof navigator !== 'undefined' && navigator.connection && navigator.connection.removeEventListener) {
        try {
          navigator.connection.removeEventListener('change', checkNetwork);
        } catch (error) {
          // Handle cleanup errors in environments with limited API support
          logger.debug('Network connection removeEventListener cleanup failed:', error.message);
        }
      }
    };
  }, []);

  useEffect(() => {
    fetchDogs();
  }, [curationType]);

  // Handle slide change
  const handleSlideChange = (slideIndex) => {
    setCurrentSlide(slideIndex);
  };

  const sectionId = `${curationType}-section`;
  const titleId = `${curationType}-title`;

  // Skeleton loading components
  const SkeletonGrid = () => (
    <div 
      data-testid="skeleton-grid"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {[1, 2, 3, 4].map(i => (
        <DogCardSkeleton key={i} />
      ))}
    </div>
  );

  const SkeletonCarousel = () => (
    <div data-testid="mobile-carousel-container" className="mobile-carousel-container">
      <div className="flex space-x-4 overflow-x-auto">
        {[1, 2].map(i => (
          <div key={i} className="flex-shrink-0 w-80">
            <DogCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <section 
      data-testid="dog-section-container"
      role="region" 
      aria-labelledby={titleId}
      className="my-12 md:my-20 min-h-[400px]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 id={titleId} className="text-section text-foreground mb-2">
              {title}
            </h2>
            <p className="text-body text-muted-foreground">
              {subtitle}
            </p>
          </div>
          <Link 
            href={viewAllHref}
            aria-label={`View all ${title.toLowerCase()}`}
            className="text-orange-600 hover:text-orange-800 font-medium text-sm flex items-center gap-1"
          >
            View all
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Loading States with Fade Transition */}
        <div className={`transition-opacity duration-300 ${loading ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'}`}>
          {loading && (isMobile ? <SkeletonCarousel /> : <SkeletonGrid />)}
          {loading && isSlowNet && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Loading on slow network, please wait...
            </p>
          )}
        </div>

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
                className="mt-2 text-destructive hover:text-destructive/80 p-0 h-auto block"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}


        {/* Real Content with Fade In */}
        <div className={`transition-opacity duration-300 ${!loading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {!loading && !error && dogs.length > 0 && (
            <div data-testid="dog-section">
              {isMobile ? (
                <Suspense fallback={<SkeletonCarousel />}>
                  <MobileCarousel 
                    onSlideChange={handleSlideChange}
                    testId="dog-carousel"
                  >
                    {dogs.map((dog, index) => (
                      <DogCardErrorBoundary key={dog.id} dogId={dog.id}>
                        <DogCard dog={dog} priority={index === 0} />
                      </DogCardErrorBoundary>
                    ))}
                  </MobileCarousel>
                </Suspense>
              ) : (
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
            </div>
          )}
        </div>

        {/* Empty State */}
        {!loading && !error && dogs.length === 0 && (
          <p className="text-center text-body text-muted-foreground">
            No dogs available at the moment.
          </p>
        )}
      </div>
    </section>
  );
});

export default DogSection;