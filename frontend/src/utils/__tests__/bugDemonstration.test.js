/**
 * @fileoverview Bug Demonstration - Before and After Fix
 *
 * This test demonstrates the exact problem that was occurring and shows it's now fixed.
 */

import { buildSecureCloudflareUrl } from "../imageUtils";

describe("Bug Demonstration: Double CDN Processing Fix", () => {
  const realR2Domain =
    process.env.NEXT_PUBLIC_R2_CUSTOM_DOMAIN || "images.rescuedogs.me";

  it("should demonstrate the fix for the reported double CDN issue", () => {
    // SCENARIO: This was the problematic URL from the bug report
    const urlWithExistingTransformation = `https://${realR2Domain}/cdn-cgi/image/w=800,h=600,fit=contain,quality=auto/rescue_dogs/pets_in_turkey/melon_3889e35e.jpg`;

    // PROBLEM: Frontend was trying to apply transformations to already-transformed URLs
    const additionalTransformation = "w=800,h=600,fit=contain,quality=auto";

    // BEFORE FIX: This would have created a URL like:
    // https://images.rescuedogs.me/cdn-cgi/image/w=800,h=600,fit=contain,quality=auto/cdn-cgi/image/w=800,h=600,fit=contain,quality=auto/rescue_dogs/pets_in_turkey/melon_3889e35e.jpg

    // AFTER FIX: Our function now detects existing transformations and returns the original
    const result = buildSecureCloudflareUrl(
      urlWithExistingTransformation,
      additionalTransformation,
    );

    // VERIFICATION:
    console.log("🐛 Original problematic URL:", urlWithExistingTransformation);
    console.log("✅ Fixed result URL:", result);
    console.log(
      "🔍 Number of /cdn-cgi/image/ segments:",
      (result.match(/\/cdn-cgi\/image\//g) || []).length,
    );

    // The result should be the original URL (no double transformation)
    expect(result).toBe(urlWithExistingTransformation);

    // Should have exactly one transformation segment
    const transformationCount = (result.match(/\/cdn-cgi\/image\//g) || [])
      .length;
    expect(transformationCount).toBe(1);

    // Should NOT contain double transformations
    expect(result).not.toContain(
      "/cdn-cgi/image/w=800,h=600,fit=contain,quality=auto/cdn-cgi/image/",
    );

    // Demonstrate that it still works for non-transformed URLs
    const originalUrl = `https://${realR2Domain}/rescue_dogs/pets_in_turkey/melon_3889e35e.jpg`;
    const resultFromOriginal = buildSecureCloudflareUrl(
      originalUrl,
      additionalTransformation,
    );

    expect(resultFromOriginal).toBe(urlWithExistingTransformation);
    expect((resultFromOriginal.match(/\/cdn-cgi\/image\//g) || []).length).toBe(
      1,
    );

    console.log("✅ Original URL correctly transformed:", resultFromOriginal);
  });

  it("should show the fix handles various URL patterns correctly", () => {
    const testCases = [
      {
        name: "Original URL (no transformation)",
        url: `https://${realR2Domain}/rescue_dogs/pets_in_turkey/dog.jpg`,
        shouldTransform: true,
      },
      {
        name: "Already transformed URL",
        url: `https://${realR2Domain}/cdn-cgi/image/w=400,h=300,fit=cover/rescue_dogs/pets_in_turkey/dog.jpg`,
        shouldTransform: false,
      },
      {
        name: "Complex transformation parameters",
        url: `https://${realR2Domain}/cdn-cgi/image/w=800,h=600,fit=contain,quality=auto,blur=5/animals/shelter/dog.jpg`,
        shouldTransform: false,
      },
    ];

    const params = "w=200,h=200,fit=crop,quality=80";

    testCases.forEach((testCase) => {
      const result = buildSecureCloudflareUrl(testCase.url, params);
      const transformationCount = (result.match(/\/cdn-cgi\/image\//g) || [])
        .length;

      console.log(`\n📋 ${testCase.name}:`);
      console.log(`   Input:  ${testCase.url}`);
      console.log(`   Output: ${result}`);
      console.log(`   Transformations: ${transformationCount}`);

      // Should have exactly one transformation
      expect(transformationCount).toBe(1);

      if (testCase.shouldTransform) {
        // Should create new transformation
        expect(result).not.toBe(testCase.url);
        expect(result).toContain(params);
      } else {
        // Should return original URL (already transformed)
        expect(result).toBe(testCase.url);
      }
    });
  });
});
