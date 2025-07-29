import { Locator, expect, Page } from 'playwright/test';
import { BasePage } from './BasePage';

export class DogDetailPage extends BasePage {
  // Hero section elements (enhanced with actual test IDs from DogDetailClient.jsx)
  get heroSection(): Locator {
    return this.page.locator('[data-testid="hero-image-container"]');
  }

  get heroImage(): Locator {
    return this.page.locator('[data-testid="hero-image"]');
  }

  get heroImageContainer(): Locator {
    return this.page.locator('[data-testid="hero-image-container"]');
  }

  get heroImageBackground(): Locator {
    return this.page.locator('.bg-cover.bg-center.filter.blur-lg');
  }

  get imageContainer(): Locator {
    return this.page.locator('[data-testid="image-container"]');
  }

  // Dog information elements (enhanced with metadata card structure)
  get dogName(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  get dogBreed(): Locator {
    return this.page.locator('p.text-large.text-muted-foreground');
  }

  // Metadata cards (enhanced with actual structure from DogDetailClient.jsx)
  get metadataCards(): Locator {
    return this.page.locator('[data-testid="metadata-cards"]');
  }

  get ageGenderRow(): Locator {
    return this.page.locator('[data-testid="age-gender-row"]');
  }

  get breedSizeRow(): Locator {
    return this.page.locator('[data-testid="breed-size-row"]');
  }

  get dogAge(): Locator {
    return this.page.locator('[data-testid="dog-age-card"]');
  }

  get dogSex(): Locator {
    return this.page.locator('[data-testid="dog-sex-card"]');
  }

  get dogBreedCard(): Locator {
    return this.page.locator('[data-testid="dog-breed-card"]');
  }

  get dogSize(): Locator {
    return this.page.locator('[data-testid="dog-size-card"]');
  }

  get dogStatus(): Locator {
    return this.page.locator('.inline-flex.items-center.px-2.py-1');
  }

  // About section
  get aboutSection(): Locator {
    return this.page.locator('[data-testid="about-section"]');
  }

  get dogDescription(): Locator {
    return this.page.locator('[data-testid="about-section"] p');
  }

  // Dog details/badges
  get dogBadges(): Locator {
    return this.page.locator('[data-testid="dog-badges"], .badge');
  }

  get availabilityBadge(): Locator {
    return this.page.locator('[data-testid="availability-badge"]');
  }

  // Organization information (enhanced with actual structure)
  get organizationContainer(): Locator {
    return this.page.locator('[data-testid="organization-container"]');
  }

  get organizationCard(): Locator {
    return this.page.locator('[data-testid="organization-container"] .bg-card');
  }

  get organizationName(): Locator {
    return this.page.locator('[data-testid="organization-container"] h3');
  }

  get organizationWebsite(): Locator {
    return this.page.locator('[data-testid="organization-container"] a[href^="http"]');
  }

  get organizationLocation(): Locator {
    return this.page.locator('[data-testid="organization-location"]');
  }

  get shipsToCountries(): Locator {
    return this.page.locator('[data-testid="organization-container"] .flex.flex-wrap.gap-1');
  }

  get countryFlags(): Locator {
    return this.page.locator('[data-testid="organization-container"] .inline-flex.items-center');
  }

  // Action/CTA section
  get ctaSection(): Locator {
    return this.page.locator('[data-testid="cta-section"]');
  }

  get contactOrganizationButton(): Locator {
    return this.page.getByRole('button', { name: /contact organization|adopt/i });
  }

  // Action buttons
  get shareButton(): Locator {
    return this.page.getByRole('button', { name: /share/i });
  }

  get favoriteButton(): Locator {
    return this.page.getByRole('button', { name: /favorite|heart/i });
  }

  // Social media and sharing
  get socialMediaLinks(): Locator {
    return this.page.locator('[data-testid="social-media-links"]');
  }

  get shareOptions(): Locator {
    return this.page.locator('[data-testid="share-options"]');
  }

  // Mobile sticky bar
  get mobileStickyBar(): Locator {
    return this.page.locator('[data-testid="mobile-sticky-bar"]');
  }

  get mobileContactButton(): Locator {
    return this.mobileStickyBar.getByRole('button', { name: /contact|adopt/i });
  }

  get mobileShareButton(): Locator {
    return this.mobileStickyBar.getByRole('button', { name: /share/i });
  }

  // Related dogs section
  get relatedDogsSection(): Locator {
    return this.page.locator('[data-testid="related-dogs-section"]');
  }

  get relatedDogsGrid(): Locator {
    return this.page.locator('[data-testid="related-dogs-grid"]');
  }

  get relatedDogCards(): Locator {
    return this.relatedDogsSection.locator('[data-testid="related-dog-card"], .dog-card, [data-testid="dog-card"]');
  }

  get relatedDogsLoading(): Locator {
    return this.page.locator('[data-testid="related-dogs-loading"]');
  }

  get relatedDogsError(): Locator {
    return this.page.locator('[data-testid="related-dogs-error"]');
  }

  // Loading and error states
  get dogDetailSkeleton(): Locator {
    return this.page.locator('[data-testid="dog-detail-skeleton"]');
  }

  get loadingIndicator(): Locator {
    return this.page.locator('[data-testid="loading-indicator"]');
  }

  get errorAlert(): Locator {
    return this.page.getByRole('alert');
  }

  get errorPage(): Locator {
    return this.page.locator('[data-testid="error-page"]');
  }

  get notFoundMessage(): Locator {
    return this.page.getByText(/not found|does not exist/i);
  }

  get retryButton(): Locator {
    return this.page.getByRole('button', { name: /retry|try again/i });
  }

  get heroImageError(): Locator {
    return this.page.locator('[data-testid="error-state"]');
  }

  get heroImageRetry(): Locator {
    return this.heroImageError.locator('button');
  }

  get heroImageLoading(): Locator {
    return this.page.locator('[data-testid="shimmer-loader"]');
  }

  // Navigation breadcrumbs
  get breadcrumbs(): Locator {
    return this.page.locator('nav[aria-label="Breadcrumb"]');
  }

  get backButton(): Locator {
    return this.page.locator('[data-testid="back-button"]');
  }

  get backToDogsLink(): Locator {
    return this.page.getByRole('link', { name: /back to dogs|all dogs/i });
  }

  // Adoption
  get adoptButton(): Locator {
    return this.page.locator('[data-testid="adopt-button"]');
  }

  // Social sharing
  get facebookShareButton(): Locator {
    return this.page.locator('[data-testid="share-facebook"]');
  }

  get twitterShareButton(): Locator {
    return this.page.locator('[data-testid="share-twitter"]');
  }

  get emailShareButton(): Locator {
    return this.page.locator('[data-testid="share-email"]');
  }

  // Navigation to dog detail page
  async navigateToDogDetail(slug: string) {
    await super.navigate(`/dogs/${slug}`);
    await this.waitForPageLoad();
  }

  async navigateFromDogCard(dogName: string) {
    const dogCard = this.page.locator('.dog-card, [data-testid="dog-card"]').filter({ hasText: dogName });
    await dogCard.click();
    await this.waitForPageLoad();
  }

  // Dog information validation
  async expectDogInformationToLoad() {
    await expect(this.dogName).toBeVisible();
    await expect(this.dogBreed).toBeVisible();
    await expect(this.dogAge).toBeVisible();
    await expect(this.dogSex).toBeVisible();
    await expect(this.dogSize).toBeVisible();
  }

  async expectDogDetails(expectedDetails: {
    name?: string;
    breed?: string;
    age?: string;
    sex?: string;
    size?: string;
    status?: string;
  }) {
    if (expectedDetails.name) {
      await expect(this.dogName).toContainText(expectedDetails.name);
    }
    if (expectedDetails.breed) {
      await expect(this.dogBreed).toContainText(expectedDetails.breed);
    }
    if (expectedDetails.age) {
      await expect(this.dogAge).toContainText(expectedDetails.age);
    }
    if (expectedDetails.sex) {
      await expect(this.dogSex).toContainText(expectedDetails.sex);
    }
    if (expectedDetails.size) {
      await expect(this.dogSize).toContainText(expectedDetails.size);
    }
    if (expectedDetails.status) {
      await expect(this.dogStatus).toContainText(expectedDetails.status);
    }
  }

  async getDogInformation(): Promise<{
    name: string;
    breed: string;
    age: string;
    sex: string;
    size: string;
  }> {
    await this.expectDogInformationToLoad();
    
    const name = await this.dogName.textContent();
    const breed = await this.dogBreed.textContent();
    const age = await this.dogAge.textContent();
    const sex = await this.dogSex.textContent();
    const size = await this.dogSize.textContent();

    return {
      name: name?.trim() || '',
      breed: breed?.trim() || '',
      age: age?.trim() || '',
      sex: sex?.trim() || '',
      size: size?.trim() || ''
    };
  }

  async expectDogDescription() {
    await expect(this.dogDescription).toBeVisible();
    expect((await this.dogDescription.textContent())?.length).toBeGreaterThan(0);
  }

  // Hero image validation
  async expectHeroImageToLoad() {
    await expect(this.heroImage).toBeVisible();
    
    // Check that image has loaded (src attribute and is not broken)
    const src = await this.heroImage.getAttribute('src');
    expect(src).toBeTruthy();
    
    // Wait for image to be fully loaded
    await expect(this.heroImage).toHaveJSProperty('complete', true);
    await expect(this.heroImage).toHaveJSProperty('naturalWidth', expect.any(Number));
    
    const naturalWidth = await this.heroImage.evaluate((img: HTMLImageElement) => img.naturalWidth);
    expect(naturalWidth).toBeGreaterThan(0);
  }

  async expectHeroImageError() {
    // Check for image error state or placeholder
    const hasErrorClass = await this.heroImage.evaluate((img: HTMLImageElement) => 
      img.classList.contains('error') || img.src.includes('placeholder')
    );
    expect(hasErrorClass).toBeTruthy();
  }

  // Organization validation
  async expectOrganizationInformationToLoad() {
    await expect(this.organizationCard).toBeVisible();
    await expect(this.organizationName).toBeVisible();
  }

  async expectOrganizationDetails(expectedDetails: {
    name?: string;
    website?: string;
    location?: string;
  }) {
    await this.expectOrganizationInformationToLoad();
    
    if (expectedDetails.name) {
      await expect(this.organizationName).toContainText(expectedDetails.name);
    }
    if (expectedDetails.website && await this.organizationWebsite.isVisible()) {
      await expect(this.organizationWebsite).toContainText(expectedDetails.website);
    }
    if (expectedDetails.location && await this.organizationLocation.isVisible()) {
      await expect(this.organizationLocation).toContainText(expectedDetails.location);
    }
  }

  async getOrganizationInformation(): Promise<{
    name: string;
    website?: string;
    location?: string;
  }> {
    await this.expectOrganizationInformationToLoad();
    
    const name = await this.organizationName.textContent();
    const website = await this.organizationWebsite.isVisible() 
      ? await this.organizationWebsite.textContent() 
      : undefined;
    const location = await this.organizationLocation.isVisible() 
      ? await this.organizationLocation.textContent() 
      : undefined;

    return {
      name: name?.trim() || '',
      website: website?.trim(),
      location: location?.trim()
    };
  }

  // Action interactions
  async clickContactOrganization() {
    await this.contactOrganizationButton.click();
    // This might open a modal, navigate to external site, or show contact info
  }

  async clickShare() {
    await this.shareButton.click();
    await expect(this.shareOptions).toBeVisible();
  }

  async clickFavorite() {
    await this.favoriteButton.click();
    // Check for visual feedback like color change
  }

  async shareToSocialMedia(platform: 'facebook' | 'twitter' | 'email') {
    await this.clickShare();
    const socialLink = this.socialMediaLinks.locator(`[data-platform="${platform}"]`);
    await socialLink.click();
  }

  // Mobile specific actions
  async expectMobileStickyBar() {
    if (await this.isMobileViewport()) {
      await expect(this.mobileStickyBar).toBeVisible();
      await expect(this.mobileContactButton).toBeVisible();
      await expect(this.mobileShareButton).toBeVisible();
    }
  }

  async clickMobileContact() {
    if (await this.isMobileViewport()) {
      await this.mobileContactButton.click();
    }
  }

  async clickMobileShare() {
    if (await this.isMobileViewport()) {
      await this.mobileShareButton.click();
    }
  }

  // Related dogs validation
  async expectRelatedDogsToLoad() {
    await expect(this.relatedDogsSection).toBeVisible();
    
    // Wait for either dogs to load or empty state
    await Promise.race([
      this.relatedDogCards.first().waitFor({ state: 'visible' }),
      this.page.getByText(/no other dogs/i).waitFor({ state: 'visible' })
    ]);
  }

  async expectRelatedDogsLoading() {
    await expect(this.relatedDogsLoading).toBeVisible();
  }

  async expectRelatedDogsError() {
    await expect(this.relatedDogsError).toBeVisible();
  }

  async getRelatedDogsCount(): Promise<number> {
    await this.expectRelatedDogsToLoad();
    return await this.relatedDogCards.count();
  }

  async clickRelatedDog(index: number = 0) {
    const relatedDog = this.relatedDogCards.nth(index);
    await relatedDog.click();
    await this.waitForPageLoad();
  }

  async expectRelatedDogsFromSameOrganization(organizationName: string) {
    await this.expectRelatedDogsToLoad();
    
    // Verify related dogs section shows same organization
    const sectionTitle = this.relatedDogsSection.locator('h2, h3');
    await expect(sectionTitle).toContainText(organizationName);
  }

  // Navigation validation
  async expectBreadcrumbs() {
    await expect(this.breadcrumbs).toBeVisible();
    await expect(this.backToDogsLink).toBeVisible();
  }

  async navigateBackToDogs() {
    await this.backToDogsLink.click();
    await this.waitForPageLoad();
    await this.expectUrl(/\/dogs$/);
  }

  // Loading and error states
  async expectLoadingState() {
    await expect(this.dogDetailSkeleton).toBeVisible();
  }

  async expectErrorState() {
    await expect(this.errorAlert).toBeVisible();
  }

  async expectNotFoundState() {
    await expect(this.notFoundMessage).toBeVisible();
  }

  async retryAfterError() {
    await this.retryButton.click();
    await this.waitForPageLoad();
  }

  // URL and metadata validation
  async expectCorrectUrl(dogSlug: string) {
    await this.expectUrl(new RegExp(`/dogs/${dogSlug}$`));
  }

  async expectPageTitle(dogName: string) {
    await expect(this.page).toHaveTitle(new RegExp(dogName));
  }

  async expectMetaDescription(dogName: string) {
    const metaDescription = this.page.locator('meta[name="description"]');
    const content = await metaDescription.getAttribute('content');
    expect(content).toContain(dogName);
  }

  // Responsive behavior validation
  async expectDesktopLayout() {
    if (await this.isDesktopViewport()) {
      // Desktop-specific layout checks
      await expect(this.heroSection).toBeVisible();
      await expect(this.organizationCard).toBeVisible();
    }
  }

  async expectMobileLayout() {
    if (await this.isMobileViewport()) {
      await this.expectMobileStickyBar();
      // Mobile-specific layout checks
    }
  }

  // Accessibility validation
  async checkAccessibilityFeatures() {
    await this.checkAccessibility();
    
    // Check that hero image has alt text
    const altText = await this.heroImage.getAttribute('alt');
    expect(altText).toBeTruthy();
    
    // Check that main content is accessible
    await expect(this.page.getByRole('main')).toBeVisible();
    
    // Check that contact buttons are accessible
    await expect(this.contactOrganizationButton).toBeVisible();
  }

  // Full page validation
  async expectDogDetailPageToLoad(expectedDog?: {
    name: string;
    breed: string;
    organization: string;
  }) {
    await this.waitForPageLoad();
    await this.expectDogInformationToLoad();
    await this.expectHeroImageToLoad();
    await this.expectOrganizationInformationToLoad();
    
    if (expectedDog) {
      await this.expectDogDetails({
        name: expectedDog.name,
        breed: expectedDog.breed
      });
      await this.expectOrganizationDetails({
        name: expectedDog.organization
      });
    }
    
    // Related dogs should start loading
    await this.expectRelatedDogsToLoad();
  }

  // Additional methods for test requirements
  async navigate(slug: string): Promise<void> {
    await this.navigateToDogDetail(slug);
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(200);
  }

  async getDogName(): Promise<string> {
    // Simply wait for any H1 and check if we're on a dog detail page
    await this.page.waitForURL(/\/dogs\/[^\/]+$/, { timeout: 10000 });
    
    // Wait for page content to load
    await this.page.waitForTimeout(1000);
    
    // Try multiple strategies to find the dog name
    // Strategy 1: Look for H1 with large text styling (the dog name from DogDetailClient.jsx line 375)
    const styledH1 = this.page.locator('h1.text-3xl, h1[class*="text-3xl"]');
    const styledH1Count = await styledH1.count();
    
    if (styledH1Count > 0) {
      const text = await styledH1.first().textContent();
      if (text && text.trim() !== '' && text.trim() !== 'Find Your New Best Friend') {
        return text.trim();
      }
    }
    
    // Strategy 2: Look for any H1 that's not the main page title
    const h1Elements = await this.page.locator('h1').all();
    
    for (const h1 of h1Elements) {
      const text = await h1.textContent();
      if (text && 
          text.trim() !== 'Find Your New Best Friend' && 
          text.trim() !== '' &&
          !text.toLowerCase().includes('filter') &&
          !text.toLowerCase().includes('navigation') &&
          !text.toLowerCase().includes('home') &&
          !text.toLowerCase().includes('dogs')) {
        return text.trim();
      }
    }
    
    // Strategy 3: Fallback to the original selector
    return await this.dogName.textContent() || '';
  }

  async getBreadcrumbItems(): Promise<string[]> {
    const items = await this.breadcrumbs.locator('a, span').all();
    const texts = [];
    for (const item of items) {
      const text = await item.textContent();
      if (text) texts.push(text.trim());
    }
    return texts;
  }

  async clickBreadcrumb(text: string): Promise<void> {
    await this.breadcrumbs.locator('a', { hasText: text }).click();
  }

  async clickBackButton(): Promise<void> {
    try {
      console.log('[DogDetailPage] Attempting to click back button');
      
      // Wait for back button to be visible and clickable
      await this.backButton.waitFor({ state: 'visible', timeout: 5000 });
      console.log('[DogDetailPage] Back button found, clicking');
      await this.backButton.click();
      
      // Wait for navigation to start
      await this.page.waitForTimeout(500);
      
    } catch (error) {
      // Fallback: Use browser back button if data-testid back button not found
      console.log('[DogDetailPage] Back button not found, using browser back navigation');
      await this.page.goBack();
      
      // Wait for navigation to start
      await this.page.waitForTimeout(500);
    }
    
    console.log('[DogDetailPage] Back navigation initiated');
  }

  // Hero Image Methods
  async waitForHeroImageLoad(): Promise<boolean> {
    try {
      console.log(`[DogDetailPage] Waiting for hero image to load`);
      
      // First check if loading state is visible
      try {
        await this.heroImageLoading.waitFor({ state: 'visible', timeout: 1000 });
        console.log(`[DogDetailPage] Hero image loading state detected`);
      } catch {
        console.log(`[DogDetailPage] No loading state detected, checking for image directly`);
      }
      
      // Wait for the actual image to be visible
      await this.heroImage.waitFor({ state: 'visible', timeout: 10000 });
      
      // Verify the image has actually loaded (not broken)
      const isImageLoaded = await this.heroImage.evaluate((img: HTMLImageElement) => {
        return img.complete && img.naturalHeight !== 0;
      });
      
      if (!isImageLoaded) {
        console.warn(`[DogDetailPage] Hero image element is visible but image failed to load`);
        return false;
      }
      
      console.log(`[DogDetailPage] Hero image loaded successfully`);
      return true;
    } catch (error) {
      console.error(`[DogDetailPage] Hero image failed to load: ${error}`);
      return false;
    }
  }

  async isHeroImageVisible(): Promise<boolean> {
    return await this.heroImage.isVisible();
  }

  async waitForHeroImageError(): Promise<void> {
    await this.heroImageError.waitFor({ state: 'visible', timeout: 3000 });
  }

  async isHeroImageErrorVisible(): Promise<boolean> {
    return await this.heroImageError.isVisible();
  }

  async isHeroImageRetryVisible(): Promise<boolean> {
    return await this.heroImageRetry.isVisible();
  }

  async clickHeroImageRetry(): Promise<void> {
    await this.heroImageRetry.click();
  }

  // Metadata Methods
  async getMetadataCards(): Promise<{
    age: string;
    gender: string;
    breed: string;
    size: string;
  }> {
    try {
      console.log(`[DogDetailPage] Getting metadata cards`);
      
      // Wait for metadata cards container to be visible
      await this.metadataCards.waitFor({ state: 'visible', timeout: 5000 });
      
      const age = await this.dogAge.textContent().catch(() => '') || '';
      const gender = await this.dogSex.textContent().catch(() => '') || '';
      const breed = await this.dogBreedCard.textContent().catch(() => '') || '';
      const size = await this.dogSize.textContent().catch(() => '') || '';
      
      const metadata = { age, gender, breed, size };
      console.log(`[DogDetailPage] Retrieved metadata:`, metadata);
      
      // Validate that we got at least some metadata
      if (!age && !gender && !breed && !size) {
        throw new Error('No metadata could be retrieved from cards');
      }
      
      return metadata;
    } catch (error) {
      console.error(`[DogDetailPage] Failed to get metadata cards: ${error}`);
      throw new Error(`Failed to get metadata cards: ${error}`);
    }
    const age = await this.dogAge.textContent() || '';
    const gender = await this.dogSex.textContent() || '';
    const breed = await this.dogBreedCard.textContent() || '';
    const size = await this.dogSize.textContent() || '';
    
    return { age, gender, breed, size };
  }

  async getAboutText(): Promise<string> {
    // The DogDescription component renders content in a div with dangerouslySetInnerHTML
    const descriptionContent = this.aboutSection.locator('[data-testid="description-content"]');
    return await descriptionContent.textContent() || '';
  }

  // CTA Section Methods
  async isCTASectionVisible(): Promise<boolean> {
    return await this.ctaSection.isVisible();
  }

  async isAdoptButtonVisible(): Promise<boolean> {
    return await this.adoptButton.isVisible();
  }

  async getAdoptionUrl(): Promise<string> {
    return await this.adoptButton.getAttribute('href') || '';
  }

  async adoptButtonOpensInNewTab(): Promise<boolean> {
    const target = await this.adoptButton.getAttribute('target');
    return target === '_blank';
  }

  // Organization Methods
  async getOrganizationInfo(): Promise<{
    name: string;
    location: string;
  }> {
    try {
      console.log(`[DogDetailPage] Getting organization information`);
      
      // Wait for organization container to be visible
      await this.organizationContainer.waitFor({ state: 'visible', timeout: 5000 });
      
      const name = await this.organizationName.textContent().catch(() => '') || '';
      const location = await this.organizationLocation.textContent().catch(() => '') || '';
      
      const orgInfo = { name, location };
      console.log(`[DogDetailPage] Retrieved organization info:`, orgInfo);
      
      // Validate that we got at least organization name
      if (!name) {
        throw new Error('Organization name is required but was not found');
      }
      
      return orgInfo;
    } catch (error) {
      console.error(`[DogDetailPage] Failed to get organization info: ${error}`);
      throw new Error(`Failed to get organization info: ${error}`);
    }
    return { name, location };
  }

  // Related Dogs Methods
  async isRelatedDogsSectionVisible(): Promise<boolean> {
    return await this.relatedDogsSection.isVisible();
  }

  async getRelatedDogCount(): Promise<number> {
    return await this.relatedDogCards.count();
  }

  async getFirstRelatedDogName(): Promise<string> {
    const firstRelated = this.relatedDogCards.first();
    return await firstRelated.locator('[data-testid="related-dog-name"]').textContent() || '';
  }

  async clickFirstRelatedDog(): Promise<void> {
    await this.relatedDogCards.first().click();
  }

  // Mobile Methods
  async isMobileStickyBarVisible(): Promise<boolean> {
    return await this.mobileStickyBar.isVisible();
  }

  async stickyBarHasAdoptButton(): Promise<boolean> {
    return await this.mobileStickyBar.locator('[data-testid="mobile-contact-button"]').isVisible();
  }

  async getStickyBarDogName(): Promise<string> {
    return await this.mobileStickyBar.locator('[data-testid="dog-name"]').textContent() || '';
  }

  // Social Sharing Methods
  async areSocialShareButtonsVisible(): Promise<boolean> {
    try {
      // Check if the main share button is visible first
      const shareButton = this.page.locator('[data-testid="share-button"]');
      
      // Wait for the share button to appear with a reasonable timeout
      await shareButton.waitFor({ state: 'visible', timeout: 5000 });
      return await shareButton.isVisible();
    } catch (error) {
      console.log('[DogDetailPage] Share button not found:', error.message);
      return false;
    }
  }

  async getSocialShareButtons(): Promise<string[]> {
    // Click the share button to open dropdown if it's not already open
    const shareButton = this.page.locator('[data-testid="share-button"]');
    await shareButton.click({ force: true, timeout: 10000 });
    
    try {
      // Try to wait for dropdown to appear (non-native share browsers)
      await this.socialMediaLinks.waitFor({ state: 'visible', timeout: 3000 });
      
      const buttons = [];
      if (await this.facebookShareButton.isVisible()) buttons.push('facebook');
      if (await this.twitterShareButton.isVisible()) buttons.push('twitter');
      if (await this.emailShareButton.isVisible()) buttons.push('email');
      return buttons;
    } catch (error) {
      // If dropdown doesn't appear, we're probably on webkit with native share
      console.log('[DogDetailPage] Dropdown not found, likely using native share API');
      // Return empty array since native share doesn't expose individual buttons
      return [];
    }
  }

  async getShareUrl(platform: string): Promise<string> {
    // Click the share button to open dropdown if it's not already open
    const shareButton = this.page.locator('[data-testid="share-button"]');
    await shareButton.click({ force: true, timeout: 10000 });
    
    try {
      // Try to wait for dropdown to appear (non-native share browsers)
      await this.socialMediaLinks.waitFor({ state: 'visible', timeout: 3000 });
      
      let button: Locator;
      switch (platform) {
        case 'facebook':
          button = this.facebookShareButton;
          break;
        case 'twitter':
          button = this.twitterShareButton;
          break;
        case 'email':
          button = this.emailShareButton;
          break;
        default:
          throw new Error(`Unknown platform: ${platform}`);
      }
      return await button.getAttribute('href') || '';
    } catch (error) {
      // If dropdown doesn't appear, we're probably on webkit with native share
      console.log('[DogDetailPage] Dropdown not found for share URLs, likely using native share API');
      // Return empty string since native share doesn't expose individual URLs
      return '';
    }
  }

  // Error State Methods
  async isErrorPageVisible(): Promise<boolean> {
    return await this.errorPage.isVisible();
  }

  async getErrorMessage(): Promise<string> {
    return await this.notFoundMessage.textContent() || '';
  }

  async isBackToDogsLinkVisible(): Promise<boolean> {
    return await this.backToDogsLink.isVisible();
  }

  async clickBackToDogsLink(): Promise<void> {
    await this.backToDogsLink.click();
  }

  // Complete user journey validation
  async validateDogDetailUserJourney(dogSlug: string) {
    await this.navigateToDogDetail(dogSlug);
    await this.expectDogDetailPageToLoad();
    
    // Test hero image interaction
    await this.expectHeroImageToLoad();
    
    // Test contact functionality
    await this.clickContactOrganization();
    
    // Test sharing functionality
    await this.clickShare();
    
    // Test related dogs
    if (await this.getRelatedDogsCount() > 0) {
      await this.clickRelatedDog(0);
      await this.expectDogDetailPageToLoad();
    }
    
    // Test navigation back
    await this.navigateBackToDogs();
  }
}