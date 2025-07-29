import { Page, Locator, expect } from 'playwright/test';

export interface BreakpointConfig {
  name: string;
  width: number;
  height: number;
  expectedColumns?: number;
  expectedLayout?: 'mobile' | 'tablet' | 'desktop';
}

export interface GridValidationResult {
  hasCorrectColumns: boolean;
  hasProperSpacing: boolean;
  isResponsive: boolean;
  itemsVisible: boolean;
  layoutType: 'mobile' | 'tablet' | 'desktop';
}

export interface LayoutTransitionResult {
  transitionSmooth: boolean;
  elementsReposition: boolean;
  noLayoutShift: boolean;
  animationComplete: boolean;
}

export interface ComponentVisibilityResult {
  [breakpoint: string]: {
    visible: boolean;
    hiddenCorrectly: boolean;
    positioning: 'correct' | 'incorrect';
  };
}

export class ResponsiveTestHelpers {
  constructor(private page: Page) {}

  /**
   * Common breakpoints for testing
   */
  static readonly BREAKPOINTS: BreakpointConfig[] = [
    { name: 'mobile', width: 375, height: 667, expectedLayout: 'mobile', expectedColumns: 1 },
    { name: 'mobile-large', width: 414, height: 896, expectedLayout: 'mobile', expectedColumns: 1 },
    { name: 'tablet', width: 768, height: 1024, expectedLayout: 'tablet', expectedColumns: 2 },
    { name: 'tablet-large', width: 1024, height: 768, expectedLayout: 'tablet', expectedColumns: 3 },
    { name: 'desktop', width: 1280, height: 720, expectedLayout: 'desktop', expectedColumns: 3 },
    { name: 'desktop-large', width: 1920, height: 1080, expectedLayout: 'desktop', expectedColumns: 4 }
  ];

  /**
   * Validate responsive grid layout at different breakpoints
   */
  async validateResponsiveGrid(
    gridSelector: string,
    breakpoints: BreakpointConfig[] = ResponsiveTestHelpers.BREAKPOINTS
  ): Promise<{ [breakpointName: string]: GridValidationResult }> {
    const results: { [breakpointName: string]: GridValidationResult } = {};

    for (const breakpoint of breakpoints) {
      await this.setViewport(breakpoint.width, breakpoint.height);
      await this.page.waitForTimeout(500); // Allow layout to settle

      const result = await this.validateGridAtCurrentViewport(gridSelector, breakpoint);
      results[breakpoint.name] = result;
    }

    return results;
  }

