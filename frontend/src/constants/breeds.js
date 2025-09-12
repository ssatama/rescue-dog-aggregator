// Breed-related constants
export const BREED_CONSTANTS = {
  // Pagination
  ITEMS_PER_PAGE: 12,
  MAX_POPULAR_BREEDS_DISPLAY: 12,
  MAX_BREED_GROUPS_DISPLAY: 8,

  // Filtering thresholds
  MIN_DOGS_FOR_POPULAR_MIX: 15,
  MAX_POPULAR_MIXES: 6,

  // Image gallery
  MAX_GALLERY_IMAGES: 4,
  IMAGE_LOAD_THRESHOLD: "100px", // Intersection observer margin

  // Touch targets
  MIN_TOUCH_TARGET_SIZE: 44, // px - WCAG recommendation

  // Animation durations
  IMAGE_FADE_DURATION: 300, // ms
  SWIPE_MIN_DISTANCE: 50, // px

  // API limits
  MAX_API_LIMIT: 1000,
  DEFAULT_REVALIDATE_TIME: 3600, // 1 hour in seconds

  // Sizes
  MOBILE_CARD_WIDTH: "85%",
  TABLET_CARD_WIDTH: "45%",
};

export const BREED_GROUP_NAMES = {
  HOUND: "Hound",
  SPORTING: "Sporting",
  HERDING: "Herding",
  WORKING: "Working",
  TERRIER: "Terrier",
  NON_SPORTING: "Non-Sporting",
  TOY: "Toy",
  MIXED: "Mixed",
};

export const BREED_TYPES = {
  PUREBRED: "purebred",
  MIXED: "mixed",
  CROSSBREED: "crossbreed",
  UNKNOWN: "unknown",
};
