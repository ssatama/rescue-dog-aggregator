import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { getAdaptiveImageQuality } from "../../utils/networkUtils";
import { MEDIA_QUERIES, IMAGE_DIMENSIONS } from "../../constants/breakpoints";

const OptimizedImage = React.memo(
  ({
    src,
    alt,
    className = "",
    priority = false,
    sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
    objectFit = "cover",
    objectPosition = "center",
  }) => {
    const placeholderImage = "/images/dog-placeholder.svg";
    const imageUrl = src || placeholderImage;

    const isR2Image =
      imageUrl.includes("r2.cloudflarestorage.com") ||
      imageUrl.includes("images.rescuedogs.me") ||
      imageUrl.includes("cdn.rescuedogs.me") ||
      imageUrl.includes("images.example.com");

    const adaptiveQuality = useMemo(() => getAdaptiveImageQuality(), []);

    const getOptimizedUrl = useMemo(() => {
      return (width, height, format = "auto", gravity = "auto") => {
        if (!isR2Image || imageUrl === placeholderImage) {
          return imageUrl;
        }

        try {
          const url = new URL(imageUrl);
          const domain = url.origin;
          let imagePath = url.pathname;

          if (imagePath.startsWith("/")) {
            imagePath = imagePath.substring(1);
          }

          const params = [
            `w_${width}`,
            `h_${height}`,
            "c_cover",
            `g_${gravity}`,
            `f_${format}`,
            adaptiveQuality,
          ].join(",");

          return `${domain}/cdn-cgi/image/${params}/${imagePath}`;
        } catch (e) {
          return imageUrl;
        }
      };
    }, [imageUrl, isR2Image, placeholderImage, adaptiveQuality]);

    const optimizedUrls = useMemo(
      () => ({
        // WebP versions for modern browsers
        mobileWebP1x: getOptimizedUrl(
          IMAGE_DIMENSIONS.mobile.small.width,
          IMAGE_DIMENSIONS.mobile.small.height,
          "webp",
          "face",
        ),
        mobileWebP2x: getOptimizedUrl(
          IMAGE_DIMENSIONS.mobile.large.width,
          IMAGE_DIMENSIONS.mobile.large.height,
          "webp",
          "face",
        ),
        tabletWebP1x: getOptimizedUrl(
          IMAGE_DIMENSIONS.tablet.small.width,
          IMAGE_DIMENSIONS.tablet.small.height,
          "webp",
          "auto",
        ),
        tabletWebP2x: getOptimizedUrl(
          IMAGE_DIMENSIONS.tablet.large.width,
          IMAGE_DIMENSIONS.tablet.large.height,
          "webp",
          "auto",
        ),
        desktopWebP: getOptimizedUrl(
          IMAGE_DIMENSIONS.desktop.default.width,
          IMAGE_DIMENSIONS.desktop.default.height,
          "webp",
          "auto",
        ),
        // Fallback JPEG/PNG versions
        mobileUrl1x: getOptimizedUrl(
          IMAGE_DIMENSIONS.mobile.small.width,
          IMAGE_DIMENSIONS.mobile.small.height,
          "auto",
          "face",
        ),
        mobileUrl2x: getOptimizedUrl(
          IMAGE_DIMENSIONS.mobile.large.width,
          IMAGE_DIMENSIONS.mobile.large.height,
          "auto",
          "face",
        ),
        tabletUrl1x: getOptimizedUrl(
          IMAGE_DIMENSIONS.tablet.small.width,
          IMAGE_DIMENSIONS.tablet.small.height,
          "auto",
          "auto",
        ),
        tabletUrl2x: getOptimizedUrl(
          IMAGE_DIMENSIONS.tablet.large.width,
          IMAGE_DIMENSIONS.tablet.large.height,
          "auto",
          "auto",
        ),
        desktopUrl: getOptimizedUrl(
          IMAGE_DIMENSIONS.desktop.default.width,
          IMAGE_DIMENSIONS.desktop.default.height,
          "auto",
          "auto",
        ),
      }),
      [getOptimizedUrl],
    );

    return (
      <picture className={className}>
        {/* WebP sources for modern browsers */}
        <source
          type="image/webp"
          media={MEDIA_QUERIES.mobile}
          srcSet={`${optimizedUrls.mobileWebP1x} 1x, ${optimizedUrls.mobileWebP2x} 2x`}
        />
        <source
          type="image/webp"
          media={MEDIA_QUERIES.tablet}
          srcSet={`${optimizedUrls.tabletWebP1x} 1x, ${optimizedUrls.tabletWebP2x} 2x`}
        />
        <source type="image/webp" srcSet={optimizedUrls.desktopWebP} />

        {/* Fallback sources for browsers that don't support WebP */}
        <source
          media={MEDIA_QUERIES.mobile}
          srcSet={`${optimizedUrls.mobileUrl1x} 1x, ${optimizedUrls.mobileUrl2x} 2x`}
        />
        <source
          media={MEDIA_QUERIES.tablet}
          srcSet={`${optimizedUrls.tabletUrl1x} 1x, ${optimizedUrls.tabletUrl2x} 2x`}
        />

        {/* Default img fallback */}
        <img
          src={optimizedUrls.desktopUrl}
          alt={alt}
          loading={priority ? undefined : "lazy"}
          fetchpriority={priority ? "high" : undefined}
          sizes={sizes}
          data-testid={
            src === placeholderImage ? "image-placeholder" : "optimized-image"
          }
          className={`w-full h-full ${objectFit === "cover" ? "object-cover" : `object-${objectFit}`}`}
          style={{
            objectPosition,
          }}
        />
      </picture>
    );
  },
);

OptimizedImage.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
  priority: PropTypes.bool,
  sizes: PropTypes.string,
  objectFit: PropTypes.oneOf([
    "cover",
    "contain",
    "fill",
    "none",
    "scale-down",
  ]),
  objectPosition: PropTypes.string,
};

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
