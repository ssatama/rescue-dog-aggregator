/**
 * Responsive breakpoints used throughout the application
 * These should match Tailwind CSS breakpoints for consistency
 */

export const BREAKPOINTS = {
  // Mobile first breakpoints
  mobile: 640, // sm: in Tailwind CSS
  tablet: 1024, // lg: in Tailwind CSS
  desktop: 1280, // xl: in Tailwind CSS
  large: 1536, // 2xl: in Tailwind CSS
};

/**
 * Media query strings for use in CSS-in-JS or picture elements
 */
export const MEDIA_QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.mobile}px)`,
  tablet: `(max-width: ${BREAKPOINTS.tablet}px)`,
  desktop: `(max-width: ${BREAKPOINTS.desktop}px)`,
  large: `(max-width: ${BREAKPOINTS.large}px)`,

  // Min-width variants for progressive enhancement
  mobileUp: `(min-width: ${BREAKPOINTS.mobile + 1}px)`,
  tabletUp: `(min-width: ${BREAKPOINTS.tablet + 1}px)`,
  desktopUp: `(min-width: ${BREAKPOINTS.desktop + 1}px)`,
  largeUp: `(min-width: ${BREAKPOINTS.large + 1}px)`,
};

/**
 * Image optimization dimensions based on breakpoints
 * Used for responsive image generation
 */
export const IMAGE_DIMENSIONS = {
  mobile: {
    small: { width: 400, height: 400 }, // 1x
    large: { width: 800, height: 800 }, // 2x
  },
  tablet: {
    small: { width: 600, height: 450 }, // 4:3 aspect ratio 1x
    large: { width: 1200, height: 900 }, // 4:3 aspect ratio 2x
  },
  desktop: {
    default: { width: 800, height: 600 }, // 4:3 aspect ratio
  },
};
