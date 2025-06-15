/**
 * Image Loading Consistency Tests
 * 
 * These tests ensure consistent behavior between catalog page images (DogCard)
 * and details page images (HeroImageWithBlurredBackground), preventing
 * regressions where one works but the other doesn't.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import DogCard from '../../components/dogs/DogCard';
import HeroImageWithBlurredBackground from '../../components/ui/HeroImageWithBlurredBackground';
import { getCatalogCardImage, getDetailHeroImage } from '../../utils/imageUtils';

// Mock dog data for testing
const mockDog = {
  id: 1,
  name: 'Test Dog',
  breed: 'Test Breed',
  standardized_breed: 'Test Breed',
  breed_group: 'Test Group',
  age: 'Adult',
  sex: 'Male',
  size: 'Medium',
  status: 'available',
  primary_image_url: 'https://res.cloudinary.com/test-cloud/image/upload/v123/test-dog.jpg',
  organization: {
    id: 1,
    name: 'Test Rescue',
    city: 'Test City',
    country: 'Test Country',
    social_media: {}
  }
};

const TEST_IMAGE_URL = 'https://res.cloudinary.com/test-cloud/image/upload/v123/consistency-test.jpg';
const EXTERNAL_IMAGE_URL = 'https://example.com/external-dog.jpg';

describe('Image Loading Consistency', () => {
  describe('URL Transformation Consistency', () => {
    test('both components should handle Cloudinary URLs consistently', () => {
      // Test catalog card transformation
      const catalogTransformed = getCatalogCardImage(TEST_IMAGE_URL);
      expect(catalogTransformed).toContain('w_400,h_300');
      expect(catalogTransformed).toContain('c_fill');
      expect(catalogTransformed).toContain('g_auto');
      expect(catalogTransformed).toContain('f_auto');
      expect(catalogTransformed).toContain('q_auto');

      // Test detail hero transformation
      const heroTransformed = getDetailHeroImage(TEST_IMAGE_URL);
      expect(heroTransformed).toContain('w_800,h_450');
      expect(heroTransformed).toContain('c_fill');
      expect(heroTransformed).toContain('g_auto');
      expect(heroTransformed).toContain('f_auto');
      expect(heroTransformed).toContain('q_auto');

      // Both should maintain the same base URL structure
      const catalogBase = catalogTransformed.split('/upload/')[0];
      const heroBase = heroTransformed.split('/upload/')[0];
      expect(catalogBase).toBe(heroBase);
    });

    test('both components should handle external URLs consistently', () => {
      const catalogTransformed = getCatalogCardImage(EXTERNAL_IMAGE_URL);
      const heroTransformed = getDetailHeroImage(EXTERNAL_IMAGE_URL);

      // Both should either transform to Cloudinary fetch or preserve original
      if (catalogTransformed.includes('cloudinary.com')) {
        expect(heroTransformed).toContain('cloudinary.com');
        expect(catalogTransformed).toContain('/image/fetch/');
        expect(heroTransformed).toContain('/image/fetch/');
      } else {
        expect(catalogTransformed).toBe(EXTERNAL_IMAGE_URL);
        expect(heroTransformed).toBe(EXTERNAL_IMAGE_URL);
      }
    });

    test('both components should handle null/invalid URLs consistently', () => {
      const catalogNull = getCatalogCardImage(null);
      const heroNull = getDetailHeroImage(null);
      
      expect(catalogNull).toBe('/placeholder_dog.svg');
      expect(heroNull).toBe('/placeholder_dog.svg');

      const catalogUndefined = getCatalogCardImage(undefined);
      const heroUndefined = getDetailHeroImage(undefined);
      
      expect(catalogUndefined).toBe('/placeholder_dog.svg');
      expect(heroUndefined).toBe('/placeholder_dog.svg');
    });
  });

  describe('Error Handling Consistency', () => {
    test('both components should show appropriate fallback content for invalid images', () => {
      // Test DogCard with invalid image
      const dogWithInvalidImage = { ...mockDog, primary_image_url: null };
      
      render(<DogCard dog={dogWithInvalidImage} />);
      
      // DogCard should still render with placeholder
      expect(screen.getByText('Test Dog')).toBeInTheDocument();
      // DogCard shows a placeholder div with icon when image is null
      expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();

      // Test HeroImage with invalid image
      render(<HeroImageWithBlurredBackground src={null} alt="Test" />);
      
      expect(screen.getByText('No image available')).toBeInTheDocument();
    });

    test('both components should handle loading errors gracefully', async () => {
      const errorImageUrl = 'https://httpstat.us/404';

      // Test DogCard error handling
      const dogWithErrorImage = { ...mockDog, primary_image_url: errorImageUrl };
      render(<DogCard dog={dogWithErrorImage} />);
      
      // Should still show dog information even if image fails
      expect(screen.getByText('Test Dog')).toBeInTheDocument();
      expect(screen.getByText('Test Breed')).toBeInTheDocument();

      // Test HeroImage error handling
      render(<HeroImageWithBlurredBackground src={errorImageUrl} alt="Error test" />);
      
      // Both components should handle network errors gracefully
      expect(screen.getByText('Test Dog')).toBeInTheDocument(); // DogCard info available
      expect(screen.getByText('Loading image...')).toBeInTheDocument(); // HeroImage shows loading initially
    });
  });

  describe('Performance Consistency', () => {
    test('image dimensions should be appropriate for each context', () => {
      // Catalog images should be smaller for grid display
      const catalogUrl = getCatalogCardImage(TEST_IMAGE_URL);
      if (catalogUrl.includes('cloudinary.com')) {
        expect(catalogUrl).toContain('w_400,h_300'); // Smaller for grid
      }

      // Hero images should be larger but optimized
      const heroUrl = getDetailHeroImage(TEST_IMAGE_URL);
      if (heroUrl.includes('cloudinary.com')) {
        expect(heroUrl).toContain('w_800,h_450'); // Larger for hero, but not excessive
        expect(heroUrl).not.toContain('w_1200'); // Should not use very large dimensions
      }
    });

    test('both components should use appropriate loading strategies', () => {
      render(<DogCard dog={mockDog} />);
      render(<HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Hero test" />);

      const images = screen.getAllByRole('img');
      
      // Find catalog and hero images
      const catalogImg = images.find(img => img.closest('[class*="aspect-[4/3]"]'));
      const heroImg = images.find(img => img.closest('[class*="aspect-[16/9]"]'));

      if (catalogImg) {
        // Catalog images should use lazy loading
        expect(catalogImg).toHaveAttribute('loading', 'lazy');
      }

      if (heroImg) {
        // Hero images should use eager loading
        expect(heroImg).toHaveAttribute('loading', 'eager');
      }
    });
  });

  describe('User Experience Consistency', () => {
    test('both components should provide loading indicators', () => {
      // Test DogCard loading state
      render(<DogCard dog={mockDog} />);
      
      // DogCard should be rendered in a card container
      const cardContainer = screen.getByText('Test Dog').closest('div');
      expect(cardContainer).toBeInTheDocument();

      // Test HeroImage loading state
      render(<HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Loading test" />);
      
      expect(screen.getByTestId('shimmer-loader')).toBeInTheDocument();
      expect(screen.getByText('Loading image...')).toBeInTheDocument();
    });

    test('both components should maintain accessibility standards', () => {
      render(<DogCard dog={mockDog} />);
      render(<HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Accessibility test" />);

      const images = screen.getAllByRole('img');
      
      // All images should have alt text
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
        expect(img.getAttribute('alt')).not.toBe('');
      });
    });

    test('both components should handle responsive design appropriately', () => {
      render(<DogCard dog={mockDog} />);
      render(<HeroImageWithBlurredBackground src={TEST_IMAGE_URL} alt="Responsive test" />);

      // DogCard should have 4:3 aspect ratio for grid layout - check testid instead
      expect(screen.getByTestId('image-placeholder')).toHaveClass('aspect-[4/3]');

      // HeroImage should have 16:9 aspect ratio for hero display
      expect(screen.getByTestId('hero-image-clean')).toHaveClass('aspect-[16/9]');
    });
  });

  describe('Component Integration', () => {
    test('catalog and detail pages should work seamlessly together', () => {
      // This simulates a user flow: viewing a dog card, then going to detail page
      
      // First render the catalog card
      const { rerender } = render(<DogCard dog={mockDog} />);
      
      expect(screen.getByText('Test Dog')).toBeInTheDocument();
      expect(screen.getByText('Test Breed')).toBeInTheDocument();

      // Then render the detail page hero image with the same image URL
      rerender(<HeroImageWithBlurredBackground src={mockDog.primary_image_url} alt={mockDog.name} />);
      
      expect(screen.getByTestId('hero-image-clean')).toBeInTheDocument();
      
      const heroImg = screen.getByRole('img');
      expect(heroImg).toHaveAttribute('alt', 'Test Dog');
    });

    test('should maintain image quality consistency across components', () => {
      const catalogUrl = getCatalogCardImage(TEST_IMAGE_URL);
      const heroUrl = getDetailHeroImage(TEST_IMAGE_URL);

      // Both should use auto quality optimization
      if (catalogUrl.includes('cloudinary.com')) {
        expect(catalogUrl).toContain('q_auto');
      }
      
      if (heroUrl.includes('cloudinary.com')) {
        expect(heroUrl).toContain('q_auto');
      }

      // Both should use auto format optimization
      if (catalogUrl.includes('cloudinary.com')) {
        expect(catalogUrl).toContain('f_auto');
      }
      
      if (heroUrl.includes('cloudinary.com')) {
        expect(heroUrl).toContain('f_auto');
      }
    });
  });
});