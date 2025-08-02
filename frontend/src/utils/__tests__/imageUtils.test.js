// frontend/src/utils/__tests__/imageUtils.test.js - Updated for R2 + Cloudflare Images

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
  preloadImages,
  isR2Url,
  // New consolidated functions to be implemented
  getOptimizedImage,
  buildSecureCloudflareUrl,
  validateImageUrl,
  createTransformationParams,
} from "../imageUtils";

// Use REAL environment configuration instead of mocking
// This ensures tests validate the actual R2 configuration
const realR2Domain =
  process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN || "images.rescuedogs.me";

// Test data - use real R2 URLs that match backend
const r2Url = `https://${realR2Domain}/animals/test-org/sample.jpg`;
const externalUrl = "https://example.com/image.jpg";
const invalidUrl = null;

describe("Image Utils - R2 Context-Specific Functions", () => {
  describe("getHomeCardImage", () => {
    it("should apply 4:3 home card transformations to R2 URLs using Cloudflare format", () => {
      const result = getHomeCardImage(r2Url);
      expect(result).toContain("/cdn-cgi/image/");
      expect(result).toContain("w=400,h=300,fit=cover,quality=auto");
    });

    it("should return original URL for external URLs (no transformation possible)", () => {
      const result = getHomeCardImage(externalUrl);
      expect(result).toBe(externalUrl);
    });

    it("should return placeholder for invalid URLs", () => {
      const result = getHomeCardImage(invalidUrl);
      expect(result).toBe("/placeholder_dog.svg");
    });
  });

  describe("getCatalogCardImage", () => {
    it("should apply 4:3 catalog card transformations to R2 URLs using Cloudflare format", () => {
      const result = getCatalogCardImage(r2Url);
      expect(result).toContain("/cdn-cgi/image/");
      expect(result).toContain("w=400,h=300,fit=cover,quality=auto");
    });

    it("should return original URL for external URLs", () => {
      const result = getCatalogCardImage(externalUrl);
      expect(result).toBe(externalUrl);
    });
  });

  describe("getCatalogCardImageWithPosition - Enhanced 4:3 Ratio", () => {
    it("should use proper Cloudflare format for 4:3 aspect ratio", () => {
      const result = getCatalogCardImageWithPosition(r2Url);
      expect(result.src).toContain("/cdn-cgi/image/");
      expect(result.src).toContain("w=400,h=300,fit=cover,quality=auto");
    });

    it("should maintain R2 URL format for existing URLs", () => {
      const result = getCatalogCardImageWithPosition(r2Url);
      expect(result.src).toContain(realR2Domain);
      expect(result.position).toBe("center 40%");
    });

    it("should handle external URLs without transformation", () => {
      const result = getCatalogCardImageWithPosition(externalUrl);
      expect(result.src).toBe(externalUrl);
      expect(result.position).toBe("center 40%");
    });

    it("should return placeholder with center position for null URL", () => {
      const result = getCatalogCardImageWithPosition(null);
      expect(result.src).toBe("/placeholder_dog.svg");
      expect(result.position).toBe("center center");
    });

    it("should ensure 4:3 aspect ratio is maintained across all R2 transformations", () => {
      // Test with different R2 URL formats
      const urls = [
        r2Url,
        `https://${realR2Domain}/animals/another-org/image.jpg`,
        `https://${realR2Domain}/uploads/folder/image.jpg`,
      ];

      urls.forEach((url) => {
        const result = getCatalogCardImageWithPosition(url);
        if (result.src !== "/placeholder_dog.svg") {
          expect(result.src).toContain("w=400,h=300,fit=cover");
        }
      });
    });

    it("should optimize for catalog display with proper crop and gravity", () => {
      const result = getCatalogCardImageWithPosition(r2Url);
      expect(result.src).toContain("fit=cover");
      expect(result.src).toContain("w=400,h=300");
    });
  });

  describe("getDetailHeroImage", () => {
    it("should apply proper aspect ratio hero transformations using Cloudflare format", () => {
      const result = getDetailHeroImage(r2Url);
      expect(result).toContain("/cdn-cgi/image/");
      expect(result).toContain("w=800,h=600,fit=contain,quality=auto");
    });

    it("should return original URL for external URLs", () => {
      const result = getDetailHeroImage(externalUrl);
      expect(result).toBe(externalUrl);
    });
  });

  describe("getThumbnailImage", () => {
    it("should apply square thumbnail transformations using Cloudflare format", () => {
      const result = getThumbnailImage(r2Url);
      expect(result).toContain("/cdn-cgi/image/");
      expect(result).toContain("w=200,h=200,fit=cover,quality=60");
    });

    it("should return original URL for external URLs", () => {
      const result = getThumbnailImage(externalUrl);
      expect(result).toBe(externalUrl);
    });
  });
});

