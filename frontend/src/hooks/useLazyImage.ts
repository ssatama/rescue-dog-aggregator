import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseLazyImageOptions {
  /** Whether this image should load immediately (high priority) */
  priority?: boolean;
  /** Whether to enable progressive loading with blur/low-quality versions */
  enableProgressiveLoading?: boolean;
  /** Callback when image loads */
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  /** Callback when image fails to load */
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
}

export interface UseLazyImageReturn {
  /** Whether the image has been loaded */
  isLoaded: boolean;
  /** Whether the image is in viewport (or should load) */
  isInView: boolean;
  /** Whether there was an error loading the image */
  hasError: boolean;
  /** Whether the low quality version has loaded */
  lowQualityLoaded: boolean;
  /** Whether the blur placeholder has loaded */
  blurPlaceholderLoaded: boolean;
  /** Ref to attach to the image element */
  imgRef: React.RefObject<HTMLDivElement | null>;
  /** Generated progressive URLs */
  progressiveUrls: {
    lowQuality?: string;
    blurPlaceholder?: string;
  };
  /** Handlers for image events */
  handlers: {
    onLoad: (event: React.SyntheticEvent<HTMLImageElement>) => void;
    onError: (event: React.SyntheticEvent<HTMLImageElement>) => void;
    onLowQualityLoad: () => void;
    onBlurPlaceholderLoad: () => void;
  };
}

/**
 * Hook for lazy loading images with progressive loading support
 */
export function useLazyImage(
  src: string,
  options: UseLazyImageOptions = {}
): UseLazyImageReturn {
  const {
    priority = false,
    enableProgressiveLoading = false,
    onLoad = () => {},
    onError = () => {}
  } = options;

  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Priority images start as in-view
  const [hasError, setHasError] = useState(false);
  const [lowQualityLoaded, setLowQualityLoaded] = useState(false);
  const [blurPlaceholderLoaded, setBlurPlaceholderLoaded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  // Generate progressive loading URLs if enabled
  const generateProgressiveUrls = useCallback((originalSrc: string) => {
    if (!originalSrc || !enableProgressiveLoading) return {};
    
    if (originalSrc.includes('res.cloudinary.com')) {
      return {
        lowQuality: originalSrc.replace('/upload/', '/upload/q_20,f_auto/'),
        blurPlaceholder: originalSrc.replace('/upload/', '/upload/w_50,q_auto,e_blur:300,f_auto/')
      };
    }
    
    // For non-Cloudinary URLs, we can only do basic progressive loading
    return {
      lowQuality: originalSrc,
      blurPlaceholder: undefined
    };
  }, [enableProgressiveLoading]);

  const progressiveUrls = generateProgressiveUrls(src);

  // Intersection Observer for lazy loading
  useEffect(() => {
    // Skip intersection observer for priority images - they load immediately
    if (priority) return;

    // Gracefully handle browsers without IntersectionObserver support
    if (typeof IntersectionObserver === 'undefined') {
      // For older browsers, just load the image immediately
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '200px' // Load images 200px before they enter viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  // Image event handlers
  const handleLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true);
    onLoad(event);
  }, [onLoad]);

  const handleError = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setHasError(true);
    onError(event);
  }, [onError]);

  const handleLowQualityLoad = useCallback(() => {
    setLowQualityLoaded(true);
  }, []);

  const handleBlurPlaceholderLoad = useCallback(() => {
    setBlurPlaceholderLoaded(true);
  }, []);

  return {
    isLoaded,
    isInView,
    hasError,
    lowQualityLoaded,
    blurPlaceholderLoaded,
    imgRef,
    progressiveUrls,
    handlers: {
      onLoad: handleLoad,
      onError: handleError,
      onLowQualityLoad: handleLowQualityLoad,
      onBlurPlaceholderLoad: handleBlurPlaceholderLoad
    }
  };
}