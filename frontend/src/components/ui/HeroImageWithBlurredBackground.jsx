/**
 * Hero image component with clean background for dog detail pages
 * Implements clean, professional image display with shimmer loading effect,
 * timeout handling, retry logic, and adaptive loading for better performance
 */
import React, { useState, useCallback, useMemo, memo, useEffect, useRef } from 'react';
import { getDetailHeroImageWithPosition, trackImageLoad } from '../../utils/imageUtils';
import { handleImageError } from '../../utils/imageUtils';
import { useReducedMotion } from '../../hooks/useScrollAnimation';
import { getLoadingStrategy, onNetworkChange } from '../../utils/networkUtils';

// Base configuration constants (will be adapted based on network conditions)
const BASE_RETRY_DELAY = 1000; // 1 second base delay between retries

// Test-safe setTimeout wrapper that batches state updates properly
const safeSetTimeout = (callback, delay) => {
  return setTimeout(() => {
    if (process.env.NODE_ENV === 'test') {
      // In test environment, use React's unstable_batchedUpdates if available
      try {
        const { unstable_batchedUpdates } = require('react-dom');
        unstable_batchedUpdates(callback);
      } catch {
        // Fallback to direct callback if batching not available
        callback();
      }
    } else {
      callback();
    }
  }, delay);
};

