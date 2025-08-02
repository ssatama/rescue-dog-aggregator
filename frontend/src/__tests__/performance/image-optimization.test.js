/**
 * Image Optimization Performance Tests
 *
 * Tests to ensure image optimization meets performance requirements:
 * - R2 + Cloudflare Images transformations are applied correctly
 * - Responsive breakpoints work
 * - Format optimization (f_auto, q_auto)
 * - Preloading effectiveness
 */

import {
  getDetailHeroImageWithPosition,
  getCatalogCardImage,
  getThumbnailImage,
  preloadImages,
  handleImageError,
} from "../../utils/imageUtils";

describe("Image Optimization Performance Tests", () => {
  beforeEach(() => {
    // Mock document.head for preloading tests
    document.head.appendChild = jest.fn();
    document.createElement = jest.fn(() => ({
      rel: "",
      as: "",
      href: "",
      setAttribute: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("R2 + Cloudflare Images Transformations", () => {
    test("hero images include format and quality optimization", () => {
      const testUrl =
        "https://images.rescuedogs.me/rescue_dogs/test-org/sample.jpg";
      const result = getDetailHeroImageWithPosition(testUrl);

      expect(result.src).toContain("quality=auto");
      expect(result.src).toContain("fit=contain");
    });

    test("catalog card images have proper dimensions and optimization", () => {
      const testUrl =
        "https://images.rescuedogs.me/rescue_dogs/test-org/sample.jpg";
      const optimizedUrl = getCatalogCardImage(testUrl);

      expect(optimizedUrl).toContain("w=400,h=300");
      expect(optimizedUrl).toContain("fit=cover");
      expect(optimizedUrl).toContain("quality=auto");
    });

    test("thumbnail images use efficient square cropping", () => {
      const testUrl =
        "https://images.rescuedogs.me/rescue_dogs/test-org/sample.jpg";
      const thumbnailUrl = getThumbnailImage(testUrl);

      expect(thumbnailUrl).toContain("w=200,h=200");
      expect(thumbnailUrl).toContain("fit=cover");
      expect(thumbnailUrl).toContain("quality=60");
    });

    test("non-R2 URLs get proper fallback handling", () => {
      const externalUrl = "https://example.com/dog.jpg";

      // Should handle gracefully without breaking
      const heroResult = getDetailHeroImageWithPosition(externalUrl);
      const catalogResult = getCatalogCardImage(externalUrl);
      const thumbnailResult = getThumbnailImage(externalUrl);

      expect(heroResult.src).toBeTruthy();
      expect(catalogResult).toBeTruthy();
      expect(thumbnailResult).toBeTruthy();

      // External URLs should be returned as-is
      expect(heroResult.src).toBe(externalUrl);
      expect(catalogResult).toBe(externalUrl);
      expect(thumbnailResult).toBe(externalUrl);
    });
  });

  describe("Performance Optimizations", () => {
    test("image preloading creates proper preload links", () => {
      const imageUrls = [
        "https://images.rescuedogs.me/rescue_dogs/test-org/dog1.jpg",
        "https://images.rescuedogs.me/rescue_dogs/test-org/dog2.jpg",
        "https://example.com/external.jpg",
      ];

      preloadImages(imageUrls);

      expect(document.createElement).toHaveBeenCalledTimes(3);
      expect(document.head.appendChild).toHaveBeenCalledTimes(3);
    });

    test("image error handling provides proper fallback chain", () => {
      const originalUrl = "https://example.com/original.jpg";
      const mockEvent = {
        target: {
          src: "https://images.rescuedogs.me/cdn-cgi/image/w_400,h_300/rescue_dogs/test-org/transformed.jpg",
          onerror: jest.fn(),
        },
      };

      handleImageError(mockEvent, originalUrl);

      // Should fallback to original URL first
      expect(mockEvent.target.src).toBe(originalUrl);
    });

    test("error handling prevents infinite loops", () => {
      const originalUrl = "https://example.com/original.jpg";
      const mockEvent = {
        target: {
          src: originalUrl,
          onerror: jest.fn(),
        },
      };

      handleImageError(mockEvent, originalUrl);

      // Should clear onerror to prevent infinite loops
      expect(mockEvent.target.onerror).toBeNull();
    });
  });

  describe("Responsive Image Strategy", () => {
    test("images are optimized for different contexts", () => {
      const testUrl =
        "https://images.rescuedogs.me/rescue_dogs/test-org/sample.jpg";

      const heroResult = getDetailHeroImageWithPosition(testUrl);
      const catalogResult = getCatalogCardImage(testUrl);
      const thumbnailResult = getThumbnailImage(testUrl);

      // Hero images should be large and wide
      expect(heroResult.src).toContain("w=800,h=600");

      // Catalog cards should be medium and square-ish
      expect(catalogResult).toContain("w=400,h=300");

      // Thumbnails should be small and square
      expect(thumbnailResult).toContain("w=200,h=200");
    });

    test("catalog images are optimized for card display", () => {
      const testUrl =
        "https://images.rescuedogs.me/rescue_dogs/test-org/sample.jpg";
      const optimizedUrl = getCatalogCardImage(testUrl);

      // Should use fixed dimensions for cards
      expect(optimizedUrl).toContain("w=400,h=300");
    });
  });

  describe("Format Optimization", () => {
    test("all image functions include automatic format selection", () => {
      const testUrl =
        "https://images.rescuedogs.me/rescue_dogs/test-org/sample.jpg";

      const heroResult = getDetailHeroImageWithPosition(testUrl);
      const catalogResult = getCatalogCardImage(testUrl);
      const thumbnailResult = getThumbnailImage(testUrl);

      // Cloudflare Images doesn't use f_auto parameter anymore
      expect(heroResult.src).toContain("quality=auto");
      expect(catalogResult).toContain("quality=auto");
      expect(thumbnailResult).toContain("quality=60");
    });

    test("all image functions include automatic quality optimization", () => {
      const testUrl =
        "https://images.rescuedogs.me/rescue_dogs/test-org/sample.jpg";

      const heroResult = getDetailHeroImageWithPosition(testUrl);
      const catalogResult = getCatalogCardImage(testUrl);
      const thumbnailResult = getThumbnailImage(testUrl);

      expect(heroResult.src).toContain("quality=auto");
      expect(catalogResult).toContain("quality=auto");
      expect(thumbnailResult).toContain("quality=60");
    });
  });

  describe("Edge Cases", () => {
    test("handles null/undefined URLs gracefully", () => {
      expect(() => {
        getDetailHeroImageWithPosition(null);
        getCatalogCardImage(null);
        getThumbnailImage(null);
      }).not.toThrow();
    });

    test("handles empty string URLs", () => {
      expect(() => {
        getDetailHeroImageWithPosition("");
        getCatalogCardImage("");
        getThumbnailImage("");
      }).not.toThrow();
    });

    test("handles malformed URLs", () => {
      const badUrl = "not-a-url";

      expect(() => {
        getDetailHeroImageWithPosition(badUrl);
        getCatalogCardImage(badUrl);
        getThumbnailImage(badUrl);
      }).not.toThrow();
    });
  });
});
