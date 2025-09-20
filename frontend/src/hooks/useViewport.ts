"use client";

import { useState, useEffect, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import { VIEWPORT_BREAKPOINTS } from "@/constants/viewport";

interface ViewportState {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Hook to detect current viewport size and device type
 * Returns viewport dimensions and boolean flags for device type
 */
export const useViewport = (): ViewportState => {
  const [viewport, setViewport] = useState<ViewportState>({
    width: 0,
    height: 0,
    isMobile: false,
    isTablet: false,
    isDesktop: false,
  });

  // Debounced update function to prevent excessive re-renders
  const debouncedUpdateViewport = useDebouncedCallback(
    () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setViewport({
        width,
        height,
        isMobile:
          width >= VIEWPORT_BREAKPOINTS.MOBILE_MIN &&
          width <= VIEWPORT_BREAKPOINTS.MOBILE_MAX,
        isTablet:
          width >= VIEWPORT_BREAKPOINTS.TABLET_MIN &&
          width <= VIEWPORT_BREAKPOINTS.TABLET_MAX,
        isDesktop: width >= VIEWPORT_BREAKPOINTS.DESKTOP_MIN,
      });
    },
    100, // 100ms debounce delay
  );

  useEffect(() => {
    // Initial check - run immediately without debounce
    const width = window.innerWidth;
    const height = window.innerHeight;

    setViewport({
      width,
      height,
      isMobile:
        width >= VIEWPORT_BREAKPOINTS.MOBILE_MIN &&
        width <= VIEWPORT_BREAKPOINTS.MOBILE_MAX,
      isTablet:
        width >= VIEWPORT_BREAKPOINTS.TABLET_MIN &&
        width <= VIEWPORT_BREAKPOINTS.TABLET_MAX,
      isDesktop: width >= VIEWPORT_BREAKPOINTS.DESKTOP_MIN,
    });

    // Add debounced event listener for resize
    window.addEventListener("resize", debouncedUpdateViewport);

    // Cleanup
    return () => {
      window.removeEventListener("resize", debouncedUpdateViewport);
      debouncedUpdateViewport.cancel(); // Cancel any pending debounced calls
    };
  }, [debouncedUpdateViewport]);

  return viewport;
};
