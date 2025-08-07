/**
 * @fileoverview Tests for useLazyImage hook
 * Focus on preventing double CDN transformations in progressive loading URLs
 */

import { renderHook } from "@testing-library/react";
import { useLazyImage } from "../useLazyImage";

// Use real R2 domain for testing
const realR2Domain =
  process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN || "images.rescuedogs.me";

describe("useLazyImage Hook", () => {
  describe("Progressive Loading URL Generation", () => {
    it("should not create double transformations for already-transformed URLs", () => {
      const alreadyTransformed = `https://${realR2Domain}/cdn-cgi/image/w=800,h=600,fit=contain,quality=auto/rescue_dogs/pets_in_turkey/melon_3889e35e.jpg`;

      const { result } = renderHook(() =>
        useLazyImage(alreadyTransformed, { enableProgressiveLoading: true }),
      );

      const { progressiveUrls } = result.current;

      // Should generate progressive URLs but without double transformations
      if (progressiveUrls.lowQuality) {
        const doubleTransformCount = (
          progressiveUrls.lowQuality.match(/\/cdn-cgi\/image\//g) || []
        ).length;
        expect(doubleTransformCount).toBe(1);
      }

      if (progressiveUrls.blurPlaceholder) {
        const doubleTransformCount = (
          progressiveUrls.blurPlaceholder.match(/\/cdn-cgi\/image\//g) || []
        ).length;
        expect(doubleTransformCount).toBe(1);
      }
    });

    it("should handle the problematic double transformation case from the bug report", () => {
      // This is the exact URL pattern that was causing problems
      const problematicUrl = `https://${realR2Domain}/cdn-cgi/image/w=800,h=600,fit=contain,quality=auto/rescue_dogs/pets_in_turkey/melon_3889e35e.jpg`;

      const { result } = renderHook(() =>
        useLazyImage(problematicUrl, { enableProgressiveLoading: true }),
      );

      const { progressiveUrls } = result.current;

      // Low quality URL should not have double transformation
      if (progressiveUrls.lowQuality) {
        expect(progressiveUrls.lowQuality).not.toContain(
          "/cdn-cgi/image/w=50,q=20,f=auto/cdn-cgi/image/",
        );

        // Should contain only one /cdn-cgi/image/ transformation
        const transformationCount = (
          progressiveUrls.lowQuality.match(/\/cdn-cgi\/image\//g) || []
        ).length;
        expect(transformationCount).toBe(1);
      }

      // Blur placeholder should not have double transformation
      if (progressiveUrls.blurPlaceholder) {
        expect(progressiveUrls.blurPlaceholder).not.toContain(
          "/cdn-cgi/image/w=50,q=20,blur=300,f=auto/cdn-cgi/image/",
        );

        // Should contain only one /cdn-cgi/image/ transformation
        const transformationCount = (
          progressiveUrls.blurPlaceholder.match(/\/cdn-cgi\/image\//g) || []
        ).length;
        expect(transformationCount).toBe(1);
      }
    });

    it("should work correctly for non-transformed R2 URLs", () => {
      const originalUrl = `https://${realR2Domain}/rescue_dogs/pets_in_turkey/melon_3889e35e.jpg`;

      const { result } = renderHook(() =>
        useLazyImage(originalUrl, { enableProgressiveLoading: true }),
      );

      const { progressiveUrls } = result.current;

      // Should generate progressive URLs with exactly one transformation each
      if (progressiveUrls.lowQuality) {
        expect(progressiveUrls.lowQuality).toContain("/cdn-cgi/image/");
        expect(progressiveUrls.lowQuality).toContain("w=50,q=20,f=auto");

        const transformationCount = (
          progressiveUrls.lowQuality.match(/\/cdn-cgi\/image\//g) || []
        ).length;
        expect(transformationCount).toBe(1);
      }

      if (progressiveUrls.blurPlaceholder) {
        expect(progressiveUrls.blurPlaceholder).toContain("/cdn-cgi/image/");
        expect(progressiveUrls.blurPlaceholder).toContain(
          "w=50,q=20,blur=300,f=auto",
        );

        const transformationCount = (
          progressiveUrls.blurPlaceholder.match(/\/cdn-cgi\/image\//g) || []
        ).length;
        expect(transformationCount).toBe(1);
      }
    });

    it("should handle external URLs without transformation", () => {
      const externalUrl = "https://example.com/image.jpg";

      const { result } = renderHook(() =>
        useLazyImage(externalUrl, { enableProgressiveLoading: true }),
      );

      const { progressiveUrls } = result.current;

      // External URLs should not be transformed
      expect(progressiveUrls.lowQuality).toBe(externalUrl);
      expect(progressiveUrls.blurPlaceholder).toBeUndefined();
    });

    it("should handle null/undefined URLs gracefully", () => {
      const { result: nullResult } = renderHook(() =>
        useLazyImage("", { enableProgressiveLoading: true }),
      );

      const { progressiveUrls: nullUrls } = nullResult.current;

      expect(nullUrls).toEqual({});
    });

    it("should work with progressive loading disabled", () => {
      const url = `https://${realR2Domain}/rescue_dogs/pets_in_turkey/melon_3889e35e.jpg`;

      const { result } = renderHook(() =>
        useLazyImage(url, { enableProgressiveLoading: false }),
      );

      const { progressiveUrls } = result.current;

      // Should return empty object when progressive loading is disabled
      expect(progressiveUrls).toEqual({});
    });

    it("should extract original path correctly for complex transformations", () => {
      // Test with complex parameters including blur
      const complexUrl = `https://${realR2Domain}/cdn-cgi/image/w=400,h=300,fit=cover,quality=auto,blur=10,format=webp/animals/shelter-name/subfolder/complex-image-name.jpg`;

      const { result } = renderHook(() =>
        useLazyImage(complexUrl, { enableProgressiveLoading: true }),
      );

      const { progressiveUrls } = result.current;

      // Should correctly extract and rebuild progressive URLs
      if (progressiveUrls.lowQuality) {
        // Should have the correct original path
        expect(progressiveUrls.lowQuality).toContain(
          "animals/shelter-name/subfolder/complex-image-name.jpg",
        );

        // Should have exactly one transformation
        const transformationCount = (
          progressiveUrls.lowQuality.match(/\/cdn-cgi\/image\//g) || []
        ).length;
        expect(transformationCount).toBe(1);
      }
    });
  });
});
