import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { getAdaptiveImageQuality } from "../../utils/networkUtils";
import { MEDIA_QUERIES, IMAGE_DIMENSIONS } from "../../constants/breakpoints";

const ResponsiveDogImage = React.memo(
  ({
    dog,
    className = "",
    priority = false,
    sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  }) => {
    const placeholderImage = "/images/dog-placeholder.svg";
    const imageUrl =
      dog.primary_image_url || dog.main_image || placeholderImage;

    const isR2Image =
      imageUrl.includes("r2.cloudflarestorage.com") ||
      imageUrl.includes("images.rescuedogs.me") ||
      imageUrl.includes("cdn.rescuedogs.me") ||
      imageUrl.includes("images.example.com"); // For testing

    // Cache network quality to avoid repeated DOM access
    const adaptiveQuality = useMemo(() => getAdaptiveImageQuality(), []);

    const getOptimizedUrl = useMemo(() => {
      return (width, height, gravity = "auto") => {
        if (!isR2Image || imageUrl === placeholderImage) {
          return imageUrl;
        }

        // Parse the URL properly
        try {
          const url = new URL(imageUrl);
          const domain = url.origin; // https://images.rescuedogs.me
          let imagePath = url.pathname; // /rescue_dogs/furry_rescue_italy/morris_3d5f7b94.jpg

          // Remove leading slash for proper URL construction
          if (imagePath.startsWith("/")) {
            imagePath = imagePath.substring(1);
          }

          const params = [
            `w_${width}`,
            `h_${height}`,
            "c_cover",
            `g_${gravity}`,
            "f_auto",
            adaptiveQuality,
          ].join(",");

          return `${domain}/cdn-cgi/image/${params}/${imagePath}`;
        } catch (e) {
          // Fallback for invalid URLs
          return imageUrl;
        }
      };
    }, [imageUrl, isR2Image, placeholderImage, adaptiveQuality]);

    // Memoize all URL generations to prevent expensive operations on every render
    const optimizedUrls = useMemo(
      () => ({
        mobileUrl1x: getOptimizedUrl(
          IMAGE_DIMENSIONS.mobile.small.width,
          IMAGE_DIMENSIONS.mobile.small.height,
          "face",
        ),
        mobileUrl2x: getOptimizedUrl(
          IMAGE_DIMENSIONS.mobile.large.width,
          IMAGE_DIMENSIONS.mobile.large.height,
          "face",
        ),
        tabletUrl1x: getOptimizedUrl(
          IMAGE_DIMENSIONS.tablet.small.width,
          IMAGE_DIMENSIONS.tablet.small.height,
          "auto",
        ),
        tabletUrl2x: getOptimizedUrl(
          IMAGE_DIMENSIONS.tablet.large.width,
          IMAGE_DIMENSIONS.tablet.large.height,
          "auto",
        ),
        desktopUrl: getOptimizedUrl(
          IMAGE_DIMENSIONS.desktop.default.width,
          IMAGE_DIMENSIONS.desktop.default.height,
          "auto",
        ),
      }),
      [getOptimizedUrl],
    );

    return (
      <picture
        className={`${className} transition-transform duration-300 ease-out group-hover:scale-105`}
      >
        {/* Mobile: Square crop with face detection */}
        <source
          media={MEDIA_QUERIES.mobile}
          srcSet={`${optimizedUrls.mobileUrl1x} 1x, ${optimizedUrls.mobileUrl2x} 2x`}
        />

        {/* Tablet: 4:3 with auto gravity */}
        <source
          media={MEDIA_QUERIES.tablet}
          srcSet={`${optimizedUrls.tabletUrl1x} 1x, ${optimizedUrls.tabletUrl2x} 2x`}
        />

        {/* Desktop fallback with auto gravity */}
        <img
          src={optimizedUrls.desktopUrl}
          alt={dog.name}
          loading={priority ? undefined : "lazy"}
          sizes={sizes}
          data-testid="image-placeholder"
          className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
          style={{
            objectPosition: "center 30%",
          }}
        />
      </picture>
    );
  },
);

ResponsiveDogImage.propTypes = {
  dog: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    primary_image_url: PropTypes.string,
    main_image: PropTypes.string,
  }).isRequired,
  className: PropTypes.string,
  priority: PropTypes.bool,
  sizes: PropTypes.string,
};

export default ResponsiveDogImage;
