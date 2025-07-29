import { Page, Locator, expect } from 'playwright/test';
import { MobileTestHelpers } from './mobileTestHelpers';

export interface CarouselTestResult {
  canSwipeLeft: boolean;
  canSwipeRight: boolean;
  indicatorsWork: boolean;
  hasProperAnimation: boolean;
  touchTargetsValid: boolean;
}

export interface FilterDrawerTestResult {
  opensCorrectly: boolean;
  closesCorrectly: boolean;
  hasProperSlideAnimation: boolean;
  scrollsCorrectly: boolean;
  touchTargetsValid: boolean;
  filtersWork: boolean;
}

export interface StickyBarTestResult {
  isPositionedCorrectly: boolean;
  buttonResponsive: boolean;
  touchTargetValid: boolean;
  hasProperFeedback: boolean;
  handlesExternalLinks: boolean;
}

export interface MobileNavigationTestResult {
  menuToggles: boolean;
  linksWork: boolean;
  closesAfterNavigation: boolean;
  touchTargetsValid: boolean;
  hasProperAnimation: boolean;
  accessibilityValid: boolean;
}

export class TouchInteractionHelpers {
  private mobileHelpers: MobileTestHelpers;

  constructor(private page: Page) {
    this.mobileHelpers = new MobileTestHelpers(page);
  }

  /**
   * Test MobileCarousel swipe navigation and touch interactions
   */
  async testCarouselSwipeNavigation(carouselSelector: string = '[data-testid="mobile-carousel"]'): Promise<CarouselTestResult> {
    const carousel = this.page.locator(carouselSelector);
    await expect(carousel).toBeVisible();

    const result: CarouselTestResult = {
      canSwipeLeft: false,
      canSwipeRight: false,
      indicatorsWork: false,
      hasProperAnimation: false,
      touchTargetsValid: false
    };

    try {
      // Test swipe right navigation
      const initialPosition = await this.getCarouselPosition(carousel);
      await this.mobileHelpers.performSwipeGesture(carousel, 'right');
      await this.page.waitForTimeout(500);
      const afterRightSwipe = await this.getCarouselPosition(carousel);
      result.canSwipeRight = afterRightSwipe !== initialPosition;

      // Test swipe left navigation
      await this.mobileHelpers.performSwipeGesture(carousel, 'left');
      await this.page.waitForTimeout(500);
      const afterLeftSwipe = await this.getCarouselPosition(carousel);
      result.canSwipeLeft = afterLeftSwipe !== afterRightSwipe;

      // Test scroll indicators
      const indicators = carousel.locator('[data-testid="carousel-indicator"]');
      if (await indicators.count() > 0) {
        const firstIndicator = indicators.first();
        await firstIndicator.tap();
        await this.page.waitForTimeout(300);
        result.indicatorsWork = true;
      }

      // Test animation smoothness
      result.hasProperAnimation = await this.validateCarouselAnimation(carousel);

      // Validate touch targets
      result.touchTargetsValid = await this.validateCarouselTouchTargets(carousel);

    } catch (error) {
      console.error('Error testing carousel:', error);
    }

    return result;
  }

  /**
   * Test carousel scroll indicators and tap-to-navigate
   */
  async testCarouselScrollIndicators(carouselSelector: string = '[data-testid="mobile-carousel"]'): Promise<boolean> {
    const carousel = this.page.locator(carouselSelector);
    const indicators = carousel.locator('[data-testid="carousel-indicator"]');

    const indicatorCount = await indicators.count();
    if (indicatorCount === 0) return false;

    try {
      // Test each indicator
      for (let i = 0; i < Math.min(indicatorCount, 3); i++) {
        const indicator = indicators.nth(i);
        await indicator.tap();
        await this.page.waitForTimeout(300);

        // Verify indicator becomes active
        const isActive = await indicator.getAttribute('data-active') === 'true' ||
                        await indicator.evaluate(el => el.classList.contains('active'));
        if (!isActive) return false;
      }

      return true;
    } catch (error) {
      console.error('Error testing carousel indicators:', error);
      return false;
    }
  }

  /**
   * Test carousel touch feedback and animation
   */
  async testCarouselTouchFeedback(carouselSelector: string = '[data-testid="mobile-carousel"]'): Promise<boolean> {
    const carousel = this.page.locator(carouselSelector);

    try {
      // Test touch feedback during swipe
      await this.mobileHelpers.performTouchAndHold(carousel, 100);

      // Check for visual feedback (transform, scale, etc.)
      const hasFeedback = await carousel.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.transform !== 'none' || style.scale !== 'none' || style.opacity !== '1';
      });

