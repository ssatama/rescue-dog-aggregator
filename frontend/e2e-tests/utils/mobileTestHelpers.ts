import { Page, Locator, expect } from 'playwright/test';

export interface DeviceInfo {
  name: string;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  userAgent: string;
}

export interface TouchGestureOptions {
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  duration?: number;
  steps?: number;
}

export class MobileTestHelpers {
  constructor(private page: Page) {}

  /**
   * Perform swipe gesture on the page
   */
  async performSwipeGesture(
    element: Locator | string,
    direction: 'left' | 'right' | 'up' | 'down',
    options: TouchGestureOptions = {}
  ): Promise<void> {
    const locator = typeof element === 'string' ? this.page.locator(element) : element;
    const box = await locator.boundingBox();

    if (!box) {
      throw new Error('Element not found or not visible');
    }

    const startX = options.startX ?? box.x + box.width / 2;
    const startY = options.startY ?? box.y + box.height / 2;
    const distance = 100; // Default swipe distance in pixels
    const duration = options.duration ?? 300;
    const steps = options.steps ?? 10;

    let endX = startX;
    let endY = startY;

    switch (direction) {
      case 'left':
        endX = startX - distance;
        break;
      case 'right':
        endX = startX + distance;
        break;
      case 'up':
        endY = startY - distance;
        break;
      case 'down':
        endY = startY + distance;
        break;
    }

    // Perform the swipe gesture
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();

    // Create smooth swipe motion
    const stepX = (endX - startX) / steps;
    const stepY = (endY - startY) / steps;
    const stepDelay = duration / steps;

    for (let i = 1; i <= steps; i++) {
      await this.page.mouse.move(startX + stepX * i, startY + stepY * i);
      await this.page.waitForTimeout(stepDelay);
    }

    await this.page.mouse.up();
    await this.page.waitForTimeout(100); // Wait for gesture completion
  }

  /**
   * Perform touch and hold gesture
   */
  async performTouchAndHold(
    element: Locator | string,
    duration: number = 1000
  ): Promise<void> {
    const locator = typeof element === 'string' ? this.page.locator(element) : element;
    const box = await locator.boundingBox();

    if (!box) {
      throw new Error('Element not found or not visible');
    }

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    await this.page.mouse.move(centerX, centerY);
    await this.page.mouse.down();
    await this.page.waitForTimeout(duration);
    await this.page.mouse.up();
  }

  /**
   * Perform pinch zoom gesture
   */
  async performPinchZoom(
    element: Locator | string,
    scale: number = 2,
    duration: number = 500
  ): Promise<void> {
    const locator = typeof element === 'string' ? this.page.locator(element) : element;
    const box = await locator.boundingBox();

    if (!box) {
      throw new Error('Element not found or not visible');
    }

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const distance = 50;

    // Start with fingers close together
    const finger1StartX = centerX - distance / 4;
    const finger1StartY = centerY;
    const finger2StartX = centerX + distance / 4;
    const finger2StartY = centerY;

    // End with fingers spread apart based on scale
    const finger1EndX = centerX - (distance * scale) / 2;
    const finger1EndY = centerY;
    const finger2EndX = centerX + (distance * scale) / 2;
    const finger2EndY = centerY;

    // Use touch events for more realistic pinch simulation
    await this.page.touchscreen.tap(finger1StartX, finger1StartY);
    await this.page.touchscreen.tap(finger2StartX, finger2StartY);
    await this.page.waitForTimeout(duration);
  }

  /**
   * Perform touch tap with optional coordinates
   */
  async performTouchTap(
    element: Locator | string,
    options: { x?: number; y?: number } = {}
  ): Promise<void> {
    const locator = typeof element === 'string' ? this.page.locator(element) : element;

    if (options.x !== undefined && options.y !== undefined) {
      await this.page.touchscreen.tap(options.x, options.y);
    } else {
      await locator.tap();
    }

    await this.page.waitForTimeout(100); // Wait for tap response
  }

  /**
   * Check if current viewport represents a mobile device
   */
  async isMobileDevice(): Promise<boolean> {
    const viewport = this.page.viewportSize();
    return viewport ? viewport.width < 768 : false;
  }

