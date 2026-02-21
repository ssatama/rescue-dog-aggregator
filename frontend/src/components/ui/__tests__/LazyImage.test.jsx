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

describe("LazyImage", () => {
  beforeEach(() => {
    mockIntersectionObserver.mockClear();
    // Reset dark mode
    document.documentElement.classList.remove("dark");
  });

  describe("Core Functionality", () => {
    it("renders image with correct src and alt", () => {
      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Test image"
          priority={true}
        />,
      );

      const image = screen.getByAltText("Test image");
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute("src", "https://example.com/image.jpg");
    });

    it("uses IntersectionObserver for lazy loading when not priority", () => {
      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Test image"
          priority={false}
        />,
      );

      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    it("applies custom className", () => {
      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Test image"
          className="custom-class"
          priority={true}
        />,
      );

      const image = screen.getByAltText("Test image");
      expect(image).toHaveClass("custom-class");
    });
  });

  describe("Fill Mode", () => {
    it("applies fill styles to image and container when fill prop is true", () => {
      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Fill image"
          fill
          priority={true}
        />,
      );

      const image = screen.getByAltText("Fill image");
      expect(image).toHaveClass("absolute");
      expect(image).toHaveClass("inset-0");
      expect(image).toHaveClass("w-full");
      expect(image).toHaveClass("h-full");
      expect(image).toHaveClass("object-cover");

      const container = image.closest("div");
      expect(container).toHaveClass("relative");
      expect(container).toHaveClass("w-full");
      expect(container).toHaveClass("h-full");
    });

    it("does not apply fill styles when fill prop is false", () => {
      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="No fill image"
          priority={true}
        />,
      );

      const image = screen.getByAltText("No fill image");
      expect(image).not.toHaveClass("object-cover");
    });
  });

  describe("Dark Mode Support", () => {
    beforeEach(() => {
      document.documentElement.classList.add("dark");
    });

    it("renders correctly in dark mode", () => {
      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Dark mode image"
          priority={true}
        />,
      );

      const image = screen.getByAltText("Dark mode image");
      expect(image).toBeInTheDocument();
    });
  });

  describe("Transitions", () => {
    it("starts with opacity-0 and transitions to opacity-100 on load", async () => {
      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Test image"
          priority={true}
        />,
      );

      const image = screen.getByAltText("Test image");

      // Initially should have opacity-0
      expect(image).toHaveClass("opacity-0");
      expect(image).toHaveClass("transition-opacity");
      expect(image).toHaveClass("duration-300");

      // Simulate image load
      fireEvent.load(image);

      await waitFor(() => {
        expect(image).toHaveClass("opacity-100");
      });
    });

    it("applies 300ms transition duration for smooth fade-in", () => {
      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Test image"
          priority={true}
        />,
      );

      const image = screen.getByAltText("Test image");
      expect(image).toHaveClass("transition-opacity");
      expect(image).toHaveClass("duration-300");
    });
  });

  describe("Progressive Loading", () => {
    it("maintains progressive loading capabilities", async () => {
      render(
        <LazyImage
          src="https://res.cloudinary.com/test/image/upload/test.jpg"
          alt="Test image"
          enableProgressiveLoading={true}
          priority={true}
        />,
      );

      // Should have multiple images for progressive loading
      const images = screen.getAllByAltText("Test image");
      expect(images.length).toBeGreaterThan(1);

      // All images should have transition classes
      images.forEach((image) => {
        expect(image).toHaveClass("transition-opacity");
      });
    });

    it("shows placeholder until image loads", async () => {
      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Test image"
          priority={true}
          placeholder={<div data-testid="custom-placeholder">Loading...</div>}
        />,
      );

      // Placeholder should be visible initially
      expect(screen.getByTestId("custom-placeholder")).toBeInTheDocument();

      const image = screen.getByAltText("Test image");
      expect(image).toHaveClass("opacity-0");

      // Simulate image load
      fireEvent.load(image);

      await waitFor(() => {
        expect(image).toHaveClass("opacity-100");
      });
    });
  });

  describe("Error Handling", () => {
    it("handles image load errors gracefully", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      render(
        <LazyImage
          src="https://example.com/broken.jpg"
          alt="Broken image"
          priority={true}
        />,
      );

      const image = screen.getByAltText("Broken image");
      fireEvent.error(image);

      // Verify error handler is set up
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringMatching(/Uncaught/),
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Accessibility", () => {
    it("includes proper ARIA attributes", () => {
      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Accessible image"
          priority={true}
          aria-label="Custom aria label"
        />,
      );

      const image = screen.getByAltText("Accessible image");
      expect(image).toHaveAttribute("alt", "Accessible image");
    });

    it("maintains focus states for keyboard navigation", () => {
      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Focusable image"
          priority={true}
          tabIndex={0}
        />,
      );

      const image = screen.getByAltText("Focusable image");
      expect(image).toHaveAttribute("tabIndex", "0");
    });
  });
});
