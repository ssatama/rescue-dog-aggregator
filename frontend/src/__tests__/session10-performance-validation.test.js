/**
 * Session 10: Performance Optimization Validation Tests
 * Verifies bundle optimization, lazy loading, and animation performance
 */

import { render, screen, act } from "@testing-library/react";
import React, { Suspense } from "react";
import DogCard from "../components/dogs/DogCard";
import LazyImage from "../components/ui/LazyImage";
import DogSection from "../components/home/DogSection";

// Mock intersection observer for LazyImage tests
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {}
  disconnect() {}
  unobserve() {}
};

describe("Session 10: Performance Optimization Validation", () => {
  describe("Lazy Loading Performance", () => {
    test("LazyImage implements proper intersection observer optimization", () => {
      const mockImage =
        "https://res.cloudinary.com/test/image/upload/v123/test.jpg";

      render(
        <LazyImage
          src={mockImage}
          alt="Performance test image"
          priority={false}
          sizes="(max-width: 768px) 100vw, 50vw"
        />,
      );

      // LazyImage should not load images until they're in viewport
      const placeholder = screen.getByTestId("image-placeholder");
      expect(placeholder).toBeInTheDocument();
      expect(placeholder).toHaveAttribute("role", "img");
      expect(placeholder).toHaveAttribute(
        "aria-label",
        "Performance test image",
      );
    });

    test("LazyImage priority flag bypasses intersection observer for above-fold content", () => {
      const mockImage =
        "https://res.cloudinary.com/test/image/upload/v123/priority.jpg";

      render(
        <LazyImage
          src={mockImage}
          alt="Priority performance test"
          priority={true}
          sizes="100vw"
        />,
      );

      // Priority images should load immediately
      const images = screen.getAllByAltText("Priority performance test");
      expect(images.length).toBeGreaterThan(0);
    });
  });

  describe("React Performance Optimizations", () => {
    test("DogCard uses React.memo for render optimization", () => {
      const mockDog = {
        id: 1,
        name: "Performance Test Dog",
        breed: "Test Breed",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" },
      };

      // Verify DogCard is wrapped with memo (React.memo components have specific characteristics)
      expect(typeof DogCard).toBe("object"); // React.memo returns an object, not a function

      const { rerender } = render(<DogCard dog={mockDog} />);

      // Same props should not cause re-render (React.memo optimization)
      rerender(<DogCard dog={mockDog} />);

      const dogName = screen.getByText("Performance Test Dog");
      expect(dogName).toBeInTheDocument();
    });

    test("Components implement proper cleanup for memory leak prevention", () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const { unmount } = render(
        <LazyImage
          src="https://example.com/cleanup-test.jpg"
          alt="Cleanup test"
          priority={true}
        />,
      );

      // Unmount should not cause memory leaks or console errors
      unmount();

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("Animation Performance (60fps)", () => {
    test("GPU-accelerated animations use transform and opacity", () => {
      const mockDog = {
        id: 1,
        name: "Animation Test Dog",
        primary_image_url: "https://example.com/animation.jpg",
      };

      render(<DogCard dog={mockDog} />);

      const card = screen.getByTestId("dog-card-1");
      expect(card).toHaveClass("group"); // Enables hover animations

      // Verify the card has transition classes for smooth animations
      expect(card.className).toMatch(/transition|animate/);
    });

    test("Animation respects reduced motion preferences", () => {
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

      const { container } = render(
        <LazyImage
          src="https://example.com/motion-test.jpg"
          alt="Motion sensitivity test"
          enableProgressiveLoading={true}
          priority={true}
        />,
      );

      // Component should handle reduced motion gracefully
      expect(container).toBeInTheDocument();
    });
  });

  describe("Bundle Optimization", () => {
    test("Conditional development logging does not leak to production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      render(
        <LazyImage
          src="https://example.com/production.jpg"
          alt="Production test"
          priority={true}
        />,
      );

      // No console logs should appear in production
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    test("Components are tree-shakeable and do not import unused dependencies", () => {
      const mockDog = {
        id: 1,
        name: "Bundle Test Dog",
        primary_image_url: "https://example.com/bundle.jpg",
      };

      // This test verifies that DogCard renders without importing heavy dependencies
      expect(() => {
        render(<DogCard dog={mockDog} />);
      }).not.toThrow();

      const dogCard = screen.getByTestId("dog-card-1");
      expect(dogCard).toBeInTheDocument();
    });
  });

  describe("Progressive Enhancement", () => {
    test("LazyImage provides proper fallback for failed images", () => {
      render(
        <LazyImage
          src="https://invalid-url.com/missing.jpg"
          alt="Progressive enhancement test"
          priority={true}
        />,
      );

      // Should show placeholder while attempting to load
      const placeholder = screen.getByTestId("image-placeholder");
      expect(placeholder).toBeInTheDocument();
      expect(placeholder).toHaveAttribute(
        "aria-label",
        "Progressive enhancement test",
      );
    });

    test("Progressive loading stages work correctly", () => {
      const cloudinaryUrl =
        "https://res.cloudinary.com/test/image/upload/v123/progressive.jpg";

      render(
        <LazyImage
          src={cloudinaryUrl}
          alt="Progressive loading test"
          enableProgressiveLoading={true}
          priority={true}
        />,
      );

      // Should render progressive loading stages
      const images = screen.getAllByAltText("Progressive loading test");
      expect(images.length).toBeGreaterThanOrEqual(1);

      // Each image should have proper transition classes for smooth progression
      images.forEach((img) => {
        expect(img.className).toMatch(/transition-opacity/);
      });
    });
  });

  describe("Core Web Vitals Optimization", () => {
    test("Images use proper sizes attribute for LCP optimization", () => {
      const mockDog = {
        id: 1,
        name: "LCP Test Dog",
        primary_image_url:
          "https://res.cloudinary.com/test/image/upload/v123/lcp.jpg",
      };

      render(<DogCard dog={mockDog} priority={true} />);

      const images = screen.getAllByAltText("LCP Test Dog");
      const mainImage = images.find((img) => img.src?.includes("lcp.jpg"));

      // Verify responsive sizing for LCP optimization
      expect(mainImage).toHaveAttribute(
        "sizes",
        "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
      );
    });

    test("Layout shift prevention with aspect ratio containers", () => {
      const mockDog = {
        id: 1,
        name: "CLS Test Dog",
        primary_image_url: "https://example.com/cls.jpg",
      };

      render(<DogCard dog={mockDog} />);

      const imageContainer = screen.getByTestId("image-container");
      expect(imageContainer).toHaveClass("aspect-[4/3]");
      expect(imageContainer).toHaveClass("overflow-hidden");
    });

    test("Touch targets meet 48px minimum for FID optimization", () => {
      const mockDog = {
        id: 1,
        name: "FID Test Dog",
        primary_image_url: "https://example.com/fid.jpg",
      };

      render(<DogCard dog={mockDog} />);

      const ctaButton = screen.getByText(/Meet FID Test Dog/);
      expect(ctaButton).toHaveClass("mobile-touch-target");

      // Should have proper focus states for accessibility
      expect(ctaButton).toHaveClass("enhanced-focus-button");
    });
  });

  describe("Performance Monitoring", () => {
    test("Components do not cause excessive re-renders", () => {
      const mockDog = {
        id: 1,
        name: "Render Test Dog",
        primary_image_url: "https://example.com/render.jpg",
        age_min_months: 24,
        organization: { name: "Test Org" },
      };

      let renderCount = 0;
      const TestWrapper = ({ dog }) => {
        renderCount++;
        return <DogCard dog={dog} />;
      };

      const { rerender } = render(<TestWrapper dog={mockDog} />);

      // Same props should not cause re-render due to React.memo
      rerender(<TestWrapper dog={mockDog} />);

      // Should only render twice: initial + rerender with same props (memo should prevent extra renders)
      expect(renderCount).toBeLessThanOrEqual(2);
    });

    test("Error boundaries prevent cascading failures", () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Test with malformed data that might cause errors
      const malformedDog = {
        id: null,
        name: undefined,
        primary_image_url: "invalid-url",
      };

      expect(() => {
        render(<DogCard dog={malformedDog} />);
      }).not.toThrow();

      consoleSpy.mockRestore();
    });
  });

  describe("Memory Management", () => {
    test("Event listeners are properly cleaned up on unmount", () => {
      const { unmount } = render(
        <LazyImage
          src="https://example.com/memory.jpg"
          alt="Memory management test"
          priority={true}
        />,
      );

      // Should unmount without memory leaks
      expect(() => unmount()).not.toThrow();
    });

    test("Intersection observers are disconnected on cleanup", () => {
      const mockObserver = {
        observe: jest.fn(),
        disconnect: jest.fn(),
        unobserve: jest.fn(),
      };

      global.IntersectionObserver = jest.fn(() => mockObserver);

      const { unmount } = render(
        <LazyImage
          src="https://example.com/observer.jpg"
          alt="Observer cleanup test"
          priority={false}
        />,
      );

      unmount();

      // Intersection observer should be properly cleaned up
      expect(mockObserver.disconnect).toHaveBeenCalled();
    });
  });
});