      return hasFeedback;
    } catch (error) {
      console.error('Error testing carousel touch feedback:', error);
      return false;
    }
  }

  /**
   * Test MobileFilterDrawer slide animation and interactions
   */
  async testFilterDrawerSlideAnimation(drawerSelector: string = '[data-testid="mobile-filter-drawer"]'): Promise<FilterDrawerTestResult> {
    const drawer = this.page.locator(drawerSelector);
    const drawerButton = this.page.locator('[data-testid="mobile-filter-button"]');

    const result: FilterDrawerTestResult = {
      opensCorrectly: false,
      closesCorrectly: false,
      hasProperSlideAnimation: false,
      scrollsCorrectly: false,
      touchTargetsValid: false,
      filtersWork: false
    };

    try {
      // Test drawer opening
      await drawerButton.tap();
      await this.page.waitForTimeout(500);
      result.opensCorrectly = await drawer.isVisible();

      if (result.opensCorrectly) {
        // Test slide animation
        result.hasProperSlideAnimation = await this.validateDrawerSlideAnimation(drawer);

        // Test scrolling within drawer
        result.scrollsCorrectly = await this.testDrawerScrolling(drawer);

        // Test touch targets within drawer
        result.touchTargetsValid = await this.validateDrawerTouchTargets(drawer);

        // Test filter functionality
        result.filtersWork = await this.testFilterFunctionality(drawer);

        // Test drawer closing
        const backdrop = this.page.locator('[data-testid="filter-drawer-backdrop"]');
        if (await backdrop.isVisible()) {
          await backdrop.tap();
          await this.page.waitForTimeout(500);
          result.closesCorrectly = await drawer.isHidden();
        } else {
          // Try ESC key
          await this.page.keyboard.press('Escape');
          await this.page.waitForTimeout(500);
          result.closesCorrectly = await drawer.isHidden();
        }
      }

    } catch (error) {
      console.error('Error testing filter drawer:', error);
    }

    return result;
  }

  /**
   * Test filter drawer touch targets
   */
  async testFilterDrawerTouchTargets(drawerSelector: string = '[data-testid="mobile-filter-drawer"]'): Promise<boolean> {
    const drawer = this.page.locator(drawerSelector);

    try {
      const touchTargets = drawer.locator('button, [role="button"], input, select, a');
      const count = await touchTargets.count();

      for (let i = 0; i < Math.min(count, 10); i++) {
        const target = touchTargets.nth(i);
        const isValid = await this.mobileHelpers.validateTouchTargetSize(target);
        if (!isValid) return false;
      }

      return true;
    } catch (error) {
      console.error('Error testing filter drawer touch targets:', error);
      return false;
    }
  }

  /**
   * Test filter drawer scrolling
   */
  async testFilterDrawerScrolling(drawerSelector: string = '[data-testid="mobile-filter-drawer"]'): Promise<boolean> {
    const drawer = this.page.locator(drawerSelector);

    try {
      const scrollContainer = drawer.locator('.overflow-y-auto, .overflow-auto').first();

      if (await scrollContainer.count() === 0) {
        return true; // No scrollable content, that's fine
      }

      const initialScrollTop = await scrollContainer.evaluate(el => el.scrollTop);
      await this.mobileHelpers.performSwipeGesture(scrollContainer, 'up');
      await this.page.waitForTimeout(300);
      const newScrollTop = await scrollContainer.evaluate(el => el.scrollTop);

      return newScrollTop !== initialScrollTop;
    } catch (error) {
      console.error('Error testing filter drawer scrolling:', error);
      return false;
    }
  }

  /**
   * Test MobileStickyBar touch targets and interactions
   */
  async testStickyBarTouchTargets(stickyBarSelector: string = '[data-testid="mobile-sticky-bar"]'): Promise<StickyBarTestResult> {
    const stickyBar = this.page.locator(stickyBarSelector);

    const result: StickyBarTestResult = {
      isPositionedCorrectly: false,
      buttonResponsive: false,
      touchTargetValid: false,
      hasProperFeedback: false,
      handlesExternalLinks: false
    };

    try {
      // Check if sticky bar is visible and positioned correctly
      result.isPositionedCorrectly = await this.validateStickyBarPosition(stickyBar);

      // Test adoption button
      const adoptionButton = stickyBar.locator('[data-testid="adoption-button"]');
      if (await adoptionButton.isVisible()) {
        result.touchTargetValid = await this.mobileHelpers.validateTouchTargetSize(adoptionButton);
        result.buttonResponsive = await this.testButtonResponsiveness(adoptionButton);
        result.hasProperFeedback = await this.testButtonTouchFeedback(adoptionButton);
        result.handlesExternalLinks = await this.testExternalLinkHandling(adoptionButton);
      }

    } catch (error) {
      console.error('Error testing sticky bar:', error);
    }

    return result;
  }

  /**
   * Test sticky bar button interactions
   */
  async testStickyBarButtonInteractions(stickyBarSelector: string = '[data-testid="mobile-sticky-bar"]'): Promise<boolean> {
    const stickyBar = this.page.locator(stickyBarSelector);
    const adoptionButton = stickyBar.locator('[data-testid="adoption-button"]');

    try {
      if (!(await adoptionButton.isVisible())) {
        return false;
      }

      // Test tap responsiveness
      const startTime = Date.now();
      await adoptionButton.tap();
      const responseTime = Date.now() - startTime;

      // Should respond within 300ms for good UX
      return responseTime < 300;
    } catch (error) {
      console.error('Error testing sticky bar button interactions:', error);
      return false;
    }
  }

  /**
   * Test mobile menu toggle and interactions
   */
  async testMobileMenuToggle(): Promise<MobileNavigationTestResult> {
    const result: MobileNavigationTestResult = {
      menuToggles: false,
      linksWork: false,
      closesAfterNavigation: false,
      touchTargetsValid: false,
      hasProperAnimation: false,
      accessibilityValid: false
    };

    try {
      const menuButton = this.page.locator('[data-testid="mobile-menu-button"]');
      const mobileMenu = this.page.locator('[data-testid="mobile-menu"]');

      // Test menu opening
      await menuButton.tap();
      await this.page.waitForTimeout(500);
      result.menuToggles = await mobileMenu.isVisible();

      if (result.menuToggles) {
        // Test menu animation
        result.hasProperAnimation = await this.validateMenuAnimation(mobileMenu);

        // Test touch targets
        result.touchTargetsValid = await this.validateMenuTouchTargets(mobileMenu);

        // Test accessibility
        result.accessibilityValid = await this.validateMenuAccessibility(mobileMenu);

        // Test navigation links
        const navLinks = mobileMenu.locator('a[href]');
        if (await navLinks.count() > 0) {
          const firstLink = navLinks.first();
          await firstLink.tap();
          await this.page.waitForTimeout(500);
          result.linksWork = true;
          result.closesAfterNavigation = await mobileMenu.isHidden();
        }
      }

    } catch (error) {
      console.error('Error testing mobile menu:', error);
    }

    return result;
  }

  /**
   * Test mobile menu touch interactions
   */
  async testMobileMenuTouchInteractions(): Promise<boolean> {
    const mobileMenu = this.page.locator('[data-testid="mobile-menu"]');

    try {
      if (!(await mobileMenu.isVisible())) {
        return false;
      }

      // Test backdrop close
      const backdrop = this.page.locator('[data-testid="mobile-menu-backdrop"]');
      if (await backdrop.isVisible()) {
        await backdrop.tap();
        await this.page.waitForTimeout(300);
        return await mobileMenu.isHidden();
      }

      return true;
    } catch (error) {
      console.error('Error testing mobile menu touch interactions:', error);
      return false;
    }
  }

  /**
   * Test mobile navigation accessibility
   */
  async testMobileNavigationAccessibility(): Promise<boolean> {
    const menuButton = this.page.locator('[data-testid="mobile-menu-button"]');
    const mobileMenu = this.page.locator('[data-testid="mobile-menu"]');

    try {
      // Test button accessibility
      const buttonAccessibility = await this.mobileHelpers.validateTouchTargetAccessibility(menuButton);
      if (!buttonAccessibility.hasAriaLabel || !buttonAccessibility.hasProperRole) {
        return false;
      }

      // Test keyboard navigation
      await menuButton.focus();
      await this.page.keyboard.press('Enter');
      await this.page.waitForTimeout(300);

      if (!(await mobileMenu.isVisible())) {
        return false;
      }

      // Test ESC key closing
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(300);

      return await mobileMenu.isHidden();
    } catch (error) {
      console.error('Error testing mobile navigation accessibility:', error);
      return false;
    }
  }

  // Private helper methods

  private async getCarouselPosition(carousel: Locator): Promise<number> {
    return await carousel.evaluate(el => {
      const transform = window.getComputedStyle(el).transform;
      if (transform === 'none') return 0;
      const matrix = transform.match(/matrix.*\((.+)\)/);
      return matrix ? parseFloat(matrix[1].split(', ')[4]) : 0;
    });
  }

  private async validateCarouselAnimation(carousel: Locator): Promise<boolean> {
    try {
      const hasTransition = await carousel.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.transition !== 'none' || style.transitionDuration !== '0s';
      });
      return hasTransition;
    } catch {
      return false;
    }
  }

  private async validateCarouselTouchTargets(carousel: Locator): Promise<boolean> {
    try {
      const indicators = carousel.locator('[data-testid="carousel-indicator"]');
      const count = await indicators.count();

      for (let i = 0; i < count; i++) {
        const indicator = indicators.nth(i);
        const isValid = await this.mobileHelpers.validateTouchTargetSize(indicator);
        if (!isValid) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private async validateDrawerSlideAnimation(drawer: Locator): Promise<boolean> {
    try {
      const hasAnimation = await drawer.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.transform !== 'none' ||
               style.transition.includes('transform') ||
               style.animation !== 'none';
      });
      return hasAnimation;
    } catch {
      return false;
    }
  }

  private async testDrawerScrolling(drawer: Locator): Promise<boolean> {
    try {
      const scrollContainer = drawer.locator('.overflow-y-auto, .overflow-auto').first();
      if (await scrollContainer.count() === 0) return true;

      const canScroll = await scrollContainer.evaluate(el => {
        return el.scrollHeight > el.clientHeight;
      });

      return canScroll;
    } catch {
      return false;
    }
  }

  private async validateDrawerTouchTargets(drawer: Locator): Promise<boolean> {
    try {
      const touchTargets = drawer.locator('button, [role="button"], input, select');
      const count = await touchTargets.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const target = touchTargets.nth(i);
        const isValid = await this.mobileHelpers.validateTouchTargetSize(target);
        if (!isValid) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private async testFilterFunctionality(drawer: Locator): Promise<boolean> {
    try {
      const filterButtons = drawer.locator('[data-testid*="filter-"], button[data-filter]');
      if (await filterButtons.count() === 0) return true;

      const firstButton = filterButtons.first();
      await firstButton.tap();
      await this.page.waitForTimeout(300);

      // Check if button becomes active
      const isActive = await firstButton.evaluate(el =>
        el.classList.contains('active') ||
        el.getAttribute('aria-pressed') === 'true' ||
        el.getAttribute('data-active') === 'true'
      );

      return isActive;
    } catch {
      return false;
    }
  }

  private async validateStickyBarPosition(stickyBar: Locator): Promise<boolean> {
    try {
      const position = await stickyBar.evaluate(el => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return {
          position: style.position,
          bottom: style.bottom,
          isAtBottom: rect.bottom >= window.innerHeight - 10 // Allow 10px tolerance
        };
      });

      return position.position === 'fixed' && position.isAtBottom;
    } catch {
      return false;
    }
  }

  private async testButtonResponsiveness(button: Locator): Promise<boolean> {
    try {
      const startTime = Date.now();
      await button.tap();
      const responseTime = Date.now() - startTime;
      return responseTime < 300;
    } catch {
      return false;
    }
  }

  private async testButtonTouchFeedback(button: Locator): Promise<boolean> {
    try {
      await this.mobileHelpers.performTouchAndHold(button, 100);

      const hasFeedback = await button.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.transform !== 'none' ||
               style.scale !== 'none' ||
               style.opacity !== '1' ||
               el.classList.contains('pressed') ||
               el.classList.contains('active');
      });

      return hasFeedback;
    } catch {
      return false;
    }
  }

  private async testExternalLinkHandling(button: Locator): Promise<boolean> {
    try {
      const href = await button.getAttribute('href');
      const target = await button.getAttribute('target');

      // External links should open in new tab/window
      if (href && href.startsWith('http')) {
        return target === '_blank';
      }

      return true; // Not an external link, that's fine
    } catch {
      return false;
    }
  }

  private async validateMenuAnimation(menu: Locator): Promise<boolean> {
    try {
      const hasAnimation = await menu.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.transition !== 'none' ||
               style.animation !== 'none' ||
               style.transform !== 'none';
      });
      return hasAnimation;
    } catch {
      return false;
    }
  }

  private async validateMenuTouchTargets(menu: Locator): Promise<boolean> {
    try {
      const links = menu.locator('a, button, [role="button"]');
      const count = await links.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const link = links.nth(i);
        const isValid = await this.mobileHelpers.validateTouchTargetSize(link);
        if (!isValid) return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private async validateMenuAccessibility(menu: Locator): Promise<boolean> {
    try {
      const hasProperRole = await menu.getAttribute('role') === 'navigation' ||
                           await menu.evaluate(el => el.tagName.toLowerCase() === 'nav');

      const hasAriaLabel = await menu.getAttribute('aria-label') !== null ||
                          await menu.getAttribute('aria-labelledby') !== null;

      return hasProperRole && hasAriaLabel;
    } catch {
      return false;
    }
  }
}

/**
 * Factory function to create TouchInteractionHelpers instance
 */
export function createTouchInteractionHelpers(page: Page): TouchInteractionHelpers {
  return new TouchInteractionHelpers(page);
}
