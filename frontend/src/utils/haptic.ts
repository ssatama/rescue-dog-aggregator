/**
 * Haptic feedback utility for mobile devices
 * Provides tactile feedback for user interactions
 */

type HapticPattern =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error"
  | "double";

const hapticPatterns: Record<HapticPattern, number[]> = {
  light: [10],
  medium: [20],
  heavy: [30],
  success: [10, 50, 10],
  warning: [20, 40, 20],
  error: [50],
  double: [10, 50, 10],
};

/**
 * Trigger haptic feedback on supported devices
 * @param pattern - The type of haptic feedback to trigger
 */
export function triggerHaptic(pattern: HapticPattern = "light"): void {
  // Check if vibration API is available
  if (typeof window === "undefined" || !window.navigator?.vibrate) {
    return;
  }

  try {
    const vibrationPattern = hapticPatterns[pattern];
    window.navigator.vibrate(vibrationPattern);
  } catch (error) {
    // Silently fail if vibration is not supported or fails
    console.debug("Haptic feedback not available:", error);
  }
}

