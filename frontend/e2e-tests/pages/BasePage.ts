import { Page, Locator, expect } from 'playwright/test';
import { getTimeoutConfig } from '../utils/testHelpers';
import { createMobileTestHelpers, MobileTestHelpers } from '../utils/mobileTestHelpers';
import { createTouchInteractionHelpers, TouchInteractionHelpers } from '../utils/touchInteractionHelpers';
import { ConsoleErrorLogger, createConsoleErrorLogger, ConsoleErrorOptions } from '../setup/console-error-logging';

export interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export interface NavigationOptions {
  waitUntil?: 'load' | 'networkidle' | 'domcontentloaded';
  timeout?: number;
}

export abstract class BasePage {
  protected readonly page: Page;
  private timeouts = getTimeoutConfig();
  protected mobileHelpers: MobileTestHelpers;
  protected touchHelpers: TouchInteractionHelpers;
  protected consoleLogger: ConsoleErrorLogger;

  constructor(page: Page, consoleErrorOptions?: ConsoleErrorOptions) {
    this.page = page;
    this.mobileHelpers = createMobileTestHelpers(page);
    this.touchHelpers = createTouchInteractionHelpers(page);
    this.consoleLogger = createConsoleErrorLogger(page, consoleErrorOptions);
  }

  // =============================================================================
  // NAVIGATION METHODS
  // =============================================================================

  async navigate(url: string, options: NavigationOptions = {}): Promise<void> {
    const { waitUntil = 'domcontentloaded', timeout = 12000 } = options; // Reduced timeout and changed to domcontentloaded
    
    try {
      await this.page.goto(url, { 
        waitUntil, 
        timeout 
      });
    } catch (error) {
      // Fallback: try with load strategy if domcontentloaded fails
      if (error.message.includes('timeout')) {
        console.log(`[BasePage] Initial navigation timeout, retrying with 'load' strategy...`);
        await this.page.goto(url, { 
          waitUntil: 'load', 
          timeout: 8000 
        });
      } else {
        throw error;
      }
    }
    
    // Wait for page to be interactive (shorter timeout)
    await this.waitForPageLoad();
    
    // Firefox-specific: Wait for lazy-loaded images to start loading
    // This prevents NS_BINDING_ABORTED errors when navigating away quickly
    const browserName = this.page.context().browser()?.browserType().name();
    if (browserName === 'firefox') {
      await this.page.waitForTimeout(300);
    }
  }

