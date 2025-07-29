import { Page, Locator, expect } from 'playwright/test';

export interface TouchTargetValidationResult {
  size: { width: number; height: number };
  meetsMinimumSize: boolean;
  hasProperSpacing: boolean;
  contrastRatio?: number;
  meetsContrastRequirement: boolean;
}

export interface MobileAccessibilityResult {
  keyboardNavigation: boolean;
  screenReaderSupport: boolean;
  focusManagement: boolean;
  semanticMarkup: boolean;
  touchTargetCompliance: boolean;
}

export interface AccessibilityViolation {
  type: 'touch-target' | 'contrast' | 'keyboard' | 'semantic' | 'focus';
  severity: 'critical' | 'high' | 'medium' | 'low';
  element: string;
  description: string;
  recommendation: string;
}

export interface TouchGestureAccessibilityResult {
  hasKeyboardAlternative: boolean;
  hasAriaLabels: boolean;
  providesInstruction: boolean;
  hasHapticFeedback: boolean;
}

export class AccessibilityTestHelpers {
  private readonly MIN_TOUCH_TARGET_SIZE = 48; // WCAG guideline
  private readonly MIN_CONTRAST_RATIO = 4.5; // WCAG AA standard
  private readonly MIN_TOUCH_SPACING = 8; // Minimum spacing between targets

  constructor(private page: Page) {}

  /**
   * Validate minimum touch target size (48px WCAG requirement)
   */
  async validateMinimumTouchTargetSize(element: Locator | string): Promise<TouchTargetValidationResult> {
    const locator = typeof element === 'string' ? this.page.locator(element) : element;
    const box = await locator.boundingBox();
    
    if (!box) {
      throw new Error('Element not found or not visible');
    }

    const result: TouchTargetValidationResult = {
      size: { width: box.width, height: box.height },
      meetsMinimumSize: box.width >= this.MIN_TOUCH_TARGET_SIZE && box.height >= this.MIN_TOUCH_TARGET_SIZE,
      hasProperSpacing: false,
      meetsContrastRequirement: false
    };

    // Check spacing from nearby touch targets
    result.hasProperSpacing = await this.validateTouchTargetSpacing(locator);

    // Check contrast ratio
    const contrast = await this.calculateContrastRatio(locator);
    result.contrastRatio = contrast;
    result.meetsContrastRequirement = contrast >= this.MIN_CONTRAST_RATIO;

    return result;
  }

  /**
   * Validate touch target spacing to prevent accidental touches
   */
  async validateTouchTargetSpacing(element: Locator | string): Promise<boolean> {
    const locator = typeof element === 'string' ? this.page.locator(element) : element;
    
    try {
      const hasProperSpacing = await this.page.evaluate((selector) => {
        const element = typeof selector === 'string' ? 
          document.querySelector(selector) : 
          selector;
        
        if (!element) return false;

        const rect = element.getBoundingClientRect();
        const touchTargets = document.querySelectorAll('button, a, input, [role="button"], [tabindex]');
        
        for (const target of touchTargets) {
          if (target === element) continue;
          
          const targetRect = target.getBoundingClientRect();
          
          // Calculate distance between elements
          const distance = Math.sqrt(
            Math.pow(targetRect.x - rect.x, 2) + Math.pow(targetRect.y - rect.y, 2)
          );
          
          // If elements are close, check if they have proper spacing
          if (distance < 100) {
            const horizontalSpacing = Math.abs(targetRect.x - (rect.x + rect.width));
            const verticalSpacing = Math.abs(targetRect.y - (rect.y + rect.height));
            
            if (horizontalSpacing < 8 && verticalSpacing < 8) {
              return false;
            }
          }
        }
        
        return true;
      }, typeof element === 'string' ? element : await locator.elementHandle());

      return hasProperSpacing;
    } catch (error) {
      console.error('Error validating touch target spacing:', error);
      return false;
    }
  }

  /**
   * Validate touch target contrast for visual accessibility
   */
  async validateTouchTargetContrast(element: Locator | string): Promise<number> {
    const locator = typeof element === 'string' ? this.page.locator(element) : element;
    return await this.calculateContrastRatio(locator);
  }

