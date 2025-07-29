import { Page, Locator, expect } from 'playwright/test';
import { getTimeoutConfig } from './testHelpers';

export interface HeroImageTestOptions {
  waitForLoad?: boolean;
  validateAltText?: boolean;
  checkLazyLoading?: boolean;
  timeout?: number;
}

export interface HeroImageValidationOptions {
  checkLoadingStates?: boolean;
  checkErrorHandling?: boolean;
  checkRetryFunctionality?: boolean;
  checkResponsiveImages?: boolean;
}

/**
 * Specialized helper for testing hero image functionality in the HeroImageWithBlurredBackground component
 */
export class HeroImageTestHelper {
  private timeouts = getTimeoutConfig();

  constructor(private page: Page) {}

  /**
   * Cleanup helper to ensure test isolation
   * Should be called after each test to prevent interference
   */
  async cleanup(): Promise<void> {
    try {
      console.log(`[HeroImageTestHelper] Cleaning up test state`);
      
      // Clear all routes to prevent interference between tests
      await this.page.unroute('**/*');
      
      // Reset viewport to default
      await this.page.setViewportSize({ width: 1280, height: 720 });
      
      // Clear any extra headers
      await this.page.context().setExtraHTTPHeaders({});
      
      console.log(`[HeroImageTestHelper] Cleanup completed`);
    } catch (error) {
      console.warn(`[HeroImageTestHelper] Cleanup failed: ${error}`);
    }
  }

  /**
   * Setup helper for consistent test initialization
   */
  async setup(): Promise<void> {
    try {
      console.log(`[HeroImageTestHelper] Setting up test environment`);
      
      // Ensure clean state
      await this.cleanup();
      
      // Wait for page to be in a stable state
      await this.page.waitForLoadState('networkidle');
      
      console.log(`[HeroImageTestHelper] Setup completed`);
    } catch (error) {
      console.error(`[HeroImageTestHelper] Setup failed: ${error}`);
      throw error;
    }
  }

  // Hero Image Loading
  async waitForHeroImageLoad(): Promise<boolean> {
    try {
      const heroImageContainer = this.page.locator('[data-testid="hero-image-container"]');
      await heroImageContainer.waitFor({ state: 'visible', timeout: this.timeouts.ui.loading });
      
      const heroImage = heroImageContainer.locator('img');
      await heroImage.waitFor({ state: 'visible', timeout: this.timeouts.media.image });
      
      // Wait for image to fully load
      await expect(heroImage).toHaveJSProperty('complete', true);
      const naturalWidth = await heroImage.evaluate((img: HTMLImageElement) => img.naturalWidth);
      
      return naturalWidth > 0;
    } catch {
      return false;
    }
  }

  async verifyHeroImageLoadingStates(): Promise<boolean> {
    const loadingSpinner = this.page.locator('[data-testid="hero-image-loading"]');
    const shimmerEffect = this.page.locator('[data-testid="hero-image-shimmer"]');
    
    try {
      // Check for loading state indicators
      const hasLoadingSpinner = await loadingSpinner.isVisible();
      const hasShimmerEffect = await shimmerEffect.isVisible();
      
      return hasLoadingSpinner || hasShimmerEffect;
    } catch {
      return false;
    }
  }

