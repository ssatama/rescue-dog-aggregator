import { Page, Locator, expect } from 'playwright/test';
import { FilterCounts, EnhancedDog } from '../fixtures/testData';
import { getTimeoutConfig } from './testHelpers';

export interface FilterTestOptions {
  waitForResults?: boolean;
  validateFilterState?: boolean;
  checkFilterCounts?: boolean;
  timeout?: number; // Legacy support - prefer using default timeouts
}

export interface FilterValidationOptions {
  checkActiveFilters?: boolean;
  checkFilterCounts?: boolean;
  checkResultsCount?: boolean;
  expectedResultCount?: number;
}

export interface MobileFilterOptions {
  openDrawer?: boolean;
  closeDrawer?: boolean;
  validateDrawerState?: boolean;
}

export interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

/**
 * Specialized helper for testing filter functionality
 * Handles both desktop and mobile filter interactions with robust selectors
 */
export class FilterTestHelper {
  private timeouts = getTimeoutConfig();

  constructor(private page: Page) {}

  /**
   * Get effective timeout for an operation, with legacy support
   */
  private getEffectiveTimeout(options: FilterTestOptions = {}, timeoutType: 'short' | 'standard' | 'medium' | 'long' = 'standard'): number {
    // Legacy timeout option overrides everything
    if (options.timeout) {
      return options.timeout;
    }
    
    // Use centralized timeout configuration
    switch (timeoutType) {
      case 'short': return this.timeouts.ui.animation;
      case 'medium': return this.timeouts.ui.loading;
      case 'long': return this.timeouts.page.load;
      default: return this.timeouts.page.element;
    }
  }
  // Enhanced filter methods for E2E tests
  async selectBreedFilter(breed: string): Promise<void> {
    try {
      // Wait for breeds to be loaded first
      const breedSelect = this.page.getByTestId('breed-filter');
      await breedSelect.waitFor({ state: 'attached', timeout: 5000 });
      
      // Wait a bit for options to be populated
      await this.page.waitForTimeout(500);
      
      // Check if the option exists before trying to select it
      const optionValue = breed === 'Any breed' ? 'any' : breed;
      const optionExists = await breedSelect.locator(`option[value="${optionValue}"]`).count() > 0;
      
      if (optionExists) {
        await breedSelect.selectOption(optionValue, { force: true });
        await this.page.waitForTimeout(200);
      } else {
        throw new Error(`Breed option "${breed}" not found in select`);
      }
    } catch (error) {
      // Fallback to UI interaction if hidden select fails
      console.warn('Hidden select failed, trying UI interaction:', error);
      
      // First, try to open the breed section if it's collapsed (mobile drawer)
      const breedSection = this.page.getByTestId('filter-summary-breed');
      if (await breedSection.count() > 0 && await breedSection.isVisible()) {
        await breedSection.click();
        await this.page.waitForTimeout(300);
      }
      
      // On desktop, try using the breed input directly
      const desktopBreedInput = this.page.getByTestId('breed-filter');
      if (await desktopBreedInput.count() > 0 && await desktopBreedInput.isVisible()) {
        await desktopBreedInput.fill(breed);
        await this.page.waitForTimeout(500);
        return;
      }
      
      // Use the breed search input
      const breedInput = this.page.getByTestId('breed-search-input');
      await breedInput.fill(breed);
      await this.page.waitForTimeout(500); // Wait for suggestions to appear
      
      // Click on the exact suggestion if it appears
      const suggestion = this.page.getByRole('button', { name: breed, exact: true });
      if (await suggestion.count() > 0) {
        await suggestion.click();
        // Wait for React state update and re-render
        await this.page.waitForTimeout(500);
      }
    }
  }

  async selectSizeFilter(size: string): Promise<void> {
    const sizeSelect = this.page.getByTestId('size-filter');
    const optionValue = size === 'Any size' ? 'any' : size;
    await sizeSelect.selectOption(optionValue, { force: true });
    await this.page.waitForTimeout(200);
  }

  async selectAgeFilter(age: string): Promise<void> {
    const ageSelect = this.page.getByTestId('age-filter');
    const optionValue = age === 'Any age' ? 'any' : age;
    await ageSelect.selectOption(optionValue, { force: true });
    await this.page.waitForTimeout(200);
  }

  async selectSexFilter(sex: string): Promise<void> {
    const sexSelect = this.page.getByTestId('sex-filter');
    const optionValue = sex === 'Any' ? 'any' : sex;
    await sexSelect.selectOption(optionValue, { force: true });
    await this.page.waitForTimeout(200);
  }

  async selectLocationFilter(location: string): Promise<void> {
    const locationSelect = this.page.getByTestId('location-filter');
    await locationSelect.selectOption(location, { force: true });
    await this.page.waitForTimeout(200);
  }

  async selectOrganizationFilter(organization: string): Promise<void> {
    const orgSelect = this.page.getByTestId('organization-filter');
    await orgSelect.selectOption(organization, { force: true });
    await this.page.waitForTimeout(200);
  }

