import React from "react";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "../../providers/ThemeProvider";
import SkeletonPulse from "../SkeletonPulse";

// Helper to render with ThemeProvider in dark mode
const renderWithDarkTheme = (component) => {
  // Set dark mode in localStorage
  localStorage.setItem("theme", "dark");
  document.documentElement.classList.add("dark");

  return render(<ThemeProvider>{component}</ThemeProvider>);
};

describe("SkeletonPulse Component - Dark Mode Support", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  describe("Background Colors", () => {
    test("should use semantic background token that adapts to dark mode", () => {
      renderWithDarkTheme(
        <SkeletonPulse data-testid="skeleton" className="h-4 w-20" />,
      );

      const skeleton = screen.getByTestId("skeleton");

      // Should use semantic background token instead of hard-coded gray
      expect(skeleton).toHaveClass("bg-muted");
      expect(skeleton).not.toHaveClass("bg-gray-200");

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");
    });

    test("should maintain pulse animation in dark mode", () => {
      renderWithDarkTheme(
        <SkeletonPulse data-testid="skeleton" className="h-6 w-32" />,
      );

      const skeleton = screen.getByTestId("skeleton");

      // Should have pulse animation
      expect(skeleton).toHaveClass("animate-pulse");

      // Should have rounded corners
      expect(skeleton).toHaveClass("rounded");
    });

    test("should support custom classes in dark mode", () => {
      renderWithDarkTheme(
        <SkeletonPulse
          data-testid="skeleton"
          className="h-8 w-48 rounded-lg custom-skeleton-class"
        />,
      );

      const skeleton = screen.getByTestId("skeleton");

      // Should preserve custom classes
      expect(skeleton).toHaveClass("h-8");
      expect(skeleton).toHaveClass("w-48");
      expect(skeleton).toHaveClass("rounded-lg");
      expect(skeleton).toHaveClass("custom-skeleton-class");

      // Should still have base skeleton classes
      expect(skeleton).toHaveClass("bg-muted");
      expect(skeleton).toHaveClass("animate-pulse");
    });
  });

  describe("Accessibility", () => {
    test("should maintain accessibility attributes in dark mode", () => {
      renderWithDarkTheme(
        <SkeletonPulse data-testid="skeleton" className="h-4 w-20" />,
      );

      const skeleton = screen.getByTestId("skeleton");

      // Should have proper ARIA attributes
      expect(skeleton).toHaveAttribute("role", "status");
      expect(skeleton).toHaveAttribute("aria-label", "Loading content");
      expect(skeleton).toHaveAttribute("aria-busy", "true");
    });

    test("should omit ARIA attributes when not standalone", () => {
      renderWithDarkTheme(
        <SkeletonPulse
          data-testid="skeleton"
          standalone={false}
          className="h-4 w-20"
        />,
      );

      const skeleton = screen.getByTestId("skeleton");

      // Should not have ARIA attributes when not standalone
      expect(skeleton).not.toHaveAttribute("role");
      expect(skeleton).not.toHaveAttribute("aria-label");
      expect(skeleton).not.toHaveAttribute("aria-busy");

      // Should still have proper styling
      expect(skeleton).toHaveClass("bg-muted");
      expect(skeleton).toHaveClass("animate-pulse");
    });
  });

  describe("Shimmer Animation", () => {
    test("should use skeleton class for enhanced shimmer in dark mode", () => {
      renderWithDarkTheme(
        <SkeletonPulse data-testid="skeleton" className="h-4 w-20 skeleton" />,
      );

      const skeleton = screen.getByTestId("skeleton");

      // Should have enhanced skeleton shimmer class (defined in globals.css)
      expect(skeleton).toHaveClass("skeleton");

      // Should also have standard animate-pulse as fallback
      expect(skeleton).toHaveClass("animate-pulse");

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");
    });

    test("should work with different sizes in dark mode", () => {
      const sizes = [
        { className: "h-3 w-16", testId: "small-skeleton" },
        { className: "h-4 w-24", testId: "medium-skeleton" },
        { className: "h-6 w-32", testId: "large-skeleton" },
        { className: "h-8 w-40", testId: "xl-skeleton" },
      ];

      sizes.forEach(({ className, testId }) => {
        renderWithDarkTheme(
          <SkeletonPulse data-testid={testId} className={className} />,
        );

        const skeleton = screen.getByTestId(testId);

        // Should have base skeleton styling
        expect(skeleton).toHaveClass("bg-muted");
        expect(skeleton).toHaveClass("animate-pulse");
        expect(skeleton).toHaveClass("rounded");

        // Should have size classes
        const sizeClasses = className.split(" ");
        sizeClasses.forEach((cls) => {
          expect(skeleton).toHaveClass(cls);
        });
      });
    });
  });

  describe("Integration with Other Components", () => {
    test("should work as loading placeholder for text in dark mode", () => {
      renderWithDarkTheme(
        <div data-testid="text-skeleton-container">
          <SkeletonPulse className="h-4 w-32 mb-2" standalone={false} />
          <SkeletonPulse className="h-4 w-24 mb-2" standalone={false} />
          <SkeletonPulse className="h-4 w-20" standalone={false} />
        </div>,
      );

      const container = screen.getByTestId("text-skeleton-container");
      const skeletons = container.querySelectorAll(".bg-muted");

      // Should have 3 skeleton elements
      expect(skeletons).toHaveLength(3);

      // All should use semantic background
      skeletons.forEach((skeleton) => {
        expect(skeleton).toHaveClass("bg-muted");
        expect(skeleton).toHaveClass("animate-pulse");
      });
    });

    test("should work as loading placeholder for images in dark mode", () => {
      renderWithDarkTheme(
        <SkeletonPulse
          data-testid="image-skeleton"
          className="aspect-square w-48 rounded-lg"
        />,
      );

      const skeleton = screen.getByTestId("image-skeleton");

      // Should have image-like styling
      expect(skeleton).toHaveClass("aspect-square");
      expect(skeleton).toHaveClass("w-48");
      expect(skeleton).toHaveClass("rounded-lg");

      // Should have base skeleton styling
      expect(skeleton).toHaveClass("bg-muted");
      expect(skeleton).toHaveClass("animate-pulse");
    });
  });
});