  /**
   * Check if current viewport represents a tablet device
   */
  async isTabletDevice(): Promise<boolean> {
    const viewport = this.page.viewportSize();
    if (!viewport) return false;
    // Include 768px width as tablet (iPad Mini) and up to 1024px
    return viewport.width >= 768 && viewport.width <= 1024;
  }

  /**
   * Get current device information
   */
  async getCurrentDeviceInfo(): Promise<DeviceInfo> {
    const viewport = this.page.viewportSize();
    const userAgent = await this.page.evaluate(() => navigator.userAgent);

    return {
      name: 'Current Device',
      viewport: viewport || { width: 0, height: 0 },
      deviceScaleFactor: await this.page.evaluate(() => window.devicePixelRatio),
      isMobile: await this.isMobileDevice(),
      hasTouch: await this.page.evaluate(() => 'ontouchstart' in window),
      userAgent
    };
  }

  /**
   * Get device orientation
   */
  async getDeviceOrientation(): Promise<'portrait' | 'landscape'> {
    const viewport = this.page.viewportSize();
    if (!viewport) return 'portrait';
    return viewport.width > viewport.height ? 'landscape' : 'portrait';
  }

  /**
   * Set viewport to specific mobile device dimensions
   */
  async setMobileViewport(
    width: number,
    height: number,
    deviceScaleFactor: number = 2
  ): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }

  /**
   * Validate touch target size meets accessibility standards (48px minimum)
   */
  async validateTouchTargetSize(element: Locator | string): Promise<boolean> {
    const locator = typeof element === 'string' ? this.page.locator(element) : element;
    const box = await locator.boundingBox();

    if (!box) {
      throw new Error('Element not found or not visible');
    }

    const minSize = 48; // WCAG guideline for minimum touch target size
    return box.width >= minSize && box.height >= minSize;
  }

  /**
   * Validate touch target accessibility features
   */
  async validateTouchTargetAccessibility(element: Locator | string): Promise<{
    hasProperSize: boolean;
    hasAriaLabel: boolean;
    hasProperRole: boolean;
    hasFocusVisible: boolean;
  }> {
    const locator = typeof element === 'string' ? this.page.locator(element) : element;

    const hasProperSize = await this.validateTouchTargetSize(locator);
    const hasAriaLabel = await locator.getAttribute('aria-label') !== null ||
                        await locator.getAttribute('aria-labelledby') !== null;
    const role = await locator.getAttribute('role');
    const tagName = await locator.evaluate((el) => el.tagName.toLowerCase());
    const hasProperRole = ['button', 'link', 'menuitem'].includes(role || '') ||
                         ['button', 'a', 'input'].includes(tagName);

    // Check if element can receive focus
    const hasFocusVisible = await locator.evaluate((el) => {
      const tabIndex = el.getAttribute('tabindex');
      return tabIndex !== '-1' && (tabIndex !== null ||
        ['button', 'a', 'input', 'select', 'textarea'].includes(el.tagName.toLowerCase()));
    });

    return {
      hasProperSize,
      hasAriaLabel,
      hasProperRole,
      hasFocusVisible
    };
  }

  /**
   * Wait for touch feedback animation to complete
   */
  async waitForTouchFeedback(duration: number = 300): Promise<void> {
    await this.page.waitForTimeout(duration);
  }

  /**
   * Wait for mobile animation to complete
   */
  async waitForMobileAnimation(selector?: string, timeout: number = 1000): Promise<void> {
    if (selector) {
      await this.page.waitForFunction(
        (sel) => {
          const element = document.querySelector(sel);
          if (!element) return true;
          const style = window.getComputedStyle(element);
          return style.animationPlayState === 'paused' || style.animationName === 'none';
        },
        selector,
        { timeout }
      );
    } else {
      await this.page.waitForTimeout(timeout);
    }
  }

  /**
   * Wait for device orientation change
   */
  async waitForDeviceOrientation(
    expectedOrientation: 'portrait' | 'landscape',
    timeout: number = 3000
  ): Promise<void> {
    await this.page.waitForFunction(
      (expected) => {
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        const current = viewport.width > viewport.height ? 'landscape' : 'portrait';
        return current === expected;
      },
      expectedOrientation,
      { timeout }
    );
  }

  /**
   * Test scroll performance on mobile
   */
  async testScrollPerformance(
    element: Locator | string,
    scrollAmount: number = 500
  ): Promise<{ duration: number; smooth: boolean }> {
    const locator = typeof element === 'string' ? this.page.locator(element) : element;
    const startTime = Date.now();

    await locator.evaluate((el, amount) => {
      el.scrollBy({ top: amount, behavior: 'smooth' });
    }, scrollAmount);

    // Wait for scroll to complete
    await this.page.waitForFunction(
      (el, amount) => Math.abs(el.scrollTop - amount) < 5,
      await locator.elementHandle(),
      scrollAmount
    );

    const duration = Date.now() - startTime;

    return {
      duration,
      smooth: duration > 200 && duration < 1000 // Reasonable range for smooth scrolling
    };
  }

  /**
   * Test mobile menu interactions
   */
  async testMobileMenuInteraction(): Promise<void> {
    const menuButton = this.page.locator('[data-testid="mobile-menu-button"]');
    const mobileMenu = this.page.locator('[data-testid="mobile-menu"]');

    // Test menu opening
    await menuButton.tap();
    await expect(mobileMenu).toBeVisible();

    // Test menu closing with backdrop tap
    const backdrop = this.page.locator('[data-testid="mobile-menu-backdrop"]');
    if (await backdrop.isVisible()) {
      await backdrop.tap();
      await expect(mobileMenu).toBeHidden();
    }
  }

  /**
   * Validate mobile responsive behavior
   */
  async validateMobileResponsiveBehavior(breakpoint: number = 768): Promise<{
    isMobileLayout: boolean;
    hasProperSpacing: boolean;
    hasReadableText: boolean;
  }> {
    const viewport = this.page.viewportSize();
    const isMobileLayout = viewport ? viewport.width <= breakpoint : false;

    // Check for proper mobile spacing
    const hasProperSpacing = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let properSpacing = true;

      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const padding = parseInt(style.paddingLeft) + parseInt(style.paddingRight);
        const margin = parseInt(style.marginLeft) + parseInt(style.marginRight);

        // Ensure minimum touch-friendly spacing
        if (el.matches('button, a, input, [role="button"]')) {
          const totalSpacing = padding + margin;
          if (totalSpacing < 8) properSpacing = false;
        }
      });

      return properSpacing;
    });

    // Check for readable text size
    const hasReadableText = await this.page.evaluate(() => {
      const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
      let readableText = true;

      textElements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const fontSize = parseInt(style.fontSize);

        // Minimum 16px for body text on mobile
        if (fontSize < 14) readableText = false;
      });

      return readableText;
    });

    return {
      isMobileLayout,
      hasProperSpacing,
      hasReadableText
    };
  }
}

/**
 * Factory function to create MobileTestHelpers instance
 */
export function createMobileTestHelpers(page: Page): MobileTestHelpers {
  return new MobileTestHelpers(page);
}

/**
 * Common mobile device configurations
 * Source: https://gist.github.com/mfehrenbach/aaf646bee2e8880b5142d92e20b633d4
 */
export const MOBILE_DEVICES = {
  iPhone15: {
    viewport: { width: 390, height: 659 },  // Source: iPhone 15 (390×659)
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  },
  samsungGalaxyS21: {
    viewport: { width: 360, height: 800 },  // Kept unchanged per request
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36'
  },
  iPadMini6th: {
    viewport: { width: 744, height: 1026 },  // Source: iPad Mini 6th (744×1026)
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  }
} as const;

/**
 * Common touch gestures
 */
export const TOUCH_GESTURES = {
  SWIPE_LEFT: { direction: 'left' as const, distance: 100 },
  SWIPE_RIGHT: { direction: 'right' as const, distance: 100 },
  SWIPE_UP: { direction: 'up' as const, distance: 100 },
  SWIPE_DOWN: { direction: 'down' as const, distance: 100 },
  LONG_PRESS: { duration: 1000 },
  DOUBLE_TAP: { interval: 300 }
} as const;
