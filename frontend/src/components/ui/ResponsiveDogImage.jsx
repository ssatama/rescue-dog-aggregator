import React from "react";
import PropTypes from "prop-types";
import { getAdaptiveImageQuality } from "../../utils/networkUtils";

const ResponsiveDogImage = ({
  dog,
  className = "",
  priority = false,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
}) => {
  const placeholderImage = "/images/dog-placeholder.svg";
  const imageUrl = dog.primary_image_url || dog.main_image || placeholderImage;

  const isR2Image =
    imageUrl.includes("r2.cloudflarestorage.com") ||
    imageUrl.includes("images.rescuedogs.me") ||
    imageUrl.includes("cdn.rescuedogs.me") ||
    imageUrl.includes("images.example.com"); // For testing

  const getOptimizedUrl = (width, height, gravity = "auto") => {
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

      // Use network-aware quality optimization
      const adaptiveQuality = getAdaptiveImageQuality();

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

  // Generate different URLs for different viewports
  const mobileUrl1x = getOptimizedUrl(400, 400, "face");
  const mobileUrl2x = getOptimizedUrl(800, 800, "face");
  const tabletUrl1x = getOptimizedUrl(600, 450, "auto");
  const tabletUrl2x = getOptimizedUrl(1200, 900, "auto");
  const desktopUrl = getOptimizedUrl(800, 600, "auto");

  return (
    <picture
      className={`${className} transition-transform duration-300 ease-out group-hover:scale-105`}
    >
      {/* Mobile: Square crop with face detection */}
      <source
        media="(max-width: 640px)"
        srcSet={`${mobileUrl1x} 1x, ${mobileUrl2x} 2x`}
      />

      {/* Tablet: 4:3 with auto gravity */}
      <source
        media="(max-width: 1024px)"
        srcSet={`${tabletUrl1x} 1x, ${tabletUrl2x} 2x`}
      />

      {/* Desktop fallback with auto gravity */}
      <img
        src={desktopUrl}
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
};

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