  async waitForPageLoad(): Promise<void> {
    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle', { 
      timeout: this.timeouts.page.load 
    });
    
    // Wait for DOM to be ready
    await this.page.waitForLoadState('domcontentloaded', { 
      timeout: this.timeouts.page.load 
    });
    
    // Additional wait for any async operations
    await this.page.waitForTimeout(this.timeouts.ui.pageSettle);
  }

  async reload() {
    await this.page.reload();
    await this.waitForPageLoad();
  }

  // Header navigation
  get logoLink(): Locator {
    return this.page.getByRole('link', { name: 'Rescue Dog Aggregator' });
  }

  get findDogsLink(): Locator {
    return this.page.getByRole('link', { name: 'Find Dogs' });
  }

  get organizationsLink(): Locator {
    return this.page.getByRole('link', { name: 'Organizations' });
  }

  get aboutLink(): Locator {
    return this.page.getByRole('link', { name: 'About' });
  }

  get themeToggle(): Locator {
    return this.page.getByRole('button', { name: /theme/i });
  }

  get mobileMenuButton(): Locator {
    return this.page.getByTestId('mobile-menu-button');
  }

  get skipToMainContentLink(): Locator {
    return this.page.getByRole('link', { name: 'Skip to main content' });
  }

  // Footer elements
  get footerLogoLink(): Locator {
    return this.page.locator('footer').getByRole('link', { name: 'Rescue Dog Aggregator' });
  }

  get footerAboutLink(): Locator {
    return this.page.locator('footer').getByRole('link', { name: 'About' });
  }

  get footerContactLink(): Locator {
    return this.page.locator('footer').getByRole('link', { name: 'Contact' });
  }

  get copyrightText(): Locator {
    return this.page.locator('footer').locator('text=All rights reserved');
  }

  async validateIsOnPage(path: string | RegExp, title?: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(path, { timeout: this.timeouts.page.navigation });
    if (title) {
      await expect(this.page).toHaveTitle(title, { timeout: this.timeouts.page.element });
    }
  }

  // =============================================================================
  // URL AND PAGE STATE VALIDATION
  // =============================================================================

  async expectUrl(pattern: RegExp | string): Promise<void> {
    if (typeof pattern === 'string') {
      await expect(this.page).toHaveURL(pattern, { 
        timeout: this.timeouts.page.element 
      });
    } else {
      await expect(this.page).toHaveURL(pattern, { 
        timeout: this.timeouts.page.element 
      });
    }
  }

  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  async expectPageTitle(title: string | RegExp): Promise<void> {
    await expect(this.page).toHaveTitle(title, { 
      timeout: this.timeouts.page.element 
    });
  }

  // =============================================================================
  // VIEWPORT AND RESPONSIVE HELPERS
  // =============================================================================

  async getViewportInfo(): Promise<ViewportInfo> {
    const viewport = this.page.viewportSize();
    if (!viewport) {
      throw new Error('Viewport size not available');
    }

    const { width, height } = viewport;
    
    return {
      width,
      height,
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024
    };
  }

  async setMobileViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(this.timeouts.ui.animation);
  }

  async setTabletViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.page.waitForTimeout(this.timeouts.ui.animation);
  }

  async setDesktopViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 1280, height: 720 });
    await this.page.waitForTimeout(this.timeouts.ui.animation);
  }

  async setIPhoneViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 393, height: 852 });
    await this.page.waitForTimeout(this.timeouts.ui.animation);
  }

  async setSamsungGalaxyViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 360, height: 800 });
    await this.page.waitForTimeout(this.timeouts.ui.animation);
  }

  async setiPadViewport(): Promise<void> {
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.page.waitForTimeout(this.timeouts.ui.animation);
  }

  async detectCurrentDevice(): Promise<{
    name: string;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
  }> {
    const deviceInfo = await this.mobileHelpers.getCurrentDeviceInfo();
    return {
      name: deviceInfo.name,
      isMobile: deviceInfo.isMobile,
      isTablet: await this.mobileHelpers.isTabletDevice(),
      isDesktop: !deviceInfo.isMobile && !await this.mobileHelpers.isTabletDevice()
    };
  }

  // Navigation actions
  async goToHomePage() {
    await this.logoLink.click();
    await this.waitForPageLoad();
  }

  async goToDogsPage() {
    await this.findDogsLink.click();
    await this.waitForPageLoad();
  }

  async goToOrganizationsPage() {
    await this.organizationsLink.click();
    await this.waitForPageLoad();
  }

  async goToAboutPage() {
    await this.aboutLink.click();
    await this.waitForPageLoad();
  }

  async toggleTheme() {
    await this.themeToggle.click();
    await this.page.waitForTimeout(this.timeouts.ui.animation); // Allow theme transition
  }

  async openMobileMenu() {
    if (await this.mobileMenuButton.isVisible()) {
      await this.mobileMenuButton.click();
      await this.page.waitForTimeout(this.timeouts.ui.animation); // Allow menu animation
    }
  }

  async openMobileMenuWithTouch() {
    if (await this.mobileMenuButton.isVisible()) {
      await this.mobileHelpers.performTouchTap(this.mobileMenuButton);
      await this.page.waitForTimeout(this.timeouts.ui.animation);
    }
  }

  async closeMobileMenu() {
    const closeButton = this.page.getByRole('button', { name: /close/i });
    if (await closeButton.isVisible()) {
      await closeButton.click();
      await this.page.waitForTimeout(this.timeouts.ui.animation); // Allow menu animation
    }
  }

  async closeMobileMenuWithTouch() {
    const backdrop = this.page.locator('[data-testid="mobile-menu-backdrop"]');
    if (await backdrop.isVisible()) {
      await this.mobileHelpers.performTouchTap(backdrop);
      await this.page.waitForTimeout(this.timeouts.ui.animation);
    }
  }

  async navigateWithTouchGestures(direction: 'left' | 'right' | 'up' | 'down') {
    const mainContent = this.page.locator('main, [role="main"]');
    if (await mainContent.isVisible()) {
      await this.mobileHelpers.performSwipeGesture(mainContent, direction);
      await this.page.waitForTimeout(this.timeouts.ui.animation);
    }
  }

  // Responsive helpers
  async isMobileViewport(): Promise<boolean> {
    const viewport = this.page.viewportSize();
    return viewport ? viewport.width < 768 : false;
  }

  async isTabletViewport(): Promise<boolean> {
    const viewport = this.page.viewportSize();
    return viewport ? viewport.width >= 768 && viewport.width < 1024 : false;
  }

  async isDesktopViewport(): Promise<boolean> {
    const viewport = this.page.viewportSize();
    return viewport ? viewport.width >= 1024 : false;
  }

  // Theme helpers
  async getCurrentTheme(): Promise<'light' | 'dark'> {
    const htmlElement = this.page.locator('html');
    const classList = await htmlElement.getAttribute('class');
    return classList?.includes('dark') ? 'dark' : 'light';
  }

  async waitForTheme(theme: 'light' | 'dark') {
    const htmlElement = this.page.locator('html');
    if (theme === 'dark') {
      await expect(htmlElement).toHaveClass(/dark/);
    } else {
      await expect(htmlElement).not.toHaveClass(/dark/);
    }
  }

  // Loading state helpers
  async waitForLoadingToFinish() {
    // Wait for any loading spinners to disappear
    const loadingSpinner = this.page.getByTestId('loading-spinner');
    if (await loadingSpinner.isVisible()) {
      await loadingSpinner.waitFor({ state: 'hidden' });
    }
  }

  async waitForElementToLoad(selector: string, timeout?: number) {
    await this.page.waitForSelector(selector, { 
      timeout: timeout ?? this.timeouts.page.element 
    });
  }

  // =============================================================================
  // MOBILE-SPECIFIC METHODS
  // =============================================================================

  async validateMobileTouchTargets(): Promise<boolean> {
    const interactiveElements = this.page.locator('button, a, input, [role="button"], [tabindex]:not([tabindex="-1"])');
    const count = await interactiveElements.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const element = interactiveElements.nth(i);
      try {
        const isValid = await this.mobileHelpers.validateTouchTargetSize(element);
        if (!isValid) return false;
      } catch {
        // Element might not be visible, skip
      }
    }
    
    return true;
  }

  async testMobileKeyboardNavigation(): Promise<boolean> {
    try {
      // Test basic keyboard navigation
      await this.page.keyboard.press('Tab');
      
      const activeElement = await this.page.evaluate(() => document.activeElement?.tagName);
      return !!activeElement;
    } catch {
      return false;
    }
  }

  async validateMobileScreenReaderSupport(): Promise<boolean> {
    const headings = this.page.locator('h1, h2, h3, h4, h5, h6');
    const landmarks = this.page.locator('[role="main"], [role="navigation"], main, nav');
    
    const hasHeadings = await headings.count() > 0;
    const hasLandmarks = await landmarks.count() > 0;
    
    return hasHeadings && hasLandmarks;
  }

  async performSwipe(element: Locator | string, direction: 'left' | 'right' | 'up' | 'down'): Promise<void> {
    await this.mobileHelpers.performSwipeGesture(element, direction);
  }

  async performTouchAndHold(element: Locator | string, duration: number = 1000): Promise<void> {
    await this.mobileHelpers.performTouchAndHold(element, duration);
  }

  async performDoubleTap(element: Locator | string): Promise<void> {
    await this.mobileHelpers.performTouchTap(element);
    await this.page.waitForTimeout(100);
    await this.mobileHelpers.performTouchTap(element);
  }

  async performPinchGesture(element: Locator | string, scale: number = 2): Promise<void> {
    await this.mobileHelpers.performPinchZoom(element, scale);
  }

  async waitForTouchFeedback(duration: number = 300): Promise<void> {
    await this.mobileHelpers.waitForTouchFeedback(duration);
  }

  async waitForMobileAnimation(selector?: string, timeout: number = 1000): Promise<void> {
    await this.mobileHelpers.waitForMobileAnimation(selector, timeout);
  }

  async waitForDeviceOrientation(expectedOrientation: 'portrait' | 'landscape', timeout: number = 3000): Promise<void> {
    await this.mobileHelpers.waitForDeviceOrientation(expectedOrientation, timeout);
  }

  async measureTouchResponseTime(element: Locator | string): Promise<number> {
    const startTime = Date.now();
    
    if (typeof element === 'string') {
      await this.page.locator(element).tap();
    } else {
      await element.tap();
    }
    
    return Date.now() - startTime;
  }

  async validateScrollPerformance(element: Locator | string, scrollAmount: number = 500): Promise<{ duration: number; smooth: boolean }> {
    return await this.mobileHelpers.testScrollPerformance(element, scrollAmount);
  }

  async testAnimationPerformance(): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      // Trigger an animation (theme toggle is a good test)
      if (await this.themeToggle.isVisible()) {
        await this.themeToggle.click();
        await this.page.waitForTimeout(500); // Wait for animation
      }
      
      const duration = Date.now() - startTime;
      return duration < 1000; // Animation should complete within 1 second
    } catch {
      return false;
    }
  }

  // =============================================================================
  // ACCESSIBILITY METHODS
  // =============================================================================

  async checkAccessibility(): Promise<void> {
    // Basic accessibility checks
    await this.checkForMainLandmark();
    await this.checkForHeadingStructure();
    await this.checkForFocusableElements();
    await this.checkForNavigation();
  }

  private async checkForMainLandmark(): Promise<void> {
    const mainLandmarks = await this.page.locator('main, [role="main"]').count();
    if (mainLandmarks === 0) {
      console.warn('Accessibility warning: No main landmark found on page');
    }
  }

  private async checkForHeadingStructure(): Promise<void> {
    const h1Count = await this.page.locator('h1').count();
    if (h1Count === 0) {
      console.warn('Accessibility warning: No H1 heading found on page');
    } else if (h1Count > 1) {
      console.warn('Accessibility warning: Multiple H1 headings found on page');
    }
  }

  private async checkForFocusableElements(): Promise<void> {
    const focusableElements = await this.page.locator('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])').count();
    if (focusableElements === 0) {
      console.warn('Accessibility warning: No focusable elements found on page');
    }
  }

  private async checkForNavigation(): Promise<void> {
    try {
      await expect(this.page.getByRole('navigation')).toBeVisible();
    } catch {
      console.warn('Accessibility warning: No navigation landmark found');
    }
  }

  async focusSkipLink() {
    await this.skipToMainContentLink.focus();
  }

  async useSkipLink() {
    await this.skipToMainContentLink.click();
    const mainContent = this.page.getByRole('main');
    await expect(mainContent).toBeFocused();
  }

  // Error state helpers
  async waitForErrorState() {
    const errorMessage = this.page.getByText(/error|failed|something went wrong/i);
    await errorMessage.waitFor({ state: 'visible' });
  }

  async isErrorDisplayed(): Promise<boolean> {
    const errorMessage = this.page.getByText(/error|failed|something went wrong/i);
    return await errorMessage.isVisible();
  }

  // Screenshot helpers
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  async takeElementScreenshot(element: Locator, name: string) {
    await element.screenshot({ 
      path: `test-results/screenshots/${name}.png` 
    });
  }

  // URL helpers
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async waitForUrl(urlPattern: string | RegExp) {
    await this.page.waitForURL(urlPattern);
  }

  // Generic form helpers
  async fillInput(selector: string, value: string) {
    await this.page.fill(selector, value);
  }

  async clickButton(text: string) {
    await this.page.getByRole('button', { name: text }).click();
  }

  async clickLink(text: string) {
    await this.page.getByRole('link', { name: text }).click();
  }

  // Generic wait helpers
  async waitForElement(selector: string) {
    await this.page.waitForSelector(selector);
  }

  async waitForText(text: string) {
    await this.page.waitForSelector(`text=${text}`);
  }

  async waitForTimeout(milliseconds: number) {
    await this.page.waitForTimeout(milliseconds);
  }

  // Validation helpers
  async expectPageTitle(title: string) {
    await expect(this.page).toHaveTitle(title);
  }

  async expectUrl(url: string | RegExp) {
    await expect(this.page).toHaveURL(url);
  }

  async expectElementVisible(locator: Locator) {
    await expect(locator).toBeVisible();
  }

  async expectElementHidden(locator: Locator) {
    await expect(locator).toBeHidden();
  }

  async expectText(locator: Locator, text: string) {
    await expect(locator).toContainText(text);
  }

  // =============================================================================
  // CONSOLE ERROR LOGGING METHODS
  // =============================================================================

  getConsoleErrors(): string[] {
    return this.consoleLogger.getConsoleErrors();
  }

  getPageErrors(): string[] {
    return this.consoleLogger.getPageErrors();
  }

  hasErrors(): boolean {
    return this.consoleLogger.hasErrors();
  }

  getErrorReport(): string {
    return this.consoleLogger.getErrorReport();
  }

  clearErrors(): void {
    this.consoleLogger.clearErrors();
  }

  // Helper method for tests to check and report console errors
  async assertNoConsoleErrors(): Promise<void> {
    if (this.hasErrors()) {
      const errorReport = this.getErrorReport();
      throw new Error(`Console errors detected:\n${errorReport}`);
    }
  }

  // Helper method to temporarily disable error throwing for specific operations
  async withErrorSuppression<T>(operation: () => Promise<T>): Promise<T> {
    const originalThrowOnError = this.consoleLogger['options'].throwOnError;
    this.consoleLogger['options'].throwOnError = false;
    
    try {
      return await operation();
    } finally {
      this.consoleLogger['options'].throwOnError = originalThrowOnError;
    }
  }
}