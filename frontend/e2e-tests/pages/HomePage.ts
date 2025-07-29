import { Locator, expect, Page } from 'playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {
  // Hero Section elements
  get heroSection(): Locator {
    return this.page.getByTestId('hero-section');
  }

  get heroContainer(): Locator {
    return this.page.getByTestId('hero-container');
  }

  get heroContent(): Locator {
    return this.page.getByTestId('hero-content');
  }

  get heroTitle(): Locator {
    return this.page.getByTestId('hero-title');
  }

  get heroSubtitle(): Locator {
    return this.page.getByTestId('hero-subtitle');
  }

  get primaryCTAButton(): Locator {
    return this.page.getByTestId('hero-primary-cta');
  }

  get secondaryCTAButton(): Locator {
    return this.page.getByTestId('hero-secondary-cta');
  }

  // Statistics elements
  get statisticsLoading(): Locator {
    return this.page.getByTestId('statistics-loading');
  }

  get statisticsError(): Locator {
    return this.page.getByTestId('statistics-error');
  }

  get statisticsContent(): Locator {
    return this.page.getByTestId('statistics-content');
  }

  get statisticsGrid(): Locator {
    return this.page.getByTestId('statistics-grid');
  }

  get statisticsDescription(): Locator {
    return this.page.getByTestId('statistics-description');
  }

  get retryButton(): Locator {
    return this.page.getByTestId('retry-button');
  }

  // Dog Section elements
  get dogSectionContainer(): Locator {
    return this.page.getByTestId('dog-section-container');
  }

  get dogSection(): Locator {
    return this.page.getByTestId('dog-section').first();
  }

  get dogGrid(): Locator {
    return this.page.getByTestId('dog-grid').first();
  }

  get dogCarousel(): Locator {
    return this.page.getByTestId('dog-carousel').first();
  }

  get skeletonGrid(): Locator {
    return this.page.getByTestId('skeleton-grid').first();
  }

  get mobileCarouselContainer(): Locator {
    return this.page.getByTestId('mobile-carousel-container').first();
  }

  // Trust Section elements
  get trustSection(): Locator {
    return this.page.getByTestId('trust-section');
  }

  get organizationsIcon(): Locator {
    return this.page.getByTestId('organizations-icon');
  }

  get dogsIcon(): Locator {
    return this.page.getByTestId('dogs-icon');
  }

  get countriesIcon(): Locator {
    return this.page.getByTestId('countries-icon');
  }

  get organizationsGrid(): Locator {
    return this.page.getByTestId('organizations-grid');
  }

  get dogSectionError(): Locator {
    return this.page.getByTestId('dog-section-error').first();
  }

  get dogSectionRetry(): Locator {
    return this.page.getByTestId('dog-section-retry').first();
  }

  get dogSectionLoading(): Locator {
    return this.page.getByTestId('dog-section-loading').first();
  }

  get dogSectionViewAll(): Locator {
    return this.page.getByTestId('dog-section-view-all').first();
  }

  get dogSectionTitle(): Locator {
    return this.page.getByTestId('dog-section-title').first();
  }

  get trustSectionLoading(): Locator {
    return this.page.getByTestId('trust-section-loading');
  }

  get trustSectionError(): Locator {
    return this.page.getByTestId('trust-section-error');
  }

  get trustSectionShowMore(): Locator {
    return this.page.getByTestId('trust-section-show-more');
  }

  get trustSectionSkeletons(): Locator {
    return this.page.getByTestId('trust-section-skeletons');
  }

  get mobileMenuButton(): Locator {
    return this.page.getByTestId('mobile-menu-button');
  }

  // Navigation actions specific to home page
  async clickPrimaryCTA() {
    await this.primaryCTAButton.click();
    await this.waitForPageLoad();
    await this.expectUrl(/\/dogs/);
  }

  async clickSecondaryCTA() {
    await this.secondaryCTAButton.click();
    await this.waitForPageLoad();
    await this.expectUrl(/\/about/);
  }

  async clickViewAllDogs() {
    const viewAllLink = this.page.getByRole('link', { name: /view all/i });
    await viewAllLink.click();
    await this.waitForPageLoad();
  }

  // Statistics validation
  async expectStatisticsToLoad() {
    await expect(this.statisticsContent).toBeVisible();
    await expect(this.statisticsGrid).toBeVisible();
  }

  async expectStatisticsError() {
    await expect(this.statisticsError).toBeVisible();
    await expect(this.retryButton).toBeVisible();
  }

  async retryStatistics() {
    await this.retryButton.click();
    await this.waitForLoadingToFinish();
  }

  async getStatisticsValues(): Promise<{ dogs: string; organizations: string; countries: string }> {
    await this.expectStatisticsToLoad();
    
    const dogsValue = await this.statisticsGrid.locator('div:nth-child(1) .text-3xl').textContent();
    const organizationsValue = await this.statisticsGrid.locator('div:nth-child(2) .text-3xl').textContent();
    const countriesValue = await this.statisticsGrid.locator('div:nth-child(3) .text-3xl').textContent();

    return {
      dogs: dogsValue?.trim() || '',
      organizations: organizationsValue?.trim() || '',
      countries: countriesValue?.trim() || ''
    };
  }

  // Dog section validation
  async expectDogSectionToLoad() {
    await expect(this.dogSection).toBeVisible();
    
    if (await this.isMobileViewport()) {
      await expect(this.dogCarousel).toBeVisible();
    } else {
      await expect(this.dogGrid).toBeVisible();
    }
  }

  async expectDogSectionLoading() {
    if (await this.isMobileViewport()) {
      await expect(this.mobileCarouselContainer).toBeVisible();
    } else {
      await expect(this.skeletonGrid).toBeVisible();
    }
  }

  async getDogCards() {
    await this.expectDogSectionToLoad();
    
    if (await this.isMobileViewport()) {
      return this.dogCarousel.locator('[data-testid="dog-card"]');
    } else {
      return this.dogGrid.locator('[data-testid="dog-card"]');
    }
  }

  async clickFirstDogCard() {
    const dogCards = await this.getDogCards();
    const firstCard = dogCards.first();
    await firstCard.click();
    await this.waitForPageLoad();
  }

  // Trust section validation
  async expectTrustSectionToLoad() {
    await expect(this.trustSection).toBeVisible();
    await expect(this.organizationsGrid).toBeVisible();
  }

  async getTrustStatistics(): Promise<{ organizations: string; dogs: string; countries: string }> {
    await this.expectTrustSectionToLoad();
    
    // Trust section has different structure than hero statistics
    const organizationsValue = await this.trustSection.locator('div:nth-child(1) .text-4xl').textContent();
    const dogsValue = await this.trustSection.locator('div:nth-child(2) .text-4xl').textContent();
    const countriesValue = await this.trustSection.locator('div:nth-child(3) .text-4xl').textContent();

    return {
      organizations: organizationsValue?.trim() || '',
      dogs: dogsValue?.trim() || '',
      countries: countriesValue?.trim() || ''
    };
  }

  async getOrganizationCards() {
    await this.expectTrustSectionToLoad();
    return this.organizationsGrid.locator('.organization-card');
  }

  async clickFirstOrganizationCard() {
    const organizationCards = await this.getOrganizationCards();
    const firstCard = organizationCards.first();
    await firstCard.click();
    await this.waitForPageLoad();
  }

  // Hero section validation
  async expectHeroSectionToLoad() {
    await expect(this.heroSection).toBeVisible();
    await expect(this.heroTitle).toBeVisible();
    await expect(this.heroSubtitle).toBeVisible();
    await expect(this.primaryCTAButton).toBeVisible();
    await expect(this.secondaryCTAButton).toBeVisible();
  }

  async expectHeroText() {
    await expect(this.heroTitle).toContainText('Helping rescue dogs find loving homes');
    await expect(this.heroSubtitle).toContainText('Browse available dogs from trusted rescue organizations');
    await expect(this.primaryCTAButton).toContainText('Find Your New Best Friend');
    await expect(this.secondaryCTAButton).toContainText('About Our Mission');
  }

  // Mobile specific actions
  async swipeDogCarousel(direction: 'left' | 'right') {
    if (await this.isMobileViewport()) {
      const carousel = this.dogCarousel;
      const box = await carousel.boundingBox();
      
      if (box) {
        const startX = direction === 'right' ? box.x + box.width * 0.8 : box.x + box.width * 0.2;
        const endX = direction === 'right' ? box.x + box.width * 0.2 : box.x + box.width * 0.8;
        const y = box.y + box.height / 2;

        await this.page.mouse.move(startX, y);
        await this.page.mouse.down();
        await this.page.mouse.move(endX, y);
        await this.page.mouse.up();
        
        await this.waitForTimeout(300); // Allow swipe animation
      }
    }
  }

  // Full page validation
  async expectHomePageToLoad() {
    await this.waitForPageLoad();
    await this.expectHeroSectionToLoad();
    await this.expectStatisticsToLoad();
    await this.expectDogSectionToLoad();
    await this.expectTrustSectionToLoad();
  }

  async expectHomePageContent() {
    await this.expectHeroText();
    
    // Validate that statistics show numbers
    const heroStats = await this.getStatisticsValues();
    expect(parseInt(heroStats.dogs)).toBeGreaterThan(0);
    expect(parseInt(heroStats.organizations)).toBeGreaterThan(0);
    expect(parseInt(heroStats.countries)).toBeGreaterThan(0);

    // Validate that trust section shows same or consistent data
    const trustStats = await this.getTrustStatistics();
    expect(parseInt(trustStats.dogs)).toBeGreaterThan(0);
    expect(parseInt(trustStats.organizations)).toBeGreaterThan(0);
    expect(parseInt(trustStats.countries)).toBeGreaterThan(0);
  }

  // Error state testing
  async triggerStatisticsError() {
    // This would be used with API mocking to simulate error states
    await this.page.reload();
    await this.expectStatisticsError();
  }

  // Accessibility testing
  async checkAccessibilityFeatures() {
    await this.checkAccessibility();
    
    // Check aria labels and roles
    await expect(this.dogSectionContainer).toHaveAttribute('role', 'region');
    await expect(this.trustSection).toHaveAttribute('role', 'region');
    
    // Check that statistics are accessible
    await expect(this.statisticsDescription).toBeVisible();
  }

  // Performance testing
  async waitForCriticalImages() {
    // Wait for hero section background and first dog images to load
    await this.waitForElementToLoad('[data-testid="hero-section"]');
    
    if (await this.dogSection.isVisible()) {
      const firstDogCard = await this.getDogCards();
      if (await firstDogCard.count() > 0) {
        await expect(firstDogCard.first().locator('img')).toBeVisible();
      }
    }
  }

  // Additional methods for test requirements
  async navigate(): Promise<void> {
    await super.navigate('/');
  }

  async waitForPageLoad(): Promise<void> {
    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout: 8000 });
      await this.page.waitForTimeout(200);
    } catch (error) {
      // If page load times out, just continue with short wait
      console.log('[HomePage] waitForPageLoad timeout, continuing with fallback');
      await this.page.waitForTimeout(300);
    }
  }

  // Dog Section Methods
  async verifyDogSectionLoading(): Promise<boolean> {
    try {
      await this.dogSectionLoading.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  async isDogSectionVisible(): Promise<boolean> {
    try {
      return await this.dogSection.isVisible();
    } catch (error) {
      console.log('[HomePage] isDogSectionVisible failed:', error.message);
      return false;
    }
  }

  async getDogSectionDogCount(): Promise<number> {
    const cards = await this.getDogCards();
    return await cards.count();
  }

  async isDogSectionGridLayout(): Promise<boolean> {
    return await this.dogGrid.isVisible();
  }

  async getDogSectionGridColumns(): Promise<number> {
    // Wait for the dog section to be loaded first
    await this.waitForDogSectionLoad();
    
    const grid = this.dogGrid;
    
    // Check if grid is visible, if not it might be using carousel layout
    const isGridVisible = await grid.isVisible();
    const isCarouselVisible = await this.dogCarousel.isVisible();
    
    if (!isGridVisible) {
      if (isCarouselVisible) {
        // If showing carousel instead of grid, the layout is mobile-style (1 column equivalent)
        return 1;
      }
      // If neither is visible, wait a bit more and try again
      await this.page.waitForTimeout(1000);
    }
    
    return await grid.evaluate(el => {
      const style = window.getComputedStyle(el);
      const columns = style.gridTemplateColumns;
      return columns.split(' ').length;
    }, { timeout: 5000 });
  }

  async isDogSectionCarouselLayout(): Promise<boolean> {
    return await this.dogCarousel.isVisible();
  }

  async isDogSectionCarouselScrollable(): Promise<boolean> {
    const carousel = this.dogCarousel;
    return await carousel.evaluate(el => el.scrollWidth > el.clientWidth);
  }

  async waitForDogSectionError(): Promise<void> {
    await this.dogSectionError.waitFor({ state: 'visible', timeout: 3000 });
  }

  async isDogSectionErrorVisible(): Promise<boolean> {
    return await this.dogSectionError.isVisible();
  }

  async isDogSectionRetryVisible(): Promise<boolean> {
    return await this.dogSectionRetry.isVisible();
  }

  async clickDogSectionRetry(): Promise<void> {
    await this.dogSectionRetry.click();
  }

  async waitForDogSectionLoad(): Promise<void> {
    await this.dogSection.waitFor({ state: 'visible', timeout: 5000 });
  }

  async isDogSectionViewAllVisible(): Promise<boolean> {
    return await this.dogSectionViewAll.isVisible();
  }

  async clickDogSectionViewAll(): Promise<void> {
    await this.dogSectionViewAll.click();
    await this.page.waitForURL('**/dogs**', { timeout: 10000 });
    await this.waitForPageLoad();
  }

  async getDogSectionTitle(): Promise<string> {
    return await this.dogSectionTitle.textContent() || '';
  }

  async getFirstDogSectionDogName(): Promise<string> {
    const cards = await this.getDogCards();
    const firstCard = cards.first();
    return await firstCard.locator('[data-testid="dog-name"]').textContent() || '';
  }

  async clickFirstDogSectionDog(): Promise<void> {
    const cards = await this.getDogCards();
    const firstCard = cards.first();
    
    // Click on the dog name link which is guaranteed to be clickable
    const dogNameLink = firstCard.locator('[data-testid="dog-name"]').locator('..');
    await dogNameLink.click();
    
    await this.page.waitForURL('**/dogs/**', { timeout: 10000 });
    await this.waitForPageLoad();
  }

  // Trust Section Methods
  async verifyTrustSectionLoading(): Promise<boolean> {
    try {
      await this.trustSectionLoading.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  async getTrustSectionStats(): Promise<{
    totalDogs: string;
    organizations: string;
    countries: string;
  }> {
    const totalDogs = await this.trustSection.locator('[data-testid="total-dogs-stat"]').textContent() || '';
    const organizations = await this.trustSection.locator('[data-testid="organizations-stat"]').textContent() || '';
    const countries = await this.trustSection.locator('[data-testid="countries-stat"]').textContent() || '';
    
    return { totalDogs, organizations, countries };
  }

  async isTrustSectionOrgGridVisible(): Promise<boolean> {
    return await this.organizationsGrid.isVisible();
  }

  async getTrustSectionOrgCount(): Promise<number> {
    const cards = await this.organizationsGrid.locator('[data-testid="organization-card"]').all();
    return cards.length;
  }

  async isTrustSectionShowMoreVisible(): Promise<boolean> {
    return await this.trustSectionShowMore.isVisible();
  }

  async clickTrustSectionShowMore(): Promise<void> {
    await this.trustSectionShowMore.click();
  }

  async waitForTrustSectionExpand(): Promise<void> {
    await this.page.waitForTimeout(500);
  }

  async getFirstTrustSectionOrg(): Promise<{
    name: string;
    location: string;
    dogCount: string;
  }> {
    const firstOrg = this.organizationsGrid.locator('[data-testid="organization-card"]').first();
    const name = await firstOrg.locator('[data-testid="org-name"]').textContent() || '';
    const location = await firstOrg.locator('[data-testid="org-location"]').textContent() || '';
    const dogCount = await firstOrg.locator('[data-testid="org-dog-count"]').textContent() || '';
    
    return { name, location, dogCount };
  }

  async testTrustSectionOrgHover(): Promise<boolean> {
    const firstOrg = this.organizationsGrid.locator('[data-testid="organization-card"]').first();
    await firstOrg.hover();
    
    const hasHoverEffect = await firstOrg.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.transform !== 'none' || style.boxShadow !== 'none';
    });
    
    return hasHoverEffect;
  }

  async getFirstTrustSectionOrgName(): Promise<string> {
    const firstOrg = this.organizationsGrid.locator('[data-testid="organization-card"]').first();
    return await firstOrg.locator('[data-testid="org-name"]').textContent() || '';
  }

  async clickFirstTrustSectionOrg(): Promise<void> {
    await this.organizationsGrid.locator('[data-testid="organization-card"]').first().click();
    await this.page.waitForURL('**/organizations/**', { timeout: 10000 });
    await this.waitForPageLoad();
  }

  async waitForTrustSectionError(): Promise<void> {
    await this.trustSectionError.waitFor({ state: 'visible', timeout: 3000 });
  }

  async isTrustSectionErrorVisible(): Promise<boolean> {
    return await this.trustSectionError.isVisible();
  }

  async verifyTrustSectionSkeletons(): Promise<boolean> {
    try {
      await this.trustSectionSkeletons.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }

  async waitForTrustSectionLoad(): Promise<void> {
    await this.trustSection.waitFor({ state: 'visible', timeout: 5000 });
  }

  // Hero Section Methods
  async isHeroSectionVisible(): Promise<boolean> {
    return await this.heroSection.isVisible();
  }

  async getHeroTitle(): Promise<string> {
    return await this.heroTitle.textContent() || '';
  }

  async getHeroSubtitle(): Promise<string> {
    return await this.heroSubtitle.textContent() || '';
  }

  async isPrimaryCTAVisible(): Promise<boolean> {
    return await this.primaryCTAButton.isVisible();
  }

  async isSecondaryCTAVisible(): Promise<boolean> {
    return await this.secondaryCTAButton.isVisible();
  }

  async clickPrimaryCTA(): Promise<void> {
    await this.primaryCTAButton.click();
    await this.page.waitForURL('**/dogs**', { timeout: 10000 });
    await this.waitForPageLoad();
  }

  // Responsive Methods
  async getTrustSectionGridColumns(): Promise<number> {
    const grid = this.organizationsGrid;
    return await grid.evaluate(el => {
      const style = window.getComputedStyle(el);
      const columns = style.gridTemplateColumns;
      return columns.split(' ').length;
    });
  }

  async isMobileMenuButtonVisible(): Promise<boolean> {
    return await this.mobileMenuButton.isVisible();
  }

  // Performance Methods
  async areImagesLazyLoaded(): Promise<boolean> {
    const images = await this.page.locator('img').all();
    for (const img of images) {
      const loading = await img.getAttribute('loading');
      if (loading !== 'lazy') return false;
    }
    return true;
  }

  async areImagesOptimized(): Promise<boolean> {
    try {
      // Wait for images to load and only get visible ones
      const images = await this.page.locator('img:visible').all();
      
      for (const img of images) {
        try {
          const src = await img.getAttribute('src', { timeout: 5000 });
          
          if (src) {
            const hasCloudflareOptimization = src.includes('/cdn-cgi/image/');
            const hasWidthParam = src.includes('w=');
            const isPlaceholder = src.includes('placeholder') || src.includes('.svg');
            const isExternalTestImage = src.includes('picsum.photos');
            const isR2Domain = src.includes('images.rescuedogs.me');
            
            // Skip placeholder images and SVGs
            if (isPlaceholder) {
              continue;
            }
            
            // In test environment, external test images (picsum.photos) are acceptable
            // In production, only R2 images should be present and they should be optimized
            if (isExternalTestImage) {
              // External test images don't need optimization
              continue;
            }
            
            // For R2 images, they must be optimized
            if (isR2Domain && !hasCloudflareOptimization && !hasWidthParam) {
              return false;
            }
          }
        } catch (error) {
          // Skip images that can't be accessed (may be loading or hidden)
          continue;
        }
      }
      
      return true;
    } catch (error) {
      // If we can't check images at all, assume they're not optimized
      return false;
    }
  }
}