import { Locator, Page } from 'playwright/test';
import { 
  FallbackStrategy, 
  ElementSelectorConfig, 
  TestIdValidationResult,
  getCurrentFallbackStrategy,
  getSelectorConfig
} from '../config/SelectorConfig';

// =============================================================================
// SIMPLIFIED SELECTOR UTILITIES
// Test ID-first approach with configurable fallbacks
// =============================================================================

/**
 * Selector validation error
 */
export class SelectorValidationError extends Error {
  constructor(
    public elementName: string,
    public attemptedSelectors: string[],
    public strategy: FallbackStrategy
  ) {
    super(
      `Failed to find element "${elementName}" using strategy "${strategy.name}". ` +
      `Attempted selectors: ${attemptedSelectors.join(', ')}`
    );
    this.name = 'SelectorValidationError';
  }
}

/**
 * Main selector utility class
 */
export class SelectorUtils {
  private page: Page;
  private strategy: FallbackStrategy;
  private validationResults: TestIdValidationResult[] = [];

  constructor(page: Page, strategy?: FallbackStrategy) {
    this.page = page;
    this.strategy = strategy || getCurrentFallbackStrategy();
  }

  /**
   * Check if a selector exists and is actionable
   */
  private async checkSelector(selector: string): Promise<{ exists: boolean; actionable: boolean }> {
    try {
      const element = this.page.locator(selector);
      const count = await element.count();
      
      if (count === 0) {
        return { exists: false, actionable: false };
      }
      
      const firstElement = element.first();
      const isVisible = await firstElement.isVisible();
      const isEnabled = await firstElement.isEnabled().catch(() => true);
      
      return { exists: true, actionable: isVisible && isEnabled };
    } catch {
      return { exists: false, actionable: false };
    }
  }

  /**
   * Get element using test ID first approach with configurable fallbacks
   */
  async getElement(elementName: string): Promise<Locator> {
    const config = getSelectorConfig(elementName);
    
    if (!config) {
      throw new Error(`No selector configuration found for element: ${elementName}`);
    }

    const attemptedSelectors: string[] = [];
    let result: TestIdValidationResult = {
      elementName,
      testIdFound: false,
      fallbackUsed: false
    };

    // Step 1: Try test IDs first
    for (const testId of config.testIds) {
      const selector = `[data-testid="${testId}"]`;
      attemptedSelectors.push(selector);
      
      const { exists, actionable } = await this.checkSelector(selector);
      if (exists && actionable) {
        result.testIdFound = true;
        result.workingSelector = selector;
        this.validationResults.push(result);
        return this.page.locator(selector);
      }
    }

    // If test IDs required and none found, fail immediately
    if (this.strategy.requireTestIds) {
      const error = new SelectorValidationError(elementName, attemptedSelectors, this.strategy);
      result.errorMessage = error.message;
      this.validationResults.push(result);
      throw error;
    }

    // Step 2: Try semantic selectors (if enabled)
    if (this.strategy.enableSemanticFallbacks && config.semanticSelectors) {
      for (const selector of config.semanticSelectors) {
        attemptedSelectors.push(selector);
        
        const { exists, actionable } = await this.checkSelector(selector);
        if (exists && actionable) {
          result.fallbackUsed = true;
          result.fallbackType = 'semantic';
          result.workingSelector = selector;
          
          if (this.strategy.warnOnFallbacks) {
            console.warn(
              `[SelectorUtils] 🔤 Using semantic fallback for "${elementName}": ${selector}. ` +
              `Consider adding test ID: data-testid="${config.testIds[0]}"`
            );
          }
          
          this.validationResults.push(result);
          return this.page.locator(selector);
        }
      }
    }

    // Step 3: Try ARIA selectors (if enabled)
    if (this.strategy.enableAriaFallbacks && config.ariaSelectors) {
      for (const selector of config.ariaSelectors) {
        attemptedSelectors.push(selector);
        
        const { exists, actionable } = await this.checkSelector(selector);
        if (exists && actionable) {
          result.fallbackUsed = true;
          result.fallbackType = 'aria';
          result.workingSelector = selector;
          
          if (this.strategy.warnOnFallbacks) {
            console.warn(
              `[SelectorUtils] ♿ Using ARIA fallback for "${elementName}": ${selector}. ` +
              `Consider adding test ID: data-testid="${config.testIds[0]}"`
            );
          }
          
          this.validationResults.push(result);
          return this.page.locator(selector);
        }
      }
    }

    // Step 4: Try CSS selectors (if enabled)
    if (this.strategy.enableCssFallbacks && config.cssSelectors) {
      for (const selector of config.cssSelectors) {
        attemptedSelectors.push(selector);
        
        const { exists, actionable } = await this.checkSelector(selector);
        if (exists && actionable) {
          result.fallbackUsed = true;
          result.fallbackType = 'css';
          result.workingSelector = selector;
          
          if (this.strategy.warnOnFallbacks) {
            console.warn(
              `[SelectorUtils] 🎨 Using CSS fallback for "${elementName}": ${selector}. ` +
              `Consider adding test ID: data-testid="${config.testIds[0]}"`
            );
          }
          
          this.validationResults.push(result);
          return this.page.locator(selector);
        }
      }
    }

    // If nothing works, fail with helpful error
    const error = new SelectorValidationError(elementName, attemptedSelectors, this.strategy);
    result.errorMessage = error.message;
    this.validationResults.push(result);
    
    if (this.strategy.failOnMissingTestIds || config.required) {
      throw error;
    }

    // Return a locator that will fail with clear error message
    console.error(`[SelectorUtils] ❌ ${error.message}`);
    return this.page.locator(`[data-test-missing="${elementName}"]`);
  }

