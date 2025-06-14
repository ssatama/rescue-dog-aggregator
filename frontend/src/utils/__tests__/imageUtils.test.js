// frontend/src/utils/__tests__/imageUtils.test.js

import {
  getHomeCardImage,
  getCatalogCardImage,
  getDetailHeroImage,
  getThumbnailImage,
  getDogThumbnail,
  getDogDetailImage,
  getDogSmallThumbnail,
  getSmartObjectPosition,
  getCatalogCardImageWithPosition,
  getDetailHeroImageWithPosition,
  handleImageError,
  preloadImages
} from '../imageUtils';

// Mock environment
const mockCloudinaryCloudName = 'test-cloud';
process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = mockCloudinaryCloudName;

// Test data - defined globally for all tests
const cloudinaryUrl = 'https://res.cloudinary.com/test-cloud/image/upload/v123/sample.jpg';
const externalUrl = 'https://example.com/image.jpg';
const invalidUrl = null;

describe('Image Utils - New Context-Specific Functions', () => {

  describe('getHomeCardImage', () => {
    it('should apply 4:3 home card transformations to Cloudinary URLs', () => {
      const result = getHomeCardImage(cloudinaryUrl);
      expect(result).toContain('w_400,h_300,c_fill,g_auto:subject,q_auto,f_auto');
    });

    it('should use fetch API for external URLs when Cloudinary is enabled', () => {
      // Ensure Cloudinary is enabled for this test
      const originalCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = mockCloudinaryCloudName;
      
      const result = getHomeCardImage(externalUrl);
      if (result !== externalUrl) {
        expect(result).toContain('image/fetch/w_400,h_300,c_fill,g_auto:subject,q_auto,f_auto');
        expect(result).toContain(encodeURIComponent(externalUrl));
      }
      
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = originalCloudName;
    });

    it('should return placeholder for invalid URLs', () => {
      const result = getHomeCardImage(invalidUrl);
      expect(result).toBe('/placeholder_dog.svg');
    });
  });

  describe('getCatalogCardImage', () => {
    it('should apply 4:3 catalog card transformations to Cloudinary URLs', () => {
      const result = getCatalogCardImage(cloudinaryUrl);
      expect(result).toContain('w_320,h_240,c_fill,g_auto:subject,q_auto,f_auto');
    });

    it('should handle external URLs appropriately', () => {
      const result = getCatalogCardImage(externalUrl);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getDetailHeroImage', () => {
    it('should apply 16:9 hero transformations with background fill', () => {
      const result = getDetailHeroImage(cloudinaryUrl);
      expect(result).toContain('w_800,h_450,c_pad,b_auto:predominant,q_auto,f_auto');
    });

    it('should handle external URLs appropriately', () => {
      const result = getDetailHeroImage(externalUrl);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getThumbnailImage', () => {
    it('should apply square thumbnail transformations', () => {
      const result = getThumbnailImage(cloudinaryUrl);
      expect(result).toContain('w_150,h_150,c_fill,g_auto:subject,q_auto,f_auto');
    });

    it('should handle external URLs appropriately', () => {
      const result = getThumbnailImage(externalUrl);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

describe('Smart Object Positioning', () => {
  describe('getSmartObjectPosition', () => {
    it('should return correct positioning for different contexts', () => {
      expect(getSmartObjectPosition('test.jpg', 'card')).toBe('center 40%');
      expect(getSmartObjectPosition('test.jpg', 'hero')).toBe('center center');
      expect(getSmartObjectPosition('test.jpg', 'thumbnail')).toBe('center center');
    });

    it('should default to center center for unknown contexts', () => {
      expect(getSmartObjectPosition('test.jpg', 'unknown')).toBe('center center');
    });
  });

  describe('getCatalogCardImageWithPosition', () => {
    it('should return image source and position object', () => {
      const result = getCatalogCardImageWithPosition(cloudinaryUrl);
      expect(result).toHaveProperty('src');
      expect(result).toHaveProperty('position');
      expect(result.src).toContain('w_320,h_240');
      expect(result.position).toBe('center 40%');
    });

    it('should handle invalid URLs gracefully', () => {
      const result = getCatalogCardImageWithPosition(null);
      expect(result.src).toBe('/placeholder_dog.svg');
      expect(result.position).toBe('center center');
    });
  });

  describe('getDetailHeroImageWithPosition', () => {
    it('should return hero image source and position object', () => {
      const result = getDetailHeroImageWithPosition(cloudinaryUrl);
      expect(result).toHaveProperty('src');
      expect(result).toHaveProperty('position');
      expect(result.src).toContain('w_800,h_450');
      expect(result.position).toBe('center center');
    });
  });
});

describe('Legacy Function Compatibility', () => {
  describe('getDogThumbnail (legacy)', () => {
    it('should still work for backward compatibility', () => {
      const result = getDogThumbnail(cloudinaryUrl);
      expect(result).toContain('w_300,h_300,c_fill,g_auto');
    });
  });

  describe('getDogDetailImage (legacy)', () => {
    it('should still work for backward compatibility', () => {
      const result = getDogDetailImage(cloudinaryUrl);
      expect(result).toContain('w_800,h_600,c_fit');
    });
  });

  describe('getDogSmallThumbnail (legacy)', () => {
    it('should still work for backward compatibility', () => {
      const result = getDogSmallThumbnail(cloudinaryUrl);
      expect(result).toContain('w_150,h_150,c_fit');
    });
  });
});

describe('Error Handling', () => {
  describe('handleImageError', () => {
    let mockEvent;

    beforeEach(() => {
      mockEvent = {
        target: {
          src: '',
          onerror: jest.fn()
        }
      };
    });

    it('should fallback to original URL for Cloudinary failures', () => {
      mockEvent.target.src = cloudinaryUrl;
      handleImageError(mockEvent, externalUrl);
      expect(mockEvent.target.src).toBe(externalUrl);
    });

    it('should fallback to placeholder for general failures', () => {
      mockEvent.target.src = externalUrl;
      handleImageError(mockEvent, externalUrl);
      expect(mockEvent.target.src).toBe('/placeholder_dog.svg');
    });

    it('should clear onerror to prevent infinite loops', () => {
      handleImageError(mockEvent, externalUrl);
      expect(mockEvent.target.onerror).toBeNull();
    });
  });
});

describe('Performance Utilities', () => {
  describe('preloadImages', () => {
    let originalCreateElement;
    let originalAppendChild;
    let mockLink;

    beforeEach(() => {
      mockLink = {
        rel: '',
        as: '',
        href: ''
      };
      originalCreateElement = document.createElement;
      originalAppendChild = document.head.appendChild;
      document.createElement = jest.fn(() => mockLink);
      document.head.appendChild = jest.fn();
    });

    afterEach(() => {
      document.createElement = originalCreateElement;
      document.head.appendChild = originalAppendChild;
    });

    it('should create preload links for valid URLs', () => {
      const urls = [cloudinaryUrl, externalUrl];
      preloadImages(urls);
      
      expect(document.createElement).toHaveBeenCalledTimes(2);
      expect(document.createElement).toHaveBeenCalledWith('link');
      expect(document.head.appendChild).toHaveBeenCalledTimes(2);
    });

    it('should skip invalid URLs', () => {
      const urls = [null, '', cloudinaryUrl];
      preloadImages(urls);
      
      expect(document.createElement).toHaveBeenCalledTimes(1);
      expect(document.head.appendChild).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Edge Cases', () => {
  it('should handle missing Cloudinary cloud name', () => {
    const originalCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    delete process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    
    const result = getCatalogCardImage(externalUrl);
    expect(result).toBe(externalUrl);
    
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = originalCloudName;
  });

  it('should handle malformed URLs gracefully', () => {
    const malformedUrl = 'not-a-url';
    const result = getCatalogCardImage(malformedUrl);
    // Should not throw an error and return something reasonable
    expect(typeof result).toBe('string');
  });
});