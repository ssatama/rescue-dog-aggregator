// Barrel export file for hooks
// This file provides a single entry point for importing hooks

// Image processing hooks
export { useLazyImage } from "./useLazyImage";
export type { UseLazyImageOptions, UseLazyImageReturn } from "./useLazyImage";

// UI interaction hooks
export { useShare } from "./useShare";
export type { UseShareOptions, UseShareReturn } from "./useShare";

// Navigation hooks
export { useSwipeNavigation } from "./useSwipeNavigation";
export type {
  UseSwipeNavigationProps,
  UseSwipeNavigationReturn,
} from "./useSwipeNavigation";

// Existing hooks (re-exported for completeness)
export { usePageTransition } from "./usePageTransition";
export { useReducedMotion } from "./useScrollAnimation";