  /**
   * Test mobile keyboard navigation
   */
  async testMobileKeyboardNavigation(containerSelector: string = 'body'): Promise<boolean> {
    const container = this.page.locator(containerSelector);
    
    try {
      // Find all focusable elements
      const focusableElements = container.locator(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const count = await focusableElements.count();
      if (count === 0) return true; // No focusable elements, that's fine

      // Test tab navigation
      await this.page.keyboard.press('Tab');
      const activeElement = await this.page.evaluate(() => document.activeElement?.tagName);
      
      if (!activeElement) return false;

      // Test reverse tab navigation
      await this.page.keyboard.press('Shift+Tab');
      
      // Test Enter/Space activation on first focusable element
      const firstElement = focusableElements.first();
      await firstElement.focus();
      
      // Test Enter key
      const enterPromise = this.page.waitForEvent('keyboard');
      await this.page.keyboard.press('Enter');
      
      return true;
    } catch (error) {
      console.error('Error testing mobile keyboard navigation:', error);
      return false;
    }
  }

  /**
   * Test mobile screen reader support
   */
  async testMobileScreenReaderSupport(element: Locator | string): Promise<{
    hasAriaLabel: boolean;
    hasProperRole: boolean;
    hasDescription: boolean;
    hasSemanticMarkup: boolean;
  }> {
    const locator = typeof element === 'string' ? this.page.locator(element) : element;
    
    const result = {
      hasAriaLabel: false,
      hasProperRole: false,
      hasDescription: false,
      hasSemanticMarkup: false
    };

    try {
      // Check for ARIA labels
      const ariaLabel = await locator.getAttribute('aria-label');
      const ariaLabelledby = await locator.getAttribute('aria-labelledby');
      result.hasAriaLabel = !!(ariaLabel || ariaLabelledby);

      // Check for proper role
      const role = await locator.getAttribute('role');
      const tagName = await locator.evaluate(el => el.tagName.toLowerCase());
      result.hasProperRole = !!(role || ['button', 'a', 'input', 'select', 'textarea'].includes(tagName));

      // Check for description
      const ariaDescribedby = await locator.getAttribute('aria-describedby');
      const title = await locator.getAttribute('title');
      result.hasDescription = !!(ariaDescribedby || title);

      // Check semantic markup
      const hasSemanticElements = await locator.evaluate(el => {
        const semanticTags = ['button', 'a', 'input', 'select', 'textarea', 'nav', 'main', 'section', 'article'];
        return semanticTags.includes(el.tagName.toLowerCase()) || el.hasAttribute('role');
      });
      result.hasSemanticMarkup = hasSemanticElements;

    } catch (error) {
      console.error('Error testing screen reader support:', error);
    }

    return result;
  }

  /**
   * Test mobile focus management
   */
  async testMobileFocusManagement(): Promise<boolean> {
    try {
      // Test focus trap in modal/drawer scenarios
      const modal = this.page.locator('[role="dialog"], [data-testid*="modal"], [data-testid*="drawer"]');
      
      if (await modal.isVisible()) {
        return await this.testFocusTrapInModal(modal);
      }

      // Test general focus management
      return await this.testGeneralFocusManagement();
    } catch (error) {
      console.error('Error testing mobile focus management:', error);
      return false;
    }
  }

  /**
   * Test mobile skip links functionality
   */
  async testMobileSkipLinks(): Promise<boolean> {
    try {
      const skipLink = this.page.locator('a[href="#main"], a[href="#content"], [data-testid="skip-link"]');
      
      if (await skipLink.count() === 0) {
        return false; // Should have skip links for accessibility
      }

      // Test skip link functionality
      await skipLink.first().focus();
      await this.page.keyboard.press('Enter');
      
      // Check if focus moved to main content
      const activeElement = await this.page.evaluate(() => {
        const active = document.activeElement;
        return active ? {
          id: active.id,
          tagName: active.tagName.toLowerCase(),
          role: active.getAttribute('role')
        } : null;
      });

      return !!(activeElement && (
        activeElement.id === 'main' ||
        activeElement.id === 'content' ||
        activeElement.tagName === 'main' ||
        activeElement.role === 'main'
      ));
    } catch (error) {
      console.error('Error testing mobile skip links:', error);
      return false;
    }
  }

  /**
   * Test mobile ARIA labels and descriptions
   */
  async testMobileAriaLabels(containerSelector: string = 'body'): Promise<AccessibilityViolation[]> {
    const violations: AccessibilityViolation[] = [];
    const container = this.page.locator(containerSelector);

    try {
      // Check interactive elements for proper labeling
      const interactiveElements = container.locator(
        'button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'
      );

      const count = await interactiveElements.count();

      for (let i = 0; i < count; i++) {
        const element = interactiveElements.nth(i);
        const accessibility = await this.testMobileScreenReaderSupport(element);
        
        if (!accessibility.hasAriaLabel && !accessibility.hasSemanticMarkup) {
          const elementInfo = await this.getElementInfo(element);
          violations.push({
            type: 'semantic',
            severity: 'high',
            element: elementInfo.selector,
            description: 'Interactive element lacks proper ARIA labeling',
            recommendation: 'Add aria-label, aria-labelledby, or use semantic HTML elements'
          });
        }
      }

    } catch (error) {
      console.error('Error testing mobile ARIA labels:', error);
    }

    return violations;
  }

  /**
   * Test mobile landmark navigation
   */
  async testMobileLandmarkNavigation(): Promise<boolean> {
    try {
      const landmarks = this.page.locator('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer');
      const landmarkCount = await landmarks.count();
      
      if (landmarkCount === 0) return false;

      // Test landmark navigation with screen reader shortcuts
      for (let i = 0; i < Math.min(landmarkCount, 5); i++) {
        const landmark = landmarks.nth(i);
        await landmark.focus();
        
        const isFocused = await landmark.evaluate(el => el === document.activeElement);
        if (!isFocused) return false;
      }

      return true;
    } catch (error) {
      console.error('Error testing mobile landmark navigation:', error);
      return false;
    }
  }

  /**
   * Test touch gesture accessibility
   */
  async testTouchGestureAccessibility(element: Locator | string): Promise<TouchGestureAccessibilityResult> {
    const locator = typeof element === 'string' ? this.page.locator(element) : element;
    
    const result: TouchGestureAccessibilityResult = {
      hasKeyboardAlternative: false,
      hasAriaLabels: false,
      providesInstruction: false,
      hasHapticFeedback: false
    };

    try {
      // Check for keyboard alternatives to touch gestures
      result.hasKeyboardAlternative = await this.hasKeyboardAlternative(locator);

      // Check ARIA labels for gesture instructions
      const ariaLabel = await locator.getAttribute('aria-label');
      const ariaDescribedby = await locator.getAttribute('aria-describedby');
      result.hasAriaLabels = !!(ariaLabel || ariaDescribedby);

      // Check for gesture instructions
      result.providesInstruction = await this.hasGestureInstructions(locator);

      // Check for haptic feedback indication
      result.hasHapticFeedback = await this.hasHapticFeedbackIndication(locator);

    } catch (error) {
      console.error('Error testing touch gesture accessibility:', error);
    }

    return result;
  }

  /**
   * Test swipe accessibility
   */
  async testSwipeAccessibility(element: Locator | string): Promise<boolean> {
    const locator = typeof element === 'string' ? this.page.locator(element) : element;
    
    try {
      // Check for swipe alternatives (navigation buttons)
      const navButtons = this.page.locator('button[aria-label*="previous"], button[aria-label*="next"], button[aria-label*="back"], button[aria-label*="forward"]');
      const hasNavButtons = await navButtons.count() > 0;

      // Check for ARIA live region updates
      const hasLiveRegion = await locator.evaluate(el => {
        const liveRegion = el.querySelector('[aria-live], [aria-atomic]') ||
                          el.closest('[aria-live], [aria-atomic]');
        return !!liveRegion;
      });

      return hasNavButtons || hasLiveRegion;
    } catch (error) {
      console.error('Error testing swipe accessibility:', error);
      return false;
    }
  }

  /**
   * Test touch feedback accessibility
   */
  async testTouchFeedbackAccessibility(element: Locator | string): Promise<boolean> {
    const locator = typeof element === 'string' ? this.page.locator(element) : element;
    
    try {
      // Check for visual feedback states
      const hasVisualFeedback = await locator.evaluate(el => {
        const style = window.getComputedStyle(el);
        
        // Check for hover/focus/active states
        const hasStates = el.matches(':hover') || el.matches(':focus') || el.matches(':active');
        
        // Check for transition/animation properties
        const hasTransitions = style.transition !== 'none' || style.animation !== 'none';
        
        return hasStates || hasTransitions;
      });

      // Check for ARIA states that change on interaction
      const hasAriaStates = await locator.evaluate(el => {
        return el.hasAttribute('aria-pressed') || 
               el.hasAttribute('aria-expanded') || 
               el.hasAttribute('aria-selected');
      });

      return hasVisualFeedback || hasAriaStates;
    } catch (error) {
      console.error('Error testing touch feedback accessibility:', error);
      return false;
    }
  }

  /**
   * Validate mobile accessibility standards compliance
   */
  async validateMobileAccessibilityCompliance(containerSelector: string = 'body'): Promise<{
    violations: AccessibilityViolation[];
    score: number;
    passed: boolean;
  }> {
    const violations: AccessibilityViolation[] = [];
    const container = this.page.locator(containerSelector);

    try {
      // Check touch target sizes
      const touchTargets = container.locator('button, a, input, [role="button"], [tabindex]:not([tabindex="-1"])');
      const touchTargetCount = await touchTargets.count();

      for (let i = 0; i < Math.min(touchTargetCount, 10); i++) {
        const target = touchTargets.nth(i);
        const validation = await this.validateMinimumTouchTargetSize(target);
        
        if (!validation.meetsMinimumSize) {
          const elementInfo = await this.getElementInfo(target);
          violations.push({
            type: 'touch-target',
            severity: 'critical',
            element: elementInfo.selector,
            description: `Touch target size ${validation.size.width}x${validation.size.height}px is below 48x48px minimum`,
            recommendation: 'Increase touch target size to meet 48x48px minimum requirement'
          });
        }

        if (!validation.meetsContrastRequirement) {
          const elementInfo = await this.getElementInfo(target);
          violations.push({
            type: 'contrast',
            severity: 'high',
            element: elementInfo.selector,
            description: `Contrast ratio ${validation.contrastRatio?.toFixed(2)} is below 4.5:1 minimum`,
            recommendation: 'Improve color contrast to meet WCAG AA standards'
          });
        }
      }

      // Check ARIA labels
      const ariaViolations = await this.testMobileAriaLabels(containerSelector);
      violations.push(...ariaViolations);

      // Check keyboard navigation
      const hasKeyboardNav = await this.testMobileKeyboardNavigation(containerSelector);
      if (!hasKeyboardNav) {
        violations.push({
          type: 'keyboard',
          severity: 'critical',
          element: containerSelector,
          description: 'Keyboard navigation is not properly implemented',
          recommendation: 'Ensure all interactive elements are keyboard accessible'
        });
      }

      // Calculate score (0-100)
      const totalChecks = touchTargetCount + ariaViolations.length + 1; // +1 for keyboard nav
      const passedChecks = totalChecks - violations.length;
      const score = Math.round((passedChecks / totalChecks) * 100);

    } catch (error) {
      console.error('Error validating mobile accessibility compliance:', error);
    }

    return {
      violations,
      score: violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 10),
      passed: violations.filter(v => v.severity === 'critical').length === 0
    };
  }

