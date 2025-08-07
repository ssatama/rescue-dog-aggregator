/**
 * @fileoverview Comprehensive verification tests for double CDN transformation prevention
 *
 * This test file specifically verifies that the double CDN transformation issue is fixed.
 * It tests the exact problematic scenarios described in the bug report.
 */

import {
  buildSecureCloudflareUrl,
  hasExistingTransformation,
  extractOriginalPath,
  getDetailHeroImage,
  getCatalogCardImage,
} from "../imageUtils";

// Use real R2 domain for testing
const realR2Domain =
  process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN || "images.rescuedogs.me";

describe("Double CDN Transformation Prevention - Comprehensive Verification", () => {
  // Test URLs that simulate the exact problematic case
  const originalUrl = `https://${realR2Domain}/rescue_dogs/pets_in_turkey/melon_3889e35e.jpg`;
  const singleTransformed = `https://${realR2Domain}/cdn-cgi/image/w=800,h=600,fit=contain,quality=auto/rescue_dogs/pets_in_turkey/melon_3889e35e.jpg`;
  const expectedBadDoubleTransform = `https://${realR2Domain}/cdn-cgi/image/w=800,h=600,fit=contain,quality=auto/cdn-cgi/image/w=800,h=600,fit=contain,quality=auto/rescue_dogs/pets_in_turkey/melon_3889e35e.jpg`;

  describe("Critical Bug Scenarios", () => {
    it("should prevent the exact double transformation bug described in the issue", () => {
      // This was the problematic case: applying transformation to already-transformed URL
      const params = "w=800,h=600,fit=contain,quality=auto";
      const result = buildSecureCloudflareUrl(singleTransformed, params);

      // Should NOT create double transformation
      expect(result).not.toBe(expectedBadDoubleTransform);

      // Should return original single transformation
      expect(result).toBe(singleTransformed);

      // Verify exactly one /cdn-cgi/image/ exists
      const matches = (result.match(/\/cdn-cgi\/image\//g) || []).length;
      expect(matches).toBe(1);
    });

    it("should work correctly when starting with non-transformed URL", () => {
      const params = "w=800,h=600,fit=contain,quality=auto";
      const result = buildSecureCloudflareUrl(originalUrl, params);

      // Should create properly formatted single transformation
      expect(result).toContain(`https://${realR2Domain}/cdn-cgi/image/`);
      expect(result).toContain("w=800,h=600,fit=contain,quality=auto");
      expect(result).toContain("rescue_dogs/pets_in_turkey/melon_3889e35e.jpg");

      // Should have exactly one transformation
      const matches = (result.match(/\/cdn-cgi\/image\//g) || []).length;
      expect(matches).toBe(1);

      // Should be the expected single transformation
      expect(result).toBe(singleTransformed);
    });
  });

  describe("Detection Utilities Accuracy", () => {
    it("should accurately detect existing transformations", () => {
      expect(hasExistingTransformation(originalUrl)).toBe(false);
      expect(hasExistingTransformation(singleTransformed)).toBe(true);
      expect(hasExistingTransformation(expectedBadDoubleTransform)).toBe(true);
    });

    it("should correctly extract original paths", () => {
      expect(extractOriginalPath(originalUrl)).toBe(originalUrl);
      expect(extractOriginalPath(singleTransformed)).toBe(originalUrl);

      // Even from a hypothetical double transform, should extract to original
      expect(extractOriginalPath(expectedBadDoubleTransform)).toBe(originalUrl);
    });
  });

  describe("High-Level Image Functions", () => {
    it("should not create double transformations in getDetailHeroImage", () => {
      // Test applying hero transformation to already-transformed URL
      const result = getDetailHeroImage(singleTransformed);

      // Should prevent double transformation by detecting existing transformation
      const matches = (result.match(/\/cdn-cgi\/image\//g) || []).length;
      expect(matches).toBe(1);

      // Should not create a bad double transform
      expect(result).not.toContain(
        "/cdn-cgi/image/w=800,h=600,fit=contain,quality=auto/cdn-cgi/image/",
      );
    });

    it("should not create double transformations in getCatalogCardImage", () => {
      // Test applying catalog transformation to already-transformed URL
      const result = getCatalogCardImage(singleTransformed);

      // Should prevent double transformation
      const matches = (result.match(/\/cdn-cgi\/image\//g) || []).length;
      expect(matches).toBe(1);

      // Should not create a bad double transform
      expect(result).not.toContain(
        "/cdn-cgi/image/w=400,h=300,fit=cover,quality=auto/cdn-cgi/image/",
      );
    });
  });

  describe("Complex URL Patterns", () => {
    it("should handle complex transformation parameters correctly", () => {
      const complexTransform = `https://${realR2Domain}/cdn-cgi/image/w=400,h=300,fit=cover,quality=auto,blur=5,format=webp/animals/shelter/subfolder/complex-image.jpg`;
      const newParams = "w=200,h=200,fit=contain,quality=60";

      const result = buildSecureCloudflareUrl(complexTransform, newParams);

      // Should return the original complex transformation
      expect(result).toBe(complexTransform);

      // Should have exactly one transformation
      const matches = (result.match(/\/cdn-cgi\/image\//g) || []).length;
      expect(matches).toBe(1);
    });

    it("should handle nested path structures correctly", () => {
      const nestedUrl = `https://${realR2Domain}/cdn-cgi/image/w=200,h=200,fit=cover,quality=60/animals/org-name/2024/january/deep/nested/folder/image.jpg`;
      const newParams = "w=100,h=100,fit=contain";

      const result = buildSecureCloudflareUrl(nestedUrl, newParams);

      // Should return the original transformation
      expect(result).toBe(nestedUrl);

      // Should have exactly one transformation
      const matches = (result.match(/\/cdn-cgi\/image\//g) || []).length;
      expect(matches).toBe(1);

      // Original path extraction should work correctly
      const extracted = extractOriginalPath(nestedUrl);
      expect(extracted).toBe(
        `https://${realR2Domain}/animals/org-name/2024/january/deep/nested/folder/image.jpg`,
      );
    });
  });

  describe("Edge Cases and Error Conditions", () => {
    it("should handle malformed transformation URLs gracefully", () => {
      const malformedUrl = `https://${realR2Domain}/cdn-cgi/image/animals/test.jpg`; // Missing params
      const params = "w=200,h=200,fit=cover";

      // Should still be detected as having transformation
      expect(hasExistingTransformation(malformedUrl)).toBe(true);

      // Should not apply new transformation
      const result = buildSecureCloudflareUrl(malformedUrl, params);
      expect(result).toBe(malformedUrl);
    });

    it("should handle URLs with multiple transformation segments", () => {
      // This shouldn't happen in practice, but let's be defensive
      const multipleTransforms = `https://${realR2Domain}/cdn-cgi/image/w=400,h=300/cdn-cgi/image/w=200,h=200/test.jpg`;
      const params = "w=100,h=100,fit=cover";

      // Should be detected as having transformation
      expect(hasExistingTransformation(multipleTransforms)).toBe(true);

      // Should not apply new transformation
      const result = buildSecureCloudflareUrl(multipleTransforms, params);
      expect(result).toBe(multipleTransforms);
    });
  });

  describe("Performance and Consistency", () => {
    it("should consistently prevent double transformations across multiple calls", () => {
      const testUrls = [
        singleTransformed,
        `https://${realR2Domain}/cdn-cgi/image/w=400,h=300,fit=cover/animals/test1.jpg`,
        `https://${realR2Domain}/cdn-cgi/image/w=200,h=200,fit=contain,quality=80/rescue_dogs/test2.jpg`,
        `https://${realR2Domain}/cdn-cgi/image/w=800,h=600,fit=pad,quality=auto/uploads/test3.jpg`,
      ];

      const params = "w=300,h=300,fit=crop,quality=90";

      testUrls.forEach((url) => {
        const result = buildSecureCloudflareUrl(url, params);

        // Should return original transformed URL
        expect(result).toBe(url);

        // Should have exactly one transformation
        const matches = (result.match(/\/cdn-cgi\/image\//g) || []).length;
        expect(matches).toBe(1);
      });
    });

    it("should maintain original functionality for non-transformed URLs", () => {
      const nonTransformedUrls = [
        originalUrl,
        `https://${realR2Domain}/animals/test1.jpg`,
        `https://${realR2Domain}/rescue_dogs/test2.jpg`,
        `https://${realR2Domain}/uploads/test3.jpg`,
      ];

      const params = "w=300,h=300,fit=crop,quality=90";

      nonTransformedUrls.forEach((url) => {
        const result = buildSecureCloudflareUrl(url, params);

        // Should create new transformation
        expect(result).toContain("/cdn-cgi/image/");
        expect(result).toContain(params);

        // Should have exactly one transformation
        const matches = (result.match(/\/cdn-cgi\/image\//g) || []).length;
        expect(matches).toBe(1);

        // Should not be the original URL
        expect(result).not.toBe(url);
      });
    });
  });
});
