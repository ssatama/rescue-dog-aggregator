import React from "react";
import PropTypes from "prop-types";
import NextImage from "./NextImage";

const ResponsiveDogImage = React.memo(
  ({
    dog,
    className = "",
    priority = false,
    sizes = "dog-card",
    aspectRatio = "4/3",
    layout = "fill",
    ...props
  }) => {
    const imageUrl = dog.primary_image_url || dog.main_image;

    return (
      <NextImage
        src={imageUrl}
        alt={dog.name}
        className={`${className} transition-transform duration-300 ease-out group-hover:scale-105`}
        priority={priority}
        sizes={sizes}
        aspectRatio={aspectRatio}
        layout={layout}
        objectFit="cover"
        objectPosition="center 30%"
        {...props}
      />
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
