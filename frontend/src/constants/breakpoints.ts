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