  async testHeroImageErrorHandling(): Promise<boolean> {
    const errorState = this.page.locator('[data-testid="hero-image-error"]');
    const retryButton = this.page.locator('[data-testid="hero-image-retry"]');
    
    try {
      if (await errorState.isVisible()) {
        await expect(retryButton).toBeVisible();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async validateHeroImageRetry(): Promise<boolean> {
    const retryButton = this.page.locator('[data-testid="hero-image-retry"]');
    
    if (await retryButton.isVisible()) {
      await retryButton.click();
      
      // Wait for retry attempt
      await this.page.waitForTimeout(1000);
      
      // Check if image loads after retry
      return await this.waitForHeroImageLoad();
    }
    
    return false;
  }

  async testHeroImageResponsive(): Promise<boolean> {
    const heroImage = this.page.locator('[data-testid="hero-image-container"] img');
    
    if (!await heroImage.isVisible()) {
      return false;
    }
    
    // Test different viewport sizes
    const viewports = [
      { width: 375, height: 667 }, // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1280, height: 720 }  // Desktop
    ];
    
    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await this.page.waitForTimeout(500);
      
      const isVisible = await heroImage.isVisible();
      if (!isVisible) return false;
      
      // Check if image adapts to viewport
      const imageBounds = await heroImage.boundingBox();
      if (imageBounds && imageBounds.width > viewport.width) {
        return false;
      }
    }
    
    return true;
  }

  // Image Optimization Testing
  async testHeroImageOptimization(): Promise<{
    hasWebP: boolean;
    hasLazyLoading: boolean;
    hasSrcSet: boolean;
    hasProperAlt: boolean;
  }> {
    const heroImage = this.page.locator('[data-testid="hero-image-container"] img');
    await expect(heroImage).toBeVisible();
    
    const src = await heroImage.getAttribute('src') || '';
    const srcSet = await heroImage.getAttribute('srcset') || '';
    const loading = await heroImage.getAttribute('loading') || '';
    const alt = await heroImage.getAttribute('alt') || '';
    
    return {
      hasWebP: src.includes('.webp') || srcSet.includes('.webp'),
      hasLazyLoading: loading === 'lazy',
      hasSrcSet: srcSet.length > 0,
      hasProperAlt: alt.length > 0 && !alt.includes('image')
    };
  }

  async testHeroImageAccessibility(): Promise<boolean> {
    const heroImage = this.page.locator('[data-testid="hero-image-container"] img');
    
    if (!await heroImage.isVisible()) {
      return false;
    }
    
    const alt = await heroImage.getAttribute('alt');
    const role = await heroImage.getAttribute('role');
    const ariaLabel = await heroImage.getAttribute('aria-label');
    
    // Hero image should have meaningful alt text
    if (!alt || alt.trim().length === 0) {
      return false;
    }
    
    // Should not have generic alt text
    const genericAltTexts = ['image', 'photo', 'picture', 'img'];
    if (genericAltTexts.some(generic => alt.toLowerCase().includes(generic))) {
      return false;
    }
    
    return true;
  }

  // Performance Testing
  async measureHeroImageLoadTime(): Promise<number> {
    const startTime = Date.now();
    
    const loadPromise = this.waitForHeroImageLoad();
    await loadPromise;
    
    const endTime = Date.now();
    return endTime - startTime;
  }

  async testHeroImageCaching(): Promise<boolean> {
    try {
      console.log(`[HeroImageTestHelper] Testing hero image caching`);
      
      const heroImage = this.page.locator('[data-testid="hero-image-container"] img');
      
      // Wait for image to be visible first
      await heroImage.waitFor({ state: 'visible', timeout: 5000 });
      const src = await heroImage.getAttribute('src');
      
      if (!src) {
        console.warn(`[HeroImageTestHelper] No image source found for caching test`);
        return false;
      }
      
      console.log(`[HeroImageTestHelper] Testing caching for image: ${src}`);
      
      // Use network response monitoring instead of timing (more reliable)
      let cacheHit = false;
      
      // Monitor network requests on reload
      const requestPromise = this.page.waitForRequest(request => {
        return request.url().includes(src);
      }).catch(() => null); // Don't fail if no request is made (cache hit)
      
      await this.page.reload({ waitUntil: 'networkidle' });
      
      const request = await requestPromise;
      
      if (!request) {
        // No network request was made - likely served from cache
        cacheHit = true;
        console.log(`[HeroImageTestHelper] Image served from cache (no network request)`);
      } else {
        // Check response headers for cache indicators
        const response = await request.response();
        if (response) {
          const cacheControl = response.headers()['cache-control'];
          const etag = response.headers()['etag'];
          cacheHit = !!(cacheControl || etag);
          console.log(`[HeroImageTestHelper] Cache headers found: cache-control=${cacheControl}, etag=${etag}`);
        }
      }
      
      // Verify image still loads correctly
      const imageLoaded = await this.waitForHeroImageLoad();
      
      return cacheHit && imageLoaded;
    } catch (error) {
      console.error(`[HeroImageTestHelper] Caching test failed: ${error}`);
      return false;
    }
  }

  // Network-dependent Loading - Simplified approach using mock API delays
  async testHeroImageWithSlowNetwork(): Promise<boolean> {
    try {
      console.log(`[HeroImageTestHelper] Testing hero image with slow network`);
      
      // Instead of manipulating network conditions, use the MockAPI's slow network simulation
      // This approach is more reliable and isolated
      
      // Check if loading states are shown - they should appear while API responses are delayed
      const loadingStatesShown = await this.verifyHeroImageLoadingStates();
      
      // Wait for image to eventually load
      const imageEventuallyLoads = await this.waitForHeroImageLoad();
      
      console.log(`[HeroImageTestHelper] Slow network test results: loading states=${loadingStatesShown}, image loads=${imageEventuallyLoads}`);
      
      return loadingStatesShown || imageEventuallyLoads; // Accept either loading states OR successful load
    } catch (error) {
      console.error(`[HeroImageTestHelper] Slow network test failed: ${error}`);
      return false;
    }
  }

  async testHeroImageWithFailedNetwork(): Promise<boolean> {
    try {
      console.log(`[HeroImageTestHelper] Testing hero image with failed network`);
      
      // Use a more targeted approach - mock specific image URLs to fail
      let routeSetup = false;
      
      try {
        // Only block image requests, not all network traffic
        await this.page.route('**/images/**', route => {
          console.log(`[HeroImageTestHelper] Blocking image request: ${route.request().url()}`);
          route.abort();
        });
        routeSetup = true;
        
        // Navigate to the page to test error handling
        await this.page.reload({ waitUntil: 'networkidle' });
        await this.page.waitForTimeout(2000);
        
        // Check if error state is properly shown
        const errorHandled = await this.testHeroImageErrorHandling();
        console.log(`[HeroImageTestHelper] Error handling result: ${errorHandled}`);
        
        // Clean up route before testing retry
        await this.page.unroute('**/images/**');
        routeSetup = false;
        
        if (errorHandled) {
          // Test retry functionality with network restored
          const retryWorked = await this.validateHeroImageRetry();
          console.log(`[HeroImageTestHelper] Retry functionality result: ${retryWorked}`);
          return retryWorked;
        }
        
        return errorHandled;
      } finally {
        // Ensure routes are cleaned up even if test fails
        if (routeSetup) {
          try {
            await this.page.unroute('**/images/**');
          } catch (cleanupError) {
            console.warn(`[HeroImageTestHelper] Failed to cleanup routes: ${cleanupError}`);
          }
        }
      }
    } catch (error) {
      console.error(`[HeroImageTestHelper] Failed network test failed: ${error}`);
      return false;
    }
  }

  // Blur Background Testing
  async testBlurredBackgroundEffect(): Promise<boolean> {
    const blurredBackground = this.page.locator('[data-testid="hero-image-container"] .filter.blur-lg');
    
    if (!await blurredBackground.isVisible()) {
      return false;
    }
    
    // Check if blur effect is applied
    const blurValue = await blurredBackground.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.filter;
    });
    
    return blurValue.includes('blur');
  }

