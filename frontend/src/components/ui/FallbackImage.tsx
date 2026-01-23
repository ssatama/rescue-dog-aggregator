import React, { useState, useCallback, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { R2_CUSTOM_DOMAIN, R2_IMAGE_PATH } from "../../constants/imageConfig";

interface FallbackImageProps extends Omit<ImageProps, "onError"> {
  fallbackSrc?: string;
  onError?: (error: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * FallbackImage Component
 *
 * A robust image component that provides multiple fallback strategies:
 * 1. Primary: Next.js Image with Vercel transformations
 * 2. Fallback 1: R2 URL with Cloudflare Image Resizing transformations
 * 3. Fallback 2: Direct R2 URL without transformations
 * 4. Fallback 3: Placeholder image or emoji
 *
 * This ensures images are always displayed, even when:
 * - Vercel image transformation quota is exceeded
 * - Cloudflare transformations fail
 * - Original image is unavailable
 */
export const FallbackImage: React.FC<FallbackImageProps> = ({
  src,
  alt,
  fallbackSrc = "/placeholder_dog.svg",
  onError: customOnError,
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState<string>(String(src));
  const [fallbackLevel, setFallbackLevel] = useState<number>(0);
  const [isR2Image, setIsR2Image] = useState<boolean>(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- Syncing image state with src prop change for fallback cascade */
    const srcString = String(src);
    setImageSrc(srcString);
    setFallbackLevel(0);
    // Use URL parsing for proper hostname validation
    try {
      const url = new URL(srcString);
      setIsR2Image(
        url.hostname === R2_CUSTOM_DOMAIN ||
          url.hostname.endsWith(".r2.cloudflarestorage.com"),
      );
    } catch {
      setIsR2Image(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [src]);

  const getR2FallbackUrl = useCallback(
    (originalUrl: string, level: number): string => {
      try {
        const url = new URL(originalUrl);

        // If it's already an R2 URL
        if (
          url.hostname === R2_CUSTOM_DOMAIN ||
          url.hostname.includes("r2.cloudflarestorage.com")
        ) {
          if (level === 1) {
            // Try with Cloudflare transformations if not already applied
            if (!url.pathname.includes("/cdn-cgi/image/")) {
              const imagePath = url.pathname;
              // Use conservative transformations for reliability
              return `https://${R2_CUSTOM_DOMAIN}/cdn-cgi/image/w=800,q=80,f=auto${imagePath}`;
            } else {
              // If already has transformations, skip to removing them
              const match = url.pathname.match(
                /\/cdn-cgi\/image\/[^/]+(\/.+)$/,
              );
              if (match && match[1]) {
                return `https://${R2_CUSTOM_DOMAIN}${match[1]}`;
              }
            }
          } else if (level === 2) {
            // Remove transformations, use direct R2 URL
            if (url.pathname.includes("/cdn-cgi/image/")) {
              const match = url.pathname.match(
                /\/cdn-cgi\/image\/[^/]+(\/.+)$/,
              );
              if (match && match[1]) {
                return `https://${R2_CUSTOM_DOMAIN}${match[1]}`;
              }
            }
            return originalUrl;
          }
        } else {
          // For non-R2 images, try to find if we have an R2 version
          // This assumes images are mirrored to R2 with a predictable pattern
          const pathMatch = originalUrl.match(
            /\/([^/]+\.(jpg|jpeg|png|webp|gif))$/i,
          );
          if (pathMatch && level === 1) {
            // Try R2 with transformations
            return `https://${R2_CUSTOM_DOMAIN}/cdn-cgi/image/w=800,q=80,f=auto/${R2_IMAGE_PATH}/${pathMatch[1]}`;
          } else if (pathMatch && level === 2) {
            // Try direct R2 URL
            return `https://${R2_CUSTOM_DOMAIN}/${R2_IMAGE_PATH}/${pathMatch[1]}`;
          }
        }
      } catch (error) {
        console.warn("Failed to generate R2 fallback URL:", error);
        // For malformed URLs, return null to indicate no fallback available
        return "";
      }

      return originalUrl;
    },
    [],
  );

  const handleError = useCallback(
    (error: React.SyntheticEvent<HTMLImageElement, Event>) => {
      console.warn(
        `Image failed to load (level ${fallbackLevel}):`,
        imageSrc,
        error,
      );

      if (customOnError) {
        customOnError(error);
      }

      // Progressive fallback strategy
      if (fallbackLevel === 0) {
        // First failure: Try R2 with Cloudflare transformations
        const r2Url = getR2FallbackUrl(String(src), 1);
        if (r2Url && r2Url !== String(src) && r2Url !== "") {
          setImageSrc(r2Url);
          setFallbackLevel(1);
          return;
        }
        // If no R2 fallback available, go directly to placeholder
        setImageSrc(fallbackSrc);
        setFallbackLevel(3);
        return;
      }

      if (fallbackLevel === 1) {
        // Second failure: Try direct R2 URL without transformations
        const directR2Url = getR2FallbackUrl(String(src), 2);
        if (directR2Url && directR2Url !== imageSrc && directR2Url !== "") {
          setImageSrc(directR2Url);
          setFallbackLevel(2);
          return;
        }
        // If no direct R2 available, use placeholder
        setImageSrc(fallbackSrc);
        setFallbackLevel(3);
        return;
      }

      if (fallbackLevel === 2) {
        // Third failure: Use fallback placeholder
        setImageSrc(fallbackSrc);
        setFallbackLevel(3);
        return;
      }

      // Final failure: Component will show the placeholder
    },
    [
      fallbackLevel,
      imageSrc,
      src,
      fallbackSrc,
      customOnError,
      getR2FallbackUrl,
    ],
  );

  // For R2 images, bypass Next.js Image optimization to avoid Vercel transformations
  const shouldBypassNextOptimization = isR2Image || fallbackLevel > 0;

  if (fallbackLevel === 3 && fallbackSrc === "/placeholder_dog.svg") {
    // Show emoji placeholder if even the fallback image fails
    return (
      <div
        className="flex items-center justify-center bg-gray-200 rounded"
        style={{ width: props.width || "100%", height: props.height || "100%" }}
        role="img"
        aria-label={alt}
      >
        <span className="text-6xl">🐕</span>
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={imageSrc}
      alt={alt}
      onError={handleError}
      unoptimized={shouldBypassNextOptimization ? true : undefined}
      loader={shouldBypassNextOptimization ? ({ src }) => src : undefined}
    />
  );
};

export default FallbackImage;