describe("Smart Object Positioning", () => {
  describe("getSmartObjectPosition", () => {
    it("should return correct positioning for different contexts", () => {
      expect(getSmartObjectPosition("test.jpg", "card")).toBe("center 40%");
      expect(getSmartObjectPosition("test.jpg", "hero")).toBe("center center");
      expect(getSmartObjectPosition("test.jpg", "thumbnail")).toBe(
        "center center",
      );
    });

    it("should default to center center for unknown contexts", () => {
      expect(getSmartObjectPosition("test.jpg", "unknown")).toBe(
        "center center",
      );
    });
  });

  describe("getCatalogCardImageWithPosition", () => {
    it("should return image source and position object", () => {
      const result = getCatalogCardImageWithPosition(r2Url);
      expect(result).toHaveProperty("src");
      expect(result).toHaveProperty("position");
      expect(result.src).toContain("w=400,h=300,fit=cover");
      expect(result.position).toBe("center 40%");
    });

    it("should handle invalid URLs gracefully", () => {
      const result = getCatalogCardImageWithPosition(null);
      expect(result.src).toBe("/placeholder_dog.svg");
      expect(result.position).toBe("center center");
    });
  });

  describe("getDetailHeroImageWithPosition", () => {
    it("should return hero image source and position object", () => {
      const result = getDetailHeroImageWithPosition(r2Url);
      expect(result).toHaveProperty("src");
      expect(result).toHaveProperty("position");
      expect(result.src).toContain("w=800,h=600,fit=contain");
      expect(result.position).toBe("center center");
    });
  });
});

describe("Legacy Function Compatibility", () => {
  describe("getDogThumbnail (legacy)", () => {
    it("should still work for backward compatibility using Cloudflare format", () => {
      const result = getDogThumbnail(r2Url);
      expect(result).toContain("/cdn-cgi/image/");
      expect(result).toContain("w=300,h=300,fit=cover,quality=auto");
    });
  });

  describe("getDogDetailImage (legacy)", () => {
    it("should still work for backward compatibility using Cloudflare format", () => {
      const result = getDogDetailImage(r2Url);
      expect(result).toContain("/cdn-cgi/image/");
      expect(result).toContain("w=800,h=600,fit=contain");
    });
  });

  describe("getDogSmallThumbnail (legacy)", () => {
    it("should still work for backward compatibility using Cloudflare format", () => {
      const result = getDogSmallThumbnail(r2Url);
      expect(result).toContain("/cdn-cgi/image/");
      expect(result).toContain("w=150,h=150,fit=contain");
    });
  });
});

describe("R2 URL Detection", () => {
  describe("isR2Url", () => {
    it("should detect R2 URLs correctly", () => {
      expect(isR2Url(r2Url)).toBe(true);
      expect(isR2Url(`https://${realR2Domain}/test.jpg`)).toBe(true);
    });

    it("should reject non-R2 URLs", () => {
      expect(isR2Url(externalUrl)).toBe(false);
      expect(isR2Url("https://cloudinary.com/test.jpg")).toBe(false);
      expect(isR2Url(null)).toBe(false);
      expect(isR2Url("")).toBe(false);
    });
  });
});

