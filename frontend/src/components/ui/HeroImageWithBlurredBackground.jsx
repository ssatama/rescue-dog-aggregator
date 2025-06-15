/**
 * Hero image component with clean background for dog detail pages
 * Implements clean, professional image display with shimmer loading effect,
 * timeout handling, retry logic, and adaptive loading for better performance
 * 
 * FIXED: Navigation state reset issue that required hard refresh
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
  const previousSrcRef = useRef(null); // Track previous src for proper navigation handling

  // Get optimized image source and position
  const { src: optimizedSrc, position } = useMemo(() => 
    getDetailHeroImageWithPosition(src, true), [src] // Always bust cache for navigation
  );

  // FIXED: Complete state reset when src changes - prevents stale image on navigation
  useEffect(() => {
    // Only process if src actually changed (not just re-renders)
    if (src !== previousSrcRef.current) {
      // Clear all timeouts to prevent race conditions
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Check for obviously invalid URLs first
      const isInvalidUrl = typeof src === 'string' && (
        src === 'not-a-valid-url' || 
        (!src.startsWith('http://') && !src.startsWith('https://') && !src.startsWith('/'))
      );
      
      if (isInvalidUrl || !src) {
        setImageLoaded(false);
        setHasError(true);
        setIsLoading(false);
        setIsRetrying(false);
        setRetryCount(0);
        setCurrentSrc('');
        previousSrcRef.current = src;
        return;
      }
      
      // Complete state reset for valid URLs
      setImageLoaded(false);
      setHasError(false);
      setIsLoading(true);
      setIsRetrying(false);
      setRetryCount(0);
      setCurrentSrc(''); // Critical: Clear currentSrc immediately
      
      // Use micro-task to ensure DOM updates before setting new src
      safeSetTimeout(() => {
        if (mountedRef.current && src) {
          // Add cache-busting with unique timestamp
          const cacheBustedSrc = (() => {
            try {
              const url = new URL(optimizedSrc);
              url.searchParams.set('t', Date.now().toString());
              url.searchParams.set('nav', Math.random().toString(36).substr(2, 9)); // Extra uniqueness
              return url.toString();
            } catch {
              // Fallback for relative URLs
              const separator = optimizedSrc.includes('?') ? '&' : '?';
              return `${optimizedSrc}${separator}t=${Date.now()}&nav=${Math.random().toString(36).substr(2, 9)}`;
            }
          })();
          
          setCurrentSrc(cacheBustedSrc);
          loadStartTimeRef.current = Date.now();
        }
      }, 0);
      
      previousSrcRef.current = src;
    }
  }, [src, optimizedSrc]);

  // Network monitoring and cleanup
  useEffect(() => {
    mountedRef.current = true;
    
    // Monitor network changes and update strategy
    const cleanupNetworkMonitor = onNetworkChange((networkInfo) => {
      if (mountedRef.current) {
        setNetworkStrategy(getLoadingStrategy('hero'));
      }
    });
    
    // Cleanup function
    return () => {
      mountedRef.current = false;
      
      // Clear all timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      // Cleanup network monitor
      if (cleanupNetworkMonitor) {
        cleanupNetworkMonitor();
      }
    };
  }, []);

  // Timeout handling with adaptive timing
  useEffect(() => {
    if (isLoading && !imageLoaded && !hasError && currentSrc) {
      const timeoutDuration = networkStrategy.timeout || 15000;
      
      timeoutRef.current = safeSetTimeout(() => {
        if (mountedRef.current && !imageLoaded && isLoading) {
          // Only retry if we haven't exceeded max retries
          if (retryCount < (networkStrategy.retry?.maxRetries || 2)) {
            setIsRetrying(true);
            setIsLoading(false);
            
            // Calculate retry delay with exponential backoff
            const baseDelay = networkStrategy.retry?.baseDelay || BASE_RETRY_DELAY;
            const multiplier = networkStrategy.retry?.backoffMultiplier || 2;
            const retryDelay = baseDelay * Math.pow(multiplier, retryCount);
            
            retryTimeoutRef.current = safeSetTimeout(() => {
              if (mountedRef.current) {
                setRetryCount(prev => prev + 1);
                setIsRetrying(false);
                setIsLoading(true);
                
                // Force new cache-busting parameters for retry
                const retriedSrc = currentSrc.replace(/t=\d+/, `t=${Date.now()}`);
                setCurrentSrc(retriedSrc);
              }
            }, retryDelay);
          } else {
            // Max retries exceeded
            setHasError(true);
            setIsLoading(false);
            handleImageError(new Error('Image loading timeout'), currentSrc);
            onError();
          }
        }
      }, timeoutDuration);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, imageLoaded, hasError, currentSrc, retryCount, networkStrategy, onError]);

  // Handle successful image load
  const handleImageLoad = useCallback(() => {
    if (mountedRef.current) {
      const loadTime = loadStartTimeRef.current ? Date.now() - loadStartTimeRef.current : 0;
      
      setImageLoaded(true);
      setIsLoading(false);
      setHasError(false);
      setIsRetrying(false);
      
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      // Track successful load
      trackImageLoad(currentSrc, loadTime, 'hero');
    }
  }, [currentSrc]);

  // Handle image error
  const handleError = useCallback((e) => {
    if (mountedRef.current) {
      setHasError(true);
      setIsLoading(false);
      setImageLoaded(false);
      handleImageError(e, currentSrc);
      onError();
      
      // Clear timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [currentSrc, onError]);

  // Determine loading message based on state
  const loadingMessage = useMemo(() => {
    if (isRetrying) {
      return `Retrying... (Attempt ${retryCount + 1})`;
    }
    if (isLoading && loadStartTimeRef.current) {
      const elapsed = Date.now() - loadStartTimeRef.current;
      if (elapsed > 5000) {
        return 'Still loading... This is taking longer than usual';
      }
    }
    return 'Loading image...';
  }, [isLoading, isRetrying, retryCount]);

  // No image available state
  if (!src && !currentSrc) {
    return (
      <div 
        className={`relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-white shadow-md ${className}`}
        data-testid="hero-image-clean"
      >
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <svg className="w-24 h-24 text-gray-300 mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 15.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm8.5 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM5 11l.898 2.954a2 2 0 0 0 1.908 1.396h8.388a2 2 0 0 0 1.908-1.396L19 11"/>
            </svg>
            <p className="text-gray-500">No image available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-white shadow-md ${className}`}
      data-testid="hero-image-clean"
    >
      {/* Main Image with force recreation on navigation */}
      <img
        key={`hero-${currentSrc}`} // Force React to recreate element on src change
        src={currentSrc || '/placeholder_dog.svg'}
        alt={alt}
        className={`
          absolute inset-0 w-full h-full object-cover transition-all duration-700
          ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}
          ${hasError ? 'hidden' : ''}
        `}
        style={{ 
          objectPosition: position,
          transform: imageLoaded && !prefersReducedMotion ? 'scale(1)' : 'scale(1.05)'
        }}
        onLoad={handleImageLoad}
        onError={handleError}
        loading={networkStrategy.loading || "eager"}
        decoding="async"
        data-testid="hero-image"
      />
      
      {/* Loading Shimmer Effect */}
      {(isLoading || isRetrying) && !imageLoaded && (
        <div 
          className={`absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 ${!prefersReducedMotion ? 'animate-shimmer' : ''} transition-opacity duration-300 ${isLoading ? 'opacity-100' : 'opacity-0'}`}
          style={{
            backgroundSize: '200% 100%',
          }}
          data-testid="shimmer-loader"
        >
          <div className="absolute bottom-4 left-4 bg-white/80 px-3 py-1 rounded text-sm text-gray-600">
            {loadingMessage}
          </div>
        </div>
      )}
      
      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100" data-testid="error-state">
          <div className="text-center p-8">
            <svg className="w-24 h-24 text-gray-300 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 15.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0zM12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm8.5 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM5 11l.898 2.954a2 2 0 0 0 1.908 1.396h8.388a2 2 0 0 0 1.908-1.396L19 11"/>
            </svg>
            <p className="text-gray-500 mb-2">Unable to load image</p>
            {retryCount < (networkStrategy.retry?.maxRetries || 2) && (
              <button 
                onClick={() => {
                  setHasError(false);
                  setIsLoading(true);
                  setRetryCount(prev => prev + 1);
                  
                  // Force new attempt with fresh cache-busting
                  const retriedSrc = currentSrc.replace(/t=\d+/, `t=${Date.now()}`);
                  setCurrentSrc(retriedSrc);
                }}
                className="text-blue-600 hover:text-blue-700 underline text-sm"
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