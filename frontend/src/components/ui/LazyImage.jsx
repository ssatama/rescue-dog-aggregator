/**
 * LazyImage component with progressive loading and optimization
 */
import React, { useState, useRef, useEffect } from 'react';
import ImagePlaceholder from './ImagePlaceholder';

export const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = null,
  onLoad = () => {},
  onError = () => {},
  enableProgressiveLoading = false,
  priority = false, // High priority images load immediately (above-fold)
  sizes = null, // Responsive image sizes attribute for optimal loading
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Priority images start as in-view
  const [hasError, setHasError] = useState(false);
  const [lowQualityLoaded, setLowQualityLoaded] = useState(false);
  const [blurPlaceholderLoaded, setBlurPlaceholderLoaded] = useState(false);
  const imgRef = useRef(null);
  
  // Generate progressive loading URLs if enabled
  const generateProgressiveUrls = (originalSrc) => {
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
      blurPlaceholder: null
    };
  };

  const { lowQuality: lowQualitySrc, blurPlaceholder: blurPlaceholderSrc } = generateProgressiveUrls(src);

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

  const handleBlurPlaceholderLoad = () => {
    setBlurPlaceholderLoaded(true);
  };

  const handleLowQualityLoad = () => {
    setLowQualityLoaded(true);
  };

  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad(e);
  };

  const handleError = (e) => {
    setHasError(true);
    onError(e);
  };

  const defaultPlaceholder = (
    <div 
      className={`bg-gray-200 animate-pulse flex items-center justify-center ${className}`}
      data-testid="image-placeholder"
      role="img"
      aria-label={alt || "Image loading"}
    >
      <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
    </div>
  );

  if (hasError) {
    return (
      <div 
        className={`bg-gray-100 flex items-center justify-center ${className}`}
        data-testid="image-error"
        role="img"
        aria-label={`${alt || "Image"} - Failed to load`}
      >
        <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }

  return (
    <div ref={imgRef} className="relative">
      {/* Stage 1: Default placeholder until we have any image loaded */}
      {!blurPlaceholderLoaded && !lowQualityLoaded && !isLoaded && (placeholder || defaultPlaceholder)}
      
      {isInView && (
        <>
          {/* Stage 1: Blur placeholder (immediate) */}
          {enableProgressiveLoading && blurPlaceholderSrc && !lowQualityLoaded && !isLoaded && (
            <img
              src={blurPlaceholderSrc}
              alt={alt}
              className={`${className} ${blurPlaceholderLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}
              loading="lazy"
              sizes={sizes}
              onLoad={handleBlurPlaceholderLoad}
              onError={handleError}
              {...props}
            />
          )}
          
          {/* Stage 2: Low quality image */}
          {enableProgressiveLoading && lowQualitySrc && !isLoaded && (
            <img
              src={lowQualitySrc}
              alt={alt}
              className={`${className} ${lowQualityLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200 ${blurPlaceholderLoaded || lowQualityLoaded ? 'absolute inset-0' : ''}`}
              loading="lazy"
              sizes={sizes}
              onLoad={handleLowQualityLoad}
              onError={handleError}
              {...props}
            />
          )}
          
          {/* Stage 3: Full quality image with smooth 300ms fade-in transition */}
          <img
            src={src}
            alt={alt}
            className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 ${enableProgressiveLoading && (blurPlaceholderLoaded || lowQualityLoaded) && !isLoaded ? 'absolute inset-0' : ''}`}
            loading="lazy"
            sizes={sizes}
            onLoad={handleLoad}
            onError={handleError}
            {...props}
          />
        </>
      )}
    </div>
  );
};

export default LazyImage;