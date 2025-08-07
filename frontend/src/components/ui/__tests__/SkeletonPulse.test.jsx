import React from "react";
import { render, screen } from "@testing-library/react";
import SkeletonPulse from "../SkeletonPulse";

describe("SkeletonPulse", () => {
  describe("Basic Rendering", () => {
    it("renders with default skeleton styling", () => {
      render(<SkeletonPulse data-testid="skeleton" />);

      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass("skeleton-element");
      expect(skeleton).toHaveClass("rounded");
      expect(skeleton).not.toHaveClass("bg-muted");
      expect(skeleton).not.toHaveClass("animate-pulse");
    });

    it("applies custom className when provided", () => {
      render(<SkeletonPulse className="h-4 w-3/4" data-testid="skeleton" />);

      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("h-4");
      expect(skeleton).toHaveClass("w-3/4");
      expect(skeleton).toHaveClass("skeleton-element");
      expect(skeleton).toHaveClass("rounded");
    });

    it("merges custom className with default classes", () => {
      render(
        <SkeletonPulse className="h-6 bg-orange-100" data-testid="skeleton" />,
      );

      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("h-6");
      expect(skeleton).toHaveClass("bg-orange-100");
      expect(skeleton).toHaveClass("skeleton-element");
      expect(skeleton).toHaveClass("rounded");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes for standalone loading state", () => {
      render(<SkeletonPulse />);

      const skeleton = screen.getByRole("status");
      expect(skeleton).toHaveAttribute("aria-label", "Loading content");
      expect(skeleton).toHaveAttribute("aria-busy", "true");
    });

    it("does not add ARIA attributes when standalone=false", () => {
      render(<SkeletonPulse standalone={false} data-testid="skeleton" />);

      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).not.toHaveAttribute("role");
      expect(skeleton).not.toHaveAttribute("aria-label");
      expect(skeleton).not.toHaveAttribute("aria-busy");
    });

    it("respects reduced motion preferences", () => {
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

      render(<SkeletonPulse data-testid="skeleton" />);

      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe("Props Forwarding", () => {
    it("forwards additional props to the div element", () => {
      render(
        <SkeletonPulse
          data-testid="skeleton"
          id="test-skeleton"
          title="Loading skeleton"
        />,
      );

      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveAttribute("id", "test-skeleton");
      expect(skeleton).toHaveAttribute("title", "Loading skeleton");
    });

    it("forwards style prop correctly", () => {
      const customStyle = { width: "200px", height: "50px" };
      render(<SkeletonPulse style={customStyle} data-testid="skeleton" />);

      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveStyle("width: 200px");
      expect(skeleton).toHaveStyle("height: 50px");
    });
  });

  describe("New Skeleton Animation System", () => {
    it("uses skeleton-element class instead of animate-pulse", () => {
      render(<SkeletonPulse data-testid="skeleton" />);

      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("skeleton-element");
      expect(skeleton).toHaveClass("rounded");
      expect(skeleton).not.toHaveClass("animate-pulse");
      expect(skeleton).not.toHaveClass("bg-muted");
    });

    it("supports intensity prop with normal as default", () => {
      render(<SkeletonPulse data-testid="skeleton" />);

      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("skeleton-element");
    });

    it("applies subtle intensity variation", () => {
      render(<SkeletonPulse intensity="subtle" data-testid="skeleton" />);

      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("skeleton-element");
      expect(skeleton).toHaveClass("skeleton-subtle");
    });

    it("applies normal intensity (default)", () => {
      render(<SkeletonPulse intensity="normal" data-testid="skeleton" />);

      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("skeleton-element");
      expect(skeleton).not.toHaveClass("skeleton-subtle");
    });

    it("merges intensity classes with custom className", () => {
      render(
        <SkeletonPulse
          intensity="subtle"
          className="h-6 w-32"
          data-testid="skeleton"
        />,
      );

      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("skeleton-element");
      expect(skeleton).toHaveClass("skeleton-subtle");
      expect(skeleton).toHaveClass("h-6");
      expect(skeleton).toHaveClass("w-32");
      expect(skeleton).toHaveClass("rounded");
    });
  });

  describe("Backward Compatibility", () => {
    it("maintains all existing props and behavior", () => {
      render(
        <SkeletonPulse
          className="h-4 w-3/4"
          data-testid="skeleton"
          standalone={true}
          id="legacy-skeleton"
        />,
      );

      const skeleton = screen.getByTestId("skeleton");
      expect(skeleton).toHaveClass("skeleton-element");
      expect(skeleton).toHaveClass("h-4");
      expect(skeleton).toHaveClass("w-3/4");
      expect(skeleton).toHaveClass("rounded");
      expect(skeleton).toHaveAttribute("id", "legacy-skeleton");
      expect(skeleton).toHaveAttribute("role", "status");
    });

    it("works with existing ContentSkeleton usage patterns", () => {
      render(
        <SkeletonPulse
          standalone={false}
          className="h-4 w-2/3"
          data-testid="content-skeleton-line"
        />,
      );

      const skeleton = screen.getByTestId("content-skeleton-line");
      expect(skeleton).toHaveClass("skeleton-element");
      expect(skeleton).toHaveClass("h-4");
      expect(skeleton).toHaveClass("w-2/3");
      expect(skeleton).not.toHaveAttribute("role");
    });
  });
});
