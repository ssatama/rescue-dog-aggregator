// =============================================================================
// SELECTOR CONFIGURATION AND VALIDATION SYSTEM
// Configurable fallback strategy for different test environments
// =============================================================================

/**
 * Fallback strategy configuration for different test environments
 */
export interface FallbackStrategy {
  name: string;
  description: string;
  enableSemanticFallbacks: boolean;
  enableAriaFallbacks: boolean;
  enableCssFallbacks: boolean;
  requireTestIds: boolean;
  warnOnFallbacks: boolean;
  failOnMissingTestIds: boolean;
}

/**
 * Test ID validation result
 */
export interface TestIdValidationResult {
  elementName: string;
  testIdFound: boolean;
  fallbackUsed: boolean;
  fallbackType?: 'semantic' | 'aria' | 'css';
  workingSelector?: string;
  errorMessage?: string;
}

/**
 * Selector configuration for an element
 */
export interface ElementSelectorConfig {
  name: string;
  description: string;
  required: boolean;
  testIds: string[];
  semanticSelectors?: string[];
  ariaSelectors?: string[];
  cssSelectors?: string[];
}

/**
 * Predefined fallback strategies for different environments
 */
export const FALLBACK_STRATEGIES: Record<string, FallbackStrategy> = {
  strict: {
    name: 'strict',
    description: 'Test IDs only - fail if not found',
    enableSemanticFallbacks: false,
    enableAriaFallbacks: false,
    enableCssFallbacks: false,
    requireTestIds: true,
    warnOnFallbacks: false,
    failOnMissingTestIds: true
  },
  
  testIdFirst: {
    name: 'testIdFirst',
    description: 'Test IDs preferred with minimal semantic fallbacks',
    enableSemanticFallbacks: true,
    enableAriaFallbacks: true,
    enableCssFallbacks: false,
    requireTestIds: false,
    warnOnFallbacks: true,
    failOnMissingTestIds: false
  },
  
  accessibility: {
    name: 'accessibility',
    description: 'Test IDs + semantic + ARIA (no CSS)',
    enableSemanticFallbacks: true,
    enableAriaFallbacks: true,
    enableCssFallbacks: false,
    requireTestIds: false,
    warnOnFallbacks: true,
    failOnMissingTestIds: false
  },
  
  compatible: {
    name: 'compatible',
    description: 'Full fallback strategy for legacy components',
    enableSemanticFallbacks: true,
    enableAriaFallbacks: true,
    enableCssFallbacks: true,
    requireTestIds: false,
    warnOnFallbacks: true,
    failOnMissingTestIds: false
  },
  
  development: {
    name: 'development',
    description: 'Development mode with validation warnings',
    enableSemanticFallbacks: true,
    enableAriaFallbacks: true,
    enableCssFallbacks: false,
    requireTestIds: false,
    warnOnFallbacks: true,
    failOnMissingTestIds: false
  }
};

/**
 * Dogs page element selector configurations
 */
