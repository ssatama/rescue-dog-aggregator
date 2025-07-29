// =============================================================================
// DOG VALIDATION OPTIONS
// =============================================================================

export interface DogCardValidationOptions {
  validateImage?: boolean;
  validateOrganization?: boolean;
  validateBadges?: boolean;
  validateMetadata?: boolean;
  validateCTAButtons?: boolean;
  validateAccessibility?: boolean;
  validateResponsive?: boolean;
}

export interface DogDetailValidationOptions {
  validateHeroImage?: boolean;
  validateMetadataCards?: boolean;
  validateOrganization?: boolean;
  validateDescription?: boolean;
  validateRelatedDogs?: boolean;
  validateCTAButtons?: boolean;
  validateBreadcrumbs?: boolean;
  validateGallery?: boolean;
  validateAccessibility?: boolean;
  validateSEO?: boolean;
}

export interface DogListOptions {
  expectedCount?: number;
  validateOrder?: boolean;
  checkAllImages?: boolean;
  validatePagination?: boolean;
  validateFiltering?: boolean;
  validateSearch?: boolean;
  validateLoadMore?: boolean;
  validateEmptyState?: boolean;
}

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

export interface ValidationResult {
  passed: boolean;
  message: string;
  element?: string;
  screenshot?: string;
}

export interface DogCardValidationResult {
  overall: ValidationResult;
  image: ValidationResult;
  name: ValidationResult;
  breed: ValidationResult;
  age: ValidationResult;
  size: ValidationResult;
  organization: ValidationResult;
  badges: ValidationResult;
  ctaButtons: ValidationResult;
  accessibility: ValidationResult;
}

export interface DogDetailValidationResult {
  overall: ValidationResult;
  heroImage: ValidationResult;
  dogInfo: ValidationResult;
  metadataCards: ValidationResult;
  description: ValidationResult;
  organization: ValidationResult;
  relatedDogs: ValidationResult;
  ctaButtons: ValidationResult;
  breadcrumbs: ValidationResult;
  gallery: ValidationResult;
  accessibility: ValidationResult;
  seo: ValidationResult;
}

export interface DogListValidationResult {
  overall: ValidationResult;
  gridLayout: ValidationResult;
  dogCards: DogCardValidationResult[];
  pagination: ValidationResult;
  filtering: ValidationResult;
  search: ValidationResult;
  loadMore: ValidationResult;
  emptyState: ValidationResult;
  accessibility: ValidationResult;
  performance: ValidationResult;
}

// =============================================================================
// INTERACTION RESULT TYPES
// =============================================================================

export interface DogInteractionResult {
  success: boolean;
  action: string;
  target: string;
  duration: number;
  screenshot?: string;
  error?: string;
}

export interface LazyImageTestResult {
  totalImages: number;
  lazyLoadedImages: number;
  loadedImages: number;
  failedImages: number;
  averageLoadTime: number;
  performanceScore: number;
  errors: Array<{
    imageUrl: string;
    error: string;
    element: string;
  }>;
}

export interface SearchInteractionResult {
  query: string;
  resultsCount: number;
  searchTime: number;
  debounceWorking: boolean;
  highlightingWorking: boolean;
  apiCallsMade: number;
  expectedApiCalls: number;
  performance: {
    averageResponseTime: number;
    totalSearchTime: number;
    debounceBehaviorCorrect: boolean;
  };
}

export interface FilterInteractionResult {
  filtersApplied: Record<string, string>;
  resultsCount: number;
  filterTime: number;
  urlUpdated: boolean;
  badgesVisible: boolean;
  clearFiltersVisible: boolean;
  performance: {
    filterResponseTime: number;
    uiUpdateTime: number;
  };
}

// =============================================================================
// DOG DATA TYPES FOR TESTING
// =============================================================================

export interface TestDogData {
  id: number;
  slug: string;
  name: string;
  breed: string;
  age: string;
  size: string;
  sex: string;
  imageUrl: string;
  organizationName: string;
  description: string;
  isAvailable: boolean;
  badges?: string[];
}

