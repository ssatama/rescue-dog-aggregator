// Type definitions for image sizes
export type ImageSizeKey = 
  | 'SWIPE_CARD'
  | 'CATALOG_CARD' 
  | 'CAROUSEL'
  | 'THUMBNAIL'
  | 'ORG_LOGO'
  | 'HERO'
  | 'DETAIL_IMAGE'
  | 'MOBILE_FULL'
  | 'DESKTOP_HALF';

export const IMAGE_SIZES: Record<ImageSizeKey, string> = {
  // Swipe cards and main dog cards
  SWIPE_CARD: "(max-width: 640px) 100vw, 50vw",
  
  // Catalog cards in grid
  CATALOG_CARD: "(max-width: 640px) 50vw, 33vw",
  
  // Image carousels
  CAROUSEL: "(max-width: 640px) 100vw, 50vw",
  
  // Thumbnails for related dogs or small previews  
  THUMBNAIL: "128px",
  
  // Organization logos
  ORG_LOGO: "64px",
  
  // Hero images or full-width images
  HERO: "100vw",
  
  // Detail page main image
  DETAIL_IMAGE: "(max-width: 1080px) 100vw, 66vw",
  
  // Mobile-specific sizes
  MOBILE_FULL: "(max-width: 640px) 100vw, 50vw",
  
  // Desktop-specific sizes
  DESKTOP_HALF: "(min-width: 1080px) 50vw, 100vw"
} as const;

export const getImageSize = (type: ImageSizeKey): string => {
  return IMAGE_SIZES[type] || IMAGE_SIZES.CATALOG_CARD;
};