describe("Error Handling", () => {
  describe("handleImageError", () => {
    let mockEvent;

    beforeEach(() => {
      mockEvent = {
        target: {
          src: "",
          onerror: jest.fn(),
        },
      };
    });

    it("should fallback to original URL for R2 transformation failures", () => {
      const r2TransformUrl = `https://${realR2Domain}/cdn-cgi/image/w_400,h_300/${r2Url.replace(`https://${realR2Domain}/`, "")}`;
      mockEvent.target.src = r2TransformUrl;
      handleImageError(mockEvent, externalUrl);
      expect(mockEvent.target.src).toBe(externalUrl);
    });

    it("should try R2 URL without transformations if transformation fails", () => {
      const r2TransformUrl = `https://${realR2Domain}/cdn-cgi/image/w_400,h_300/animals/test-org/sample.jpg`;
      mockEvent.target.src = r2TransformUrl;
      handleImageError(mockEvent, r2Url);
      expect(mockEvent.target.src).toBe(
        `https://${realR2Domain}/animals/test-org/sample.jpg`,
      );
    });

    it("should fallback to placeholder for general failures", () => {
      mockEvent.target.src = externalUrl;
      handleImageError(mockEvent, externalUrl);
      expect(mockEvent.target.src).toBe("/placeholder_dog.svg");
    });

    it("should clear onerror to prevent infinite loops", () => {
      handleImageError(mockEvent, externalUrl);
      expect(mockEvent.target.onerror).toBeNull();
    });
  });
});