// Memoized HeroImage component for better performance and reliability
const HeroImageWithBlurredBackground = memo(function HeroImageWithBlurredBackground({ 
  src, 
  alt, 
  className = '', 
  onError = () => {},
  useGradientFallback = false
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentSrc, setCurrentSrc] = useState('');
  const [networkStrategy, setNetworkStrategy] = useState(() => getLoadingStrategy('hero'));
  const mountedRef = useRef(true);
  const timeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const loadStartTimeRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  // Get optimized image source and position
  const { src: optimizedSrc, position } = useMemo(() => 
    getDetailHeroImageWithPosition(src, true), [src] // Always bust cache for navigation
  );

  // Reset states when src changes - fix race condition
  useEffect(() => {
    // Always reset when src changes, regardless of currentSrc state
    // This ensures proper state reset during navigation
    // FIXED: Only check for src, optimizedSrc will be available due to useMemo
    if (src) {
      
      // Check for obviously invalid URLs first
      const isInvalidUrl = typeof src === 'string' && (
        src === 'not-a-valid-url' || 
        (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('/'))
      );
      
      if (isInvalidUrl) {
        setImageLoaded(false);
        setHasError(true);
        setIsLoading(false);
        setIsRetrying(false);
        setRetryCount(0);
        setCurrentSrc('');
        return;
      }
      
      setImageLoaded(false);
      setHasError(false);
      setIsLoading(true);
      setIsRetrying(false);
      setRetryCount(0);
      
      // Add cache-busting for fresh navigation to prevent browser cache issues
      const cacheBustedSrc = (() => {
        try {
          const url = new URL(optimizedSrc);
          // Only add cache-busting if this is a new navigation (not a retry)
          if (!url.searchParams.has('t')) {
            url.searchParams.set('t', Date.now().toString());
          }
          return url.toString();
        } catch {
          // If URL parsing fails, use simpler approach
          const separator = optimizedSrc.includes('?') ? '&' : '?';
          return `${optimizedSrc}${separator}t=${Date.now()}`;
        }
      })();
      
      setCurrentSrc(cacheBustedSrc);
      loadStartTimeRef.current = Date.now(); // Start timing the load
    }
  }, [src, optimizedSrc]); // Keep optimizedSrc for consistency but don't require it in condition

  // Handle initial src availability - ensures loading starts when src becomes available
  useEffect(() => {
    // If we have a src but are not loading/loaded/errored, start loading
    if (src && !isLoading && !imageLoaded && !hasError && !isRetrying) {
      setIsLoading(true);
      setImageLoaded(false);
      setHasError(false);
    }
  }, [src, isLoading, imageLoaded, hasError, isRetrying]);

  // Network monitoring and cleanup - handle React strict mode remounting
  useEffect(() => {
    mountedRef.current = true;
    
    // Force reset on mount to handle React strict mode double mounting
    if (src && optimizedSrc && !imageLoaded && !hasError) {
      setIsLoading(true);
      setImageLoaded(false);
      setHasError(false);
      setIsRetrying(false);
    }
    
    // Monitor network changes and update strategy
    const cleanupNetworkMonitor = onNetworkChange((networkInfo) => {
      if (mountedRef.current) {
        setNetworkStrategy(getLoadingStrategy('hero'));
        if (process.env.NODE_ENV !== 'production') console.log('Network changed, updated loading strategy:', networkInfo);
      }
    });
    
    return () => {
      mountedRef.current = false;
      cleanupNetworkMonitor();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, []); // Empty dependencies - only run on mount/unmount

  // Adaptive timeout handling - force error state after network-adaptive timeout
  useEffect(() => {
    if (isLoading && !imageLoaded && !hasError && !isRetrying) {
      const adaptiveTimeout = networkStrategy.timeout;
      
      timeoutRef.current = safeSetTimeout(() => {
        if (mountedRef.current && !imageLoaded && !hasError) {
          if (process.env.NODE_ENV !== 'production') console.warn('Hero image load timeout after', adaptiveTimeout, 'ms (network adaptive)');
          handleRetryOrError();
        }
      }, adaptiveTimeout);

      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }
  }, [isLoading, imageLoaded, hasError, isRetrying, networkStrategy.timeout]);

  // Adaptive retry logic with network-aware backoff and cache-busting
  const handleRetryOrError = useCallback(() => {
    const { maxRetries, baseDelay, backoffMultiplier } = networkStrategy.retry;
    
    if (retryCount < maxRetries) {
      // Update retry count immediately for test synchronization
      const nextRetryCount = retryCount + 1;
      
      // Set retry state immediately
      setIsLoading(false);
      setIsRetrying(true);
      setRetryCount(nextRetryCount);
      
      const delay = baseDelay * Math.pow(backoffMultiplier, retryCount); // Adaptive exponential backoff
      if (process.env.NODE_ENV !== 'production') console.warn(`Retrying hero image load (attempt ${nextRetryCount}/${maxRetries}) in ${delay}ms (network adaptive)`);
      
      retryTimeoutRef.current = safeSetTimeout(() => {
        if (mountedRef.current) {
          setIsLoading(true);
          setIsRetrying(false);
          setHasError(false);
          
          // Cache-busting for retry attempts - use timestamp and retry count
          const timestamp = Date.now();
          
          setCurrentSrc(prev => {
            try {
              const url = new URL(prev);
              // Remove old cache-busting params and add new ones
              url.searchParams.delete('retry');
              url.searchParams.delete('t');
              url.searchParams.set('retry', nextRetryCount.toString());
              url.searchParams.set('t', timestamp.toString());
              return url.toString();
            } catch {
              // If URL parsing fails, use simpler approach
              const separator = prev.includes('?') ? '&' : '?';
              return `${prev}${separator}retry=${nextRetryCount}&t=${timestamp}`;
            }
          });
        }
      }, delay);
    } else {
      if (process.env.NODE_ENV !== 'production') console.error(`Hero image failed after ${maxRetries} retries`);
      setHasError(true);
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, [retryCount, networkStrategy.retry]);

  const handleLoad = useCallback(() => {
    if (mountedRef.current) {
      setImageLoaded(true);
      setIsLoading(false);
      setIsRetrying(false);
      setHasError(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      
      // Track performance metrics
      if (loadStartTimeRef.current) {
        const loadTime = Date.now() - loadStartTimeRef.current;
        try {
          trackImageLoad(currentSrc || optimizedSrc, loadTime, 'hero', retryCount);
        } catch (error) {
          // Ignore tracking errors in test and production environments
          if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') console.warn('Failed to track image load:', error);
        }
      }
    }
  }, [currentSrc, optimizedSrc, retryCount]);

  const handleImageErrorInternal = useCallback((e) => {
    if (mountedRef.current) {
      if (process.env.NODE_ENV !== 'production') console.warn('Hero image load error:', e.target?.src);
      handleImageError(e, src);
      onError(e);
      
      // Clear timeouts before handling retry
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      
      handleRetryOrError();
    }
  }, [src, onError, handleRetryOrError]);

  // Animation classes based on user preference and loading state (memoized for performance)
  const animationClasses = useMemo(() => ({
    transitionDuration: prefersReducedMotion ? 'duration-0' : 'duration-500',
    imageOpacity: imageLoaded ? 'opacity-100' : 'opacity-0',
    shimmerOpacity: 'opacity-100', // Always visible when rendered
    shimmerAnimation: prefersReducedMotion ? '' : 'animate-shimmer'
  }), [prefersReducedMotion, imageLoaded]);

  // Error state with network-adaptive retry information
  if (hasError || !src) {
    const { maxRetries } = networkStrategy.retry;
    const errorMessage = retryCount > 0 
      ? `Unable to load image after ${retryCount} ${retryCount === 1 ? 'retry' : 'retries'}`
      : 'No image available';
      
    return (
      <div className={`w-full aspect-[16/9] bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <p className="text-gray-500 mb-1">{errorMessage}</p>
          {retryCount > 0 && (
            <p className="text-xs text-gray-400">
              {networkStrategy.skipOptimizations 
                ? 'Data saver mode - reduced retry attempts' 
                : 'Connection issues detected - network adaptive retries used'}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-white ${className}`} 
      data-testid="hero-image-clean"
    >
      {/* Fallback gradient background for legacy support */}
      {useGradientFallback && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
      )}
      
      {/* Main image container */}
      <div 
        className="w-full h-full flex items-center justify-center" 
        data-testid="image-container"
      >
        <img
          src={currentSrc || optimizedSrc}
          alt={alt}
          className={`w-full h-full object-contain transition-opacity ${animationClasses.transitionDuration} ${animationClasses.imageOpacity}`}
          style={{ objectPosition: position }}
          onLoad={handleLoad}
          onError={handleImageErrorInternal}
          loading={networkStrategy.loading}
          decoding="async"
          key={`${src}-${currentSrc}-${retryCount}`} // Force re-render on src change or retry
        />
      </div>
      
      {/* Enhanced shimmer loading state - only render when actually needed */}
      {((isLoading || isRetrying || !imageLoaded) && !hasError) && (
        <div 
          className={`absolute inset-0 w-full aspect-[16/9] transition-opacity ${animationClasses.transitionDuration} ${animationClasses.shimmerOpacity}`}
          data-testid="shimmer-loader"
        >
          <div className={`w-full h-full bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 ${animationClasses.shimmerAnimation}`} data-testid="shimmer-animation">
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-gray-500">
                  {isRetrying
                    ? `Retrying... (${retryCount}/${networkStrategy.retry.maxRetries})` 
                    : networkStrategy.skipOptimizations 
                      ? 'Loading (data saver)...'
                      : 'Loading image...'}
                </span>
                {isRetrying && (
                  <span className="text-xs text-gray-400">
                    {networkStrategy.skipOptimizations 
                      ? 'Slow connection detected' 
                      : 'Connection issues detected'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if essential props change
  return (
    prevProps.src === nextProps.src &&
    prevProps.alt === nextProps.alt &&
    prevProps.className === nextProps.className &&
    prevProps.useGradientFallback === nextProps.useGradientFallback
  );
});

HeroImageWithBlurredBackground.displayName = 'HeroImageWithBlurredBackground';

export { HeroImageWithBlurredBackground };
export default HeroImageWithBlurredBackground;