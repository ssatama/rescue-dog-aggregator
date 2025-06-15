/**
 * Image Optimization Performance Tests
 * 
 * Tests to ensure image optimization meets performance requirements:
 * - Cloudinary transformations are applied correctly
 * - Responsive breakpoints work
 * - Format optimization (f_auto, q_auto)
 * - Preloading effectiveness
 */

import { 
  getDetailHeroImageWithPosition,
  getCatalogCardImage,
  getThumbnailImage,
  preloadImages,
  handleImageError
} from '../../utils/imageUtils';

describe('Image Optimization Performance Tests', () => {
  beforeEach(() => {
    // Mock document.head for preloading tests
    document.head.appendChild = jest.fn();
    document.createElement = jest.fn(() => ({
      rel: '',
      as: '',
      href: '',
      setAttribute: jest.fn()
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cloudinary Transformations', () => {
    test('hero images include format and quality optimization', () => {
      const testUrl = 'https://res.cloudinary.com/test/image/upload/v123/sample.jpg';
      const result = getDetailHeroImageWithPosition(testUrl);
      
      expect(result.src).toContain('f_auto');
      expect(result.src).toContain('q_auto');
    });

    test('catalog card images have proper dimensions and optimization', () => {
      const testUrl = 'https://res.cloudinary.com/test/image/upload/v123/sample.jpg';
      const optimizedUrl = getCatalogCardImage(testUrl);
      
      expect(optimizedUrl).toContain('w_400,h_300');
      expect(optimizedUrl).toContain('c_fill');
      expect(optimizedUrl).toContain('g_auto');
      expect(optimizedUrl).toContain('f_auto');
      expect(optimizedUrl).toContain('q_auto');
    });

    test('thumbnail images use efficient square cropping', () => {
      const testUrl = 'https://res.cloudinary.com/test/image/upload/v123/sample.jpg';
      const thumbnailUrl = getThumbnailImage(testUrl);
      
      expect(thumbnailUrl).toContain('w_200,h_200');
      expect(thumbnailUrl).toContain('c_fill');
      expect(thumbnailUrl).toContain('g_auto');
      expect(thumbnailUrl).toContain('f_auto');
      expect(thumbnailUrl).toContain('q_auto:low');
    });

    test('non-Cloudinary URLs get proper fallback handling', () => {
      const externalUrl = 'https://example.com/dog.jpg';
      
      // Should handle gracefully without breaking
      const heroResult = getDetailHeroImageWithPosition(externalUrl);
      const catalogResult = getCatalogCardImage(externalUrl);
      const thumbnailResult = getThumbnailImage(externalUrl);
      
      expect(heroResult.src).toBeTruthy();
      expect(catalogResult).toBeTruthy();
      expect(thumbnailResult).toBeTruthy();
    });
  });

  describe('Performance Optimizations', () => {
    test('preloadImages creates proper preload links', () => {
      const testUrls = [
        'https://res.cloudinary.com/test/image/upload/v123/dog1.jpg',
        'https://res.cloudinary.com/test/image/upload/v123/dog2.jpg'
      ];

      preloadImages(testUrls);

      expect(document.createElement).toHaveBeenCalledTimes(2);
      expect(document.head.appendChild).toHaveBeenCalledTimes(2);
    });

    test('preloadImages handles empty or invalid URLs gracefully', () => {
      const testUrls = [null, undefined, '', 'https://example.com/valid.jpg'];

      preloadImages(testUrls);

      // Should only create preload for valid URL
      expect(document.createElement).toHaveBeenCalledTimes(1);
      expect(document.head.appendChild).toHaveBeenCalledTimes(1);
    });

    test('image error handling provides proper fallback chain', () => {
      const mockEvent = {
        target: {
          src: 'https://res.cloudinary.com/test/image/upload/failed.jpg',
          onerror: null
        }
      };
      const originalUrl = 'https://example.com/original.jpg';

      handleImageError(mockEvent, originalUrl);

      // Should fallback to original URL first
      expect(mockEvent.target.src).toBe(originalUrl);
    });

    test('error handling prevents infinite loops', () => {
      const mockEvent = {
        target: {
          src: '/placeholder_dog.svg',
          onerror: jest.fn()
        }
      };

      handleImageError(mockEvent, null);

      // Should set onerror to null to prevent loops
      expect(mockEvent.target.onerror).toBeNull();
    });
  });

  describe('Responsive Image Strategy', () => {
    test('hero images have appropriate positioning for mobile/desktop', () => {
      const testUrl = 'https://res.cloudinary.com/test/image/upload/v123/sample.jpg';
      const result = getDetailHeroImageWithPosition(testUrl);
      
      expect(result.position).toBeDefined();
      expect(typeof result.position).toBe('string');
      expect(result.position).toMatch(/center|top|bottom/);
    });

    test('catalog images are optimized for card display', () => {
      const testUrl = 'https://res.cloudinary.com/test/image/upload/v123/sample.jpg';
      const optimizedUrl = getCatalogCardImage(testUrl);
      
      // Should use fixed dimensions for cards
      expect(optimizedUrl).toContain('w_400,h_300');
    });
  });

  describe('Format Optimization', () => {
    test('all image functions include automatic format selection', () => {
      const testUrl = 'https://res.cloudinary.com/test/image/upload/v123/sample.jpg';
      
      const heroResult = getDetailHeroImageWithPosition(testUrl);
      const catalogResult = getCatalogCardImage(testUrl);
      const thumbnailResult = getThumbnailImage(testUrl);
      
      expect(heroResult.src).toContain('f_auto');
      expect(catalogResult).toContain('f_auto');
      expect(thumbnailResult).toContain('f_auto');
    });

    test('all image functions include automatic quality optimization', () => {
      const testUrl = 'https://res.cloudinary.com/test/image/upload/v123/sample.jpg';
      
      const heroResult = getDetailHeroImageWithPosition(testUrl);
      const catalogResult = getCatalogCardImage(testUrl);
      const thumbnailResult = getThumbnailImage(testUrl);
      
      expect(heroResult.src).toContain('q_auto');
      expect(catalogResult).toContain('q_auto');
      expect(thumbnailResult).toContain('q_auto');
    });
  });

  describe('Edge Cases', () => {
    test('handles null/undefined URLs gracefully', () => {
      expect(() => {
        getDetailHeroImageWithPosition(null);
        getCatalogCardImage(undefined);
        getThumbnailImage('');
      }).not.toThrow();
    });

    test('placeholder image is returned for invalid URLs', () => {
      const heroResult = getDetailHeroImageWithPosition(null);
      const catalogResult = getCatalogCardImage(null);
      const thumbnailResult = getThumbnailImage(null);
      
      expect(heroResult.src).toContain('placeholder_dog.svg');
      expect(catalogResult).toContain('placeholder_dog.svg');
      expect(thumbnailResult).toContain('placeholder_dog.svg');
    });
  });
});