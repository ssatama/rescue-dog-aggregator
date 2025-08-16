import React from "react";
import { render, screen, fireEvent, waitFor } from "../../../test-utils";
import LazyImage from "../LazyImage";

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

describe("LazyImage - Transition Enhancements", () => {
  beforeEach(() => {
    mockIntersectionObserver.mockClear();
  });

  describe("Smooth Fade-in Transitions", () => {
    it("starts with opacity-0 and transitions to opacity-100 on load", async () => {
      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Test image"
          priority={true}
          data-testid="lazy-image"
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
          data-testid="lazy-image"
        />,
      );

      const image = screen.getByAltText("Test image");
      expect(image).toHaveClass("transition-opacity");
      expect(image).toHaveClass("duration-300");
    });

    it("maintains existing progressive loading capabilities", async () => {
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
  });

  describe("Placeholder Integration", () => {
    it("shows placeholder until image loads with smooth transition", async () => {
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

    it("uses default placeholder when none provided", () => {
      render(
        <LazyImage
          src="https://example.com/slow-image.jpg"
          alt="Test image"
          priority={true}
        />,
      );

      // Should show default placeholder
      expect(screen.getByTestId("image-placeholder")).toBeInTheDocument();
    });
  });

  describe("Motion Preferences Respect", () => {
    it("respects prefers-reduced-motion setting", () => {
      // Mock reduced motion preference
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === "(prefers-reduced-motion: reduce)",
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Test image"
          priority={true}
        />,
      );

      const image = screen.getByAltText("Test image");
      // Should still have transition classes (CSS will handle reduced motion)
      expect(image).toHaveClass("transition-opacity");
      expect(image).toHaveClass("duration-300");
    });
  });

  describe("Error Handling with Transitions", () => {
    it("handles image load errors gracefully with transitions", async () => {
      render(
        <LazyImage
          src="https://example.com/broken-image.jpg"
          alt="Test image"
          priority={true}
        />,
      );

      const image = screen.getByAltText("Test image");

      // Simulate image error
      fireEvent.error(image);

      await waitFor(() => {
        expect(screen.getByTestId("image-error")).toBeInTheDocument();
      });
    });
  });

  describe("Performance Considerations", () => {
    it("does not cause layout shifts during transition", async () => {
      const { container } = render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Test image"
          className="w-64 h-48"
          priority={true}
        />,
      );

      const image = screen.getByAltText("Test image");
      expect(image).toHaveClass("w-64");
      expect(image).toHaveClass("h-48");

      // Simulate load
      fireEvent.load(image);

      await waitFor(() => {
        expect(image).toHaveClass("opacity-100");
        // Dimensions should remain unchanged
        expect(image).toHaveClass("w-64");
        expect(image).toHaveClass("h-48");
      });
    });

    it("maintains proper z-index stacking for progressive loading", () => {
      const { container } = render(
        <LazyImage
          src="https://res.cloudinary.com/test/image/upload/test.jpg"
          alt="Test image"
          enableProgressiveLoading={true}
          priority={true}
        />,
      );

      const imageContainer = container.querySelector(".relative");
      expect(imageContainer).toBeInTheDocument();
      expect(imageContainer).toHaveClass("relative");
    });
  });

  describe("Intersection Observer Integration", () => {
    it("maintains lazy loading functionality with transitions", () => {
      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Test image"
          priority={false} // Enable intersection observer
        />,
      );

      // Should have called IntersectionObserver
      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    it("immediate loads priority images with transitions", async () => {
      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Test image"
          priority={true}
        />,
      );

      const image = screen.getByAltText("Test image");
      expect(image).toBeInTheDocument();
      expect(image).toHaveClass("opacity-0");
      expect(image).toHaveClass("transition-opacity");
    });
  });

  describe("Callback Integration", () => {
    it("calls onLoad callback after transition setup", async () => {
      const onLoadMock = jest.fn();

      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Test image"
          priority={true}
          onLoad={onLoadMock}
        />,
      );

      const image = screen.getByAltText("Test image");
      fireEvent.load(image);

      await waitFor(() => {
        expect(onLoadMock).toHaveBeenCalled();
        expect(image).toHaveClass("opacity-100");
      });
    });

    it("calls onError callback when image fails", async () => {
      const onErrorMock = jest.fn();

      render(
        <LazyImage
          src="https://example.com/broken-image.jpg"
          alt="Test image"
          priority={true}
          onError={onErrorMock}
        />,
      );

      const image = screen.getByAltText("Test image");
      fireEvent.error(image);

      await waitFor(() => {
        expect(onErrorMock).toHaveBeenCalled();
      });
    });
  });
});