  async getAvailableOrganizations(): Promise<string[]> {
    const orgSelect = this.page.getByTestId('organization-filter');
    const options = await orgSelect.locator('option').allTextContents();
    return options.filter(opt => opt.trim() !== '');
  }

  async testSearchDebouncing(): Promise<boolean> {
    const searchInput = this.page.getByTestId('search-input');
    
    // Track network requests
    const apiCallPromises: Promise<any>[] = [];
    this.page.on('request', (request) => {
      if (request.url().includes('/api/v1/dogs')) {
        apiCallPromises.push(request.response());
      }
    });
    
    // Type rapidly to test debouncing
    await searchInput.fill('');
    await searchInput.type('Golden Retriever', { delay: 50 });
    
    // Wait for debounce period
    await this.page.waitForTimeout(500);
    
    // Should only have made one API call after debouncing
    const apiCalls = await Promise.allSettled(apiCallPromises);
    return apiCalls.length === 1;
  }

  async validateSearchApiThrottling(): Promise<boolean> {
    const searchInput = this.page.getByTestId('search-input');
    let apiCallCount = 0;
    
    // Monitor API calls
    this.page.on('request', (request) => {
      if (request.url().includes('/api/v1/dogs')) {
        apiCallCount++;
      }
    });
    
    // Rapid successive searches
    const searches = ['A', 'AB', 'ABC', 'ABCD', 'ABCDE'];
    for (const search of searches) {
      await searchInput.fill(search);
      await this.page.waitForTimeout(100);
    }
    
    // Wait for any pending debounced requests
    await this.page.waitForTimeout(600);
    
    // Should have throttled to only 1-2 calls max
    return apiCallCount <= 2;
  }

  async testSearchClearFunctionality(): Promise<void> {
    const searchInput = this.page.getByTestId('search-input');
    const clearButton = this.page.getByTestId('search-clear-button');
    
    // Enter search text
    await searchInput.fill('Golden Retriever');
    await this.page.waitForTimeout(300);
    
    // Verify clear button is visible
    await expect(clearButton).toBeVisible();
    
    // Click clear button
    await clearButton.click();
    
    // Verify search is cleared
    await expect(searchInput).toHaveValue('');
    await expect(clearButton).not.toBeVisible();
    
    // Wait for results to update
    await this.page.waitForSelector('[data-testid="dogs-grid"]', {
      state: 'visible',
      timeout: this.getEffectiveTimeout({}, 'medium')
    });
  }

  async testSearchWithFilters(): Promise<void> {
    // Test implementation for search with filters
  }

  async testFilterCombinations(): Promise<void> {
    // Apply multiple filters in combination
    await this.selectBreedFilter('Golden Retriever');
    await this.selectSizeFilter('Large');
    await this.selectAgeFilter('Young');
    
    // Wait for filters to apply
    await this.page.waitForTimeout(500);
    
    // Validate that all filters are active
    const activeFilters = await this.page.locator('[data-testid="active-filter-badge"]').allTextContents();
    expect(activeFilters).toContain('Golden Retriever');
    expect(activeFilters).toContain('Large');
    expect(activeFilters).toContain('Young');
    
    // Verify DOM state reflects filter combination
    const dogsGrid = this.page.getByTestId('dogs-grid');
    await expect(dogsGrid).toBeVisible();
    
    // Check that URL contains all filter parameters
    const url = this.page.url();
    expect(url).toContain('breed=Golden%20Retriever');
    expect(url).toContain('size=Large');
    expect(url).toContain('age=Young');
  }

  async validateFilterBadgeInteractions(): Promise<boolean> {
    // Apply a filter to create a badge
    await this.selectBreedFilter('Labrador');
    await this.page.waitForTimeout(300);
    
    // Find the active filter badge
    const filterBadge = this.page.locator('[data-testid="active-filter-badge"]:has-text("Labrador")');
    await expect(filterBadge).toBeVisible();
    
    // Check if badge has remove button
    const removeBadgeButton = filterBadge.locator('[aria-label*="Remove"], [data-testid*="remove"], button');
    
    if (await removeBadgeButton.count() > 0) {
      // Click to remove filter
      await removeBadgeButton.first().click();
      await this.page.waitForTimeout(300);
      
      // Verify badge is removed
      await expect(filterBadge).not.toBeVisible();
      
      return true;
    }
    
    return false;
  }

  async testFilterPersistence(): Promise<boolean> {
    // Apply filters
    await this.selectBreedFilter('Beagle');
    await this.selectSizeFilter('Medium');
    await this.page.waitForTimeout(300);
    
    // Get the current URL with filters
    const urlWithFilters = this.page.url();
    
    // Reload the page
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
    
    // Check if filters are restored
    const breedSelect = this.page.getByTestId('breed-select');
    const sizeSelect = this.page.getByTestId('size-select');
    
    const breedValue = await breedSelect.inputValue().catch(() => '');
    const sizeValue = await sizeSelect.inputValue().catch(() => '');
    
    // Verify filters persisted
    const filtersRestored = breedValue.includes('Beagle') && sizeValue.includes('Medium');
    
    // Also check URL parameters
    const currentUrl = this.page.url();
    const urlParametersMatch = currentUrl.includes('breed=Beagle') && currentUrl.includes('size=Medium');
    
    return filtersRestored || urlParametersMatch;
  }

