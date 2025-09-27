import { useMediaQuery } from "./useMediaQuery";

/**
 * Custom hook to detect if the device should use swipe interface
 * Returns true for mobile devices, tablets, and touch-capable devices
 * Ensures tablets (especially iPads) can access the swipe feature
 */
export function useSwipeDevice(): boolean {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1279px)");
  const hasTouch = useMediaQuery("(pointer: coarse)");
  const hasFinePointer = useMediaQuery("(pointer: fine)");

  // Include:
  // 1. Mobile devices (< 768px)
  // 2. Tablets (768px - 1279px)
  // 3. Any device with touch capability
  // 4. Devices without fine pointer (likely mobile/tablet)
  return isMobile || isTablet || hasTouch || !hasFinePointer;
}
