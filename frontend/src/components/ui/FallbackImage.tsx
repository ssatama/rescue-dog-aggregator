import React, { useState, useCallback, useEffect } from "react";
import Image, { ImageProps } from "next/image";
import { R2_CUSTOM_DOMAIN } from "../../constants/imageConfig";

interface FallbackImageProps extends Omit<ImageProps, "onError"> {
  fallbackSrc?: string;
  onError?: (error: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * FallbackImage Component
 *
 * A robust image component that provides multiple fallback strategies:
 * 1. Primary: next/image through the site's loader (pre-generated WebP
 *    variants on images.rescuedogs.me), so an R2 photo keeps its srcset (#680)
 * 2. Fallback 1: the original R2 file, unoptimized (a variant is missing)
 * 3. Fallback 2: placeholder image or emoji
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

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- Syncing image state with src prop change for fallback cascade */
    setImageSrc(String(src));
    setFallbackLevel(0);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [src]);

  // The first try is a pre-generated variant through the loader. If that
  // fails, the original R2 file (never a Cloudflare transformation, which is
  // billed per image, #761); then the placeholder.
  const getR2FallbackUrl = useCallback(
    (originalUrl: string, level: number): string => {
      if (level !== 1) return "";
      try {
        const url = new URL(originalUrl);
        if (url.hostname !== R2_CUSTOM_DOMAIN && !url.hostname.endsWith(".r2.cloudflarestorage.com")) {
          return "";
        }
        const match = url.pathname.match(/\/cdn-cgi\/image\/[^/]+(\/.+)$/);
        return match ? `${url.origin}${match[1]}` : originalUrl;
      } catch {
        return "";
      }
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
        // First failure: the original R2 file
        const r2Url = getR2FallbackUrl(String(src), 1);
        // May be the same URL as src: this time unoptimized, so the original
        // file rather than a variant
        if (r2Url) {
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

  // A fallback URL is already the exact one to load; the first try goes
  // through the loader, which picks a pre-generated R2 variant
  const shouldBypassNextOptimization = fallbackLevel > 0;

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
    />
  );
};

export default FallbackImage;
