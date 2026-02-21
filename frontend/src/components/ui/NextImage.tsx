"use client";
import React, { useMemo, useState } from "react";
import Image from "next/image";
import { getAdaptiveImageQuality } from "../../utils/networkUtils";

function normalizeImageUrl(url: string | undefined | null): string | undefined {
  if (!url || typeof url !== "string") return url ?? undefined;
  if (url.startsWith("//")) {
    return `https:${url}`;
  }
  return url;
}

type AspectRatio = "4/3" | "1/1" | "16/9" | "auto";
type Layout = "responsive" | "fill" | "fixed" | "intrinsic";
type ObjectFit = "cover" | "contain" | "fill" | "none" | "scale-down";
type Placeholder = "blur" | "empty";

interface NextImageProps {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
  aspectRatio?: AspectRatio;
  layout?: Layout;
  objectFit?: ObjectFit;
  objectPosition?: string;
  placeholder?: Placeholder;
  quality?: number;
  fallbackSrc?: string;
  onError?: (error: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  blurDataURL?: string;
  [key: string]: unknown;
}

const NextImage = React.memo(function NextImage({
  src,
  alt,
  className = "",
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  width = 400,
  height = 300,
  aspectRatio = "4/3",
  layout = "responsive",
  objectFit = "cover",
  objectPosition = "center 30%",
  placeholder = "blur",
  quality = undefined,
  fallbackSrc = "/placeholder_dog.svg",
  onError = undefined,
  blurDataURL: providedBlurDataURL = undefined,
  ...props
}: NextImageProps) {
  const [imageSrc, setImageSrc] = useState(normalizeImageUrl(src) || fallbackSrc);
  const [hasError, setHasError] = useState(false);

  const isR2Image = useMemo(() => {
    if (!imageSrc) return false;
    try {
      const url = new URL(imageSrc);
      return (
        url.hostname.endsWith(".r2.cloudflarestorage.com") ||
        url.hostname === "images.rescuedogs.me" ||
        url.hostname === "cdn.rescuedogs.me" ||
        url.hostname === "images.example.com"
      );
    } catch {
      return false;
    }
  }, [imageSrc]);

  const adaptiveQuality = useMemo(() => {
    if (quality) return String(quality);
    return getAdaptiveImageQuality().replace("q_", "").replace(",", "");
  }, [quality]);

  const blurDataURL = useMemo(() => {
    // Priority 1: Use database-stored blur URL if provided (best performance)
    if (providedBlurDataURL && placeholder === "blur") {
      return providedBlurDataURL;
    }

    // Priority 2: Skip blur for non-R2 images or fallback images
    if (placeholder !== "blur" || !isR2Image || imageSrc === fallbackSrc) {
      return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==";
    }

    // Priority 3: Generate Cloudflare CDN blur URL (fallback)
    try {
      const url = new URL(imageSrc);
      const domain = url.origin;
      let imagePath = url.pathname;

      if (imagePath.startsWith("/")) {
        imagePath = imagePath.substring(1);
      }

      const params = [
        "w_10",
        "h_10",
        "c_fill",
        "q_30",
        "f_jpg",
        "e_blur:300",
      ].join(",");

      return `${domain}/cdn-cgi/image/${params}/${imagePath}`;
    } catch {
      // Priority 4: Default fallback blur placeholder
      return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==";
    }
  }, [providedBlurDataURL, placeholder, isR2Image, imageSrc, fallbackSrc]);

  const handleError = (error: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError && imageSrc !== fallbackSrc) {
      setHasError(true);
      setImageSrc(fallbackSrc);

      if (onError) {
        onError(error);
      }
    }
  };

  const calculateDimensions = useMemo(() => {
    if (layout === "fill") {
      return { width: undefined, height: undefined };
    }

    const aspectRatios: Record<AspectRatio, number> = {
      "4/3": 4 / 3,
      "1/1": 1,
      "16/9": 16 / 9,
      auto: width / height,
    };

    const ratio = aspectRatios[aspectRatio] || aspectRatios["4/3"];

    return {
      width: width,
      height: Math.round(width / ratio),
    };
  }, [width, height, aspectRatio, layout]);

  const qualityValue = useMemo(() => {
    const numericQuality = parseInt(adaptiveQuality);
    return isNaN(numericQuality) ? 75 : numericQuality;
  }, [adaptiveQuality]);

  const responsiveSizes = useMemo(() => {
    const sizePresets: Record<string, string> = {
      "dog-card": "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
      "dog-thumbnail":
        "(max-width: 640px) 25vw, (max-width: 1024px) 20vw, 15vw",
      "org-logo": "(max-width: 640px) 64px, (max-width: 1024px) 56px, 64px",
      "related-dog": "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
      hero: "100vw",
    };

    for (const [preset, value] of Object.entries(sizePresets)) {
      if (sizes.includes(preset)) {
        return value;
      }
    }

    return sizes;
  }, [sizes]);

  const imageStyles = {
    objectFit,
    objectPosition,
  };

  const containerStyles = useMemo(() => {
    if (layout === "fill") {
      return "relative overflow-hidden";
    }

    const aspectRatioClass: Record<AspectRatio, string> = {
      "4/3": "aspect-[4/3]",
      "1/1": "aspect-square",
      "16/9": "aspect-video",
      auto: "",
    };

    return `${aspectRatioClass[aspectRatio] || ""} relative`;
  }, [layout, aspectRatio]);

  const testId =
    src === fallbackSrc || hasError ? "image-placeholder" : "optimized-image";

  const nextjsOnlyProps = new Set([
    "priority",
    "sizes",
    "quality",
    "placeholder",
    "blurDataURL",
    "fill",
    "loader",
    "unoptimized",
  ]);

  const validDomProps: Record<string, unknown> = {};
  Object.keys(props).forEach((key) => {
    if (
      !nextjsOnlyProps.has(key) &&
      (key.startsWith("data-") ||
        key.startsWith("aria-") ||
        [
          "id",
          "title",
          "role",
          "tabIndex",
          "onClick",
          "onKeyDown",
          "loading",
          "crossOrigin",
        ].includes(key))
    ) {
      validDomProps[key] = props[key];
    }
  });

  const imageProps = {
    src: imageSrc,
    alt,
    className,
    style: imageStyles,
    priority,
    sizes: responsiveSizes,
    quality: qualityValue,
    placeholder,
    blurDataURL: placeholder === "blur" ? blurDataURL : undefined,
    onError: handleError,
    ...validDomProps,
  };

  if (layout === "fill") {
    return <Image {...imageProps} data-testid={testId} fill alt={alt} />;
  }

  return (
    <div className={containerStyles}>
      <Image
        {...imageProps}
        data-testid={testId}
        width={calculateDimensions.width}
        height={calculateDimensions.height}
        alt={alt}
      />
    </div>
  );
});

NextImage.displayName = "NextImage";

export default NextImage;
