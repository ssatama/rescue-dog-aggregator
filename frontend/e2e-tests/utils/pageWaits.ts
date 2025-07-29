import { Page, Locator } from '@playwright/test';

/**
 * Utility functions to replace networkidle waits with more reliable wait strategies
 * for use with mock APIs that prevent network idle state
 */

export interface PageWaitOptions {
  timeout?: number;
  retries?: number;
}

/**
 * Waits for organizations page to be ready by waiting for DOM load + key elements
 */
export async function waitForOrganizationsPage(page: Page, options: PageWaitOptions = {}): Promise<void> {
  const { timeout = 10000 } = options;
  
  // Wait for DOM to be ready
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for the main page heading to be visible with reduced timeout
  try {
    await page.waitForSelector('h1:has-text("Rescue Organizations")', { 
      state: 'visible',
      timeout: 8000 
    });
  } catch (error) {
    // Fallback: check for any h1 on the page
    await page.waitForSelector('h1', { 
      state: 'visible',
      timeout: 5000 
    });
  }
  
  // Wait for content to load - try each state in order of likelihood
  try {
    // First try to wait for organization cards (most common case)
    await page.waitForSelector('[data-testid="organization-card"]', { 
      state: 'visible',
      timeout: 3000 
    });
  } catch {
    try {
      // If no cards, check for loading skeletons
      await page.waitForSelector('[data-testid="organization-card-skeleton"]', { 
        state: 'visible',
        timeout: 2000 
      });
    } catch {
      // Finally check for empty state, but don't fail if not found
      await page.waitForSelector('[data-testid="empty-state"]', { 
        state: 'visible',
        timeout: 1000 
      }).catch(() => {
        // Empty state may not be visible if there are organizations
        // This is not an error condition
      });
    }
  }
}

/**
 * Waits for organization detail page to be ready
 */
export async function waitForOrganizationDetailPage(page: Page, options: PageWaitOptions = {}): Promise<void> {
  const { timeout = 10000 } = options;
  
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for either the organization hero OR not found error
  await page.waitForFunction(() => {
    const hasHero = document.querySelector('[data-testid="organization-hero"]');
    const hasNotFound = document.querySelector('h1') && document.querySelector('h1').textContent?.includes('Organization Not Found');
    const hasTitle = document.querySelector('h1');
    return hasHero || hasNotFound || hasTitle;
  }, undefined, { timeout });
}

/**
 * Waits for dog detail page to be ready
 */
export async function waitForDogDetailPage(page: Page, options: PageWaitOptions = {}): Promise<void> {
  const { timeout = 10000 } = options;
  
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for dog detail container or error state
  await page.waitForFunction(() => {
    const hasDetail = document.querySelector('[data-testid="dog-detail-container"]');
    const hasNotFound = document.querySelector('h1') && document.querySelector('h1').textContent?.includes('Dog Not Found');
    const hasTitle = document.querySelector('h1');
    return hasDetail || hasNotFound || hasTitle;
  }, undefined, { timeout });
}

/**
 * Waits for share functionality to be ready
 */
export async function waitForShareComponent(page: Page, options: PageWaitOptions = {}): Promise<void> {
  const { timeout = 5000 } = options;
  
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for share button to be present and clickable
  await page.waitForSelector('[data-testid="share-button"]', { 
    state: 'visible',
    timeout 
  });
}

/**
 * Waits for about page to be ready with proper main content
 */
export async function waitForAboutPage(page: Page, options: PageWaitOptions = {}): Promise<void> {
  const { timeout = 10000 } = options;
  
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for main content to be present
  await page.waitForSelector('#main-content', { 
    state: 'attached',
    timeout 
  });
  
  // Wait for about page specific content
  await page.waitForFunction(() => {
    const mainContent = document.querySelector('#main-content');
    const hasAboutTitle = document.querySelector('h1') && document.querySelector('h1').textContent?.includes('About Rescue Dog Aggregator');
    const hasContactButton = document.querySelector('a[href="mailto:rescuedogsme@gmail.com"]');
    return mainContent && (hasAboutTitle || hasContactButton);
  }, undefined, { timeout });
}

/**
 * Generic page load wait that replaces networkidle for pages with mock APIs
 */
export async function waitForPageReady(page: Page, options: PageWaitOptions = {}): Promise<void> {
  const { timeout = 10000 } = options;
  
  // Wait for DOM content to load
  await page.waitForLoadState('domcontentloaded');
  
  // Small delay to allow React hydration
  await page.waitForTimeout(500);
  
  // Wait for body to be present (basic page structure loaded)
  await page.waitForSelector('body', { state: 'attached', timeout });
  
  // Additional wait for React components to mount
  await page.waitForTimeout(1000);
}