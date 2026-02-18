import { useState, useEffect, useRef, useCallback } from "react";
import type { RefObject } from "react";

interface ProgressiveLoadingOptions {
  rootMargin?: string;
  threshold?: number;
  loadDelay?: number;
  onVisible?: (() => void) | null;
}

interface ProgressiveLoadingReturn {
  ref: RefObject<HTMLElement | null>;
  isVisible: boolean;
  isLoaded: boolean;
}

export default function useProgressiveLoading(
  options: ProgressiveLoadingOptions = {},
): ProgressiveLoadingReturn {
  const {
    rootMargin = "50px",
    threshold = 0.01,
    loadDelay = 0,
    onVisible = null,
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const handleIntersectionRef = useRef<
    ((entries: IntersectionObserverEntry[]) => void) | null
  >(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);

          if (loadDelay > 0) {
            setTimeout(() => {
              setIsLoaded(true);
              onVisible?.();
            }, loadDelay);
          } else {
            setIsLoaded(true);
            onVisible?.();
          }

          if (observerRef.current && ref.current) {
            observerRef.current.unobserve(ref.current);
          }
        }
      });
    },
    [isVisible, loadDelay, onVisible],
  );

  useEffect(() => {
    handleIntersectionRef.current = handleIntersection;
  }, [handleIntersection]);

  useEffect(() => {
    if (!ref.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => handleIntersectionRef.current?.(entries),
      {
        rootMargin,
        threshold,
      },
    );

    observerRef.current.observe(ref.current);

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
