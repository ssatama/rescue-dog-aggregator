import { Page, Locator, expect } from 'playwright/test';
import { getTimeoutConfig } from './testHelpers';

export interface PaginationTestOptions {
  waitForData?: boolean;
  validateScrollPosition?: boolean;
  checkNetworkRequests?: boolean;
  timeout?: number;
}

export interface LoadMoreValidationOptions {
  checkButtonState?: boolean;
  checkLoadingIndicator?: boolean;
  checkErrorHandling?: boolean;
  expectedDataCount?: number;
}

export interface ScrollTestOptions {
  scrollIncrement?: number;
  scrollDelay?: number;
  maxScrollAttempts?: number;
}

/**
 * Specialized helper for testing pagination and "Load More" functionality
 */
export class PaginationTestHelper {
  private timeouts = getTimeoutConfig();

  constructor(private page: Page) {}

  // Load More Button Testing
  async testLoadMoreFunctionality(): Promise<{
    initialCount: number;
    afterLoadCount: number;
    loadedSuccessfully: boolean;
  }> {
    const loadMoreButton = this.page.getByTestId('load-more-button');
    const dogsGrid = this.page.getByTestId('dogs-grid');
    
    // Get initial count
    const initialCards = await dogsGrid.locator('[data-testid="dog-card"]').all();
    const initialCount = initialCards.length;
    
    // Click load more
    await loadMoreButton.click();
    
    // Wait for new content to load
    await this.page.waitForTimeout(1000);
    
    // Get new count
    const afterLoadCards = await dogsGrid.locator('[data-testid="dog-card"]').all();
    const afterLoadCount = afterLoadCards.length;
    
    return {
      initialCount,
      afterLoadCount,
      loadedSuccessfully: afterLoadCount > initialCount
    };
  }

  async validatePaginationLoading(): Promise<boolean> {
    const loadingIndicator = this.page.getByTestId('pagination-loading');
    const loadMoreButton = this.page.getByTestId('load-more-button');
    
    // Click load more
    await loadMoreButton.click();
    
    try {
      // Check if loading indicator appears
      await loadingIndicator.waitFor({ state: 'visible', timeout: 1000 });
      
      // Wait for loading to complete
      await loadingIndicator.waitFor({ state: 'hidden', timeout: 5000 });
      
      return true;
    } catch {
      return false;
    }
  }

  async testPaginationErrorHandling(): Promise<boolean> {
    const loadMoreButton = this.page.getByTestId('load-more-button');
    const errorMessage = this.page.getByTestId('pagination-error');
    const retryButton = this.page.getByTestId('pagination-retry');
    
    // Simulate network failure
    await this.page.route('**/api/dogs*', route => route.abort());
    
    // Click load more
    await loadMoreButton.click();
    
    try {
      // Check if error message appears
      await errorMessage.waitFor({ state: 'visible', timeout: 3000 });
      
      // Check if retry button is available
      const hasRetryButton = await retryButton.isVisible();
      
      // Restore network
      await this.page.unroute('**/api/dogs*');
      
      if (hasRetryButton) {
        await retryButton.click();
        await this.page.waitForTimeout(1000);
      }
      
      return true;
    } catch {
      // Restore network in case of error
      await this.page.unroute('**/api/dogs*');
      return false;
    }
  }

  async verifyDataAppending(): Promise<boolean> {
    const dogsGrid = this.page.getByTestId('dogs-grid');
    const loadMoreButton = this.page.getByTestId('load-more-button');
    
    // Get initial dog names
    const initialCards = await dogsGrid.locator('[data-testid="dog-card"]').all();
    const initialNames = [];
    for (const card of initialCards) {
      const nameElement = card.locator('[data-testid="dog-name"]');
      const name = await nameElement.textContent();
      if (name) initialNames.push(name.trim());
    }
    
    // Load more data
    await loadMoreButton.click();
    await this.page.waitForTimeout(1000);
    
    // Get all dog names after loading
    const allCards = await dogsGrid.locator('[data-testid="dog-card"]').all();
    const allNames = [];
    for (const card of allCards) {
      const nameElement = card.locator('[data-testid="dog-name"]');
      const name = await nameElement.textContent();
      if (name) allNames.push(name.trim());
    }
    
    // Verify that original data is preserved and new data is appended
    if (allNames.length <= initialNames.length) {
      return false;
    }
    
    // Check that initial names are still present in the same order
    for (let i = 0; i < initialNames.length; i++) {
      if (allNames[i] !== initialNames[i]) {
        return false;
      }
    }
    
    return true;
  }

  // Infinite Scroll Testing
  async testInfiniteScrollTrigger(): Promise<boolean> {
    const dogsGrid = this.page.getByTestId('dogs-grid');
    
    // Get initial count
    const initialCards = await dogsGrid.locator('[data-testid="dog-card"]').all();
    const initialCount = initialCards.length;
    
    // Scroll to bottom to trigger infinite scroll
    await this.scrollToBottom();
    
    // Wait for potential new content
    await this.page.waitForTimeout(2000);
    
    // Get new count
    const newCards = await dogsGrid.locator('[data-testid="dog-card"]').all();
    const newCount = newCards.length;
    
    return newCount > initialCount;
  }

