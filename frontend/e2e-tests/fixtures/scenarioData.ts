// =============================================================================
// MODULAR TEST DATA IMPORTS
// Re-exports from separate, focused modules for better organization
// =============================================================================

// Basic static test data for common cases
export {
  basicDog,
  basicDogs,
  basicOrganization,
  basicOrganizations,
  basicStatistics,
  basicFilterCounts,
  createDogVariation,
  createOrganizationVariation,
  createBreedTestSet,
  createSizeTestSet,
  createAgeTestSet,
  emptyTestData,
  singleDogTestData,
  multiDogTestData
} from './basicTestData';

// Heavy data generation utilities
export {
  DataGenerationConfig,
  DataGenerator,
  SEED_DATA,
  DEFAULT_GENERATION_CONFIG,
  generateLargeCatalogData,
  generateFreshLargeCatalogData,
  generateQuickTestData,
  generateStressTestData,
  generateSpecializedScenarios,
  ScenarioDataCacheUtils
} from './dataGenerators';

// Organized test scenario catalogs
export {
  SearchScenario,
  FilterScenario,
  ErrorScenario,
  PerformanceScenario,
  ResponsiveScenario,
  AccessibilityScenario,
  UserJourneyScenario,
  UserJourneyStep,
  searchScenarios,
  filterScenarios,
  errorScenarios,
  performanceScenarios,
  responsiveScenarios,
  accessibilityScenarios,
  getSearchScenarioByName,
  getFilterScenarioByName,
  getErrorScenarioByName,
  getPerformanceScenarioByName,
  getResponsiveScenarioByName,
  getAccessibilityScenarioByName,
  getUserJourneyScenarioByName,
  generateParameterizedScenarios
} from './scenarioCatalogs';

// =============================================================================
// COMPREHENSIVE E2E TEST SCENARIOS
// =============================================================================

export interface TestScenario {
  name: string;
  description: string;
  setup?: () => Promise<void>;
  cleanup?: () => Promise<void>;
  data?: Record<string, unknown>;
  expectations?: Record<string, unknown>;
}

export interface NavigationScenario extends TestScenario {
  startUrl: string;
  targetUrl: string;
  navigationSteps: string[];
}

export interface FilterTestScenario extends TestScenario {
  filters: Record<string, string>;
  expectedResults: number;
  expectedDogs?: string[];
}

export interface SearchTestScenario extends TestScenario {
  query: string;
  expectedResults: number;
  expectedDogs?: string[];
  shouldDebounce?: boolean;
}

export interface MobileTestScenario extends TestScenario {
  viewport: { width: number; height: number };
  mobileSpecificActions: string[];
}

// Navigation Test Scenarios
export const navigationScenarios: NavigationScenario[] = [
  {
    name: 'home-to-dogs-listing',
    description: 'Navigate from home page to dogs listing page',
    startUrl: '/',
    targetUrl: '/dogs',
    navigationSteps: ['Click primary CTA button', 'Wait for page load'],
    expectations: {
      pageTitle: 'Dogs for Adoption',
      dogsGridVisible: true
    }
  },
  {
    name: 'dogs-to-detail-and-back',
    description: 'Navigate to dog detail page and back to listing',
    startUrl: '/dogs',
    targetUrl: '/dogs/max-golden-retriever',
    navigationSteps: ['Click first dog card', 'Wait for detail page', 'Click back button'],
    expectations: {
      dogName: 'Max',
      breadcrumbsVisible: true,
      backButtonVisible: true
    }
  },
  {
    name: 'deep-link-to-dog-detail',
    description: 'Direct navigation to dog detail page via URL',
    startUrl: '/dogs/max-golden-retriever',
    targetUrl: '/dogs/max-golden-retriever',
    navigationSteps: ['Load page directly'],
    expectations: {
      dogName: 'Max',
      heroImageVisible: true,
      adoptionButtonVisible: true
    }
  }
];

