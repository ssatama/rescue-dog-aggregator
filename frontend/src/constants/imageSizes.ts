// Type definitions for image sizes
export type ImageSizeKey =
  | "SWIPE_CARD"
  | "CATALOG_CARD"
  | "SINGLE_COLUMN_CARD"
  | "GUIDE_CARD"
  | "CAROUSEL"
  | "THUMBNAIL"
  | "ORG_LOGO"
  | "HERO"
  | "DETAIL_IMAGE"
  | "MOBILE_FULL"
  | "DESKTOP_HALF";

export const IMAGE_SIZES: Record<ImageSizeKey, string> = {
  // Swipe cards and main dog cards
  SWIPE_CARD:
    "(max-width: 480px) 100vw, 448px",

  // Catalog cards in DOG_GRID: 2 columns, 3 from 640px, 4 from 1280px
  CATALOG_CARD: "(max-width: 639px) 50vw, (max-width: 1279px) 33vw, 25vw",

  // A card grid that is one column on phones (similar dogs)
  SINGLE_COLUMN_CARD: "(max-width: 767px) 100vw, 33vw",

  // Guides' DogGrid: cards of at most ~360px inside the article column
  GUIDE_CARD: "(max-width: 767px) 100vw, 360px",

  // Image carousels - optimized for different viewport sizes
  CAROUSEL:
    "(max-width: 480px) 100vw, 448px",

  // Thumbnails for related dogs or small previews
  THUMBNAIL: "96px",

  // Organization logos
  ORG_LOGO: "64px",

  // Hero images or full-width images
  HERO: "100vw",

  // Detail page main image
  DETAIL_IMAGE: "(max-width: 1080px) 100vw, 66vw",

  // Mobile-specific sizes
  MOBILE_FULL: "(max-width: 640px) 100vw, 50vw",

  // Desktop-specific sizes
  DESKTOP_HALF: "(min-width: 1080px) 50vw, 100vw",
} as const;

export const getImageSize = (type: ImageSizeKey): string => {
  return IMAGE_SIZES[type] || IMAGE_SIZES.CATALOG_CARD;
};
