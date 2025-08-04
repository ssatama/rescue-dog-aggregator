/**
 * Centralized responsive breakpoint definitions
 *
 * Breakpoint strategy aligned with grid layouts:
 * - Mobile: < 1024px (phones and small tablets, 1-2 column grids)
 * - Desktop: >= 1024px (when 3+ column grids appear)
 *
 * This ensures desktop filters only show when there's enough space
 * for 3-column dog grids (lg breakpoint).
 */

export const BREAKPOINTS = {
  mobile: 1024, // Tailwind's lg breakpoint - when 3-column grids start
} as const;

export const MEDIA_QUERIES = {
  mobile: `(max-width: ${BREAKPOINTS.mobile - 1}px)`,
  desktop: `(min-width: ${BREAKPOINTS.mobile}px)`,
} as const;

// Tailwind class helpers for consistency
export const RESPONSIVE_CLASSES = {
  hideOnMobile: "lg:hidden",
  showOnMobile: "lg:hidden",
  hideOnDesktop: "hidden lg:block",
  showOnDesktop: "hidden lg:block",
} as const;

// Device viewport references from screenshot-automation.js
// Source: https://gist.github.com/mfehrenbach/aaf646bee2e8880b5142d92e20b633d4
export const DEVICE_VIEWPORTS = {
  // Mobile phones
  iPhoneSE: 320, // Source: iPhone SE (320×449)
  iPhone15Plus: 428, // Source: iPhone 15 Plus (428×739) - updated from iPhone16ProMax
  galaxyS24: 384, // Kept unchanged per request

  // Tablets
  iPadMini: 744, // Source: iPad Mini 6th (744×1026)
  iPadAir11: 820, // Source: iPad 10th (820×1180)
  iPadPro129: 1024, // Source: iPad Pro 12.9" (1024×1366) - updated from iPadPro11/iPadPro13

  // Desktop
  macBookAir13: 1280, // Source: MacBook Air 13" (1280×715)
} as const;