// Filter Test Scenarios
export const filterTestScenarios: FilterTestScenario[] = [
  {
    name: 'filter-by-size-small',
    description: 'Filter dogs by small size',
    filters: { size: 'Small' },
    expectedResults: 1,
    expectedDogs: ['Charlie'],
    expectations: {
      filterBadgeVisible: true,
      clearFiltersVisible: true
    }
  },
  {
    name: 'filter-by-breed-golden-retriever',
    description: 'Filter dogs by Golden Retriever breed',
    filters: { breed: 'Golden Retriever' },
    expectedResults: 1,
    expectedDogs: ['Max'],
    expectations: {
      filterBadgeVisible: true,
      breedFilterSelected: 'Golden Retriever'
    }
  },
  {
    name: 'multiple-filters-medium-female',
    description: 'Apply multiple filters: medium size and female',
    filters: { size: 'Medium', sex: 'Female' },
    expectedResults: 2,
    expectedDogs: ['Bella', 'Luna'],
    expectations: {
      multipleFilterBadges: true,
      clearAllFiltersVisible: true
    }
  },
  {
    name: 'filter-no-results',
    description: 'Apply filters that return no results',
    filters: { size: 'Small', breed: 'German Shepherd' },
    expectedResults: 0,
    expectedDogs: [],
    expectations: {
      emptyStateVisible: true,
      clearFiltersVisible: true
    }
  }
];

// Search Test Scenarios
export const searchTestScenarios: SearchTestScenario[] = [
  {
    name: 'search-by-name',
    description: 'Search for dogs by name',
    query: 'Max',
    expectedResults: 1,
    expectedDogs: ['Max'],
    shouldDebounce: true,
    expectations: {
      searchResultsVisible: true,
      searchQueryHighlighted: true
    }
  },
  {
    name: 'search-by-breed',
    description: 'Search for dogs by breed',
    query: 'Golden',
    expectedResults: 1,
    expectedDogs: ['Max'],
    shouldDebounce: true,
    expectations: {
      searchResultsVisible: true,
      breedHighlighted: true
    }
  },
  {
    name: 'search-no-results',
    description: 'Search with query that returns no results',
    query: 'NonexistentBreed',
    expectedResults: 0,
    expectedDogs: [],
    shouldDebounce: true,
    expectations: {
      emptySearchState: true,
      noResultsMessage: 'No dogs found matching your search'
    }
  },
  {
    name: 'search-with-filters',
    description: 'Search combined with active filters',
    query: 'a',
    expectedResults: 2, // Bella and Luna contain 'a'
    expectedDogs: ['Bella', 'Luna'],
    shouldDebounce: true,
    expectations: {
      searchAndFiltersActive: true,
      resultCountCorrect: true
    }
  }
];

// Mobile-specific Test Scenarios
export const mobileTestScenarios: MobileTestScenario[] = [
  {
    name: 'mobile-filter-drawer',
    description: 'Test mobile filter drawer functionality',
    viewport: { width: 375, height: 667 },
    mobileSpecificActions: [
      'Open filter drawer',
      'Apply filters',
      'Close drawer',
      'Verify results'
    ],
    expectations: {
      filterDrawerVisible: true,
      mobileLayoutActive: true,
      stickyHeaderVisible: true
    }
  },
  {
    name: 'mobile-dog-carousel',
    description: 'Test mobile dog carousel on home page',
    viewport: { width: 375, height: 667 },
    mobileSpecificActions: [
      'Verify carousel layout',
      'Swipe left/right',
      'Tap dog card'
    ],
    expectations: {
      carouselVisible: true,
      swipeGesturesWork: true,
      gridNotVisible: true
    }
  },
  {
    name: 'mobile-dog-detail-sticky-bar',
    description: 'Test mobile sticky action bar on dog detail page',
    viewport: { width: 375, height: 667 },
    mobileSpecificActions: [
      'Navigate to dog detail',
      'Scroll down',
      'Verify sticky bar',
      'Test action buttons'
    ],
    expectations: {
      stickyBarVisible: true,
      adoptButtonInBar: true,
      shareButtonInBar: true
    }
  }
];

