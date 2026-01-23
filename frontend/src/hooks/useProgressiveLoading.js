/**
 * Hook for progressive loading with IntersectionObserver
 * Enables lazy loading of content when it becomes visible in viewport
 */
import { useState, useEffect, useRef, useCallback } from "react";

export default function useProgressiveLoading(options = {}) {
  const {
    rootMargin = "50px", // Load slightly before entering viewport
    threshold = 0.01,
    loadDelay = 0,
    onVisible = null,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef(null);
  const observerRef = useRef(null);
  const handleIntersectionRef = useRef(null);

  const handleIntersection = useCallback(
    (entries) => {
      entries.forEach((entry) => {
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
    },
    [isVisible, loadDelay, onVisible],
  );

  // Update the ref inside useEffect to avoid updating ref during render
  useEffect(() => {
    handleIntersectionRef.current = handleIntersection;
  }, [handleIntersection]);

  useEffect(() => {
    if (!ref.current) return;

    // Create intersection observer with stable ref callback
    observerRef.current = new IntersectionObserver(
      (entries) => handleIntersectionRef.current(entries),
      {
        rootMargin,
        threshold,
      },
    );

    // Start observing
    observerRef.current.observe(ref.current);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [rootMargin, threshold]);

  return {
    ref,
    isVisible,
    isLoaded,
  };
}
