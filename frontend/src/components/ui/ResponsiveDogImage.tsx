import React from "react";
import NextImage from "./NextImage";

type AspectRatio = "4/3" | "1/1" | "16/9" | "auto";
type Layout = "responsive" | "fill" | "fixed" | "intrinsic";

interface Dog {
  id: number;
  name: string;
  primary_image_url?: string;
  main_image?: string;
}

interface ResponsiveDogImageProps {
  dog: Dog;
  className?: string;
  priority?: boolean;
  sizes?: string;
  aspectRatio?: AspectRatio;
  layout?: Layout;
  [key: string]: unknown;
}

const ResponsiveDogImage = React.memo(
  ({
    dog,
    className = "",
    priority = false,
    sizes = "dog-card",
    aspectRatio = "4/3",
    layout = "fill",
    ...props
  }: ResponsiveDogImageProps) => {
    const imageUrl = dog.primary_image_url;

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

ResponsiveDogImage.displayName = "ResponsiveDogImage";

export default ResponsiveDogImage;