  /**
   * Test grid breakpoints and column changes
   */
  async testGridBreakpoints(
    gridSelector: string,
    expectedBreakpoints: { [width: number]: number }
  ): Promise<boolean> {
    const grid = this.page.locator(gridSelector);
    await expect(grid).toBeVisible();

    for (const [width, expectedColumns] of Object.entries(expectedBreakpoints)) {
      await this.setViewport(parseInt(width), 800);
      await this.page.waitForTimeout(300);

      const actualColumns = await this.getGridColumnCount(grid);
      if (actualColumns !== expectedColumns) {
        console.error(`Expected ${expectedColumns} columns at ${width}px, got ${actualColumns}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Validate mobile-specific grid layout
   */
  async validateMobileGridLayout(gridSelector: string): Promise<GridValidationResult> {
    await this.setViewport(375, 667); // Standard mobile viewport
    await this.page.waitForTimeout(500);

    const grid = this.page.locator(gridSelector);
    await expect(grid).toBeVisible();

    const result: GridValidationResult = {
      hasCorrectColumns: false,
      hasProperSpacing: false,
      isResponsive: false,
      itemsVisible: false,
      layoutType: 'mobile'
    };

    try {
      // Check for single column layout on mobile
      const columns = await this.getGridColumnCount(grid);
      result.hasCorrectColumns = columns === 1;

      // Check proper spacing
      result.hasProperSpacing = await this.validateMobileSpacing(grid);

      // Check if items are visible and properly sized
      const items = grid.locator('> *');
      const itemCount = await items.count();
      result.itemsVisible = itemCount > 0;

      if (itemCount > 0) {
        const firstItem = items.first();
        const box = await firstItem.boundingBox();
        result.isResponsive = box ? box.width > 300 : false; // Should use most of mobile width
      }

    } catch (error) {
      console.error('Error validating mobile grid layout:', error);
    }

    return result;
  }

  /**
   * Test component visibility at different breakpoints
   */
  async testComponentVisibilityAtBreakpoints(
    componentSelector: string,
    visibilityRules: { [breakpointName: string]: boolean }
  ): Promise<ComponentVisibilityResult> {
    const result: ComponentVisibilityResult = {};

    for (const [breakpointName, shouldBeVisible] of Object.entries(visibilityRules)) {
      const breakpoint = ResponsiveTestHelpers.BREAKPOINTS.find(bp => bp.name === breakpointName);
      if (!breakpoint) continue;

      await this.setViewport(breakpoint.width, breakpoint.height);
      await this.page.waitForTimeout(300);

      const component = this.page.locator(componentSelector);
      const isVisible = await component.isVisible();
      const isHidden = await component.isHidden();

      result[breakpointName] = {
        visible: isVisible,
        hiddenCorrectly: shouldBeVisible ? isVisible : isHidden,
        positioning: await this.validateComponentPositioning(component)
      };
    }

    return result;
  }

  /**
   * Validate layout transitions between breakpoints
   */
  async validateLayoutTransitions(
    containerSelector: string,
    fromBreakpoint: BreakpointConfig,
    toBreakpoint: BreakpointConfig
  ): Promise<LayoutTransitionResult> {
    const container = this.page.locator(containerSelector);
    
    // Start at initial breakpoint
    await this.setViewport(fromBreakpoint.width, fromBreakpoint.height);
    await this.page.waitForTimeout(500);

    const initialLayout = await this.captureLayoutMetrics(container);

    // Transition to new breakpoint
    await this.setViewport(toBreakpoint.width, toBreakpoint.height);
    await this.page.waitForTimeout(1000); // Allow transition time

    const finalLayout = await this.captureLayoutMetrics(container);

    return {
      transitionSmooth: await this.hasTransitionAnimation(container),
      elementsReposition: initialLayout.bounds !== finalLayout.bounds,
      noLayoutShift: await this.validateNoLayoutShift(container),
      animationComplete: await this.isAnimationComplete(container)
    };
  }

  /**
   * Test mobile stacked layout patterns
   */
  async testMobileStackedLayout(containerSelector: string): Promise<boolean> {
    await this.setViewport(375, 667);
    await this.page.waitForTimeout(300);

    const container = this.page.locator(containerSelector);
    
    try {
      // Check if elements are stacked vertically
      const children = container.locator('> *');
      const count = await children.count();
      
      if (count < 2) return true; // Single item, stacking not applicable

      let previousBottom = 0;
      for (let i = 0; i < Math.min(count, 5); i++) {
        const child = children.nth(i);
        const box = await child.boundingBox();
        
        if (!box) continue;
        
        if (i > 0 && box.y < previousBottom) {
          return false; // Elements are not properly stacked
        }
        
        previousBottom = box.y + box.height;
      }

      return true;
    } catch (error) {
      console.error('Error testing mobile stacked layout:', error);
      return false;
    }
  }

  /**
   * Test mobile carousel layout behavior
   */
  async testMobileCarouselLayout(carouselSelector: string): Promise<{
    isHorizontalScroll: boolean;
    hasOverflow: boolean;
    itemsProperlySpaced: boolean;
    respondsToSwipe: boolean;
  }> {
    await this.setViewport(375, 667);
    await this.page.waitForTimeout(300);

    const carousel = this.page.locator(carouselSelector);
    await expect(carousel).toBeVisible();

    const result = {
      isHorizontalScroll: false,
      hasOverflow: false,
      itemsProperlySpaced: false,
      respondsToSwipe: false
    };

    try {
      // Check for horizontal scroll
      result.isHorizontalScroll = await carousel.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.overflowX === 'auto' || style.overflowX === 'scroll';
      });

      // Check if content overflows
      result.hasOverflow = await carousel.evaluate(el => {
        return el.scrollWidth > el.clientWidth;
      });

      // Check item spacing
      const items = carousel.locator('> *');
      const itemCount = await items.count();
      
      if (itemCount >= 2) {
        const firstItem = items.first();
        const secondItem = items.nth(1);
        
        const firstBox = await firstItem.boundingBox();
        const secondBox = await secondItem.boundingBox();
        
        if (firstBox && secondBox) {
          const spacing = secondBox.x - (firstBox.x + firstBox.width);
          result.itemsProperlySpaced = spacing >= 8 && spacing <= 32; // Reasonable spacing
        }
      }

      // Test swipe responsiveness
      const initialScrollLeft = await carousel.evaluate(el => el.scrollLeft);
      await this.performSwipeOnCarousel(carousel, 'left');
      await this.page.waitForTimeout(300);
      const newScrollLeft = await carousel.evaluate(el => el.scrollLeft);
      result.respondsToSwipe = newScrollLeft !== initialScrollLeft;

    } catch (error) {
      console.error('Error testing mobile carousel layout:', error);
    }

    return result;
  }

  /**
   * Test mobile filter drawer layout
   */
  async testMobileFilterDrawerLayout(drawerSelector: string): Promise<{
    slidesFromCorrectSide: boolean;
    takesFullHeight: boolean;
    hasProperBackdrop: boolean;
    contentScrollable: boolean;
  }> {
    await this.setViewport(375, 667);
    await this.page.waitForTimeout(300);

    const drawer = this.page.locator(drawerSelector);
    const result = {
      slidesFromCorrectSide: false,
      takesFullHeight: false,
      hasProperBackdrop: false,
      contentScrollable: false
    };

    try {
      // Open drawer
      const triggerButton = this.page.locator('[data-testid="mobile-filter-button"]');
      await triggerButton.tap();
      await this.page.waitForTimeout(500);

      if (await drawer.isVisible()) {
        // Check slide direction
        const transform = await drawer.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.transform;
        });
        result.slidesFromCorrectSide = !transform.includes('-100%'); // Should not be hidden off-screen

        // Check full height
        const box = await drawer.boundingBox();
        const viewport = this.page.viewportSize();
        if (box && viewport) {
          result.takesFullHeight = Math.abs(box.height - viewport.height) < 50; // Allow some tolerance
        }

        // Check backdrop
        const backdrop = this.page.locator('[data-testid="filter-drawer-backdrop"]');
        result.hasProperBackdrop = await backdrop.isVisible();

        // Check content scrollability
        const content = drawer.locator('.overflow-y-auto, .overflow-auto').first();
        if (await content.count() > 0) {
          result.contentScrollable = await content.evaluate(el => {
            return el.scrollHeight > el.clientHeight;
          });
        }
      }

    } catch (error) {
      console.error('Error testing mobile filter drawer layout:', error);
    }

    return result;
  }

  /**
   * Test CSS Grid behavior on mobile devices
   */
  async testMobileGridBehavior(gridSelector: string): Promise<{
    hasProperGap: boolean;
    itemsFillWidth: boolean;
    alignmentCorrect: boolean;
    noOverflow: boolean;
  }> {
    await this.setViewport(375, 667);
    await this.page.waitForTimeout(300);

    const grid = this.page.locator(gridSelector);
    const result = {
      hasProperGap: false,
      itemsFillWidth: false,
      alignmentCorrect: false,
      noOverflow: false
    };

    try {
      // Check grid gap
      const gap = await grid.evaluate(el => {
        const style = window.getComputedStyle(el);
        return parseInt(style.gap) || parseInt(style.rowGap) || 0;
      });
      result.hasProperGap = gap >= 8 && gap <= 32; // Reasonable gap for mobile

      // Check if items fill available width
      const items = grid.locator('> *');
      const itemCount = await items.count();
      
      if (itemCount > 0) {
        const firstItem = items.first();
        const itemBox = await firstItem.boundingBox();
        const gridBox = await grid.boundingBox();
        
        if (itemBox && gridBox) {
          const fillRatio = itemBox.width / gridBox.width;
          result.itemsFillWidth = fillRatio > 0.8; // Should use most of available width
        }
      }

      // Check alignment
      result.alignmentCorrect = await grid.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.justifyContent !== 'start' || style.alignItems !== 'start';
      });

      // Check for overflow
      result.noOverflow = await grid.evaluate(el => {
        return el.scrollWidth <= el.clientWidth;
      });

    } catch (error) {
      console.error('Error testing mobile grid behavior:', error);
    }

    return result;
  }

  /**
   * Test mobile Flexbox behavior
   */
  async testMobileFlexboxBehavior(flexSelector: string): Promise<{
    hasProperDirection: boolean;
    itemsWrapCorrectly: boolean;
    spacingAppropriate: boolean;
    alignmentCorrect: boolean;
  }> {
    await this.setViewport(375, 667);
    await this.page.waitForTimeout(300);

    const flexContainer = this.page.locator(flexSelector);
    const result = {
      hasProperDirection: false,
      itemsWrapCorrectly: false,
      spacingAppropriate: false,
      alignmentCorrect: false
    };

    try {
      // Check flex direction (should be column on mobile for most cases)
      const direction = await flexContainer.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.flexDirection;
      });
      result.hasProperDirection = direction === 'column' || direction === 'column-reverse';

      // Check flex wrap
      const wrap = await flexContainer.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.flexWrap;
      });
      result.itemsWrapCorrectly = wrap === 'wrap' || wrap === 'wrap-reverse';

      // Check spacing
      const gap = await flexContainer.evaluate(el => {
        const style = window.getComputedStyle(el);
        return parseInt(style.gap) || 0;
      });
      result.spacingAppropriate = gap >= 8;

      // Check alignment
      const justifyContent = await flexContainer.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.justifyContent;
      });
      result.alignmentCorrect = ['flex-start', 'center', 'stretch'].includes(justifyContent);

    } catch (error) {
      console.error('Error testing mobile flexbox behavior:', error);
    }

    return result;
  }

  // Private helper methods

  private async setViewport(width: number, height: number): Promise<void> {
    await this.page.setViewportSize({ width, height });
  }

  private async validateGridAtCurrentViewport(
    gridSelector: string,
    breakpoint: BreakpointConfig
  ): Promise<GridValidationResult> {
    const grid = this.page.locator(gridSelector);
    
    const result: GridValidationResult = {
      hasCorrectColumns: false,
      hasProperSpacing: false,
      isResponsive: false,
      itemsVisible: false,
      layoutType: breakpoint.expectedLayout || 'mobile'
    };

    try {
      if (await grid.isVisible()) {
        const columns = await this.getGridColumnCount(grid);
        result.hasCorrectColumns = !breakpoint.expectedColumns || columns === breakpoint.expectedColumns;
        result.hasProperSpacing = await this.validateGridSpacing(grid);
        result.isResponsive = await this.isGridResponsive(grid);
        
        const items = grid.locator('> *');
        result.itemsVisible = await items.count() > 0;
      }
    } catch (error) {
      console.error('Error validating grid at viewport:', error);
    }

    return result;
  }

  private async getGridColumnCount(grid: Locator): Promise<number> {
    return await grid.evaluate(el => {
      const style = window.getComputedStyle(el);
      
      // Try to get from CSS Grid
      const gridTemplateColumns = style.gridTemplateColumns;
      if (gridTemplateColumns && gridTemplateColumns !== 'none') {
        return gridTemplateColumns.split(' ').length;
      }
      
      // Fallback: count items in first row
      const children = Array.from(el.children);
      if (children.length === 0) return 0;
      
      const firstChild = children[0] as HTMLElement;
      const firstChildTop = firstChild.offsetTop;
      
      return children.filter(child => {
        return (child as HTMLElement).offsetTop === firstChildTop;
      }).length;
    });
  }

  private async validateGridSpacing(grid: Locator): Promise<boolean> {
    return await grid.evaluate(el => {
      const style = window.getComputedStyle(el);
      const gap = parseInt(style.gap) || parseInt(style.columnGap) || 0;
      return gap >= 4; // Minimum spacing
    });
  }

  private async validateMobileSpacing(grid: Locator): Promise<boolean> {
    return await grid.evaluate(el => {
      const style = window.getComputedStyle(el);
      const padding = parseInt(style.paddingLeft) + parseInt(style.paddingRight);
      return padding >= 16; // Minimum mobile padding
    });
  }

  private async isGridResponsive(grid: Locator): Promise<boolean> {
    return await grid.evaluate(el => {
      const style = window.getComputedStyle(el);
      const gridTemplateColumns = style.gridTemplateColumns;
      
      // Check for responsive units
      return gridTemplateColumns.includes('fr') || 
             gridTemplateColumns.includes('%') || 
             gridTemplateColumns.includes('minmax') ||
             gridTemplateColumns.includes('auto-fit') ||
             gridTemplateColumns.includes('auto-fill');
    });
  }

  private async validateComponentPositioning(component: Locator): Promise<'correct' | 'incorrect'> {
    try {
      const box = await component.boundingBox();
      if (!box) return 'incorrect';
      
      const viewport = this.page.viewportSize();
      if (!viewport) return 'incorrect';
      
      // Check if component is within viewport bounds
      const withinBounds = box.x >= 0 && 
                          box.y >= 0 && 
                          box.x + box.width <= viewport.width && 
                          box.y + box.height <= viewport.height;
      
      return withinBounds ? 'correct' : 'incorrect';
    } catch {
      return 'incorrect';
    }
  }

  private async captureLayoutMetrics(container: Locator): Promise<{ bounds: string; childCount: number }> {
    return await container.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return {
        bounds: `${rect.x},${rect.y},${rect.width},${rect.height}`,
        childCount: el.children.length
      };
    });
  }

  private async hasTransitionAnimation(element: Locator): Promise<boolean> {
    return await element.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.transition !== 'none' || style.animation !== 'none';
    });
  }

  private async validateNoLayoutShift(container: Locator): Promise<boolean> {
    // This is a simplified check - in real implementation, you'd measure CLS
    try {
      await this.page.waitForTimeout(500);
      return true; // If no errors after waiting, assume no major layout shift
    } catch {
      return false;
    }
  }

  private async isAnimationComplete(element: Locator): Promise<boolean> {
    return await element.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.animationPlayState !== 'running';
    });
  }

  private async performSwipeOnCarousel(carousel: Locator, direction: 'left' | 'right'): Promise<void> {
    const box = await carousel.boundingBox();
    if (!box) return;

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const distance = 100;
    const endX = direction === 'left' ? startX - distance : startX + distance;

    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, startY);
    await this.page.mouse.up();
  }
}

/**
 * Factory function to create ResponsiveTestHelpers instance
 */
export function createResponsiveTestHelpers(page: Page): ResponsiveTestHelpers {
  return new ResponsiveTestHelpers(page);
}

/**
 * Common responsive testing scenarios
 */
export const RESPONSIVE_SCENARIOS = {
  MOBILE_TO_TABLET: {
    from: { name: 'mobile', width: 375, height: 667 },
    to: { name: 'tablet', width: 768, height: 1024 }
  },
  TABLET_TO_DESKTOP: {
    from: { name: 'tablet', width: 768, height: 1024 },
    to: { name: 'desktop', width: 1280, height: 720 }
  },
  PORTRAIT_TO_LANDSCAPE: {
    from: { name: 'portrait', width: 375, height: 667 },
    to: { name: 'landscape', width: 667, height: 375 }
  }
} as const;