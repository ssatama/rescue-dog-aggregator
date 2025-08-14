/**
 * Hook for progressive loading with IntersectionObserver
 * Enables lazy loading of content when it becomes visible in viewport
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export default function useProgressiveLoading(options = {}) {
  const {
    rootMargin = '50px', // Load slightly before entering viewport
    threshold = 0.01,
    loadDelay = 0,
    onVisible = null,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef(null);
  const observerRef = useRef(null);

  const handleIntersection = useCallback((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !isVisible) {
        setIsVisible(true);
        
        // Load content after optional delay
        if (loadDelay > 0) {
          setTimeout(() => {
            setIsLoaded(true);
            onVisible?.();
          }, loadDelay);
        } else {
          setIsLoaded(true);
          onVisible?.();
        }

        // Unobserve after becoming visible
        if (observerRef.current && ref.current) {
          observerRef.current.unobserve(ref.current);
        }
      }
    });
  }, [isVisible, loadDelay, onVisible]);

  useEffect(() => {
    if (!ref.current) return;

    // Create intersection observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      rootMargin,
      threshold,
    });

    // Start observing
    observerRef.current.observe(ref.current);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootMargin, threshold]); // Exclude handleIntersection to prevent recreation

  return {
    ref,
    isVisible,
    isLoaded,
  };
}