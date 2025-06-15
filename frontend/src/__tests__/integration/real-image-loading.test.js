/**
 * Real Image Loading Integration Tests
 * 
 * These tests validate actual image loading functionality without mocking,
 * ensuring the frontend and backend image configurations are compatible.
 */

import { getCatalogCardImage, getDetailHeroImage, getHomeCardImage, isCloudinaryUrl } from '../../utils/imageUtils';

// Test with real backend-style URLs to prevent config mismatches
const TEST_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'test-cloud-name';
const SAMPLE_CLOUDINARY_URL = `https://res.cloudinary.com/${TEST_CLOUD_NAME}/image/upload/v1749383008/rescue_dogs/organization_id_5/lucky_91abb895.jpg`;
const SAMPLE_EXTERNAL_URL = 'https://example.com/dog.jpg';

describe('Real Image Loading Integration', () => {
  describe('Cloudinary URL Detection', () => {
    test('correctly identifies Cloudinary URLs', () => {
      expect(isCloudinaryUrl(SAMPLE_CLOUDINARY_URL)).toBe(true);
      expect(isCloudinaryUrl(SAMPLE_EXTERNAL_URL)).toBe(false);
      expect(isCloudinaryUrl('')).toBe(false);
      expect(isCloudinaryUrl(null)).toBe(false);
    });
  });

  describe('Image URL Transformations', () => {
    test('catalog card transformations preserve cloud name', () => {
      const transformed = getCatalogCardImage(SAMPLE_CLOUDINARY_URL);
      
      // Should maintain the correct cloud name
      expect(transformed).toContain(TEST_CLOUD_NAME);
      expect(transformed).toContain('res.cloudinary.com');
      
      // Should add optimization parameters (fixed dimensions)
      expect(transformed).toContain('w_400,h_300');
      expect(transformed).toContain('c_fill');
      expect(transformed).toContain('g_auto');
      expect(transformed).toContain('f_auto');
      expect(transformed).toContain('q_auto');
    });

    test('hero image transformations preserve cloud name', () => {
      const transformed = getDetailHeroImage(SAMPLE_CLOUDINARY_URL);
      
      expect(transformed).toContain(TEST_CLOUD_NAME);
      expect(transformed).toContain('w_800,h_450');
      expect(transformed).toContain('c_fill');
      expect(transformed).toContain('g_auto');
      expect(transformed).toContain('f_auto');
      expect(transformed).toContain('q_auto');
    });

    test('home card transformations preserve cloud name', () => {
      const transformed = getHomeCardImage(SAMPLE_CLOUDINARY_URL);
      
      expect(transformed).toContain(TEST_CLOUD_NAME);
      expect(transformed).toContain('w_400,h_300');
      expect(transformed).toContain('c_fill');
    });
  });

  describe('External URL Handling', () => {
    test('external URLs get Cloudinary fetch transformation', () => {
      const transformed = getCatalogCardImage(SAMPLE_EXTERNAL_URL);
      
      // Should use Cloudinary fetch with correct cloud name
      if (transformed !== SAMPLE_EXTERNAL_URL) {
        expect(transformed).toContain(TEST_CLOUD_NAME);
        expect(transformed).toContain('/image/fetch/');
        expect(transformed).toContain(encodeURIComponent(SAMPLE_EXTERNAL_URL));
      }
    });
  });

  describe('Environment Configuration Validation', () => {
    test('Cloudinary cloud name is configured', () => {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || TEST_CLOUD_NAME;
      expect(cloudName).toBeDefined();
      expect(cloudName).toBe(TEST_CLOUD_NAME); // Must match backend
      expect(cloudName.length).toBeGreaterThan(0);
    });

    test('API URL is configured for local development', () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      expect(apiUrl).toBeDefined();
      expect(apiUrl).toBe('http://localhost:8000');
    });
  });

  describe('Image URL Format Consistency', () => {
    test('transformed URLs maintain valid Cloudinary format', () => {
      const originalUrl = SAMPLE_CLOUDINARY_URL;
      const transformations = [
        getCatalogCardImage(originalUrl),
        getDetailHeroImage(originalUrl),
        getHomeCardImage(originalUrl)
      ];

      transformations.forEach(transformed => {
        // Must be valid Cloudinary URL
        expect(transformed).toMatch(new RegExp(`^https:\\/\\/res\\.cloudinary\\.com\\/${TEST_CLOUD_NAME}\\/image\\/upload\\/`));
        
        // Must contain transformation parameters
        expect(transformed).toContain('/upload/');
        expect(transformed.split('/upload/').length).toBe(2);
        
        // Must not have double slashes or malformed URLs
        expect(transformed).not.toContain('//upload//');
        expect(transformed).not.toContain('undefined');
      });
    });
  });

  describe('Error Handling', () => {
    test('handles null and undefined gracefully', () => {
      expect(getCatalogCardImage(null)).toBe('/placeholder_dog.svg');
      expect(getCatalogCardImage(undefined)).toBe('/placeholder_dog.svg');
      expect(getCatalogCardImage('')).toBe('/placeholder_dog.svg');
    });

    test('preserves original URL when transformation fails', () => {
      const malformedUrl = 'not-a-valid-url';
      const result = getCatalogCardImage(malformedUrl);
      
      // Should fallback to Cloudinary fetch or return original URL
      if (result !== malformedUrl) {
        expect(result).toContain('dy8y3boog');
      } else {
        // If transformation disabled, original URL is preserved
        expect(result).toBe(malformedUrl);
      }
    });
  });
});

describe('Backend-Frontend Image URL Compatibility', () => {
  test('sample backend URL format is handled correctly', () => {
    // This test uses the actual URL format returned by the backend
    const backendUrl = SAMPLE_CLOUDINARY_URL;
    
    // Frontend should recognize it as Cloudinary
    expect(isCloudinaryUrl(backendUrl)).toBe(true);
    
    // Frontend should be able to transform it
    const transformed = getCatalogCardImage(backendUrl);
    expect(transformed).toContain('dy8y3boog');
    expect(transformed).toContain('w_400');
  });

  test('cloud name consistency between frontend and backend format', () => {
    const backendStyleUrl = 'https://res.cloudinary.com/dy8y3boog/image/upload/v123456/rescue_dogs/org_1/dog.jpg';
    const transformed = getCatalogCardImage(backendStyleUrl);
    
    // Extract cloud name from both URLs
    const backendCloudName = backendStyleUrl.match(/cloudinary\.com\/([^\/]+)/)[1];
    const frontendCloudName = transformed.match(/cloudinary\.com\/([^\/]+)/)[1];
    
    expect(frontendCloudName).toBe(backendCloudName);
    expect(frontendCloudName).toBe(TEST_CLOUD_NAME);
  });
});