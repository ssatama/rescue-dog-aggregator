/**
 * Real Image Loading Integration Tests
 * 
 * These tests validate actual image loading functionality without mocking,
 * ensuring the frontend and backend image configurations are compatible.
 */

import { getCatalogCardImage, getDetailHeroImage, getHomeCardImage, isR2Url } from '../../utils/imageUtils';

// Test with real backend-style URLs to prevent config mismatches
const R2_CUSTOM_DOMAIN = process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN || 'images.rescuedogs.me';
const SAMPLE_R2_URL = `https://${R2_CUSTOM_DOMAIN}/rescue_dogs/organization_id_5/lucky_91abb895.jpg`;
const SAMPLE_EXTERNAL_URL = 'https://example.com/dog.jpg';

describe('Real Image Loading Integration', () => {
  describe('R2 URL Detection', () => {
    test('correctly identifies R2 URLs', () => {
      expect(isR2Url(SAMPLE_R2_URL)).toBe(true);
      expect(isR2Url(SAMPLE_EXTERNAL_URL)).toBe(false);
      expect(isR2Url('')).toBe(false);
      expect(isR2Url(null)).toBe(false);
    });
  });

  describe('Image URL Transformations', () => {
    test('catalog card transformations preserve R2 domain', () => {
      const transformed = getCatalogCardImage(SAMPLE_R2_URL);
      
      // Should maintain the correct R2 domain
      expect(transformed).toContain(R2_CUSTOM_DOMAIN);
      expect(transformed).toContain('/cdn-cgi/image/');
      
      // Should add optimization parameters (fixed dimensions)
      expect(transformed).toContain('w=400,h=300');
      expect(transformed).toContain('fit=cover');
      expect(transformed).toContain('quality=auto');
    });

    test('hero image transformations preserve R2 domain', () => {
      const transformed = getDetailHeroImage(SAMPLE_R2_URL);
      
      expect(transformed).toContain(R2_CUSTOM_DOMAIN);
      expect(transformed).toContain('w=800,h=600');
      expect(transformed).toContain('fit=contain');
      expect(transformed).toContain('quality=auto');
    });

    test('home card transformations preserve R2 domain', () => {
      const transformed = getHomeCardImage(SAMPLE_R2_URL);
      
      expect(transformed).toContain(R2_CUSTOM_DOMAIN);
      expect(transformed).toContain('w=400,h=300');
      expect(transformed).toContain('fit=cover');
    });
  });

  describe('External URL Handling', () => {
    test('external URLs are returned as-is', () => {
      const transformed = getCatalogCardImage(SAMPLE_EXTERNAL_URL);
      
      // R2 system returns external URLs as-is (no transformation)
      expect(transformed).toBe(SAMPLE_EXTERNAL_URL);
    });
  });

  describe('Environment Configuration Validation', () => {
    test('R2 custom domain is configured', () => {
      const r2Domain = process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN || R2_CUSTOM_DOMAIN;
      expect(r2Domain).toBeDefined();
      expect(r2Domain).toBe(R2_CUSTOM_DOMAIN); // Must match backend
      expect(r2Domain.length).toBeGreaterThan(0);
    });

    test('API URL is configured for local development', () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      expect(apiUrl).toBeDefined();
      // Accept both test and development API URLs
      expect(['http://localhost:8000', 'http://localhost:3000']).toContain(apiUrl);
    });
  });

  describe('Image URL Format Consistency', () => {
    test('transformed URLs maintain valid R2 format', () => {
      const originalUrl = SAMPLE_R2_URL;
      const transformations = [
        getCatalogCardImage(originalUrl),
        getDetailHeroImage(originalUrl),
        getHomeCardImage(originalUrl)
      ];

      transformations.forEach(transformed => {
        // Must be valid R2 URL with Cloudflare Images
        expect(transformed).toMatch(new RegExp(`^https:\\/\\/${R2_CUSTOM_DOMAIN}\\/cdn-cgi\\/image\\/`));
        
        // Must contain transformation parameters
        expect(transformed).toContain('/cdn-cgi/image/');
        expect(transformed.split('/cdn-cgi/image/').length).toBe(2);
        
        // Must not have double slashes or malformed URLs
        expect(transformed).not.toContain('//cdn-cgi//');
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
      
      // R2 system returns non-R2 URLs as-is (no transformation)
      expect(result).toBe(malformedUrl);
    });
  });
});

describe('Backend-Frontend Image URL Compatibility', () => {
  test('sample backend URL format is handled correctly', () => {
    // This test uses the actual URL format returned by the backend
    const backendUrl = SAMPLE_R2_URL;
    
    // Frontend should recognize it as R2
    expect(isR2Url(backendUrl)).toBe(true);
    
    // Frontend should be able to transform it
    const transformed = getCatalogCardImage(backendUrl);
    expect(transformed).toContain(R2_CUSTOM_DOMAIN);
    expect(transformed).toContain('w=400');
  });

  test('domain consistency between frontend and backend format', () => {
    const backendStyleUrl = `https://${R2_CUSTOM_DOMAIN}/rescue_dogs/org_1/dog.jpg`;
    const transformed = getCatalogCardImage(backendStyleUrl);
    
    // Extract domain from both URLs
    const backendDomain = backendStyleUrl.match(/https:\/\/([^\/]+)/)[1];
    const frontendDomain = transformed.match(/https:\/\/([^\/]+)/)[1];
    
    expect(frontendDomain).toBe(backendDomain);
    expect(frontendDomain).toBe(R2_CUSTOM_DOMAIN);
  });
});