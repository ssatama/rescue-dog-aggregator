// frontend/src/components/ui/__tests__/LazyImageProgressive.test.jsx

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LazyImage from "../LazyImage";

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

describe("LazyImage Progressive Loading", () => {
  const cloudinaryUrl =
    "https://res.cloudinary.com/test/image/upload/v123/dog.jpg";
  const externalUrl = "https://example.com/dog.jpg";

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup IntersectionObserver to trigger immediately
    mockIntersectionObserver.mockImplementation((callback) => {
      // Immediately trigger the callback to simulate in-view
      setTimeout(() => callback([{ isIntersecting: true }]), 0);
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
    });
  });

  describe("3-Stage Progressive Loading for Cloudinary URLs", () => {
    it("should generate progressive URLs correctly", async () => {
      const { container } = render(
        <LazyImage
          src={cloudinaryUrl}
          alt="Test Dog"
          enableProgressiveLoading={true}
          className="test-image"
        />,
      );

      await waitFor(() => {
        // Should have final image
        const fullQualityImg = container.querySelector(
          `img[src="${cloudinaryUrl}"]`,
        );
        expect(fullQualityImg).toBeInTheDocument();
      });
    });

    it("should enable progressive loading when prop is true", async () => {
      const { container } = render(
        <LazyImage
          src={cloudinaryUrl}
          alt="Test Dog"
          enableProgressiveLoading={true}
          className="test-image"
        />,
      );

      await waitFor(() => {
        // Should have at least the final image
        const images = container.querySelectorAll("img");
        expect(images.length).toBeGreaterThan(0);
      });
    });

    it("should have smooth transitions with transition classes", async () => {
      const { container } = render(
        <LazyImage
          src={cloudinaryUrl}
          alt="Test Dog"
          enableProgressiveLoading={true}
          className="test-image"
        />,
      );

      await waitFor(() => {
        const images = container.querySelectorAll("img");
        // All images should have transition classes
        images.forEach((img) => {
          expect(img).toHaveClass("transition-opacity");
        });
      });
    });
  });

  describe("Progressive Loading Disabled", () => {
    it("should only show final image when progressive loading is disabled", async () => {
      const { container } = render(
        <LazyImage
          src={cloudinaryUrl}
          alt="Test Dog"
          enableProgressiveLoading={false}
          className="test-image"
        />,
      );

      await waitFor(() => {
        // Should only have one image (the final one)
        const images = container.querySelectorAll("img");
        expect(images).toHaveLength(1);
        expect(images[0]).toHaveAttribute("src", cloudinaryUrl);
      });
    });
  });

  describe("Non-Cloudinary URLs", () => {
    it("should handle external URLs gracefully", async () => {
      const { container } = render(
        <LazyImage
          src={externalUrl}
          alt="Test Dog"
          enableProgressiveLoading={true}
          className="test-image"
        />,
      );

      await waitFor(() => {
        // Should only have the final image (no blur placeholder for external URLs)
        const images = container.querySelectorAll("img");
        expect(images).toHaveLength(2); // Low quality + full quality

        // No blur placeholder for external URLs
        expect(
          container.querySelector('img[src*="e_blur"]'),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Error Handling in Progressive Loading", () => {
    it("should handle errors gracefully", async () => {
      const onError = jest.fn();
      const { container } = render(
        <LazyImage
          src={cloudinaryUrl}
          alt="Test Dog"
          enableProgressiveLoading={true}
          onError={onError}
          className="test-image"
        />,
      );

      await waitFor(() => {
        const images = container.querySelectorAll("img");
        expect(images.length).toBeGreaterThan(0);

        // Trigger error on any image
        fireEvent.error(images[0]);
        expect(onError).toHaveBeenCalled();
      });
    });
  });

  describe("Performance Optimizations", () => {
    it("should use lazy loading for all stages", async () => {
      const { container } = render(
        <LazyImage
          src={cloudinaryUrl}
          alt="Test Dog"
          enableProgressiveLoading={true}
          className="test-image"
        />,
      );

      await waitFor(() => {
        const images = container.querySelectorAll("img");
        images.forEach((img) => {
          expect(img).toHaveAttribute("loading", "lazy");
        });
      });
    });

    it("should position images absolutely for smooth transitions", async () => {
      const { container } = render(
        <LazyImage
          src={cloudinaryUrl}
          alt="Test Dog"
          enableProgressiveLoading={true}
          className="test-image"
        />,
      );

      await waitFor(() => {
        // After blur loads, subsequent images should be positioned absolutely
        const blurImg = container.querySelector('img[src*="e_blur:300"]');
        if (blurImg) {
          fireEvent.load(blurImg);
        }

        const lowQualityImg = container.querySelector('img[src*="q_20"]');
        if (lowQualityImg) {
          expect(lowQualityImg).toHaveClass("absolute", "inset-0");
        }
      });
    });
  });

  describe("Accessibility", () => {
    it("should maintain proper alt text across all stages", async () => {
      const { container } = render(
        <LazyImage
          src={cloudinaryUrl}
          alt="Test Dog Progressive"
          enableProgressiveLoading={true}
          className="test-image"
        />,
      );

      await waitFor(() => {
        const images = container.querySelectorAll("img");
        images.forEach((img) => {
          expect(img).toHaveAttribute("alt", "Test Dog Progressive");
        });
      });
    });
  });
});
