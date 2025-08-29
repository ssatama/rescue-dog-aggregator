import React from "react";
import PropTypes from "prop-types";
import NextImage from "./NextImage";

const OptimizedImage = React.memo(
  ({
    src,
    alt,
    className = "",
    priority = false,
    sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
    objectFit = "cover",
    objectPosition = "center",
    ...props
  }) => {
    const mappedObjectPosition =
      objectPosition === "center" ? "center 30%" : objectPosition;

    return (
      <NextImage
        src={src}
        alt={alt}
        className={className}
        priority={priority}
        sizes={sizes}
        aspectRatio="4/3"
        layout="responsive"
        objectFit={objectFit}
        objectPosition={mappedObjectPosition}
        {...props}
      />
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