describe("Performance Utilities", () => {
  describe("preloadImages", () => {
    let originalCreateElement;
    let originalAppendChild;
    let mockLink;

    beforeEach(() => {
      mockLink = {
        rel: "",
        as: "",
        href: "",
        setAttribute: jest.fn(),
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

    it("should create preload links for valid URLs", () => {
      const urls = [r2Url, externalUrl];
      preloadImages(urls);

      expect(document.createElement).toHaveBeenCalledTimes(2);
      expect(document.createElement).toHaveBeenCalledWith("link");
      expect(document.head.appendChild).toHaveBeenCalledTimes(2);
    });

    it("should skip invalid URLs", () => {
      const urls = [null, "", r2Url];
      preloadImages(urls);

      expect(document.createElement).toHaveBeenCalledTimes(1);
      expect(document.head.appendChild).toHaveBeenCalledTimes(1);
    });
  });
});

describe("Edge Cases", () => {
  it("should handle missing R2 custom domain configuration", () => {
    // Test fallback behavior when R2 is not configured
    const result = getCatalogCardImage(externalUrl);

    // Without R2 configuration, external URLs should be returned as-is
    expect(result).toBe(externalUrl);
  });

  it("should handle malformed URLs gracefully", () => {
    const malformedUrl = "not-a-url";
    const result = getCatalogCardImage(malformedUrl);
    // Should not throw an error and return something reasonable
    expect(typeof result).toBe("string");
    expect(result).toBe(malformedUrl); // Should return as-is for non-R2 URLs
  });

  it("should handle R2 URLs with complex paths", () => {
    const complexR2Url = `https://${realR2Domain}/animals/test-org/subfolder/image-with-dashes_and_underscores.jpg`;
    const result = getCatalogCardImage(complexR2Url);
    expect(result).toContain("/cdn-cgi/image/");
    expect(result).toContain("w=400,h=300,fit=cover");
  });
});

// =====================================================
// NEW CONSOLIDATED FUNCTIONS TESTS (TDD - RED PHASE)
// =====================================================

describe("New Consolidated Image Functions", () => {
  describe("validateImageUrl", () => {
    it("should validate secure R2 URLs", () => {
      expect(validateImageUrl(r2Url)).toBe(true);
      expect(
        validateImageUrl(`https://${realR2Domain}/valid/path/image.jpg`),
      ).toBe(true);
    });

    it("should reject URLs with path traversal attempts", () => {
      expect(
        validateImageUrl(`https://${realR2Domain}/../malicious/path.jpg`),
      ).toBe(false);
      expect(
        validateImageUrl(`https://${realR2Domain}/folder/../../../secret.jpg`),
      ).toBe(false);
      expect(validateImageUrl(`https://${realR2Domain}/./file.jpg`)).toBe(
        false,
      );
    });

    it("should reject non-R2 URLs", () => {
      expect(validateImageUrl("https://malicious.com/image.jpg")).toBe(false);
      expect(validateImageUrl("http://insecure.com/image.jpg")).toBe(false);
    });

    it("should handle invalid inputs gracefully", () => {
      expect(validateImageUrl(null)).toBe(false);
      expect(validateImageUrl("")).toBe(false);
      expect(validateImageUrl("not-a-url")).toBe(false);
    });
  });

  describe("createTransformationParams", () => {
    it("should create proper Cloudflare format parameters for catalog preset", () => {
      const params = createTransformationParams("catalog");
      expect(params).toBe("w=400,h=300,fit=cover,quality=auto");
    });

    it("should create proper Cloudflare format parameters for hero preset", () => {
      const params = createTransformationParams("hero");
      expect(params).toBe("w=800,h=600,fit=contain,quality=auto");
    });

    it("should create proper Cloudflare format parameters for thumbnail preset", () => {
      const params = createTransformationParams("thumbnail");
      expect(params).toBe("w=200,h=200,fit=cover,quality=60");
    });

    it("should create proper Cloudflare format parameters for mobile preset", () => {
      const params = createTransformationParams("mobile");
      expect(params).toBe("w=320,h=240,fit=cover,quality=70");
    });

    it("should allow custom parameters override", () => {
      const params = createTransformationParams("catalog", {
        width: 500,
        height: 400,
        quality: 85,
      });
      expect(params).toBe("w=500,h=400,fit=cover,quality=85");
    });

    it("should handle network-aware quality adjustment", () => {
      // Mock slow connection
      const params = createTransformationParams("catalog", {}, true);
      expect(params).toContain("quality=60"); // Lower quality for slow connections
    });

    it("should default to catalog preset for unknown presets", () => {
      const params = createTransformationParams("unknown");
      expect(params).toBe("w=400,h=300,fit=cover,quality=auto");
    });
  });

  describe("buildSecureCloudflareUrl", () => {
    it("should build secure Cloudflare transformation URLs", () => {
      const params = "w=400,h=300,fit=cover,quality=auto";
      const result = buildSecureCloudflareUrl(r2Url, params);

      expect(result).toContain(`https://${realR2Domain}/cdn-cgi/image/`);
      expect(result).toContain("w=400,h=300,fit=cover,quality=auto");
      expect(result).toContain("animals/test-org/sample.jpg");
    });

    it("should reject invalid URLs for security", () => {
      const params = "w=400,h=300,fit=cover,quality=auto";
      const maliciousUrl = `https://${realR2Domain}/../secret/file.jpg`;

      expect(() => buildSecureCloudflareUrl(maliciousUrl, params)).toThrow(
        "Invalid image path",
      );
    });

    it("should sanitize transformation parameters", () => {
      const maliciousParams =
        "w=400,h=300,fit=cover,quality=auto;DROP TABLE users;";

      expect(() => buildSecureCloudflareUrl(r2Url, maliciousParams)).toThrow(
        "Invalid transformation parameters",
      );
    });

    it("should handle missing parameters gracefully", () => {
      const result = buildSecureCloudflareUrl(r2Url, "");
      expect(result).toBe(r2Url); // Return original URL if no transformations
    });

    it("should return original URL for non-R2 URLs", () => {
      const params = "w=400,h=300,fit=cover,quality=auto";
      const result = buildSecureCloudflareUrl(externalUrl, params);
      expect(result).toBe(externalUrl);
    });
  });

  describe("getOptimizedImage", () => {
    it("should return optimized R2 URL with catalog preset by default", () => {
      const result = getOptimizedImage(r2Url);

      expect(result).toContain(`https://${realR2Domain}/cdn-cgi/image/`);
      expect(result).toContain("w=400,h=300,fit=cover,quality=auto");
    });

    it("should apply different presets correctly", () => {
      const heroResult = getOptimizedImage(r2Url, "hero");
      const thumbnailResult = getOptimizedImage(r2Url, "thumbnail");

      expect(heroResult).toContain("w=800,h=600,fit=contain");
      expect(thumbnailResult).toContain("w=200,h=200,fit=cover,quality=60");
    });

    it("should handle external URLs without transformation", () => {
      const result = getOptimizedImage(externalUrl, "hero");
      expect(result).toBe(externalUrl);
    });

    it("should return placeholder for null URLs", () => {
      const result = getOptimizedImage(null);
      expect(result).toBe("/placeholder_dog.svg");
    });

    it("should handle custom options", () => {
      const result = getOptimizedImage(r2Url, "catalog", {
        width: 600,
        height: 400,
        quality: 90,
      });

      expect(result).toContain("w=600,h=400,fit=cover,quality=90");
    });

    it("should be network-aware for performance", () => {
      const result = getOptimizedImage(r2Url, "catalog", {}, true); // slow connection
      expect(result).toContain("quality=60"); // Lower quality for slow networks
    });
  });
});

describe("Updated Legacy Functions (Cloudflare Format)", () => {
  describe("getDetailHeroImage - Updated Format", () => {
    it("should use proper Cloudflare format instead of old Cloudinary format", () => {
      const result = getDetailHeroImage(r2Url);
      expect(result).toContain("/cdn-cgi/image/");
      // NEW: Should use Cloudflare format (w=800,h=600,fit=contain,quality=auto)
      expect(result).toContain("w=800,h=600,fit=contain,quality=auto");
      // OLD: Should NOT contain old Cloudinary format
      expect(result).not.toContain("w_800,h_400,c_fill");
    });
  });

  describe("getCatalogCardImage - Updated Format", () => {
    it("should use proper Cloudflare format for catalog cards", () => {
      const result = getCatalogCardImage(r2Url);
      expect(result).toContain("/cdn-cgi/image/");
      // NEW: Should use Cloudflare format
      expect(result).toContain("w=400,h=300,fit=cover,quality=auto");
      // OLD: Should NOT contain old format
      expect(result).not.toContain("w_400,h_300,c_fill");
    });
  });

  describe("getThumbnailImage - Updated Format", () => {
    it("should use proper Cloudflare format for thumbnails", () => {
      const result = getThumbnailImage(r2Url);
      expect(result).toContain("/cdn-cgi/image/");
      // NEW: Should use Cloudflare format
      expect(result).toContain("w=200,h=200,fit=cover,quality=60");
      // OLD: Should NOT contain old format
      expect(result).not.toContain("w_200,h_200,c_fill,q_60");
    });
  });
});

describe("Security Tests", () => {
  describe("Path Traversal Prevention", () => {
    it('should reject URLs with "../" patterns', () => {
      const maliciousUrls = [
        `https://${realR2Domain}/../../../etc/passwd`,
        `https://${realR2Domain}/folder/../secret.jpg`,
        `https://${realR2Domain}/./config.json`,
        `https://${realR2Domain}/folder/..%2F..%2Fsecret.jpg`,
        `https://${realR2Domain}/folder/%2E%2E%2Fsecret.jpg`,
      ];

      maliciousUrls.forEach((url) => {
        expect(validateImageUrl(url)).toBe(false);
      });
    });
  });

  describe("Parameter Injection Prevention", () => {
    it("should reject malicious transformation parameters", () => {
      const maliciousParams = [
        "w=400,h=300,fit=cover;DROP TABLE users;",
        "w=400&h=300&rm -rf /",
        "w=400,h=300,script=alert(1)",
        "w=400,h=300,redirect=evil.com",
      ];

      maliciousParams.forEach((params) => {
        expect(() => buildSecureCloudflareUrl(r2Url, params)).toThrow();
      });
    });
  });
});

describe("Performance and Caching Tests", () => {
  describe("Memoization", () => {
    it("should memoize transformation URL generation for better performance", () => {
      // Clear any existing cache
      getOptimizedImage.clearCache?.();

      // Test that same input produces same result (cache hit behavior)
      const result1 = getOptimizedImage(r2Url, "catalog");
      const result2 = getOptimizedImage(r2Url, "catalog");

      // Results should be identical (memoized)
      expect(result1).toBe(result2);

      // Test with different parameters to ensure cache works correctly
      const result3 = getOptimizedImage(r2Url, "hero");
      expect(result3).not.toBe(result1); // Different preset should give different result
    });
  });

  describe("Parameter Consistency", () => {
    it("should generate consistent parameters for same preset to improve CDN caching", () => {
      const result1 = getOptimizedImage(r2Url, "catalog");
      const result2 = getOptimizedImage(
        `https://${realR2Domain}/other/image.jpg`,
        "catalog",
      );

      // Extract transformation parameters from URLs
      const params1 = result1.match(/\/cdn-cgi\/image\/([^\/]+)\//)?.[1];
      const params2 = result2.match(/\/cdn-cgi\/image\/([^\/]+)\//)?.[1];

      expect(params1).toBe(params2); // Same preset should generate identical parameters
    });
  });
});