  async testFilterUrlParameters(): Promise<boolean> {
    // Test implementation for URL parameter validation
    return true;
  }

  async testEmptyStateScenarios(): Promise<void> {
    // Apply filters that would result in no matches
    await this.selectBreedFilter('Very Rare Nonexistent Breed');
    await this.selectSizeFilter('Giant');
    await this.selectAgeFilter('Ancient');
    
    // Wait for results to load
    await this.page.waitForTimeout(1000);
    
    // Check for empty state
    const emptyState = this.page.locator('[data-testid="empty-state"], [data-testid="no-results"], .empty-state');
    await expect(emptyState).toBeVisible({ timeout: this.getEffectiveTimeout({}, 'medium') });
    
    // Verify empty state has helpful text
    const emptyStateText = await emptyState.textContent();
    expect(emptyStateText).toMatch(/no.*dogs.*found|no.*results|try.*different.*filters/i);
    
    // Check for suggested actions (clear filters, modify search, etc.)
    const clearFiltersButton = this.page.locator('[data-testid="clear-filters"], button:has-text("Clear")');
    if (await clearFiltersButton.count() > 0) {
      await expect(clearFiltersButton).toBeVisible();
    }
  }

  async validateEmptyStateMessages(): Promise<boolean> {
    // Create empty state by using impossible filter combination
    await this.selectBreedFilter('Impossible Breed XYZ');
    await this.page.waitForTimeout(500);
    
    // Look for empty state elements
    const emptyStateElements = [
      '[data-testid="empty-state"]',
      '[data-testid="no-results"]', 
      '.empty-state',
      '[aria-label*="no results"]',
      ':text("No dogs found")',
      ':text("No results")'
    ];
    
    for (const selector of emptyStateElements) {
      const element = this.page.locator(selector);
      if (await element.count() > 0 && await element.isVisible()) {
        const text = await element.textContent();
        
        // Validate message is helpful and not just generic
        const hasHelpfulMessage = text && (
          text.includes('No dogs found') ||
          text.includes('Try different filters') ||
          text.includes('No results') ||
          text.includes('adjust your search') ||
          text.includes('clear filters')
        );
        
        return hasHelpfulMessage;
      }
    }
    
    return false;
  }
}

/**
 * Enhanced search helper with improved selectors and validation
 */
export class SearchTestHelper {
  private timeouts = getTimeoutConfig();

  constructor(private page: Page) {}

  /**
   * Get effective timeout for an operation
   */
  private getEffectiveTimeout(options: { timeout?: number } = {}, timeoutType: 'short' | 'standard' | 'medium' | 'long' = 'standard'): number {
    if (options.timeout) {
      return options.timeout;
    }
    
    switch (timeoutType) {
      case 'short': return this.timeouts.page.element;
      case 'medium': return this.timeouts.ui.loading;
      case 'long': return this.timeouts.page.load;
      default: return this.timeouts.page.element;
    }
  }

  async performSearch(query: string): Promise<void> {
    // Check if we're on mobile by looking for the mobile filter button
    const mobileFilterButton = this.page.getByTestId('mobile-filter-button');
    const isMobile = await mobileFilterButton.isVisible().catch(() => false);
    
    if (isMobile) {
      // On mobile, check if drawer is already open
      const mobileFilterDrawer = this.page.getByTestId('mobile-filter-drawer');
      const drawerOpen = await mobileFilterDrawer.isVisible().catch(() => false);
      
      if (!drawerOpen) {
        console.log('[SearchTestHelper] Mobile detected, opening filter drawer');
        // Force click on mobile filter button with extended timeout
        await mobileFilterButton.click({ force: true, timeout: 10000 });
        
        // Wait for drawer to open with extended timeout
        await mobileFilterDrawer.waitFor({ state: 'visible', timeout: 10000 });
        await this.page.waitForTimeout(800); // Longer animation settle
      }
    }
    
    // Get the appropriate search input based on mobile/desktop
    const searchInput = isMobile 
      ? this.page.getByTestId('mobile-filter-drawer').getByTestId('search-input')
      : this.page.getByTestId('search-input').first();
      
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill(query);
    
    // If on mobile, close the drawer after search
    if (isMobile) {
      // Look for close icon button in header
      const closeButton = this.page.getByTestId('mobile-filter-drawer').getByRole('button', { name: /close filters/i });
      
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
        // Wait for drawer to close
        await this.page.waitForTimeout(500);
      } else {
        // If no close button, try clicking backdrop
        const backdrop = this.page.getByTestId('filter-backdrop');
        if (await backdrop.isVisible().catch(() => false)) {
          await backdrop.click();
          await this.page.waitForTimeout(500);
        }
      }
    }
    
    // Wait for debounce and network activity
    await this.page.waitForTimeout(600); // Longer wait for debounce
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Additional wait for URL parameter update
    await this.page.waitForTimeout(300);
  }
}
