import { Page, Locator, expect } from 'playwright/test';
import { EnhancedDog } from '../fixtures/testData';
import {
  LazyImageTestResult,
  ImageLoadingBehavior,
  ValidationResult
} from './dogTestHelperTypes';
import { getTimeoutConfig } from './testHelpers';

/**
 * Comprehensive helper for testing lazy image loading behavior and performance
 */
export class LazyImageTestHelper {
  private page: Page;
  private timeouts = getTimeoutConfig();
  private imageLoadLog: Array<{ src: string; timestamp: number; loadTime: number }> = [];
  private startTime: number = Date.now();

  constructor(page: Page) {
    this.page = page;
    this.startTime = Date.now();
    this.setupImageLoadLogging();
  }

  private setupImageLoadLogging(): void {
    this.page.on('response', (response) => {
      const url = response.url();
      if (this.isImageRequest(url)) {
        this.imageLoadLog.push({
          src: url,
          timestamp: Date.now(),
          loadTime: Date.now() - this.startTime
        });
      }
    });
  }

  private isImageRequest(url: string): boolean {
    return /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(url);
  }

  /**
   * Scrolls to an image to trigger the intersection observer.
   * @param imageLocator - The Playwright locator for the LazyImage component.
   */
  async triggerIntersectionObserver(imageLocator: Locator): Promise<void> {
    await imageLocator.scrollIntoViewIfNeeded();
    // Wait for the lazy loading to trigger
    await this.page.waitForTimeout(100);
  }

  /**
   * Validates the progressive loading states of a LazyImage.
   * 1. Checks for an initial placeholder.
   * 2. Triggers lazy loading by scrolling.
   * 3. Checks for the final image to be loaded.
   * @param imageLocator - The Playwright locator for the LazyImage component.
   */
  async validateProgressiveLoading(imageLocator: Locator): Promise<void> {
    // 1. Check for initial placeholder state
    const placeholder = imageLocator.locator('[data-testid="lazy-image-placeholder"]');
    await expect(placeholder).toBeVisible();

    // 2. Trigger lazy loading
    await this.triggerIntersectionObserver(imageLocator);

    // 3. Check for final image
    const finalImage = imageLocator.locator('img');
    await expect(finalImage).toBeVisible();
    await expect(finalImage).toHaveJSProperty('complete', true);
    expect(await finalImage.getAttribute('src')).not.toContain('data:image/gif;base64'); // Ensure it's not the placeholder
  }

