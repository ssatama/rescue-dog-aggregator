/**
 * Progressive Image Loading Component
 * 
 * Features:
 * - Blur-up placeholder technique for better perceived performance
 * - Lazy loading with intersection observer
 * - Responsive image loading
 * - Error handling with fallbacks
 * - Core Web Vitals optimization
 */
"use client";

import React, { useState, useRef, useEffect, memo } from 'react';
import { getCatalogCardImage, getDetailHeroImage, getThumbnailImage, handleImageError } from '../../utils/imageUtils';

const ProgressiveImage = memo(function ProgressiveImage({
  src,
  alt,
  className = '',
  placeholder,
  context = 'card', // 'hero', 'card', 'thumbnail'
  priority = false, // For LCP images
  onLoad,
  onError,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Load immediately if priority
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // Start loading 50px before image comes into view
        threshold: 0.1
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  // Get optimized image URL based on context
  const getOptimizedSrc = (originalSrc) => {
    if (!originalSrc) return null;
    
    switch (context) {
      case 'hero':
        return getDetailHeroImage(originalSrc);
      case 'thumbnail':
        return getThumbnailImage(originalSrc);
      default:
        return getCatalogCardImage(originalSrc);
    }
  };

  const optimizedSrc = getOptimizedSrc(src);

  const handleLoad = (event) => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.(event);
  };

  const handleLoadError = (event) => {
    setHasError(true);
    handleImageError(event, src);
    onError?.(event);
  };

  // Generate low-quality placeholder for blur-up effect
  const generatePlaceholder = () => {
    if (placeholder) return placeholder;
    if (!src) return '/placeholder_dog.svg';
    
    // For Cloudinary images, create a tiny blurred version
    if (src.includes('res.cloudinary.com')) {
      return src.replace('/upload/', '/upload/w_20,h_20,q_10,f_auto,e_blur:300/');
    }
    
    return '/placeholder_dog.svg';
  };

  const placeholderSrc = generatePlaceholder();

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      {...props}
    >
      {/* Placeholder/blur-up image */}
      <img
        src={placeholderSrc}
        alt=""
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          filter: placeholderSrc === '/placeholder_dog.svg' ? 'none' : 'blur(5px)',
          transform: placeholderSrc === '/placeholder_dog.svg' ? 'none' : 'scale(1.1)'
        }}
        aria-hidden="true"
      />

      {/* Main image */}
      {isInView && optimizedSrc && (
        <img
          src={optimizedSrc}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleLoadError}
          style={{
            // Improve image rendering performance
            imageRendering: context === 'thumbnail' ? 'optimizeSpeed' : 'optimizeQuality'
          }}
        />
      )}

      {/* Loading indicator for hero images */}
      {context === 'hero' && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
});

ProgressiveImage.displayName = 'ProgressiveImage';

export default ProgressiveImage;