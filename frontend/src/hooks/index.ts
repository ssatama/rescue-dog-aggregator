// Barrel export file for hooks
// This file provides a single entry point for importing hooks

// Image processing hooks
export { useAdvancedImage } from "./useAdvancedImage";
export type {
  UseAdvancedImageOptions,
  UseAdvancedImageReturn,
} from "./useAdvancedImage";

export { useLazyImage } from "./useLazyImage";
export type { UseLazyImageOptions, UseLazyImageReturn } from "./useLazyImage";

// UI interaction hooks
export { useShare } from "./useShare";
export type { UseShareOptions, UseShareReturn } from "./useShare";

// Existing hooks (re-exported for completeness)
export { default as useFilteredDogs } from "./useFilteredDogs";
export { usePageTransition } from "./usePageTransition";
export { useReducedMotion } from "./useScrollAnimation";