  /**
   * Test lazy loading behavior on dog cards
   */
  async testLazyLoadingBehavior(containerSelector = '[data-testid="dogs-grid"]'): Promise<LazyImageTestResult> {
    const startTime = Date.now();
    
    try {
      const container = this.page.locator(containerSelector);
      await expect(container).toBeVisible({ timeout: this.timeouts.ui.element });

      // Get all images in the container
      const images = container.locator('img');
      const imageCount = await images.count();

      if (imageCount === 0) {
        return {
          totalImages: 0,
          lazyImages: 0,
          eagerImages: 0,
          loadingBehavior: 'none',
          performanceMetrics: {
            totalTestTime: Date.now() - startTime,
            averageLoadTime: 0,
            imagesInViewport: 0,
            imagesBelowFold: 0
          },
          passed: false,
          message: 'No images found to test lazy loading'
        };
      }

      let lazyImages = 0;
      let eagerImages = 0;
      let imagesInViewport = 0;
      let imagesBelowFold = 0;

      // Analyze each image's loading behavior
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        
        // Check loading attribute
        const loadingAttr = await img.getAttribute('loading');
        if (loadingAttr === 'lazy') {
          lazyImages++;
        } else {
          eagerImages++;
        }

        // Check if image is in viewport
        const isInViewport = await this.isImageInViewport(img);
        if (isInViewport) {
          imagesInViewport++;
        } else {
          imagesBelowFold++;
        }
      }

      // Determine loading behavior
      let loadingBehavior: ImageLoadingBehavior = 'mixed';
      if (lazyImages === imageCount) {
        loadingBehavior = 'full-lazy';
      } else if (eagerImages === imageCount) {
        loadingBehavior = 'eager';
      } else if (imagesInViewport > 0 && imagesBelowFold > 0) {
        loadingBehavior = 'viewport-optimized';
      }

      // Calculate performance metrics
      const averageLoadTime = this.imageLoadLog.length > 0 
        ? this.imageLoadLog.reduce((sum, log) => sum + log.loadTime, 0) / this.imageLoadLog.length
        : 0;

      const totalTestTime = Date.now() - startTime;

      // Determine if behavior is optimal
      const isOptimalBehavior = (
        loadingBehavior === 'viewport-optimized' || 
        (loadingBehavior === 'full-lazy' && imageCount > 10)
      );

      return {
        totalImages: imageCount,
        lazyImages,
        eagerImages,
        loadingBehavior,
        performanceMetrics: {
          totalTestTime,
          averageLoadTime,
          imagesInViewport,
          imagesBelowFold
        },
        passed: isOptimalBehavior,
        message: isOptimalBehavior 
          ? 'Lazy loading behavior is optimal' 
          : `Suboptimal loading behavior: ${loadingBehavior} for ${imageCount} images`
      };

    } catch (error) {
      return {
        totalImages: 0,
        lazyImages: 0,
        eagerImages: 0,
        loadingBehavior: 'error',
        performanceMetrics: {
          totalTestTime: Date.now() - startTime,
          averageLoadTime: 0,
          imagesInViewport: 0,
          imagesBelowFold: 0
        },
        passed: false,
        message: `Error testing lazy loading: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Test image loading as user scrolls
   */
  async testScrollingImageLoad(): Promise<ValidationResult> {
    try {
      const initialImageCount = await this.getLoadedImageCount();
      
      // Scroll down to trigger lazy loading
      await this.page.evaluate(() => {
        window.scrollTo(0, window.innerHeight * 2);
      });

      // Wait for potential lazy loading
      await this.page.waitForTimeout(1000);

      const afterScrollImageCount = await this.getLoadedImageCount();

      if (afterScrollImageCount <= initialImageCount) {
        return { 
          passed: false, 
          message: 'No additional images loaded after scrolling' 
        };
      }

      return { 
        passed: true, 
        message: `${afterScrollImageCount - initialImageCount} additional images loaded after scrolling` 
      };

    } catch (error) {
      return { 
        passed: false, 
        message: `Error during scroll test: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Validates the error handling of a LazyImage component.
   * Mocks a failed image load and checks for the error state.
   * @param imageUrl - The URL of the image that should fail.
   * @param action - A function that triggers the rendering of the LazyImage.
   */
  async validateImageErrorHandling(imageUrl: string, action: () => Promise<void>): Promise<void> {
    // Mock the image URL to fail
    await this.page.route(imageUrl, route => route.abort());

    await action();

    const imageLocator = this.page.locator(`img[src="${imageUrl}"]`).locator('..'); // Get parent container
    
    await this.triggerIntersectionObserver(imageLocator);

    // Check for the error state/fallback UI
    const errorFallback = imageLocator.locator('[data-testid="lazy-image-error"]');
    await expect(errorFallback).toBeVisible();
  }

  /**
   * Test image error handling and fallbacks
   */
  async testImageErrorHandling(brokenImageUrl = 'https://broken-url.example.com/404-image.jpg'): Promise<ValidationResult> {
    try {
      // Navigate to page or ensure we're on correct page
      await this.page.goto('/dogs', { waitUntil: 'networkidle' });

      // Mock a broken image in the test data
      await this.page.route('**/404-image.jpg', route => {
        route.abort('failed');
      });

      // Wait for page to load and handle the error
      await this.page.waitForTimeout(2000);

      // Check for fallback images or error states
      const fallbackImages = this.page.locator('img[src*="placeholder"], img[src*="fallback"], img[alt*="error"]');
      const fallbackCount = await fallbackImages.count();

      const errorStates = this.page.locator('[data-testid="image-error"], .image-error, .broken-image');
      const errorStateCount = await errorStates.count();

      if (fallbackCount === 0 && errorStateCount === 0) {
        return { 
          passed: false, 
          message: 'No fallback images or error states found for broken images' 
        };
      }

      return { 
        passed: true, 
        message: `Image error handling working: ${fallbackCount} fallbacks, ${errorStateCount} error states` 
      };

    } catch (error) {
      return { 
        passed: false, 
        message: `Error testing image error handling: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Test image loading performance under slow network conditions
   */
  async testSlowNetworkImageLoading(): Promise<ValidationResult> {
    try {
      // Simulate slow network
      await this.page.route('**/*.{jpg,jpeg,png,gif,webp}', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
        await route.continue();
      });

      const startTime = Date.now();
      await this.page.goto('/dogs', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      // Check if page is still usable during slow image loading
      const dogsGrid = this.page.locator('[data-testid="dogs-grid"]');
      await expect(dogsGrid).toBeVisible({ timeout: this.timeouts.ui.element });

      const dogCards = dogsGrid.locator('[data-testid="dog-card"]');
      const cardCount = await dogCards.count();

      if (cardCount === 0) {
        return { 
          passed: false, 
          message: 'No dog cards visible during slow image loading' 
        };
      }

      // Check for loading states or progressive enhancement
      const loadingIndicators = this.page.locator('[data-testid="image-loading"], .image-loading, .skeleton');
      const loadingIndicatorCount = await loadingIndicators.count();

      const hasProgressiveEnhancement = loadingIndicatorCount > 0 || loadTime < 10000;

      return { 
        passed: hasProgressiveEnhancement, 
        message: hasProgressiveEnhancement 
          ? `Good performance under slow network: ${cardCount} cards visible, ${loadingIndicatorCount} loading states`
          : `Poor performance under slow network: ${loadTime}ms load time`
      };

    } catch (error) {
      return { 
        passed: false, 
        message: `Error testing slow network performance: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Test intersection observer based lazy loading
   */
  async testIntersectionObserverLazyLoading(): Promise<ValidationResult> {
    try {
      // Check if page uses Intersection Observer API
      const hasIntersectionObserver = await this.page.evaluate(() => {
        return 'IntersectionObserver' in window;
      });

      if (!hasIntersectionObserver) {
        return { 
          passed: false, 
          message: 'IntersectionObserver API not available' 
        };
      }

      // Monitor intersection observer usage
      let observerCallCount = 0;
      await this.page.addInitScript(() => {
        const originalObserver = window.IntersectionObserver;
        window.IntersectionObserver = class extends originalObserver {
          constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
            super(callback, options);
            const win = window as Window & { observerCallCount?: number };
            win.observerCallCount = (win.observerCallCount || 0) + 1;
          }
        };
      });

      await this.page.goto('/dogs', { waitUntil: 'networkidle' });

      observerCallCount = await this.page.evaluate(() => {
        const win = window as Window & { observerCallCount?: number };
        return win.observerCallCount || 0;
      });

      if (observerCallCount === 0) {
        return { 
          passed: false, 
          message: 'No IntersectionObserver instances created for lazy loading' 
        };
      }

      return { 
        passed: true, 
        message: `IntersectionObserver-based lazy loading detected: ${observerCallCount} observers` 
      };

    } catch (error) {
      return { 
        passed: false, 
        message: `Error testing IntersectionObserver: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Validate specific image loading attributes
   */
  async validateImageAttributes(imageSelector?: string): Promise<ValidationResult> {
    try {
      const images = imageSelector 
        ? this.page.locator(imageSelector)
        : this.page.locator('[data-testid="dog-card"] img');
      
      const imageCount = await images.count();
      if (imageCount === 0) {
        return { 
          passed: false, 
          message: 'No images found to validate' 
        };
      }

      let issuesFound: string[] = [];

      for (let i = 0; i < Math.min(imageCount, 10); i++) {
        const img = images.nth(i);
        
        // Check required attributes
        const src = await img.getAttribute('src');
        const alt = await img.getAttribute('alt');
        const loading = await img.getAttribute('loading');

        if (!src) {
          issuesFound.push(`Image ${i + 1}: Missing src attribute`);
        }
        if (!alt) {
          issuesFound.push(`Image ${i + 1}: Missing alt attribute`);
        }
        if (!loading && i > 2) { // First few images can be eager
          issuesFound.push(`Image ${i + 1}: Missing loading attribute`);
        }

        // Check for modern image formats
        if (src && !src.includes('.webp') && !src.includes('format=webp')) {
          // This is informational, not a failure
        }
      }

      if (issuesFound.length > 0) {
        return { 
          passed: false, 
          message: `Image attribute issues: ${issuesFound.join(', ')}` 
        };
      }

      return { 
        passed: true, 
        message: `All ${imageCount} images have proper attributes` 
      };

    } catch (error) {
      return { 
        passed: false, 
        message: `Error validating image attributes: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private async isImageInViewport(imageElement: Locator): Promise<boolean> {
    try {
      const boundingBox = await imageElement.boundingBox();
      if (!boundingBox) return false;

      const viewportSize = this.page.viewportSize();
      if (!viewportSize) return false;

      return (
        boundingBox.y < viewportSize.height &&
        boundingBox.y + boundingBox.height > 0
      );
    } catch {
      return false;
    }
  }

  private async getLoadedImageCount(): Promise<number> {
    return await this.page.evaluate(() => {
      const images = document.querySelectorAll('img');
      let loadedCount = 0;
      
      images.forEach(img => {
        if (img.complete && img.naturalWidth > 0) {
          loadedCount++;
        }
      });
      
      return loadedCount;
    });
  }

  /**
   * Get image loading statistics for analysis
   */
  getImageLoadingStats(): Array<{ src: string; timestamp: number; loadTime: number }> {
    return [...this.imageLoadLog];
  }

  /**
   * Clear image loading log
   */
  clearImageLoadingLog(): void {
    this.imageLoadLog = [];
  }

  /**
   * Take screenshot for debugging image issues
   */
  async takeImageDebugScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ 
      path: `test-results/debug-screenshots/image-${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }
}
