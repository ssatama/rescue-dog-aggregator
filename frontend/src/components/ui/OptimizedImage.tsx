import React from "react";
import NextImage from "./NextImage";

type ObjectFit = "cover" | "contain" | "fill" | "none" | "scale-down";

interface OptimizedImageProps {
  src?: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  objectFit?: ObjectFit;
  objectPosition?: string;
  [key: string]: unknown;
}

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
  }: OptimizedImageProps) => {
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

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