export interface TestOrganizationData {
  id: number;
  name: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

// =============================================================================
// TEST CONFIGURATION TYPES
// =============================================================================

export interface DogTestConfig {
  viewport: {
    width: number;
    height: number;
    isMobile: boolean;
  };
  performance: {
    enableMetrics: boolean;
    slowNetworkSimulation: boolean;
    imageLoadTimeout: number;
    debounceTimeout: number;
  };
  accessibility: {
    enableChecks: boolean;
    checkColorContrast: boolean;
    checkKeyboardNav: boolean;
    checkScreenReader: boolean;
  };
  screenshots: {
    onError: boolean;
    onValidation: boolean;
    onInteraction: boolean;
  };
}

export interface ElementSelectors {
  dogCard: {
    container: string;
    image: string;
    name: string;
    breed: string;
    age: string;
    size: string;
    organization: string;
    badges: string;
    ctaButton: string;
    favoriteButton: string;
  };
  dogDetail: {
    heroImage: string;
    dogName: string;
    dogInfo: string;
    metadataCards: string;
    description: string;
    organization: string;
    relatedDogs: string;
    adoptButton: string;
    shareButton: string;
    breadcrumbs: string;
    gallery: string;
  };
  dogList: {
    grid: string;
    loadMoreButton: string;
    pagination: string;
    filters: string;
    search: string;
    sortDropdown: string;
    emptyState: string;
    loadingSpinner: string;
  };
  navigation: {
    header: string;
    logo: string;
    mainNav: string;
    mobileMenu: string;
    footer: string;
    skipLink: string;
  };
}

// =============================================================================
// ERROR AND LOADING STATES
// =============================================================================

export interface ErrorTestScenario {
  name: string;
  description: string;
  trigger: () => Promise<void>;
  expectedBehavior: {
    errorMessageVisible: boolean;
    retryButtonVisible: boolean;
    fallbackContentVisible: boolean;
    userCanRecover: boolean;
  };
}

export interface LoadingTestScenario {
  name: string;
  description: string;
  trigger: () => Promise<void>;
  expectedBehavior: {
    loadingSpinnerVisible: boolean;
    contentHidden: boolean;
    progressIndicatorVisible: boolean;
    timeoutHandled: boolean;
  };
}

// =============================================================================
// PERFORMANCE TESTING TYPES
// =============================================================================

export interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  totalBlockingTime: number;
  imageLoadTimes: number[];
  apiResponseTimes: number[];
  searchResponseTimes: number[];
  filterResponseTimes: number[];
}

export interface PerformanceThresholds {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  totalBlockingTime: number;
  imageLoadTime: number;
  apiResponseTime: number;
  searchResponseTime: number;
  filterResponseTime: number;
}

// =============================================================================
// ACCESSIBILITY TESTING TYPES
// =============================================================================

export interface AccessibilityTestResult {
  passed: boolean;
  violations: Array<{
    rule: string;
    description: string;
    impact: 'minor' | 'moderate' | 'serious' | 'critical';
    elements: string[];
    helpUrl: string;
  }>;
  summary: {
    total: number;
    minor: number;
    moderate: number;
    serious: number;
    critical: number;
  };
}

export interface KeyboardNavigationResult {
  allElementsFocusable: boolean;
  tabOrderCorrect: boolean;
  focusVisible: boolean;
  skipLinksWork: boolean;
  modalTrapsCorrect: boolean;
  errors: string[];
}

// =============================================================================
// RESPONSIVE TESTING TYPES
// =============================================================================

export interface ResponsiveTestConfig {
  breakpoints: Array<{
    name: string;
    width: number;
    height: number;
  }>;
  elementsToTest: string[];
  expectedBehaviors: Record<string, {
    visible: boolean;
    layout: 'grid' | 'list' | 'carousel' | 'stack';
    columns?: number;
  }>;
}

export interface ResponsiveTestResult {
  breakpoint: string;
  passed: boolean;
  layoutCorrect: boolean;
  elementsVisible: boolean;
  interactionsWork: boolean;
  performanceGood: boolean;
  errors: string[];
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type TestEnvironment = 'development' | 'staging' | 'production';

export type MockScenario = 'fast' | 'realistic' | 'slow' | 'error' | 'empty' | 'large';

export type TestPriority = 'critical' | 'high' | 'medium' | 'low';

export type TestCategory = 
  | 'smoke' 
  | 'regression' 
  | 'performance' 
  | 'accessibility' 
  | 'responsive' 
  | 'error-handling' 
  | 'user-journey';

export interface TestMetadata {
  category: TestCategory;
  priority: TestPriority;
  environment: TestEnvironment[];
  mockScenario: MockScenario;
  estimatedDuration: number;
  dependencies: string[];
  tags: string[];
}
