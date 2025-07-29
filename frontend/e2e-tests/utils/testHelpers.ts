// =============================================================================
// ESSENTIAL TIMEOUT CONFIGURATION
// =============================================================================

/**
 * A simplified and essential set of timeouts for E2E tests.
 * This configuration avoids complex multipliers and environment-based logic
 * for easier maintenance and predictability.
 */
export const TIMEOUTS = {
  /** Timeouts for page-level actions like loading and navigation. */
  page: {
    load: 25000,      // For full page loads (e.g., `goto`, `reload`). Increased for full device matrix.
    navigation: 20000,// For navigations initiated by user actions (e.g., clicks). Increased for resource contention.
    element: 15000,   // Default wait time for an element to be ready. Increased for slower responses.
  },

  /** Timeouts for API calls. */
  api: {
    standard: 8000,   // For standard API calls. Increased for slower dev server under load.
    slow: 15000,      // For API calls that are expected to take longer.
  },

  /** Timeouts for UI interactions and states. */
  ui: {
    animation: 500,     // For CSS animations to complete.
    debounce: 700,      // For debounced inputs like search.
    loading: 25000,     // For loading indicators to disappear. Major increase for full device matrix.
  },

  /** Timeouts for media elements. */
  media: {
    image: 12000,        // For a single image to load. Increased for resource contention.
  },
} as const;

/**
 * Function to get the timeout configuration. In this simplified system,
 * it directly returns the TIMEOUTS constant.
 */
export function getTimeoutConfig() {
  return TIMEOUTS;
}