export const DOGS_PAGE_SELECTORS: ElementSelectorConfig[] = [
  // Page structure
  {
    name: 'page-container',
    description: 'Main page container',
    required: true,
    testIds: ['dogs-page-container', 'dogs-page']
  },
  
  {
    name: 'page-title',
    description: 'Page title heading',
    required: true,
    testIds: ['dogs-page-title', 'page-title'],
    semanticSelectors: ['h1:has-text("Find Your New Best Friend")', 'h1'],
    ariaSelectors: ['[role="heading"][aria-level="1"]']
  },

  // Search
  {
    name: 'search-input',
    description: 'Search input field',
    required: true,
    testIds: ['search-input', 'dogs-search'],
    semanticSelectors: ['input[type="search"]', 'input[placeholder*="search" i]'],
    ariaSelectors: ['[role="searchbox"]', '[aria-label*="search" i]']
  },

  {
    name: 'clear-search',
    description: 'Clear search button',
    required: false,
    testIds: ['clear-search', 'search-clear'],
    semanticSelectors: ['button:has(svg.lucide-x)', 'button[title*="clear" i]'],
    ariaSelectors: ['[aria-label*="clear" i]']
  },

  // Mobile filters
  {
    name: 'mobile-filter-button',
    description: 'Mobile filter toggle button',
    required: true,
    testIds: ['mobile-filter-button', 'filter-toggle'],
    semanticSelectors: ['button:has(svg.lucide-filter)', 'button:has-text("Filter")'],
    ariaSelectors: ['[aria-label*="filter" i]', '[aria-expanded]']
  },

  {
    name: 'mobile-filter-drawer',
    description: 'Mobile filter drawer/modal',
    required: true,
    testIds: ['mobile-filter-drawer', 'filter-modal'],
    semanticSelectors: ['dialog', '[role="dialog"]'],
    ariaSelectors: ['[aria-modal="true"]', '[aria-label*="filter" i]']
  },

  {
    name: 'filter-close',
    description: 'Close filter drawer button',
    required: true,
    testIds: ['filter-close', 'close-filter'],
    semanticSelectors: ['button:has-text("Close")', 'button:has(svg.lucide-x)'],
    ariaSelectors: ['[aria-label*="close" i]']
  },

  // Filter selects
  {
    name: 'organization-select',
    description: 'Organization filter dropdown',
    required: true,
    testIds: ['organization-select', 'organization-filter'],
    semanticSelectors: ['select[name="organization"]', '#organization-filter'],
    ariaSelectors: ['[aria-label*="organization" i]', '[role="combobox"]']
  },

  {
    name: 'breed-select',
    description: 'Breed filter dropdown',
    required: true,
    testIds: ['breed-select', 'breed-filter'],
    semanticSelectors: ['select[name="breed"]', '#breed-filter'],
    ariaSelectors: ['[aria-label*="breed" i]']
  },

  {
    name: 'sex-select',
    description: 'Sex filter dropdown',
    required: true,
    testIds: ['sex-select', 'sex-filter'],
    semanticSelectors: ['select[name="sex"]', '#sex-filter'],
    ariaSelectors: ['[aria-label*="sex" i]', '[aria-label*="gender" i]']
  },

  {
    name: 'size-select',
    description: 'Size filter dropdown',
    required: true,
    testIds: ['size-select', 'size-filter'],
    semanticSelectors: ['select[name="size"]', '#size-filter'],
    ariaSelectors: ['[aria-label*="size" i]']
  },

  {
    name: 'age-select',
    description: 'Age filter dropdown',
    required: true,
    testIds: ['age-select', 'age-filter'],
    semanticSelectors: ['select[name="age"]', '#age-filter'],
    ariaSelectors: ['[aria-label*="age" i]']
  },

  {
    name: 'location-country-select',
    description: 'Location country filter dropdown',
    required: false,
    testIds: ['location-country-select', 'location-filter'],
    semanticSelectors: ['select[name="location_country"]', '#location-country-filter'],
    ariaSelectors: ['[aria-label*="location" i]', '[aria-label*="located" i]']
  },

  {
    name: 'available-country-select',
    description: 'Available country filter dropdown',
    required: false,
    testIds: ['available-country-select', 'available-filter'],
    semanticSelectors: ['select[name="available_country"]', '#available-country-filter'],
    ariaSelectors: ['[aria-label*="available" i]', '[aria-label*="adoptable" i]']
  },

  // Dogs grid and cards
  {
    name: 'dogs-grid',
    description: 'Dogs grid container',
    required: true,
    testIds: ['dogs-grid', 'dogs-list'],
    semanticSelectors: ['main[role="main"]', '[role="grid"]'],
    ariaSelectors: ['[aria-label*="dog" i]']
  },

  {
    name: 'dog-card',
    description: 'Individual dog cards',
    required: true,
    testIds: ['dog-card'],
    semanticSelectors: ['article', '[role="gridcell"]'],
    ariaSelectors: ['[aria-label*="dog" i]']
  },

  {
    name: 'dog-name',
    description: 'Dog name in card',
    required: true,
    testIds: ['dog-name'],
    semanticSelectors: ['h3', 'h2', '[role="heading"]'],
    cssSelectors: ['.dog-name']
  },

  {
    name: 'dog-breed',
    description: 'Dog breed in card',
    required: true,
    testIds: ['dog-breed'],
    ariaSelectors: ['[aria-label*="breed" i]'],
    cssSelectors: ['.dog-breed']
  },

  // States
  {
    name: 'loading-skeleton',
    description: 'Loading skeleton elements',
    required: false,
    testIds: ['loading-skeleton', 'skeleton'],
    semanticSelectors: ['[role="status"]', '[aria-live="polite"]'],
    ariaSelectors: ['[aria-label*="loading" i]'],
    cssSelectors: ['.animate-pulse']
  },

  {
    name: 'empty-state',
    description: 'Empty state when no results',
    required: false,
    testIds: ['empty-state', 'no-results'],
    semanticSelectors: ['[role="status"]'],
    ariaSelectors: ['[aria-label*="no results" i]', '[aria-label*="empty" i]']
  },

  {
    name: 'error-alert',
    description: 'Error alert/message',
    required: false,
    testIds: ['error-alert', 'error-message'],
    semanticSelectors: ['[role="alert"]'],
    ariaSelectors: ['[aria-live="assertive"]']
  },

  // Actions
  {
    name: 'load-more-button',
    description: 'Load more dogs button',
    required: false,
    testIds: ['load-more', 'load-more-button'],
    semanticSelectors: ['button:has-text("Load More")', 'button:has-text("Show More")'],
    ariaSelectors: ['[aria-label*="load more" i]']
  },

  {
    name: 'reset-filters',
    description: 'Reset all filters button',
    required: false,
    testIds: ['reset-filters', 'clear-filters'],
    semanticSelectors: ['button:has-text("Reset")', 'button:has-text("Clear")'],
    ariaSelectors: ['[aria-label*="reset" i]', '[aria-label*="clear" i]']
  }
];

