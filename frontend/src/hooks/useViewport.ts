"use client";

import { useState, useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";
import { VIEWPORT_BREAKPOINTS } from "@/constants/viewport";

interface ViewportState {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

const getViewportState = (): ViewportState => {
  if (typeof window === "undefined") {
    return {
      width: 0,
      height: 0,
      isMobile: false,
      isTablet: false,
      isDesktop: false,
    };
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  return {
    width,
    height,
    isMobile:
      width >= VIEWPORT_BREAKPOINTS.MOBILE_MIN &&
      width <= VIEWPORT_BREAKPOINTS.MOBILE_MAX,
    isTablet:
      width >= VIEWPORT_BREAKPOINTS.TABLET_MIN &&
      width <= VIEWPORT_BREAKPOINTS.TABLET_MAX,
    isDesktop: width >= VIEWPORT_BREAKPOINTS.DESKTOP_MIN,
  };
};

export const useViewport = (): ViewportState => {
  const [viewport, setViewport] = useState<ViewportState>(getViewportState);

  const debouncedUpdateViewport = useDebouncedCallback(() => {
    setViewport(getViewportState());
  }, 100);

  useEffect(() => {
    window.addEventListener("resize", debouncedUpdateViewport);

    return () => {
      window.removeEventListener("resize", debouncedUpdateViewport);
      debouncedUpdateViewport.cancel();
    };
  }, [debouncedUpdateViewport]);

  return viewport;
};
