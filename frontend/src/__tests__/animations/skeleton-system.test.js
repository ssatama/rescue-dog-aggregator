/**
 * Test suite for unified skeleton animation system
 * Tests CSS classes for skeleton animations, focusing on preventing the "disco" flashing effect
 */

import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";

describe("Unified Skeleton Animation System", () => {
  let cssContent;

  beforeAll(() => {
    // Read the actual CSS file to test
    const cssPath = path.join(process.cwd(), "src", "app", "globals.css");
    cssContent = fs.readFileSync(cssPath, "utf8");
  });

  describe("CSS Classes Implementation", () => {
    test("should define skeleton-element class with gradient animation", () => {
      // Check that skeleton-element class exists
      expect(cssContent).toContain(".skeleton-element");

      // Should use gradient background, not solid color
      expect(cssContent).toContain("linear-gradient(");

      // Should use skeleton-shimmer animation
      expect(cssContent).toContain("skeleton-shimmer");

      // Should not use opacity-based pulse animation
      const skeletonElementMatch = cssContent.match(
        /\.skeleton-element\s*{[^}]*}/s,
      );
      expect(skeletonElementMatch[0]).not.toContain("pulse");
    });

    test("should have 2s duration with ease-in-out timing", () => {
      // Extract skeleton-element CSS rule
      const skeletonElementMatch = cssContent.match(
        /\.skeleton-element\s*{[^}]*}/s,
      );
      expect(skeletonElementMatch).toBeTruthy();

      const rule = skeletonElementMatch[0];
      expect(rule).toContain("2s");
      expect(rule).toContain("ease-in-out");
      expect(rule).toContain("infinite");
    });

    test("should use moving gradient with 200% background size", () => {
      const skeletonElementMatch = cssContent.match(
        /\.skeleton-element\s*{[^}]*}/s,
      );
      expect(skeletonElementMatch).toBeTruthy();

      const rule = skeletonElementMatch[0];
      expect(rule).toContain("background-size: 200% 100%");
      expect(rule).toContain("linear-gradient(");
    });

    test("should be compatible with dark mode", () => {
      // Should have dark mode variant
      expect(cssContent).toContain(".dark .skeleton-element");

      // Should have different colors in dark mode
      const darkModeMatch = cssContent.match(
        /\.dark \.skeleton-element\s*{[^}]*}/s,
      );
      expect(darkModeMatch).toBeTruthy();
      expect(darkModeMatch[0]).toContain("linear-gradient(");
    });

    test("should define skeleton-container class with static properties", () => {
      expect(cssContent).toContain(".skeleton-container");

      const containerMatch = cssContent.match(
        /\.skeleton-container\s*{[^}]*}/s,
      );
      expect(containerMatch).toBeTruthy();

      const rule = containerMatch[0];
      expect(rule).toContain("animation: none");
      expect(rule).toContain("opacity: 1");
      expect(rule).toContain("transform: none");
    });

    test("should include performance optimizations", () => {
      const skeletonElementMatch = cssContent.match(
        /\.skeleton-element\s*{[^}]*}/s,
      );
      expect(skeletonElementMatch).toBeTruthy();

      const rule = skeletonElementMatch[0];
      expect(rule).toContain("will-change: background-position");
    });

    test("should support prefers-reduced-motion", () => {
      expect(cssContent).toContain("@media (prefers-reduced-motion: reduce)");

      // Extract the media query content
      const reducedMotionMatch = cssContent.match(
        /@media \(prefers-reduced-motion: reduce\)[^}]*\{[^}]*\.skeleton-element[^}]*\}/s,
      );
      expect(reducedMotionMatch).toBeTruthy();

      const mediaRule = reducedMotionMatch[0];
      expect(mediaRule).toContain("animation: none");
    });

    test("should define skeleton-shimmer keyframes", () => {
      expect(cssContent).toContain("@keyframes skeleton-shimmer");

      // More flexible regex to match the actual keyframes structure
      const keyframesMatch = cssContent.match(
        /@keyframes skeleton-shimmer[\s\S]*?background-position: -200% 0[\s\S]*?background-position: 200% 0[\s\S]*?}/,
      );
      expect(keyframesMatch).toBeTruthy();

      const keyframes = keyframesMatch[0];
      expect(keyframes).toContain("0%");
      expect(keyframes).toContain("100%");
      expect(keyframes).toContain("background-position: -200% 0");
      expect(keyframes).toContain("background-position: 200% 0");
    });

    test("should deprecate old skeleton classes", () => {
      // Should still contain old classes for backward compatibility
      expect(cssContent).toContain(".skeleton {");

      // But should use the new animation system
      const oldSkeletonMatch = cssContent.match(/\.skeleton\s*{[^}]*}/s);
      expect(oldSkeletonMatch).toBeTruthy();
      expect(oldSkeletonMatch[0]).toContain("skeleton-shimmer");
    });

    test("should prevent conflicting animations", () => {
      // Look for backward compatibility rules that prevent conflicts
      const backCompatMatch = cssContent.match(
        /\.skeleton-element\.animate-pulse[^}]*{[^}]*}/s,
      );
      if (backCompatMatch) {
        expect(backCompatMatch[0]).toContain("skeleton-shimmer");
        expect(backCompatMatch[0]).toContain("!important");
      }
    });

    test("should use consistent timing across all skeleton animations", () => {
      // All skeleton animations should use 2s
      const allSkeletonRules = cssContent.match(
        /\.(skeleton[^{]*){[^}]*animation[^}]*}/g,
      );

      if (allSkeletonRules) {
        allSkeletonRules.forEach((rule) => {
          if (
            rule.includes("animation:") &&
            rule.includes("skeleton-shimmer")
          ) {
            expect(rule).toContain("2s");
            expect(rule).toContain("ease-in-out");
          }
        });
      }
    });

    test("should maintain dark mode compatibility", () => {
      expect(cssContent).toContain(".dark .skeleton-container");

      const darkContainerMatch = cssContent.match(
        /\.dark \.skeleton-container\s*{[^}]*}/s,
      );
      expect(darkContainerMatch).toBeTruthy();
      expect(darkContainerMatch[0]).toContain("background-color");
    });
  });

  describe("Integration with existing CSS", () => {
    test("should not break existing animations", () => {
      // Should still have other animation keyframes
      expect(cssContent).toContain("@keyframes shimmer");
      expect(cssContent).toContain("@keyframes pulse-dot");
    });

    test("should integrate with reduced motion preferences", () => {
      // Should include other classes in reduced motion rules
      const reducedMotionContent = cssContent.match(
        /@media \(prefers-reduced-motion: reduce\)[^@]*/s,
      );
      expect(reducedMotionContent).toBeTruthy();

      const mediaContent = reducedMotionContent[0];
      expect(mediaContent).toContain(".skeleton");
      expect(mediaContent).toContain(".animate-pulse");
      expect(mediaContent).toContain(".animate-shimmer");
    });

    test("should maintain existing color theme compatibility", () => {
      // Should use CSS variables for theming
      const skeletonElementMatch = cssContent.match(
        /\.skeleton-element\s*{[^}]*}/s,
      );
      expect(skeletonElementMatch[0]).toContain("hsl(var(--background))");
    });
  });
});
