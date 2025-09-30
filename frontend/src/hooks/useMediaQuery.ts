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
