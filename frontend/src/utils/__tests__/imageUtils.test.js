// frontend/src/utils/__tests__/imageUtils.test.js - Updated for R2 + Cloudflare Images

import {
  getHomeCardImage,
  getCatalogCardImage,
  getDetailHeroImage,
  getThumbnailImage,
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
  // Double CDN transformation prevention utilities (TDD)
  hasExistingTransformation,
  extractOriginalPath,
  // Unified URL generation for preload/usage consistency
  getUnifiedImageUrl,
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

    it("should accept images.rescuedogs.me as R2 URL", () => {
      expect(isR2Url("https://images.rescuedogs.me/test.jpg")).toBe(true);
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

  // NEW: Tests for unified error handling patterns (TDD - GREEN PHASE)
  describe("Unified Error Handling (FIXED)", () => {
    describe("buildSecureCloudflareUrl consistent fallback behavior", () => {
      it("should return fallbacks for invalid URLs instead of throwing", () => {
        const maliciousUrl = `https://${realR2Domain}/../secret/file.jpg`;
        const params = "w=400,h=300,fit=cover,quality=auto";

        // Should not throw - returns fallback instead
        const result = buildSecureCloudflareUrl(maliciousUrl, params);
        expect(typeof result).toBe("string");
        expect(result).toBe(maliciousUrl); // Returns original URL as fallback
      });

      it("should return fallbacks for malicious parameters instead of throwing", () => {
        const maliciousParams =
          "w=400,h=300,fit=cover,quality=auto;DROP TABLE users;";

        // Should not throw - returns original URL as fallback
        const result = buildSecureCloudflareUrl(r2Url, maliciousParams);
        expect(result).toBe(r2Url); // Returns original URL as fallback
      });

      it("should handle same errors consistently across all code paths", () => {
        const maliciousUrl = `https://${realR2Domain}/../secret/file.jpg`;

        // Direct call now returns fallback (consistent behavior)
        const result1 = buildSecureCloudflareUrl(
          maliciousUrl,
          "w=400,h=300,fit=cover",
        );
        const result2 = getOptimizedImage(maliciousUrl, "catalog");

        // Both should return same type (string) and same fallback pattern
        expect(typeof result1).toBe("string");
        expect(typeof result2).toBe("string");
        expect(result1).toBe(maliciousUrl); // Both return original URL as fallback
        expect(result2).toBe(maliciousUrl);
      });
    });

    describe("Consistent validation and fallback patterns", () => {
      it("should use consistent fallback patterns across all validation functions", () => {
        const maliciousUrl = `https://${realR2Domain}/../secret/file.jpg`;

        // validateImageUrl still returns boolean (for internal use)
        const isValid = validateImageUrl(maliciousUrl);
        expect(isValid).toBe(false);

        // But functions using validation now consistently return string fallbacks
        const result1 = buildSecureCloudflareUrl(
          maliciousUrl,
          "w=400,h=300,fit=cover",
        );
        const result2 = getOptimizedImage(maliciousUrl, "catalog");

        // Both return consistent fallbacks
        expect(typeof result1).toBe("string");
        expect(typeof result2).toBe("string");
        expect(result1).toBe(result2); // Same fallback behavior
      });
    });

    describe("Consistent error logging", () => {
      it("should log security violations without throwing", () => {
        // Mock logger to capture calls
        const logSpy = jest.spyOn(require("../logger").logger, "warn");

        const maliciousUrl = `https://${realR2Domain}/../secret/file.jpg`;

        // Should log security violation and return fallback
        const result = buildSecureCloudflareUrl(
          maliciousUrl,
          "w=400,h=300,fit=cover",
        );

        expect(logSpy).toHaveBeenCalled(); // Should log security error
        expect(typeof result).toBe("string"); // Should return fallback
        expect(result).toBe(maliciousUrl); // Original URL as fallback

        logSpy.mockRestore();
      });

      it("should log parameter violations without throwing", () => {
        const logSpy = jest.spyOn(require("../logger").logger, "warn");

        const maliciousParams = "w=400,h=300,script=alert(1)";

        const result = buildSecureCloudflareUrl(r2Url, maliciousParams);

        expect(logSpy).toHaveBeenCalled(); // Should log parameter error
        expect(result).toBe(r2Url); // Should return original URL

        logSpy.mockRestore();
      });
    });

    describe("Consistent null/undefined handling", () => {
      it("should handle null/undefined URLs consistently across all functions", () => {
        const testCases = [null, undefined, "", "not-a-url"];

        testCases.forEach((invalidUrl) => {
          // All functions should handle invalid URLs consistently
          const result1 = buildSecureCloudflareUrl(
            invalidUrl,
            "w=400,h=300,fit=cover",
          );
          const result2 = getOptimizedImage(invalidUrl, "catalog");
          const result3 = getCatalogCardImage(invalidUrl);

          // All should return valid strings
          expect(typeof result1).toBe("string");
          expect(typeof result2).toBe("string");
          expect(typeof result3).toBe("string");

          // For null/undefined, should return placeholder
          if (invalidUrl === null || invalidUrl === undefined) {
            expect(result1).toBe("/placeholder_dog.svg");
            expect(result2).toBe("/placeholder_dog.svg");
            expect(result3).toBe("/placeholder_dog.svg");
          }

          // For invalid strings, should return original or fallback appropriately
          if (invalidUrl === "" || invalidUrl === "not-a-url") {
            if (invalidUrl === "") {
              expect(result1).toBe("/placeholder_dog.svg"); // Empty string -> placeholder
            } else {
              expect(result1).toBe(invalidUrl); // Invalid URL -> return as-is (non-R2)
            }
          }
        });
      });
    });

    describe("Consistent parameter sanitization", () => {
      it("should handle malicious parameters consistently without throwing", () => {
        const maliciousParams = [
          "w=400;rm -rf /",
          "w=400&h=300&evil=script",
          "w=400,h=300,script=alert(1)",
          "w=400,h=300,redirect=evil.com",
          "",
          null,
          undefined,
        ];

        maliciousParams.forEach((params) => {
          // All parameter processing should return safe fallbacks, never throw
          const result = buildSecureCloudflareUrl(r2Url, params);
          expect(typeof result).toBe("string");
          // Should return original URL for unsafe parameters
          expect(result.includes(realR2Domain)).toBe(true);
          expect(result).toBe(r2Url); // Original URL fallback for all malicious params
        });
      });
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

    it("should return fallbacks for invalid URLs for security", () => {
      const params = "w=400,h=300,fit=cover,quality=auto";
      const maliciousUrl = `https://${realR2Domain}/../secret/file.jpg`;

      // Should return original URL as fallback instead of throwing
      const result = buildSecureCloudflareUrl(maliciousUrl, params);
      expect(result).toBe(maliciousUrl);
    });

    it("should return fallbacks for invalid transformation parameters", () => {
      const maliciousParams =
        "w=400,h=300,fit=cover,quality=auto;DROP TABLE users;";

      // Should return original URL as fallback instead of throwing
      const result = buildSecureCloudflareUrl(r2Url, maliciousParams);
      expect(result).toBe(r2Url);
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

  // =====================================================
  // DOUBLE CDN TRANSFORMATION DETECTION TESTS (TDD - RED PHASE)
  // =====================================================

  describe("hasExistingTransformation", () => {
    it("should detect existing CDN transformations in URLs", () => {
      const transformedUrl = `https://${realR2Domain}/cdn-cgi/image/w=400,h=300,fit=cover/animals/test-org/sample.jpg`;
      expect(hasExistingTransformation(transformedUrl)).toBe(true);
    });

    it("should return false for non-transformed R2 URLs", () => {
      expect(hasExistingTransformation(r2Url)).toBe(false);
    });

    it("should return false for external URLs", () => {
      expect(hasExistingTransformation(externalUrl)).toBe(false);
    });

    it("should handle null/undefined URLs gracefully", () => {
      expect(hasExistingTransformation(null)).toBe(false);
      expect(hasExistingTransformation(undefined)).toBe(false);
      expect(hasExistingTransformation("")).toBe(false);
    });
  });

  describe("extractOriginalPath", () => {
    it("should extract original path from transformed URLs", () => {
      const transformedUrl = `https://${realR2Domain}/cdn-cgi/image/w=400,h=300,fit=cover/animals/test-org/sample.jpg`;
      const expectedOriginal = `https://${realR2Domain}/animals/test-org/sample.jpg`;
      expect(extractOriginalPath(transformedUrl)).toBe(expectedOriginal);
    });

    it("should return original URL if no transformation exists", () => {
      expect(extractOriginalPath(r2Url)).toBe(r2Url);
    });

    it("should handle complex transformation parameters", () => {
      const complexTransform = `https://${realR2Domain}/cdn-cgi/image/w=800,h=600,fit=contain,quality=auto,blur=5/rescue_dogs/pets_in_turkey/melon_3889e35e.jpg`;
      const expectedOriginal = `https://${realR2Domain}/rescue_dogs/pets_in_turkey/melon_3889e35e.jpg`;
      expect(extractOriginalPath(complexTransform)).toBe(expectedOriginal);
    });

    it("should handle nested path structures", () => {
      const nestedTransform = `https://${realR2Domain}/cdn-cgi/image/w=200,h=200,fit=cover,quality=60/animals/org-name/subfolder/deep/image.jpg`;
      const expectedOriginal = `https://${realR2Domain}/animals/org-name/subfolder/deep/image.jpg`;
      expect(extractOriginalPath(nestedTransform)).toBe(expectedOriginal);
    });

    it("should handle external URLs without transformation", () => {
      expect(extractOriginalPath(externalUrl)).toBe(externalUrl);
    });

    it("should handle null/undefined URLs gracefully", () => {
      expect(extractOriginalPath(null)).toBe(null);
      expect(extractOriginalPath(undefined)).toBe(undefined);
      expect(extractOriginalPath("")).toBe("");
    });
  });

  describe("buildSecureCloudflareUrl - Double Transformation Prevention", () => {
    it("should NOT apply transformations to already-transformed URLs", () => {
      const alreadyTransformed = `https://${realR2Domain}/cdn-cgi/image/w=200,h=200,fit=cover/animals/test-org/sample.jpg`;
      const newParams = "w=400,h=300,fit=contain,quality=auto";

      const result = buildSecureCloudflareUrl(alreadyTransformed, newParams);

      // Should return the original transformed URL, not double-transform
      expect(result).toBe(alreadyTransformed);

      // Verify no double /cdn-cgi/image/ in result
      const matches = (result.match(/\/cdn-cgi\/image\//g) || []).length;
      expect(matches).toBe(1);
    });

    it("should handle the problematic double transformation case", () => {
      // This is the exact problematic case from the issue description
      const singleTransformed = `https://${realR2Domain}/cdn-cgi/image/w=800,h=600,fit=contain,quality=auto/rescue_dogs/pets_in_turkey/melon_3889e35e.jpg`;
      const additionalParams = "w=800,h=600,fit=contain,quality=auto";

      const result = buildSecureCloudflareUrl(
        singleTransformed,
        additionalParams,
      );

      // Should not create the double transformation
      const expectedBad = `https://${realR2Domain}/cdn-cgi/image/w=800,h=600,fit=contain,quality=auto/cdn-cgi/image/w=800,h=600,fit=contain,quality=auto/rescue_dogs/pets_in_turkey/melon_3889e35e.jpg`;
      expect(result).not.toBe(expectedBad);

      // Should return the original single transformation
      expect(result).toBe(singleTransformed);

      // Verify only one /cdn-cgi/image/ exists
      const matches = (result.match(/\/cdn-cgi\/image\//g) || []).length;
      expect(matches).toBe(1);
    });

    it("should still work normally for non-transformed URLs", () => {
      const params = "w=400,h=300,fit=cover,quality=auto";
      const result = buildSecureCloudflareUrl(r2Url, params);

      expect(result).toContain(`https://${realR2Domain}/cdn-cgi/image/`);
      expect(result).toContain("w=400,h=300,fit=cover,quality=auto");
      expect(result).toContain("animals/test-org/sample.jpg");

      // Verify exactly one /cdn-cgi/image/ exists
      const matches = (result.match(/\/cdn-cgi\/image\//g) || []).length;
      expect(matches).toBe(1);
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

// =====================================================
// MEMORY LEAK TESTS (TDD - RED PHASE)
// These tests demonstrate the memory leak issues that need fixing
// =====================================================

describe("Memory Leak Prevention Tests (TDD - Failing Tests)", () => {
  describe("imageUrlCache Memory Leak Prevention", () => {
    beforeEach(() => {
      // Clear cache before each test
      getOptimizedImage.clearCache?.();
    });

    it("should prevent imageUrlCache from growing beyond 1000 items", () => {
      // This test will FAIL initially - demonstrates unbounded cache growth
      const baseUrl = `https://${realR2Domain}/animals/test-org/image`;

      // Generate 1500 unique cache keys to force cache overflow
      for (let i = 0; i < 1500; i++) {
        const uniqueUrl = `${baseUrl}_${i}.jpg`;
        getOptimizedImage(uniqueUrl, "catalog", {}, false);
      }

      // The cache should not exceed 1000 items (LRU eviction should occur)
      // This will initially fail because current implementation doesn't properly limit size
      const cacheStats = getOptimizedImage.getCacheStats?.();
      expect(cacheStats?.size).toBeLessThanOrEqual(1000);
    });

    it("should implement LRU eviction policy (least recently used items removed first)", () => {
      // Clear cache
      getOptimizedImage.clearCache?.();

      const baseUrl = `https://${realR2Domain}/animals/test-org/image`;
      const firstUrl = `${baseUrl}_first.jpg`;
      const secondUrl = `${baseUrl}_second.jpg`;

      // Add the first two items
      getOptimizedImage(firstUrl, "catalog");
      getOptimizedImage(secondUrl, "catalog");

      // Fill cache to capacity (add 998 more to reach 1000 total)
      for (let i = 1; i <= 998; i++) {
        getOptimizedImage(`${baseUrl}_${i}.jpg`, "catalog");
      }

      // Access first item again to mark it as recently used
      const firstResultAgain = getOptimizedImage(firstUrl, "catalog");
      // Now cache order should be: secondUrl (oldest), items 1-998, firstUrl (newest)

      // Add one more item to trigger eviction (should evict secondUrl which is oldest)
      getOptimizedImage(`${baseUrl}_new.jpg`, "catalog");

      const cacheStats = getOptimizedImage.getCacheStats?.();

      // Cache should be at max size
      expect(cacheStats?.size).toBe(1000);

      // First item should still be cached (was recently accessed)
      const firstUrlCacheKey = `${firstUrl}:catalog:{}:false`;
      expect(cacheStats?.has(firstUrlCacheKey)).toBe(true);

      // Second item should have been evicted (was least recently used)
      const secondUrlCacheKey = `${secondUrl}:catalog:{}:false`;
      expect(cacheStats?.has(secondUrlCacheKey)).toBe(false);

      // New item should be cached
      const newUrlCacheKey = `${baseUrl}_new.jpg:catalog:{}:false`;
      expect(cacheStats?.has(newUrlCacheKey)).toBe(true);
    });

    it("should provide cache hit/miss statistics for monitoring", () => {
      // This test will FAIL initially - cache metrics don't exist yet
      getOptimizedImage.clearCache?.();

      const testUrl = `https://${realR2Domain}/animals/test-org/cache_test.jpg`;

      // First call should be a cache miss
      getOptimizedImage(testUrl, "catalog");

      // Second call should be a cache hit
      getOptimizedImage(testUrl, "catalog");

      const stats = getOptimizedImage.getCacheStats?.();
      expect(stats?.hits).toBe(1);
      expect(stats?.misses).toBe(1);
      expect(stats?.hitRate).toBeCloseTo(0.5); // 50% hit rate
    });
  });

  describe("Performance Tracking Arrays Memory Leak Prevention", () => {
    beforeEach(() => {
      // Reset stats before each test using existing functions
      require("../imageUtils").resetImageLoadStats();
    });

    it("should prevent loadTimes array from growing beyond 100 items", () => {
      const { trackImageLoad, getImageLoadStats } = require("../imageUtils");

      // Add 150 load time measurements
      for (let i = 0; i < 150; i++) {
        trackImageLoad(`test_url_${i}`, i * 10, "catalog", 0);
      }

      const stats = getImageLoadStats();

      // LoadTimes array should be capped at 100 items (rolling window)
      // This will initially FAIL because current implementation doesn't limit array size properly
      expect(stats.loadTimes.length).toBeLessThanOrEqual(100);

      // Should keep only the most recent 100 measurements
      // The oldest measurements should be removed
      const oldestLoadTime = stats.loadTimes[0];
      const newestLoadTime = stats.loadTimes[stats.loadTimes.length - 1];

      // Newest load time should be from recent measurements (140-149 range)
      expect(newestLoadTime).toBeGreaterThan(1400);

      // Oldest load time should not be from the very first measurements (0-49 range)
      expect(oldestLoadTime).toBeGreaterThan(490);
    });

    it("should prevent networkConditions array from growing beyond 50 items", async () => {
      const { trackImageLoad, getImageLoadStats } = require("../imageUtils");

      // Mock navigator.connection for network condition tracking
      const originalConnection = navigator.connection;
      Object.defineProperty(navigator, "connection", {
        writable: true,
        value: {
          effectiveType: "4g",
          downlink: 10,
          saveData: false,
        },
      });

      // Add 80 measurements with network conditions, with small delays to create different timestamps
      for (let i = 0; i < 80; i++) {
        trackImageLoad(`test_url_${i}`, i * 10, "catalog", 0);
        // Add tiny delay every 10 iterations to ensure different timestamps
        if (i % 10 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1));
        }
      }

      const stats = getImageLoadStats();

      // NetworkConditions array should be capped at 50 items (rolling window)
      expect(stats.networkConditions.length).toBeLessThanOrEqual(50);

      // Should keep only the most recent 50 measurements
      if (stats.networkConditions.length > 1) {
        const oldestTimestamp = stats.networkConditions[0].timestamp;
        const newestTimestamp =
          stats.networkConditions[stats.networkConditions.length - 1].timestamp;

        // Newest timestamp should be greater than or equal to oldest (allowing for same timestamps)
        expect(newestTimestamp).toBeGreaterThanOrEqual(oldestTimestamp);
      }

      // Restore original navigator.connection
      Object.defineProperty(navigator, "connection", {
        writable: true,
        value: originalConnection,
      });
    });

    it("should maintain performance metrics accuracy despite array size limits", () => {
      const { trackImageLoad, getImageLoadStats } = require("../imageUtils");

      // Add measurements that would exceed array limits
      for (let i = 0; i < 200; i++) {
        // Load times: 0ms, 100ms, 200ms, etc.
        trackImageLoad(`test_url_${i}`, i * 100, "catalog", 0);
      }

      const stats = getImageLoadStats();

      // Total count should still track all measurements
      expect(stats.total).toBe(200);

      // Average should be calculated correctly from the rolling window
      // Even though we only keep last 100 measurements for rolling average
      expect(stats.averageLoadTime).toBeGreaterThan(0);

      // LoadTimes array should be limited but stats.total should be cumulative
      expect(stats.loadTimes.length).toBeLessThanOrEqual(100);
      expect(stats.total).toBe(200);
    });

    it("should provide memory usage monitoring for performance arrays", () => {
      const { trackImageLoad, getImageLoadStats } = require("../imageUtils");

      // This test will initially FAIL - memory monitoring doesn't exist yet

      // Add some measurements
      for (let i = 0; i < 25; i++) {
        trackImageLoad(`test_url_${i}`, i * 50, "catalog", 0);
      }

      const stats = getImageLoadStats();

      // Should provide memory usage information
      expect(stats.memoryUsage?.loadTimesArraySize).toBeDefined();
      expect(stats.memoryUsage?.networkConditionsArraySize).toBeDefined();
      expect(stats.memoryUsage?.loadTimesArraySize).toBe(
        stats.loadTimes.length,
      );
    });
  });

  describe("Long-running Session Memory Stability", () => {
    it("should maintain stable memory usage in long-running sessions", () => {
      // Simulate a long-running session with mixed operations
      const { trackImageLoad, getImageLoadStats } = require("../imageUtils");

      getOptimizedImage.clearCache?.();
      require("../imageUtils").resetImageLoadStats();

      const baseUrl = `https://${realR2Domain}/animals/test-org/session`;

      // Simulate continuous usage over time
      for (let cycle = 0; cycle < 10; cycle++) {
        // Each cycle processes 200 images and 100 load measurements
        for (let i = 0; i < 200; i++) {
          const imageUrl = `${baseUrl}_cycle${cycle}_img${i}.jpg`;
          getOptimizedImage(imageUrl, "catalog");

          if (i % 2 === 0) {
            // Track every other image load
            trackImageLoad(imageUrl, Math.random() * 1000, "catalog", 0);
          }
        }
      }

      // After 10 cycles (2000 images, 1000 load measurements):
      const cacheStats = getOptimizedImage.getCacheStats?.();
      const loadStats = getImageLoadStats();

      // Cache should be bounded
      expect(cacheStats?.size).toBeLessThanOrEqual(1000);

      // Performance arrays should be bounded
      expect(loadStats.loadTimes.length).toBeLessThanOrEqual(100);
      expect(loadStats.networkConditions.length).toBeLessThanOrEqual(50);

      // But cumulative stats should reflect all activity
      expect(loadStats.total).toBe(1000); // Total load measurements
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
    it("should return fallbacks for malicious transformation parameters", () => {
      const maliciousParams = [
        "w=400,h=300,fit=cover;DROP TABLE users;",
        "w=400&h=300&rm -rf /",
        "w=400,h=300,script=alert(1)",
        "w=400,h=300,redirect=evil.com",
      ];

      maliciousParams.forEach((params) => {
        // Should return original URL as fallback instead of throwing
        const result = buildSecureCloudflareUrl(r2Url, params);
        expect(result).toBe(r2Url);
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

// NEW TESTS: URL Consistency for Preload vs Usage
describe("Image Preload URL Consistency", () => {
  beforeEach(() => {
    // Clear any existing preload registry before each test
    if (global.document) {
      // Remove existing preload links
      const preloadLinks = document.querySelectorAll(
        'link[rel="preload"][as="image"]',
      );
      preloadLinks.forEach((link) => link.remove());
    }
  });

  describe("URL consistency between preload and usage", () => {
    it("should generate identical URLs when preloading and using hero images", () => {
      // Test that preload and usage generate the same URL through unified system

      const originalUrl = r2Url;

      // Simulate preload (should use getUnifiedImageUrl with cache-busting for hero)
      const preloadUrl = getUnifiedImageUrl(originalUrl, "hero", true);

      // Simulate usage (uses getDetailHeroImageWithPosition with cache-busting)
      const { src: usageUrl } = getDetailHeroImageWithPosition(
        originalUrl,
        true,
      );

      // Should generate identical URLs through unified system
      expect(preloadUrl).toBe(usageUrl);
    });

    it("should maintain URL consistency across multiple calls with same cache-busting session", () => {
      // FAILING TEST: Multiple calls to getDetailHeroImageWithPosition with bustCache=true
      // should return the same URL within the same session

      const originalUrl = r2Url;

      const { src: firstCall } = getDetailHeroImageWithPosition(
        originalUrl,
        true,
      );
      const { src: secondCall } = getDetailHeroImageWithPosition(
        originalUrl,
        true,
      );

      // Should be identical but will fail because Date.now() creates different timestamps
      expect(firstCall).toBe(secondCall);
    });

    it("should preload the exact URL that will be used by components", () => {
      // Test that preloaded URLs match what components actually request

      const originalUrl = r2Url;

      // Mock document.createElement to capture preload URLs
      const capturedPreloadUrls = [];
      const originalCreateElement = document.createElement;
      document.createElement = jest.fn((tagName) => {
        if (tagName === "link") {
          const link = originalCreateElement.call(document, tagName);
          // Override href property setter to capture the value
          Object.defineProperty(link, "href", {
            set: function (value) {
              capturedPreloadUrls.push(value);
              this._href = value;
            },
            get: function () {
              return this._href;
            },
          });
          return link;
        }
        return originalCreateElement.call(document, tagName);
      });

      // Preload the image
      preloadImages([originalUrl], "hero");

      // Get the URL that would actually be used
      const { src: actualUsageUrl } = getDetailHeroImageWithPosition(
        originalUrl,
        true,
      );

      // Cleanup mock
      document.createElement = originalCreateElement;

      // The preloaded URL should match the actual usage URL
      expect(capturedPreloadUrls).toContain(actualUsageUrl);
    });
  });

  describe("URL registry functionality", () => {
    it("should store and retrieve URLs from a session-based registry", () => {
      // FAILING TEST: Need a URL registry that can store preloaded URLs
      // and return them consistently for usage

      const originalUrl = r2Url;
      const context = "hero";

      // This function doesn't exist yet - will fail
      expect(() => {
        const { getUnifiedImageUrl } = require("../imageUtils");

        // First call should register the URL
        const firstUrl = getUnifiedImageUrl(originalUrl, context, true);

        // Second call should return the same URL from registry
        const secondUrl = getUnifiedImageUrl(originalUrl, context, true);

        expect(firstUrl).toBe(secondUrl);
      }).not.toThrow();
    });
  });
});