// Error Testing Scenarios
export const errorTestScenarios: TestScenario[] = [
  {
    name: 'api-error-dogs-loading',
    description: 'Test dogs API error handling',
    expectations: {
      errorMessageVisible: true,
      retryButtonVisible: true,
      fallbackContentVisible: false
    }
  },
  {
    name: 'broken-image-handling',
    description: 'Test broken image error states',
    data: { dogSlug: 'broken-image-dog' },
    expectations: {
      placeholderImageVisible: true,
      errorIconVisible: true,
      retryImageVisible: true
    }
  },
  {
    name: 'network-timeout-simulation',
    description: 'Test network timeout scenarios',
    expectations: {
      loadingStateVisible: true,
      timeoutMessageVisible: true,
      retryOptionAvailable: true
    }
  },
  {
    name: 'dog-not-found-404',
    description: 'Test 404 error for non-existent dog',
    data: { dogSlug: 'non-existent-dog' },
    expectations: {
      notFoundPageVisible: true,
      backToDogsLinkVisible: true,
      errorMessage: 'Dog not found'
    }
  }
];

// Performance Testing Scenarios
export const performanceTestScenarios: TestScenario[] = [
  {
    name: 'large-dataset-pagination',
    description: 'Test pagination with large dataset',
    data: { totalDogs: 100 },
    expectations: {
      loadMoreButtonVisible: true,
      paginationPerformant: true,
      memoryUsageStable: true
    }
  },
  {
    name: 'image-lazy-loading',
    description: 'Test image lazy loading performance',
    expectations: {
      imagesLazyLoaded: true,
      onlyVisibleImagesLoaded: true,
      performanceMetricsGood: true
    }
  },
  {
    name: 'search-debouncing-performance',
    description: 'Test search debouncing prevents excessive API calls',
    expectations: {
      apiCallsDebounced: true,
      singleRequestPerQuery: true,
      performanceOptimal: true
    }
  }
];

// Accessibility Testing Scenarios
export const accessibilityTestScenarios: TestScenario[] = [
  {
    name: 'keyboard-navigation',
    description: 'Test full keyboard navigation',
    expectations: {
      allInteractiveElementsFocusable: true,
      tabOrderLogical: true,
      focusVisibleIndicators: true
    }
  },
  {
    name: 'screen-reader-compatibility',
    description: 'Test screen reader compatibility',
    expectations: {
      ariaLabelsPresent: true,
      headingStructureLogical: true,
      landmarksIdentified: true
    }
  },
  {
    name: 'color-contrast-compliance',
    description: 'Test color contrast compliance',
    expectations: {
      contrastRatioCompliant: true,
      colorOnlyNotUsed: true,
      highContrastModeSupported: true
    }
  }
];

// User Journey Scenarios
export const userJourneyScenarios: TestScenario[] = [
  {
    name: 'adoption-inquiry-journey',
    description: 'Complete adoption inquiry user journey',
    expectations: {
      journeyCompleted: true,
      allStepsAccessible: true,
      dataTransferredCorrectly: true
    }
  },
  {
    name: 'search-filter-adoption-journey',
    description: 'Search, filter, and inquire about adoption',
    expectations: {
      searchWorked: true,
      filtersApplied: true,
      adoptionFormOpened: true
    }
  },
  {
    name: 'mobile-responsive-journey',
    description: 'Complete user journey on mobile device',
    expectations: {
      mobileLayoutCorrect: true,
      touchGesturesWork: true,
      mobileCTAsAccessible: true
    }
  }
];

// Utility functions for scenario management
export const getScenarioByName = (scenarios: TestScenario[], name: string): TestScenario | undefined => {
  return scenarios.find(scenario => scenario.name === name);
};

export const getScenariosByType = (type: 'navigation' | 'filter' | 'search' | 'mobile' | 'error' | 'performance' | 'accessibility' | 'userJourney') => {
  switch (type) {
    case 'navigation': return navigationScenarios;
    case 'filter': return filterTestScenarios;
    case 'search': return searchTestScenarios;
    case 'mobile': return mobileTestScenarios;
    case 'error': return errorTestScenarios;
    case 'performance': return performanceTestScenarios;
    case 'accessibility': return accessibilityTestScenarios;
    case 'userJourney': return userJourneyScenarios;
    default: return [];
  }
};

export const getAllScenarios = (): TestScenario[] => {
  return [
    ...navigationScenarios,
    ...filterTestScenarios,
    ...searchTestScenarios,
    ...mobileTestScenarios,
    ...errorTestScenarios,
    ...performanceTestScenarios,
    ...accessibilityTestScenarios,
    ...userJourneyScenarios
  ];
};
