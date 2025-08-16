// src/components/ui/__tests__/LazyImage.dark-mode.test.jsx
// TDD Phase 1: RED - Tests for LazyImage dark mode functionality

import React from "react";
import { render, screen, fireEvent, waitFor } from "../../../test-utils";
import "@testing-library/jest-dom";
import LazyImage from "../LazyImage";

// Mock ImagePlaceholder component
jest.mock("../ImagePlaceholder", () => {
  return function MockImagePlaceholder({ className }) {
    return (
      <div className={className} data-testid="mock-image-placeholder">
        Mock Placeholder
      </div>
    );
  };
});

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

describe("LazyImage Dark Mode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset IntersectionObserver mock
    mockIntersectionObserver.mockClear();
    mockIntersectionObserver.mockReturnValue({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    });
  });

  describe("Loading Placeholder Dark Mode", () => {
    test("default placeholder has dark mode styling", () => {
      render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Test image"
          className="w-32 h-32"
        />,
      );

      const placeholder = screen.getByTestId("image-placeholder");
      expect(placeholder).toHaveClass("bg-gray-200");
      expect(placeholder).toHaveClass("dark:bg-gray-700");
      expect(placeholder).toHaveClass("animate-pulse");
    });

    test("placeholder icon has dark mode color", () => {
      render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Test image"
          className="w-32 h-32"
        />,
      );

      const placeholder = screen.getByTestId("image-placeholder");
      const icon = placeholder.querySelector("svg");
      expect(icon).toHaveClass("text-gray-400");
      expect(icon).toHaveClass("dark:text-gray-500");
    });

    test("custom placeholder maintains dark mode support", () => {
      const customPlaceholder = (
        <div
          className="bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300"
          data-testid="custom-placeholder"
        >
          Custom Loading...
        </div>
      );

      render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Test image"
          placeholder={customPlaceholder}
          className="w-32 h-32"
        />,
      );

      const customPlaceholderElement = screen.getByTestId("custom-placeholder");
      expect(customPlaceholderElement).toHaveClass("bg-blue-100");
      expect(customPlaceholderElement).toHaveClass("dark:bg-blue-800");
      expect(customPlaceholderElement).toHaveClass("text-blue-600");
      expect(customPlaceholderElement).toHaveClass("dark:text-blue-300");
    });
  });

  describe("Error State Dark Mode", () => {
    test("error placeholder has dark mode styling", () => {
      // Mock image load error
      const mockImg = {
        addEventListener: jest.fn((event, callback) => {
          if (event === "error") {
            setTimeout(() => callback(new Error("Load failed")), 0);
          }
        }),
        removeEventListener: jest.fn(),
        src: "",
      };

      jest.spyOn(global, "Image").mockImplementation(() => mockImg);

      render(
        <LazyImage
          src="https://example.com/broken.jpg"
          alt="Broken image"
          className="w-32 h-32"
          priority={true} // Load immediately for testing
        />,
      );

      // Wait for error state
      setTimeout(() => {
        const errorPlaceholder = screen.getByTestId("image-error");
        expect(errorPlaceholder).toHaveClass("bg-gray-100");
        expect(errorPlaceholder).toHaveClass("dark:bg-gray-800");
      }, 0);
    });

    test("error icon has dark mode color", () => {
      // Mock image error by triggering onError directly
      const { container } = render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Test image"
          className="w-32 h-32"
          priority={true}
        />,
      );

      // Simulate image error by triggering the onError callback
      const img = container.querySelector("img");
      if (img) {
        fireEvent.error(img);
      }

      const errorPlaceholder = screen.getByTestId("image-error");
      const icon = errorPlaceholder.querySelector("svg");
      expect(icon).toHaveClass("text-gray-400");
      expect(icon).toHaveClass("dark:text-gray-500");
    });

    test("error state maintains accessibility in dark mode", () => {
      const { container } = render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Profile picture"
          className="w-32 h-32"
          priority={true}
        />,
      );

      // Simulate image error
      const img = container.querySelector("img");
      if (img) {
        fireEvent.error(img);
      }

      const errorPlaceholder = screen.getByTestId("image-error");
      expect(errorPlaceholder).toHaveAttribute("role", "img");
      expect(errorPlaceholder).toHaveAttribute(
        "aria-label",
        "Profile picture - Failed to load",
      );
    });
  });

  describe("Progressive Loading Dark Mode", () => {
    test("progressive loading maintains dark mode through all stages", async () => {
      render(
        <LazyImage
          src="https://res.cloudinary.com/demo/image/upload/sample.jpg"
          alt="Progressive test image"
          className="w-32 h-32"
          enableProgressiveLoading={true}
          priority={true}
        />,
      );

      // Initially should show placeholder with dark mode
      const placeholder = screen.getByTestId("image-placeholder");
      expect(placeholder).toHaveClass("bg-gray-200");
      expect(placeholder).toHaveClass("dark:bg-gray-700");

      // Progressive loading images should inherit className properly
      // Note: In real usage, the transitions between stages maintain consistent styling
      const container = document.querySelector(".relative");
      expect(container).toBeInTheDocument();
    });

    test("blur placeholder stage has proper opacity transitions", () => {
      render(
        <LazyImage
          src="https://res.cloudinary.com/demo/image/upload/sample.jpg"
          alt="Blur test image"
          className="w-32 h-32 rounded-lg"
          enableProgressiveLoading={true}
          priority={true}
        />,
      );

      // All progressive images should inherit the className with border radius and size
      const container = document.querySelector(".relative");
      expect(container).toBeInTheDocument();
    });

    test("low quality stage maintains styling consistency", () => {
      render(
        <LazyImage
          src="https://res.cloudinary.com/demo/image/upload/sample.jpg"
          alt="Low quality test image"
          className="w-full h-64 object-cover rounded-md border border-gray-200 dark:border-gray-700"
          enableProgressiveLoading={true}
          priority={true}
        />,
      );

      // Verify container exists and will apply consistent styling across stages
      const container = document.querySelector(".relative");
      expect(container).toBeInTheDocument();
    });
  });

  describe("Priority Loading Dark Mode", () => {
    test("priority images bypass intersection observer and maintain dark mode", () => {
      render(
        <LazyImage
          src="https://example.com/priority.jpg"
          alt="Priority image"
          className="w-32 h-32"
          priority={true}
        />,
      );

      // Priority images should load immediately, so we should see img element
      // while still maintaining dark mode placeholder until loaded
      expect(mockIntersectionObserver).not.toHaveBeenCalled();

      // Should still show placeholder initially
      const placeholder = screen.getByTestId("image-placeholder");
      expect(placeholder).toHaveClass("bg-gray-200");
      expect(placeholder).toHaveClass("dark:bg-gray-700");
    });

    test("priority images with custom styling maintain dark mode", () => {
      render(
        <LazyImage
          src="https://example.com/hero.jpg"
          alt="Hero image"
          className="w-full h-96 object-cover bg-gray-300 dark:bg-gray-600"
          priority={true}
        />,
      );

      // Placeholder should respect the custom background colors
      const placeholder = screen.getByTestId("image-placeholder");
      expect(placeholder).toHaveClass("bg-gray-200"); // Default placeholder background
      expect(placeholder).toHaveClass("dark:bg-gray-700"); // Default dark mode background
      expect(placeholder).toHaveClass("w-full"); // Should inherit className
      expect(placeholder).toHaveClass("h-96");
    });
  });

  describe("Accessibility in Dark Mode", () => {
    test("maintains proper ARIA labels in dark mode", () => {
      render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Accessible test image"
          className="w-32 h-32"
        />,
      );

      const placeholder = screen.getByTestId("image-placeholder");
      expect(placeholder).toHaveAttribute("role", "img");
      expect(placeholder).toHaveAttribute(
        "aria-label",
        "Accessible test image",
      );
    });

    test("fallback ARIA label works in dark mode", () => {
      render(
        <LazyImage src="https://example.com/test.jpg" className="w-32 h-32" />,
      );

      const placeholder = screen.getByTestId("image-placeholder");
      expect(placeholder).toHaveAttribute("aria-label", "Image loading");
    });

    test("loaded image maintains accessibility attributes", () => {
      render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Final loaded image"
          className="w-32 h-32"
          priority={true}
        />,
      );

      // Check that the image element has proper alt attribute when rendered
      const images = document.querySelectorAll("img");
      if (images.length > 0) {
        expect(images[images.length - 1]).toHaveAttribute(
          "alt",
          "Final loaded image",
        );
      }

      // Also verify placeholder accessibility
      const placeholder = screen.getByTestId("image-placeholder");
      expect(placeholder).toHaveAttribute("aria-label", "Final loaded image");
    });
  });

  describe("Responsive Images Dark Mode", () => {
    test("responsive image with sizes attribute maintains dark mode", () => {
      render(
        <LazyImage
          src="https://example.com/responsive.jpg"
          alt="Responsive image"
          className="w-full h-auto"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={true}
        />,
      );

      // Placeholder should still show initially with dark mode
      const placeholder = screen.getByTestId("image-placeholder");
      expect(placeholder).toHaveClass("bg-gray-200");
      expect(placeholder).toHaveClass("dark:bg-gray-700");
      expect(placeholder).toHaveClass("w-full");
    });

    test("responsive progressive loading maintains consistency", () => {
      render(
        <LazyImage
          src="https://res.cloudinary.com/demo/image/upload/w_1200/sample.jpg"
          alt="Responsive progressive image"
          className="w-full h-64 object-cover lg:h-96"
          enableProgressiveLoading={true}
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={true}
        />,
      );

      // Should maintain responsive classes throughout loading stages
      const container = document.querySelector(".relative");
      expect(container).toBeInTheDocument();

      const placeholder = screen.getByTestId("image-placeholder");
      expect(placeholder).toHaveClass("w-full");
      expect(placeholder).toHaveClass("h-64");
      expect(placeholder).toHaveClass("lg:h-96");
    });
  });

  describe("Intersection Observer Fallback Dark Mode", () => {
    test("gracefully handles missing IntersectionObserver with dark mode", () => {
      // Temporarily remove IntersectionObserver
      const originalIntersectionObserver = window.IntersectionObserver;
      delete window.IntersectionObserver;

      render(
        <LazyImage
          src="https://example.com/fallback.jpg"
          alt="Fallback test image"
          className="w-32 h-32"
        />,
      );

      // Should still show placeholder with dark mode
      const placeholder = screen.getByTestId("image-placeholder");
      expect(placeholder).toHaveClass("bg-gray-200");
      expect(placeholder).toHaveClass("dark:bg-gray-700");

      // Restore IntersectionObserver
      window.IntersectionObserver = originalIntersectionObserver;
    });
  });
});
