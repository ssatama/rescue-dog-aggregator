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

import React, { useState, useRef, useEffect, memo } from "react";
import {
  getCatalogCardImage,
  getDetailHeroImage,
  getThumbnailImage,
  handleImageError,
} from "../../utils/imageUtils";
import { R2_CUSTOM_DOMAIN } from "../../constants/imageConfig";

type ImageContext = "hero" | "card" | "thumbnail";

interface ProgressiveImageProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  context?: ImageContext;
  priority?: boolean;
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
}

const ProgressiveImage = memo(function ProgressiveImage({
  src,
  alt,
  className = "",
  placeholder,
  context = "card", // 'hero', 'card', 'thumbnail'
  priority = false, // For LCP images
  onLoad,
  onError,
  ...props
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // Load immediately if priority
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

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
        rootMargin: "50px", // Start loading 50px before image comes into view
        threshold: 0.1,
      },
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  // Get optimized image URL based on context
  const getOptimizedSrc = (originalSrc: string): string | null => {
    if (!originalSrc) return null;

    switch (context) {
      case "hero":
        return getDetailHeroImage(originalSrc);
      case "thumbnail":
        return getThumbnailImage(originalSrc);
      default:
        return getCatalogCardImage(originalSrc);
    }
  };

  const optimizedSrc = getOptimizedSrc(src);

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>): void => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.(event);
  };

  const handleLoadError = (
    event: React.SyntheticEvent<HTMLImageElement>,
  ): void => {
    setHasError(true);
    handleImageError(event, src);
    onError?.(event);
  };

  // Generate low-quality placeholder for blur-up effect
  const generatePlaceholder = (): string => {
    if (placeholder) return placeholder;
    if (!src) return "/placeholder_dog.svg";

    // For R2 images, create a tiny blurred version using Cloudflare Images
    if (src.includes(R2_CUSTOM_DOMAIN)) {
      // Extract the path from the R2 URL
      const imagePath = src.replace(`https://${R2_CUSTOM_DOMAIN}/`, "");
      return `https://${R2_CUSTOM_DOMAIN}/cdn-cgi/image/w_20,h_20,q_10,f_auto,blur_300/${imagePath}`;
    }

    return "/placeholder_dog.svg";
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
          isLoaded ? "opacity-0" : "opacity-100"
        }`}
        style={{
          filter:
            placeholderSrc === "/placeholder_dog.svg" ? "none" : "blur(5px)",
          transform:
            placeholderSrc === "/placeholder_dog.svg" ? "none" : "scale(1.1)",
        }}
        aria-hidden="true"
      />

      {/* Main image */}
      {isInView && optimizedSrc && (
        <img
          src={optimizedSrc}
          alt={alt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={handleLoad}
          onError={handleLoadError}
          style={{
            // Improve image rendering performance
            imageRendering: context === "thumbnail" ? "pixelated" : "auto",
          }}
        />
      )}

      {/* Loading indicator for hero images */}
      {context === "hero" && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
});

ProgressiveImage.displayName = "ProgressiveImage";

export default ProgressiveImage;