  /**
   * Get multiple elements of the same type
   */
  async getElements(elementName: string): Promise<Locator> {
    const config = getSelectorConfig(elementName);
    
    if (!config) {
      throw new Error(`No selector configuration found for element: ${elementName}`);
    }

    // For multiple elements, we just return the first working selector
    // without actionability check (since we want all instances)
    const attemptedSelectors: string[] = [];

    // Try test IDs first
    for (const testId of config.testIds) {
      const selector = `[data-testid="${testId}"]`;
      attemptedSelectors.push(selector);
      
      const count = await this.page.locator(selector).count();
      if (count > 0) {
        return this.page.locator(selector);
      }
    }

    // Try fallbacks if enabled
    if (this.strategy.enableSemanticFallbacks && config.semanticSelectors) {
      for (const selector of config.semanticSelectors) {
        attemptedSelectors.push(selector);
        
        const count = await this.page.locator(selector).count();
        if (count > 0) {
          if (this.strategy.warnOnFallbacks) {
            console.warn(
              `[SelectorUtils] 🔤 Using semantic fallback for multiple "${elementName}": ${selector}`
            );
          }
          return this.page.locator(selector);
        }
      }
    }

    if (this.strategy.enableAriaFallbacks && config.ariaSelectors) {
      for (const selector of config.ariaSelectors) {
        attemptedSelectors.push(selector);
        
        const count = await this.page.locator(selector).count();
        if (count > 0) {
          if (this.strategy.warnOnFallbacks) {
            console.warn(
              `[SelectorUtils] ♿ Using ARIA fallback for multiple "${elementName}": ${selector}`
            );
          }
          return this.page.locator(selector);
        }
      }
    }

    if (this.strategy.enableCssFallbacks && config.cssSelectors) {
      for (const selector of config.cssSelectors) {
        attemptedSelectors.push(selector);
        
        const count = await this.page.locator(selector).count();
        if (count > 0) {
          if (this.strategy.warnOnFallbacks) {
            console.warn(
              `[SelectorUtils] 🎨 Using CSS fallback for multiple "${elementName}": ${selector}`
            );
          }
          return this.page.locator(selector);
        }
      }
    }

    // Return empty locator if nothing found
    return this.page.locator(`[data-test-missing="${elementName}"]`);
  }

  /**
   * Validate all test IDs are present on the page
   */
  async validateAllTestIds(): Promise<TestIdValidationResult[]> {
    // Clear previous results
    this.validationResults = [];
    
    // Try to get each required element to populate validation results
    const requiredElements = getSelectorConfig('') ? 
      Object.keys(getSelectorConfig('') || {}) : [];
    
    // For now, return the accumulated results
    return this.validationResults;
  }

  /**
   * Get validation summary
   */
  getValidationSummary(): {
    total: number;
    withTestIds: number;
    withFallbacks: number;
    failed: number;
    strategy: string;
  } {
    const total = this.validationResults.length;
    const withTestIds = this.validationResults.filter(r => r.testIdFound).length;
    const withFallbacks = this.validationResults.filter(r => r.fallbackUsed).length;
    const failed = this.validationResults.filter(r => r.errorMessage).length;

    return {
      total,
      withTestIds,
      withFallbacks,
      failed,
      strategy: this.strategy.name
    };
  }

  /**
   * Log validation summary
   */
  logValidationSummary(): void {
    const summary = this.getValidationSummary();
    
    if (summary.total === 0) {
      console.log('[SelectorUtils] No elements validated yet');
      return;
    }

    const coverage = Math.round((summary.withTestIds / summary.total) * 100);
    
    console.log(`[SelectorUtils] Validation Summary (${this.strategy.name} strategy):`);
    console.log(`  Test ID Coverage: ${summary.withTestIds}/${summary.total} (${coverage}%)`);
    
    if (summary.withFallbacks > 0) {
      console.log(`  Using Fallbacks: ${summary.withFallbacks}`);
    }
    
    if (summary.failed > 0) {
      console.warn(`  Failed: ${summary.failed}`);
    }
    
    if (coverage < 70) {
      console.warn('  ⚠️  Low test ID coverage - consider adding more test IDs');
    } else if (coverage === 100) {
      console.log('  ✅ Perfect test ID coverage!');
    }
  }

  /**
   * Reset validation results
   */
  resetValidation(): void {
    this.validationResults = [];
  }

  /**
   * Change selector strategy
   */
  setStrategy(strategy: FallbackStrategy): void {
    this.strategy = strategy;
    this.resetValidation();
  }
}

/**
 * Create selector utils instance with current strategy
 */
export function createSelectorUtils(page: Page, strategy?: FallbackStrategy): SelectorUtils {
  return new SelectorUtils(page, strategy);
}