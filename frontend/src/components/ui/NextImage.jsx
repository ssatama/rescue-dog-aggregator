"use client";
import React, { useMemo, useState } from "react";
import Image from "next/image";
import PropTypes from "prop-types";
import { getAdaptiveImageQuality } from "../../utils/networkUtils";
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
  quality = null,
  fallbackSrc = "/images/dog-placeholder.svg",
  onError = null,
  blurDataURL: providedBlurDataURL = null, // NEW: Accept blur data from database
  ...props
}) {
  const [imageSrc, setImageSrc] = useState(src || fallbackSrc);
  const [hasError, setHasError] = useState(false);

  const isR2Image = useMemo(() => {
    return (
      imageSrc &&
      (imageSrc.includes("r2.cloudflarestorage.com") ||
        imageSrc.includes("images.rescuedogs.me") ||
        imageSrc.includes("cdn.rescuedogs.me") ||
        imageSrc.includes("images.example.com"))
    );
  }, [imageSrc]);

  const adaptiveQuality = useMemo(() => {
    if (quality) return quality;
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
    } catch (e) {
      // Priority 4: Default fallback blur placeholder
      return "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q==";
    }
  }, [providedBlurDataURL, placeholder, isR2Image, imageSrc, fallbackSrc]);

  const handleError = (error) => {
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

    const aspectRatios = {
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
    const sizePresets = {
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

    const aspectRatioClass = {
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

  const validDomProps = {};
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
    return <Image {...imageProps} data-testid={testId} fill />;
  }

  return (
    <div className={containerStyles}>
      <Image
        {...imageProps}
        data-testid={testId}
        width={calculateDimensions.width}
        height={calculateDimensions.height}
      />
    </div>
  );
});

NextImage.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
  priority: PropTypes.bool,
  sizes: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  aspectRatio: PropTypes.oneOf(["4/3", "1/1", "16/9", "auto"]),
  layout: PropTypes.oneOf(["responsive", "fill", "fixed", "intrinsic"]),
  objectFit: PropTypes.oneOf([
    "cover",
    "contain",
    "fill",
    "none",
    "scale-down",
  ]),
  objectPosition: PropTypes.string,
  placeholder: PropTypes.oneOf(["blur", "empty"]),
  quality: PropTypes.number,
  fallbackSrc: PropTypes.string,
  onError: PropTypes.func,
  blurDataURL: PropTypes.string, // NEW: Database-stored blur placeholder
};

NextImage.displayName = "NextImage";

export default NextImage;