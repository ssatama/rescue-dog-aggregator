import React from "react";
import { useLazyImage } from "../../hooks/useLazyImage";

export interface LazyImageProps
  extends Omit<
    React.ImgHTMLAttributes<HTMLImageElement>,
    "src" | "alt" | "onLoad" | "onError" | "placeholder"
  > {
  /** Image source URL */
  src: string;
  /** Alt text for the image */
  alt: string;
  /** Additional CSS classes */
  className?: string;
  /** Custom placeholder element */
  placeholder?: React.ReactNode;
  /** Callback when image loads */
  onLoad?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  /** Callback when image fails to load */
  onError?: (event: React.SyntheticEvent<HTMLImageElement>) => void;
  /** Whether to enable progressive loading with blur/low-quality versions */
  enableProgressiveLoading?: boolean;
  /** High priority images load immediately (above-fold) */
  priority?: boolean;
  /** Responsive image sizes attribute for optimal loading */
  sizes?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = "",
  placeholder = null,
  onLoad = () => {},
  onError = () => {},
  enableProgressiveLoading = false,
  priority = false,
  sizes = undefined,
  ...domProps
}) => {
  const {
    isLoaded,
    isInView,
    hasError,
    lowQualityLoaded,
    blurPlaceholderLoaded,
    imgRef,
    progressiveUrls,
    handlers,
  } = useLazyImage(src, {
    priority,
    enableProgressiveLoading,
    onLoad,
    onError,
  });

  const { lowQuality: lowQualitySrc, blurPlaceholder: blurPlaceholderSrc } =
    progressiveUrls;

  const defaultPlaceholder = (
    <div
      className={`bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center ${className}`}
      data-testid="image-placeholder"
      role="img"
      aria-label={alt || "Image loading"}
    >
      <svg
        className="w-8 h-8 text-gray-400 dark:text-gray-500"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );

  if (hasError) {
    return (
      <div
        className={`bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`}
        data-testid="image-error"
        role="img"
        aria-label={`${alt || "Image"} - Failed to load`}
      >
        <svg
          className="w-8 h-8 text-gray-400 dark:text-gray-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  }

  return (
    <div ref={imgRef} className="relative">
      {/* Stage 1: Default placeholder until we have any image loaded */}
      {!blurPlaceholderLoaded &&
        !lowQualityLoaded &&
        !isLoaded &&
        (placeholder || defaultPlaceholder)}

      {isInView && (
        <>
          {/* Stage 1: Blur placeholder (immediate) */}
          {enableProgressiveLoading &&
            blurPlaceholderSrc &&
            !lowQualityLoaded &&
            !isLoaded && (
              <img
                src={blurPlaceholderSrc}
                alt={alt}
                className={`${className} ${blurPlaceholderLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-100`}
                loading="lazy"
                sizes={sizes}
                onLoad={handlers.onBlurPlaceholderLoad}
                onError={handlers.onError}
                {...domProps}
              />
            )}

          {/* Stage 2: Low quality image */}
          {enableProgressiveLoading && lowQualitySrc && !isLoaded && (
            <img
              src={lowQualitySrc}
              alt={alt}
              className={`${className} ${lowQualityLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-200 ${blurPlaceholderLoaded || lowQualityLoaded ? "absolute inset-0" : ""}`}
              loading="lazy"
              sizes={sizes}
              onLoad={handlers.onLowQualityLoad}
              onError={handlers.onError}
              {...domProps}
            />
          )}

          {/* Stage 3: Full quality image with smooth 300ms fade-in transition */}
          <img
            src={src}
            alt={alt}
            className={`${className} ${isLoaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300 ${enableProgressiveLoading && (blurPlaceholderLoaded || lowQualityLoaded) && !isLoaded ? "absolute inset-0" : ""}`}
            loading="lazy"
            sizes={sizes}
            onLoad={handlers.onLoad}
            onError={handlers.onError}
            {...domProps}
          />
        </>
      )}
    </div>
  );
};

export default LazyImage;
