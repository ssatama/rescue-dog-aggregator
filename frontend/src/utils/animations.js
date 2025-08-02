import { useRef, useEffect, useState } from "react";

/**
 * Custom hook for fade-in animations using Intersection Observer
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Intersection threshold (0-1)
 * @param {string} options.rootMargin - Root margin for intersection detection
 * @param {boolean} options.triggerOnce - Whether to trigger animation only once
 * @param {number} options.delay - Animation delay in milliseconds
 * @returns {Object} { ref, isVisible, hasAnimated }
 */
export const useFadeInAnimation = (options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = "50px",
    triggerOnce = true,
    delay = 0,
  } = options;

  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check if user prefers reduced motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      setHasAnimated(true);
      return;
    }

    // Check if IntersectionObserver is available
    if (typeof window === "undefined" || !window.IntersectionObserver) {
      // Fallback: make element visible immediately
      setIsVisible(true);
      if (triggerOnce) setHasAnimated(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Apply delay if specified
          if (delay > 0) {
            setTimeout(() => {
              setIsVisible(true);
              if (triggerOnce) setHasAnimated(true);
            }, delay);
          } else {
            setIsVisible(true);
            if (triggerOnce) setHasAnimated(true);
          }

          // Unobserve if triggerOnce is true
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      },
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce, delay]);

  return { ref, isVisible, hasAnimated };
};

/**
 * Custom hook for staggered animations on multiple elements
 * @param {number} itemCount - Number of items to animate
 * @param {number} baseDelay - Base delay between animations in milliseconds
 * @param {Object} observerOptions - Options for Intersection Observer
 * @returns {Object} { containerRef, getItemProps }
 */
export const useStaggerAnimation = (
  itemCount,
  baseDelay = 100,
  observerOptions = {},
) => {
  const {
    threshold = 0.1,
    rootMargin = "50px",
    triggerOnce = true,
  } = observerOptions;

  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if user prefers reduced motion
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      setHasAnimated(true);
      return;
    }

    // Check if IntersectionObserver is available
    if (typeof window === "undefined" || !window.IntersectionObserver) {
      // Fallback: make container visible immediately
      setIsVisible(true);
      if (triggerOnce) setHasAnimated(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            setHasAnimated(true);
            observer.unobserve(container);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      },
    );

    observer.observe(container);

    return () => {
      observer.unobserve(container);
    };
  }, [threshold, rootMargin, triggerOnce]);

  /**
   * Get props for individual staggered items
   * @param {number} index - Item index for stagger calculation
   * @returns {Object} Props to spread on the item element
   */
  const getItemProps = (index) => {
    const delay = index * baseDelay;
    const staggerClass = `animate-stagger-${Math.min(index + 1, 6)}`; // Max 6 stagger classes

    return {
      className: isVisible
        ? `animate-fade-in-up ${staggerClass}`
        : "opacity-0 translate-y-5",
      style: {
        animationDelay: `${delay}ms`,
        animationFillMode: "forwards",
      },
    };
  };

  return { containerRef, getItemProps, isVisible, hasAnimated };
};

/**
 * Hook for hover animations with performance optimization
 * @param {Object} options - Animation options
 * @returns {Object} { ref, isHovered, hoverProps }
 */
export const useHoverAnimation = (options = {}) => {
  const {
    scale = 1.02,
    translateY = -4,
    duration = 300,
    easing = "cubic-bezier(0.4, 0, 0.2, 1)",
  } = options;

  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const hoverProps = {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    style: {
      transition: `transform ${duration}ms ${easing}`,
      transform: isHovered
        ? `scale(${scale}) translateY(${translateY}px)`
        : "scale(1) translateY(0px)",
      willChange: "transform", // Optimize for animations
    },
  };

  return { ref, isHovered, hoverProps };
};

/**
 * Utility function to create CSS class names for animations
 * @param {boolean} isVisible - Whether element is visible
 * @param {string} animationType - Type of animation ('fade-in', 'fade-in-up', etc.)
 * @param {number} delay - Animation delay index for staggering
 * @returns {string} CSS class names
 */
export const getAnimationClasses = (
  isVisible,
  animationType = "fade-in",
  delay = 0,
) => {
  if (!isVisible) {
    return "opacity-0";
  }

  const baseClass = `animate-${animationType}`;
  const staggerClass = delay > 0 ? `animate-stagger-${Math.min(delay, 6)}` : "";

  return `${baseClass} ${staggerClass}`.trim();
};

/**
 * Performance-optimized scroll animation using requestAnimationFrame
 * @param {Function} callback - Function to call on scroll
 * @param {number} throttle - Throttle delay in milliseconds
 * @returns {Function} Cleanup function
 */
export const useOptimizedScroll = (callback, throttle = 16) => {
  useEffect(() => {
    let ticking = false;
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          callback(currentScrollY, lastScrollY);
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    // Add throttling if specified
    let timeoutId;
    const throttledScroll = () => {
      if (timeoutId) return;
      timeoutId = setTimeout(() => {
        handleScroll();
        timeoutId = null;
      }, throttle);
    };

    const scrollHandler = throttle > 0 ? throttledScroll : handleScroll;

    window.addEventListener("scroll", scrollHandler, { passive: true });

    return () => {
      window.removeEventListener("scroll", scrollHandler);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [callback, throttle]);
};

/**
 * Hook for sequential animations (one after another)
 * @param {Array} elements - Array of element configurations
 * @param {number} baseDelay - Base delay between elements
 * @returns {Object} Animation state and controls
 */
export const useSequentialAnimation = (elements = [], baseDelay = 200) => {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isComplete, setIsComplete] = useState(false);

  const startAnimation = () => {
    if (elements.length === 0) return;

    setCurrentIndex(0);

    elements.forEach((_, index) => {
      setTimeout(() => {
        setCurrentIndex(index);
        if (index === elements.length - 1) {
          setIsComplete(true);
        }
      }, index * baseDelay);
    });
  };

  const resetAnimation = () => {
    setCurrentIndex(-1);
    setIsComplete(false);
  };

  const isElementVisible = (index) => index <= currentIndex;

  return {
    currentIndex,
    isComplete,
    startAnimation,
    resetAnimation,
    isElementVisible,
  };
};

/**
 * Preload images for smooth animations
 * @param {Array} imageUrls - Array of image URLs to preload
 * @returns {Object} Loading state and progress
 */
export const useImagePreloader = (imageUrls = []) => {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (imageUrls.length === 0) {
      setIsLoading(false);
      setProgress(100);
      return;
    }

    let loadedCount = 0;
    const totalImages = imageUrls.length;

    const handleImageLoad = (url) => {
      loadedCount++;
      setLoadedImages((prev) => new Set([...prev, url]));
      setProgress((loadedCount / totalImages) * 100);

      if (loadedCount === totalImages) {
        setIsLoading(false);
      }
    };

    imageUrls.forEach((url) => {
      const img = new Image();
      img.onload = () => handleImageLoad(url);
      img.onerror = () => handleImageLoad(url); // Count failed loads too
      img.src = url;
    });
  }, [imageUrls]);

  return { loadedImages, isLoading, progress };
};
