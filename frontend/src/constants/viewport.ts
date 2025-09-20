// Viewport breakpoint constants
export const VIEWPORT_BREAKPOINTS = {
  MOBILE_MIN: 375,
  MOBILE_MAX: 767,
  TABLET_MIN: 768,
  TABLET_MAX: 1023,
  DESKTOP_MIN: 1024,
} as const;

// Layout constants
export const GRID_COLUMNS = {
  MOBILE: 2,
  TABLET: 3,
  DESKTOP: 4,
} as const;

// Animation durations
export const ANIMATION_DURATION = {
  CARD_DELAY: 0.05,
  MODAL_TRANSITION: 200,
} as const;

// UI Constants
export const UI_CONSTANTS = {
  BORDER_RADIUS: "12px",
  SWIPE_THRESHOLD: 75, // px for swipe gesture
  SCROLL_DEBOUNCE: 300, // ms
  URL_UPDATE_DEBOUNCE: 500, // ms
  MAX_PERSONALITY_TRAITS_DISPLAY: 2,
} as const;
