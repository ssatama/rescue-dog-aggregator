import { useMediaQuery } from "./useMediaQuery";

/**
 * Viewport detection hook for the dog catalog mobile experience upgrade
 * Aligns with PRD breakpoint specifications:
 * - Mobile: 375px - 767px (2-column grid)
 * - Tablet: 768px - 1023px (3-column grid)
 * - Desktop: 1024px+ (NO CHANGES - existing 4-column layout)
 */
export function useViewport() {
  // Use existing media query hooks - call all hooks unconditionally
  const isAbove768 = useMediaQuery("(min-width: 768px)");
  const isAbove1024 = useMediaQuery("(min-width: 1024px)");
  const isAbove375 = useMediaQuery("(min-width: 375px)");

  // Calculate the viewport states from the media query results
  const isMobile = !isAbove768;
  const isTablet = isAbove768 && !isAbove1024;
  const isDesktop = isAbove1024;

  return {
    isMobile, // 375-767px
    isTablet, // 768-1023px
    isDesktop, // 1024px+
    // Helper for grouping mobile/tablet together (for modal behavior)
    isMobileOrTablet: isMobile || isTablet,
    // Raw width check for edge cases
    isAbove375,
  };
}

/**
 * Helper hook to determine grid columns based on viewport
 */
export function useGridColumns(): number {
  const { isMobile, isTablet, isDesktop } = useViewport();

  if (isMobile) return 2; // Mobile: 2 columns
  if (isTablet) return 3; // Tablet: 3 columns
  return 4; // Desktop: 4 columns (existing)
}

/**
 * Helper hook to determine if modal should be used for dog details
 */
export function useModalBehavior(): boolean {
  const { isDesktop } = useViewport();
  // Modal only for mobile/tablet, desktop uses separate pages
  return !isDesktop;
}