/**
 * Get current fallback strategy from environment
 */
export function getCurrentFallbackStrategy(): FallbackStrategy {
  const strategyName = process.env.E2E_SELECTOR_STRATEGY || 'testIdFirst';
  const strategy = FALLBACK_STRATEGIES[strategyName];
  
  if (!strategy) {
    console.warn(`[SelectorConfig] Unknown strategy "${strategyName}", falling back to "testIdFirst"`);
    return FALLBACK_STRATEGIES.testIdFirst;
  }
  
  return strategy;
}

/**
 * Get selector configuration by element name
 */
export function getSelectorConfig(elementName: string): ElementSelectorConfig | undefined {
  return DOGS_PAGE_SELECTORS.find(config => config.name === elementName);
}

/**
 * Get all required element configurations
 */
export function getRequiredElements(): ElementSelectorConfig[] {
  return DOGS_PAGE_SELECTORS.filter(config => config.required);
}

/**
 * Generate validation report for missing test IDs
 */
export function generateValidationReport(results: TestIdValidationResult[]): {
  summary: string;
  missingTestIds: string[];
  usingFallbacks: string[];
  recommendations: string[];
} {
  const missingTestIds = results
    .filter(r => !r.testIdFound)
    .map(r => r.elementName);
    
  const usingFallbacks = results
    .filter(r => r.fallbackUsed)
    .map(r => `${r.elementName} (${r.fallbackType})`);

  const totalElements = results.length;
  const withTestIds = results.filter(r => r.testIdFound).length;
  const withFallbacks = results.filter(r => r.fallbackUsed).length;

  const recommendations: string[] = [];
  
  if (missingTestIds.length > 0) {
    recommendations.push(
      `Add test IDs to components: ${missingTestIds.join(', ')}`
    );
  }
  
  if (withFallbacks > totalElements * 0.3) {
    recommendations.push(
      'Consider adding more test IDs as >30% of elements use fallbacks'
    );
  }
  
  if (withTestIds === totalElements) {
    recommendations.push('✅ All elements have test IDs - excellent!');
  }

  const summary = `Test ID Coverage: ${withTestIds}/${totalElements} (${Math.round(withTestIds/totalElements*100)}%)`;

  return {
    summary,
    missingTestIds,
    usingFallbacks,
    recommendations
  };
}