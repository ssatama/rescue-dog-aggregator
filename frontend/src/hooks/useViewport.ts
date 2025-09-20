"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      setViewport({
        width,
        height,
        isMobile: width >= VIEWPORT_BREAKPOINTS.MOBILE_MIN && width <= VIEWPORT_BREAKPOINTS.MOBILE_MAX,
        isTablet: width >= VIEWPORT_BREAKPOINTS.TABLET_MIN && width <= VIEWPORT_BREAKPOINTS.TABLET_MAX,
        isDesktop: width >= VIEWPORT_BREAKPOINTS.DESKTOP_MIN,
      });
    };

    // Initial check
    updateViewport();

    // Add event listener
    window.addEventListener("resize", updateViewport);

    // Cleanup
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  return viewport;
};