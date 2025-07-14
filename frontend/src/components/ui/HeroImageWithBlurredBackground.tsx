import React, { memo } from 'react';
import { useAdvancedImage } from '../../hooks/useAdvancedImage';
import { useReducedMotion } from '../../hooks/useScrollAnimation';

export interface HeroImageWithBlurredBackgroundProps {
  /** Image source URL */
  src: string;
  /** Alt text for the image */
  alt: string;
  /** Additional CSS classes */
  className?: string;
  /** Error callback function */
  onError?: () => void;
  /** Whether to use gradient fallback on error */
  useGradientFallback?: boolean;
}

const HeroImageWithBlurredBackground = memo(function HeroImageWithBlurredBackground({ 
  src, 
  alt, 
  className = '', 
  onError = () => {},
  useGradientFallback = false
}: HeroImageWithBlurredBackgroundProps) {
  const prefersReducedMotion = useReducedMotion();
  
  const {
    imageLoaded,
    hasError,
    isLoading,
    isRetrying,
    retryCount,
    currentSrc,
    position,
    networkStrategy,
    handleRetry
  } = useAdvancedImage(src, {
    onError,
    useGradientFallback,
    type: 'hero'
  });

  // DIAGNOSTIC: Log state changes in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.log('[HeroImageWithBlurredBackground] State update:', {
      imageLoaded,
      hasError,
      isLoading,
      isRetrying,
      retryCount,
      currentSrc,
      originalSrc: src
    });
  }, [imageLoaded, hasError, isLoading, isRetrying, retryCount, currentSrc, src]);

  // Determine loading message based on state
  const loadingMessage = React.useMemo(() => {
    if (isRetrying) {
      return `Retrying... (Attempt ${retryCount + 1})`;
    }
    if (isLoading) {
      return 'Loading image...';
    }
    return 'Loading image...';
  }, [isLoading, isRetrying, retryCount]);

  // No image available state
  if (!src || src.trim() === '') {
    return (
      <div 
        className={`relative w-full aspect-square md:aspect-[16/9] rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-md ${className}`}
        data-testid="hero-image-clean"
      >
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="text-center">
            <svg className="w-24 h-24 text-gray-300 dark:text-gray-600 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 15.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm8.5 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM5 11l.898 2.954a2 2 0 0 0 1.908 1.396h8.388a2 2 0 0 0 1.908-1.396L19 11"/>
            </svg>
            <p className="text-gray-500 dark:text-gray-400">No image available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative w-full aspect-square md:aspect-[16/9] rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-md ${className}`}
      data-testid="hero-image-clean"
    >
      {/* Image container for centering and TDD compliance */}
      <div 
        className="flex items-center justify-center absolute inset-0"
        data-testid="image-container"
      >
        {/* Main Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={`hero-${currentSrc}`}
          src={currentSrc || '/placeholder_dog.svg'}
          alt={alt}
          className={`
            w-full h-full object-cover md:object-contain transition-all duration-700
            ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}
            ${hasError ? 'hidden' : ''}
          `}
          style={{ 
            objectPosition: position,
            transform: imageLoaded && !prefersReducedMotion ? 'scale(1)' : 'scale(1.05)'
          }}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw"
          loading={networkStrategy.loading || "eager"}
          decoding="async"
          data-testid="hero-image"
        />
      </div>
      
      {/* Loading Shimmer Effect */}
      {(isLoading || isRetrying) && !imageLoaded && (
        <div 
          className={`absolute inset-0 bg-gradient-to-r from-gray-200 dark:from-gray-700 via-gray-100 dark:via-gray-600 to-gray-200 dark:to-gray-700 ${!prefersReducedMotion ? 'animate-shimmer' : ''} transition-opacity duration-300 ${isLoading ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundSize: '200% 100%',
          }}
          data-testid="shimmer-loader"
        >
          <div className="absolute bottom-4 left-4 bg-white/80 dark:bg-gray-800/80 px-3 py-1 rounded text-sm text-gray-600 dark:text-gray-300">
            {loadingMessage}
          </div>
        </div>
      )}
      
      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800" data-testid="error-state">
          <div className="text-center p-8">
            <svg className="w-24 h-24 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 15.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm8.5 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM5 11l.898 2.954a2 2 0 0 0 1.908 1.396h8.388a2 2 0 0 0 1.908-1.396L19 11"/>
            </svg>
            <p className="text-gray-500 dark:text-gray-400 mb-2">Unable to load image</p>
            {retryCount < (networkStrategy.retry?.maxRetries || 2) && (
              <button 
                onClick={handleRetry}
                className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 underline text-sm"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

HeroImageWithBlurredBackground.displayName = 'HeroImageWithBlurredBackground';

export default HeroImageWithBlurredBackground;