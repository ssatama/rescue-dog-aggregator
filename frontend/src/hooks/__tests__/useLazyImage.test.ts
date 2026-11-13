/**
 * @fileoverview Tests for useLazyImage hook
 * Focus on preventing double CDN transformations in progressive loading URLs
 */

import { renderHook } from "../../test-utils";
import { useLazyImage } from "../useLazyImage";
import { R2_CUSTOM_DOMAIN } from "../../constants/imageConfig";

// Use real R2 domain for testing
const realR2Domain =
  process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN || "images.rescuedogs.me";

describe("useLazyImage Hook", () => {
  describe("Configuration Integration", () => {
    it("should use R2_CUSTOM_DOMAIN from centralized config", () => {
      // Verify that the imported constant matches the expected domain
      expect(R2_CUSTOM_DOMAIN).toBe(realR2Domain);
      expect(typeof R2_CUSTOM_DOMAIN).toBe("string");
      expect(R2_CUSTOM_DOMAIN.length).toBeGreaterThan(0);
    });

    it("should properly detect R2 URLs using centralized configuration", () => {
      const r2Url = `https://${R2_CUSTOM_DOMAIN}/rescue_dogs/test.jpg`;
      const externalUrl = "https://example.com/test.jpg";

      const { result: r2Result } = renderHook(() =>
        useLazyImage(r2Url, { enableProgressiveLoading: true }),
      );

      const { result: externalResult } = renderHook(() =>
        useLazyImage(externalUrl, { enableProgressiveLoading: true }),
      );

      // R2 URL should generate progressive URLs
      expect(Object.keys(r2Result.current.progressiveUrls)).toHaveLength(2);

      // External URL should not generate transformation URLs
      expect(externalResult.current.progressiveUrls.lowQuality).toBe(
        externalUrl,
      );
      expect(
        externalResult.current.progressiveUrls.blurPlaceholder,
      ).toBeUndefined();
    });
  });
  describe("Progressive Loading URL Generation", () => {
    // Pre-generated variants, never a billed Cloudflare transformation (#761)
    it.each([
      `https://${realR2Domain}/rescue_dogs/pets_in_turkey/melon_3889e35e.jpg`,
      `https://${realR2Domain}/cdn-cgi/image/w=800,h=600,fit=contain,quality=auto/rescue_dogs/pets_in_turkey/melon_3889e35e.jpg`,
    ])("uses the smallest R2 variant as the low-quality image for %s", (src) => {
      const { result } = renderHook(() => useLazyImage(src, { enableProgressiveLoading: true }));

      const { progressiveUrls } = result.current;
      expect(progressiveUrls.lowQuality).toBe(
        `https://${realR2Domain}/rescue_dogs/pets_in_turkey/melon_3889e35e_w320.webp`,
      );
      expect(progressiveUrls.blurPlaceholder).toBeUndefined();
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

  });
});