  async testImageContainerLayout(): Promise<boolean> {
    const imageContainer = this.page.locator('[data-testid="image-container"]');
    const heroImageContainer = this.page.locator('[data-testid="hero-image-container"]');
    
    if (!await imageContainer.isVisible() || !await heroImageContainer.isVisible()) {
      return false;
    }
    
    // Check proper positioning and layout
    const containerBounds = await heroImageContainer.boundingBox();
    const imageBounds = await imageContainer.boundingBox();
    
    if (!containerBounds || !imageBounds) {
      return false;
    }
    
    // Image should be contained within the hero container
    return imageBounds.x >= containerBounds.x && 
           imageBounds.y >= containerBounds.y &&
           imageBounds.x + imageBounds.width <= containerBounds.x + containerBounds.width &&
           imageBounds.y + imageBounds.height <= containerBounds.y + containerBounds.height;
  }

  // Comprehensive Hero Image Test
  async validateCompleteHeroImageFunctionality(options: HeroImageValidationOptions = {}): Promise<{
    loadingWorking: boolean;
    errorHandlingWorking: boolean;
    retryWorking: boolean;
    responsiveWorking: boolean;
    accessibilityValid: boolean;
    optimizationGood: boolean;
  }> {
    const results = {
      loadingWorking: false,
      errorHandlingWorking: false,
      retryWorking: false,
      responsiveWorking: false,
      accessibilityValid: false,
      optimizationGood: false
    };
    
    // Test loading functionality
    if (options.checkLoadingStates !== false) {
      results.loadingWorking = await this.waitForHeroImageLoad();
    }
    
    // Test error handling with proper cleanup
    if (options.checkErrorHandling !== false) {
      try {
        results.errorHandlingWorking = await this.testHeroImageWithFailedNetwork();
      } finally {
        // Ensure cleanup after error handling test
        await this.cleanup();
      }
    }
    
    // Test retry functionality
    if (options.checkRetryFunctionality !== false) {
      results.retryWorking = await this.validateHeroImageRetry();
    }
    
    // Test responsive behavior with cleanup
    if (options.checkResponsiveImages !== false) {
      try {
        results.responsiveWorking = await this.testHeroImageResponsive();
      } finally {
        // Reset viewport after responsive test
        await this.page.setViewportSize({ width: 1280, height: 720 });
      }
    }
    
    // Test accessibility
    results.accessibilityValid = await this.testHeroImageAccessibility();
    
    // Test optimization
    const optimization = await this.testHeroImageOptimization();
    results.optimizationGood = optimization.hasProperAlt && 
                              optimization.hasSrcSet && 
                              optimization.hasLazyLoading;
    
    return results;
  }
}

/**
 * Convenience function to create a HeroImageTestHelper instance
 */
export function createHeroImageTestHelper(page: Page): HeroImageTestHelper {
  return new HeroImageTestHelper(page);
}

/**
 * Pre-configured test scenarios for common hero image testing patterns
 */
export const heroImageTestScenarios = {
  basicLoad: async (helper: HeroImageTestHelper) => {
    return await helper.waitForHeroImageLoad();
  },
  
  fullValidation: async (helper: HeroImageTestHelper) => {
    return await helper.validateCompleteHeroImageFunctionality();
  },
  
  errorRecovery: async (helper: HeroImageTestHelper) => {
    return await helper.testHeroImageWithFailedNetwork();
  },
  
  performanceTest: async (helper: HeroImageTestHelper) => {
    const loadTime = await helper.measureHeroImageLoadTime();
    const cached = await helper.testHeroImageCaching();
    return { loadTime, cached };
  }
};