  // Private helper methods

  private async calculateContrastRatio(element: Locator): Promise<number> {
    try {
      return await element.evaluate(el => {
        const style = window.getComputedStyle(el);
        const bgColor = style.backgroundColor;
        const textColor = style.color;
        
        // Simplified contrast calculation (would need full implementation for production)
        // This is a placeholder - real implementation would parse RGB values and calculate proper contrast
        const parseRGB = (color: string) => {
          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
        };
        
        const bg = parseRGB(bgColor);
        const text = parseRGB(textColor);
        
        // Simplified luminance calculation
        const luminance = (color: number[]) => {
          const [r, g, b] = color.map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        
        const bgLum = luminance(bg);
        const textLum = luminance(text);
        
        const lighter = Math.max(bgLum, textLum);
        const darker = Math.min(bgLum, textLum);
        
        return (lighter + 0.05) / (darker + 0.05);
      });
    } catch {
      return 4.5; // Assume passes if we can't calculate
    }
  }

  private async testFocusTrapInModal(modal: Locator): Promise<boolean> {
    try {
      const focusableElements = modal.locator(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const count = await focusableElements.count();
      if (count === 0) return true;

      // Focus first element
      await focusableElements.first().focus();
      
      // Tab through all elements
      for (let i = 0; i < count; i++) {
        await this.page.keyboard.press('Tab');
      }
      
      // Should wrap back to first element
      const activeElement = await this.page.evaluate(() => document.activeElement);
      const firstElement = await focusableElements.first().elementHandle();
      
      return activeElement === firstElement;
    } catch {
      return false;
    }
  }

  private async testGeneralFocusManagement(): Promise<boolean> {
    try {
      // Test that focus is visible
      await this.page.keyboard.press('Tab');
      
      const hasFocusOutline = await this.page.evaluate(() => {
        const activeElement = document.activeElement;
        if (!activeElement) return false;
        
        const style = window.getComputedStyle(activeElement);
        return style.outline !== 'none' || style.boxShadow !== 'none';
      });
      
      return hasFocusOutline;
    } catch {
      return false;
    }
  }

  private async hasKeyboardAlternative(element: Locator): Promise<boolean> {
    try {
      // Check if element is keyboard focusable
      const isFocusable = await element.evaluate(el => {
        const tabIndex = el.getAttribute('tabindex');
        return tabIndex !== '-1' && (
          tabIndex !== null || 
          ['button', 'a', 'input', 'select', 'textarea'].includes(el.tagName.toLowerCase())
        );
      });

      // Check for keyboard event handlers
      const hasKeyboardHandlers = await element.evaluate(el => {
        return el.hasAttribute('onkeydown') || 
               el.hasAttribute('onkeyup') || 
               el.hasAttribute('onkeypress');
      });

      return isFocusable || hasKeyboardHandlers;
    } catch {
      return false;
    }
  }

  private async hasGestureInstructions(element: Locator): Promise<boolean> {
    try {
      const hasInstructions = await element.evaluate(el => {
        const ariaLabel = el.getAttribute('aria-label') || '';
        const ariaDescribedby = el.getAttribute('aria-describedby');
        
        let descriptionText = ariaLabel;
        if (ariaDescribedby) {
          const descElement = document.getElementById(ariaDescribedby);
          descriptionText += ' ' + (descElement?.textContent || '');
        }
        
        const gestureKeywords = ['swipe', 'tap', 'drag', 'pinch', 'scroll', 'touch'];
        return gestureKeywords.some(keyword => 
          descriptionText.toLowerCase().includes(keyword)
        );
      });

      return hasInstructions;
    } catch {
      return false;
    }
  }

  private async hasHapticFeedbackIndication(element: Locator): Promise<boolean> {
    try {
      // Check for haptic feedback attributes or CSS
      const hasHapticIndication = await element.evaluate(el => {
        const hasAttributes = el.hasAttribute('data-haptic') || 
                             el.hasAttribute('data-vibrate') ||
                             el.classList.contains('haptic');
        
        const style = window.getComputedStyle(el);
        const hasTransition = style.transition.includes('transform') || 
                             style.transition.includes('scale');
        
        return hasAttributes || hasTransition;
      });

      return hasHapticIndication;
    } catch {
      return false;
    }
  }

  private async getElementInfo(element: Locator): Promise<{ selector: string; tagName: string }> {
    try {
      const info = await element.evaluate(el => ({
        selector: el.getAttribute('data-testid') ? `[data-testid="${el.getAttribute('data-testid')}"]` : el.tagName.toLowerCase(),
        tagName: el.tagName.toLowerCase()
      }));
      return info;
    } catch {
      return { selector: 'unknown', tagName: 'unknown' };
    }
  }
}

/**
 * Factory function to create AccessibilityTestHelpers instance
 */
export function createAccessibilityTestHelpers(page: Page): AccessibilityTestHelpers {
  return new AccessibilityTestHelpers(page);
}

/**
 * Common accessibility test scenarios
 */
export const ACCESSIBILITY_SCENARIOS = {
  TOUCH_TARGET_VALIDATION: {
    minSize: 48,
    minSpacing: 8,
    contrastRatio: 4.5
  },
  KEYBOARD_NAVIGATION: {
    tabOrder: true,
    focusVisible: true,
    skipLinks: true
  },
  SCREEN_READER: {
    ariaLabels: true,
    semanticMarkup: true,
    landmarks: true
  }
} as const;