  async scrollToBottom(): Promise<void> {
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await this.page.waitForTimeout(500);
  }

  async scrollToLoadMore(): Promise<void> {
    const loadMoreButton = this.page.getByTestId('load-more-button');
    
    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(300);
    }
  }

  async testScrollPerformance(): Promise<{
    scrollTime: number;
    loadTime: number;
  }> {
    const startTime = Date.now();
    
    // Scroll to trigger loading
    await this.scrollToBottom();
    
    const scrollTime = Date.now() - startTime;
    const loadStartTime = Date.now();
    
    // Wait for content to load
    await this.page.waitForTimeout(2000);
    
    const loadTime = Date.now() - loadStartTime;
    
    return { scrollTime, loadTime };
  }

  // Load More Button State Testing
  async isLoadMoreButtonVisible(): Promise<boolean> {
    const loadMoreButton = this.page.getByTestId('load-more-button');
    return await loadMoreButton.isVisible();
  }

  async isLoadMoreButtonEnabled(): Promise<boolean> {
    const loadMoreButton = this.page.getByTestId('load-more-button');
    return await loadMoreButton.isEnabled();
  }

  async getLoadMoreButtonText(): Promise<string> {
    const loadMoreButton = this.page.getByTestId('load-more-button');
    return await loadMoreButton.textContent() || '';
  }

  async isLoadMoreButtonLoading(): Promise<boolean> {
    const loadMoreButton = this.page.getByTestId('load-more-button');
    const loadingSpinner = loadMoreButton.locator('.spinner, .loading');
    return await loadingSpinner.isVisible();
  }

  async waitForLoadMoreButtonToEnable(): Promise<void> {
    const loadMoreButton = this.page.getByTestId('load-more-button');
    await expect(loadMoreButton).toBeEnabled({ timeout: this.timeouts.ui.loading });
  }

  async waitForLoadMoreToComplete(): Promise<void> {
    const loadingIndicator = this.page.getByTestId('pagination-loading');
    const loadMoreButton = this.page.getByTestId('load-more-button');
    
    // Wait for loading to start
    try {
      await loadingIndicator.waitFor({ state: 'visible', timeout: 1000 });
    } catch {
      // Loading might be too fast to catch
    }
    
    // Wait for loading to complete
    await loadingIndicator.waitFor({ state: 'hidden', timeout: this.timeouts.ui.loading });
    
    // Ensure button is re-enabled
    await this.waitForLoadMoreButtonToEnable();
  }

  // End of Data Testing
  async testEndOfDataBehavior(): Promise<boolean> {
    const loadMoreButton = this.page.getByTestId('load-more-button');
    const endOfDataMessage = this.page.getByTestId('end-of-data-message');
    
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts && await loadMoreButton.isVisible() && await loadMoreButton.isEnabled()) {
      await loadMoreButton.click();
      await this.waitForLoadMoreToComplete();
      attempts++;
    }
    
    // Check if we reached end of data
    const hasEndMessage = await endOfDataMessage.isVisible();
    const buttonHidden = !await loadMoreButton.isVisible();
    const buttonDisabled = await loadMoreButton.isVisible() && !await loadMoreButton.isEnabled();
    
    return hasEndMessage || buttonHidden || buttonDisabled;
  }

  async isEndOfDataReached(): Promise<boolean> {
    const endOfDataMessage = this.page.getByTestId('end-of-data-message');
    const loadMoreButton = this.page.getByTestId('load-more-button');
    
    const hasEndMessage = await endOfDataMessage.isVisible();
    const buttonVisible = await loadMoreButton.isVisible();
    const buttonEnabled = buttonVisible ? await loadMoreButton.isEnabled() : false;
    
    return hasEndMessage || !buttonVisible || !buttonEnabled;
  }

  // Data Validation
  async getCurrentDataCount(): Promise<number> {
    const dogsGrid = this.page.getByTestId('dogs-grid');
    const cards = await dogsGrid.locator('[data-testid="dog-card"]').all();
    return cards.length;
  }

  async validateDataConsistency(): Promise<boolean> {
    const dogsGrid = this.page.getByTestId('dogs-grid');
    const cards = await dogsGrid.locator('[data-testid="dog-card"]').all();
    
    const dogNames = new Set();
    
    for (const card of cards) {
      const nameElement = card.locator('[data-testid="dog-name"]');
      const name = await nameElement.textContent();
      
      if (!name) {
        return false; // Missing name
      }
      
      if (dogNames.has(name.trim())) {
        return false; // Duplicate dog
      }
      
      dogNames.add(name.trim());
    }
    
    return true;
  }

  async validateLoadedDataQuality(): Promise<{
    hasValidNames: boolean;
    hasValidImages: boolean;
    hasValidMetadata: boolean;
  }> {
    const dogsGrid = this.page.getByTestId('dogs-grid');
    const cards = await dogsGrid.locator('[data-testid="dog-card"]').all();
    
    let hasValidNames = true;
    let hasValidImages = true;
    let hasValidMetadata = true;
    
    for (const card of cards) {
      // Check name
      const nameElement = card.locator('[data-testid="dog-name"]');
      const name = await nameElement.textContent();
      if (!name || name.trim().length === 0) {
        hasValidNames = false;
      }
      
      // Check image
      const imageElement = card.locator('img');
      if (await imageElement.isVisible()) {
        const src = await imageElement.getAttribute('src');
        if (!src || src.length === 0) {
          hasValidImages = false;
        }
      }
      
      // Check metadata (breed, age, etc.)
      const breedElement = card.locator('[data-testid="dog-breed"]');
      const breed = await breedElement.textContent();
      if (!breed || breed.trim().length === 0) {
        hasValidMetadata = false;
      }
    }
    
    return { hasValidNames, hasValidImages, hasValidMetadata };
  }

  // Network Request Monitoring
  async monitorPaginationRequests(): Promise<{
    requestCount: number;
    lastRequestUrl: string;
    averageResponseTime: number;
  }> {
    const requests: { url: string; timestamp: number; responseTime?: number }[] = [];
    
    // Monitor network requests
    this.page.on('request', request => {
      if (request.url().includes('/api/dogs')) {
        requests.push({
          url: request.url(),
          timestamp: Date.now()
        });
      }
    });
    
    this.page.on('response', response => {
      if (response.url().includes('/api/dogs')) {
        const request = requests.find(req => req.url === response.url() && !req.responseTime);
        if (request) {
          request.responseTime = Date.now() - request.timestamp;
        }
      }
    });
    
    // Trigger pagination
    const loadMoreButton = this.page.getByTestId('load-more-button');
    if (await loadMoreButton.isVisible()) {
      await loadMoreButton.click();
      await this.waitForLoadMoreToComplete();
    }
    
    const completedRequests = requests.filter(req => req.responseTime);
    const averageResponseTime = completedRequests.length > 0 
      ? completedRequests.reduce((sum, req) => sum + (req.responseTime || 0), 0) / completedRequests.length
      : 0;
    
    return {
      requestCount: requests.length,
      lastRequestUrl: requests.length > 0 ? requests[requests.length - 1].url : '',
      averageResponseTime
    };
  }

  // Complete pagination test suite
  async validateCompletePaginationFunctionality(options: LoadMoreValidationOptions = {}): Promise<{
    loadMoreWorks: boolean;
    loadingStateWorks: boolean;
    errorHandlingWorks: boolean;
    dataAppendingWorks: boolean;
    dataQualityGood: boolean;
    endOfDataWorks: boolean;
  }> {
    const results = {
      loadMoreWorks: false,
      loadingStateWorks: false,
      errorHandlingWorks: false,
      dataAppendingWorks: false,
      dataQualityGood: false,
      endOfDataWorks: false
    };
    
    // Test basic load more functionality
    if (options.checkButtonState !== false) {
      const loadResult = await this.testLoadMoreFunctionality();
      results.loadMoreWorks = loadResult.loadedSuccessfully;
    }
    
    // Test loading indicator
    if (options.checkLoadingIndicator !== false) {
      results.loadingStateWorks = await this.validatePaginationLoading();
    }
    
    // Test error handling
    if (options.checkErrorHandling !== false) {
      results.errorHandlingWorks = await this.testPaginationErrorHandling();
    }
    
    // Test data appending
    results.dataAppendingWorks = await this.verifyDataAppending();
    
    // Test data quality
    const qualityResults = await this.validateLoadedDataQuality();
    results.dataQualityGood = qualityResults.hasValidNames && 
                             qualityResults.hasValidImages && 
                             qualityResults.hasValidMetadata;
    
    // Test end of data behavior
    results.endOfDataWorks = await this.testEndOfDataBehavior();
    
    return results;
  }
}

/**
 * Convenience function to create a PaginationTestHelper instance
 */
export function createPaginationTestHelper(page: Page): PaginationTestHelper {
  return new PaginationTestHelper(page);
}

/**
 * Pre-configured test scenarios for common pagination testing patterns
 */
export const paginationTestScenarios = {
  basicLoadMore: async (helper: PaginationTestHelper) => {
    return await helper.testLoadMoreFunctionality();
  },
  
  fullValidation: async (helper: PaginationTestHelper) => {
    return await helper.validateCompletePaginationFunctionality();
  },
  
  errorRecovery: async (helper: PaginationTestHelper) => {
    return await helper.testPaginationErrorHandling();
  },
  
  performanceTest: async (helper: PaginationTestHelper) => {
    const performance = await helper.testScrollPerformance();
    const networkMetrics = await helper.monitorPaginationRequests();
    return { performance, networkMetrics };
  },
  
  dataConsistency: async (helper: PaginationTestHelper) => {
    const isConsistent = await helper.validateDataConsistency();
    const quality = await helper.validateLoadedDataQuality();
    return { isConsistent, quality };
  }
};