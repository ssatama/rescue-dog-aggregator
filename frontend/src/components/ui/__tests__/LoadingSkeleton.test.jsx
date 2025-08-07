import React from "react";
import { render, screen } from "@testing-library/react";
import { DogCardSkeleton, TrustStatsSkeleton } from "../LoadingSkeleton";

describe("LoadingSkeleton", () => {
  describe("DogCardSkeleton", () => {
    test("should render skeleton with exact 4:3 aspect ratio", () => {
      render(<DogCardSkeleton />);

      const imageContainer = screen.getByTestId("skeleton-image");
      expect(imageContainer).toHaveClass("aspect-[4/3]");
      expect(imageContainer).toHaveClass("skeleton-element");
    });

    test("should have skeleton elements with proper classes", () => {
      render(<DogCardSkeleton />);

      const imageContainer = screen.getByTestId("skeleton-image");
      expect(imageContainer).toHaveClass("skeleton-element");
      expect(imageContainer).toHaveClass("aspect-[4/3]");
    });

    test("should match real DogCard structure", () => {
      render(<DogCardSkeleton />);

      // Header (image area)
      expect(screen.getByTestId("skeleton-image")).toBeInTheDocument();

      // Content area
      expect(screen.getByTestId("skeleton-content")).toBeInTheDocument();

      // Title skeleton
      expect(screen.getByTestId("skeleton-title")).toHaveClass(
        "h-6",
        "w-3/4",
        "skeleton-element",
      );

      // Description skeleton
      expect(screen.getByTestId("skeleton-description")).toHaveClass(
        "h-4",
        "w-1/2",
        "skeleton-element",
      );

      // Button skeleton
      expect(screen.getByTestId("skeleton-button")).toHaveClass(
        "h-10",
        "w-full",
        "skeleton-element",
      );
    });

    test("should have proper accessibility attributes", () => {
      render(<DogCardSkeleton />);

      const skeleton = screen.getByTestId("dog-card-skeleton");
      expect(skeleton).toHaveAttribute("role", "status");
      expect(skeleton).toHaveAttribute("aria-label", "Loading dog information");
    });

    test("should have consistent height with real DogCard", () => {
      render(<DogCardSkeleton />);

      const skeleton = screen.getByTestId("dog-card-skeleton");
      expect(skeleton).toHaveClass("flex", "flex-col", "h-full");
      expect(skeleton).toHaveClass("shadow-blue-sm");
    });

    test("should use unified skeleton system classes", () => {
      render(<DogCardSkeleton />);

      const skeleton = screen.getByTestId("dog-card-skeleton");
      expect(skeleton).toHaveClass("skeleton-container");
    });

    test("should have proper spacing and padding matching real card", () => {
      render(<DogCardSkeleton />);

      const content = screen.getByTestId("skeleton-content");
      expect(content).toHaveClass("p-4", "space-y-2");

      // Button should be positioned at bottom with mt-auto
      const button = screen.getByTestId("skeleton-button");
      expect(button).toHaveClass("mt-auto");
    });
  });

  describe("TrustStatsSkeleton", () => {
    test("should render 3 stat skeleton blocks", () => {
      render(<TrustStatsSkeleton />);

      const statBlocks = screen.getAllByTestId("stat-skeleton");
      expect(statBlocks).toHaveLength(3);
    });

    test("should have responsive grid layout", () => {
      render(<TrustStatsSkeleton />);

      const container = screen.getByTestId("trust-stats-skeleton");
      expect(container).toHaveClass(
        "grid",
        "grid-cols-1",
        "md:grid-cols-3",
        "gap-6",
      );
    });

    test("should have proper icon placeholder dimensions", () => {
      render(<TrustStatsSkeleton />);

      const statBlocks = screen.getAllByTestId("stat-skeleton");
      statBlocks.forEach((block) => {
        const iconPlaceholder = block.querySelector(
          '[data-testid="stat-icon-skeleton"]',
        );
        expect(iconPlaceholder).toHaveClass(
          "w-16",
          "h-16",
          "rounded-full",
          "skeleton-element",
        );
      });
    });

    test("should use skeleton-container for each stat block", () => {
      render(<TrustStatsSkeleton />);

      const statBlocks = screen.getAllByTestId("stat-skeleton");
      statBlocks.forEach((block) => {
        expect(block).toHaveClass("skeleton-container");
      });
    });
  });

  describe("Performance and Accessibility", () => {
    test("should not cause layout shifts", () => {
      const { rerender } = render(<DogCardSkeleton />);

      const skeleton = screen.getByTestId("dog-card-skeleton");
      const initialRect = skeleton.getBoundingClientRect();

      rerender(<DogCardSkeleton />);

      const finalRect = skeleton.getBoundingClientRect();
      expect(finalRect.height).toBe(initialRect.height);
    });

    test("should be screen reader friendly", () => {
      render(<DogCardSkeleton />);

      const skeleton = screen.getByTestId("dog-card-skeleton");
      expect(skeleton).toHaveAttribute("aria-label");
      expect(skeleton).toHaveAttribute("role", "status");
    });
  });
});
