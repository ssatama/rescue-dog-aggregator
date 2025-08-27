import { useEffect, useState } from "react";

/**
 * Custom hook for responsive media query detection
 * Efficiently tracks media query changes with event listeners
 * Prevents performance issues from repeated DOM access
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with SSR-safe default
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    // Create media query list
    const mediaQueryList = window.matchMedia(query);

    // Set initial value
    setMatches(mediaQueryList.matches);

    // Define event handler
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add event listener (modern browsers)
    mediaQueryList.addEventListener("change", handleChange);

    // Cleanup
    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

/**
 * Preset hook for mobile detection
 * Uses standard mobile breakpoint (768px)
 */
export function useIsMobile(): boolean {
  return !useMediaQuery("(min-width: 768px)");
}

/**
 * Preset hook for tablet detection
 * Uses standard tablet breakpoint (768px - 1024px)
 */
export function useIsTablet(): boolean {
  const isAboveMobile = useMediaQuery("(min-width: 768px)");
  const isBelowDesktop = !useMediaQuery("(min-width: 1024px)");
  return isAboveMobile && isBelowDesktop;
}

/**
 * Preset hook for desktop detection
 * Uses standard desktop breakpoint (1024px+)
 */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
