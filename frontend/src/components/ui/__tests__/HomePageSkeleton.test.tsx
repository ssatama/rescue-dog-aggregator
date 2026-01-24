import React from "react";
import { render, screen } from "../../../test-utils";
import HomePageSkeleton from "../HomePageSkeleton";

describe("HomePageSkeleton", () => {
  describe("Basic Rendering", () => {
    it("renders with proper accessibility attributes", () => {
      render(<HomePageSkeleton />);

      const container = screen.getByRole("status");
      expect(container).toBeInTheDocument();
      expect(container).toHaveAttribute("aria-label", "Loading home page");
      expect(container).toHaveAttribute("aria-busy", "true");
    });

    it("renders hero section skeleton", () => {
      render(<HomePageSkeleton />);

      const container = screen.getByRole("status");
      // Hero section should have large title placeholder
      expect(container.querySelector('[data-testid="hero-skeleton"]')).toBeInTheDocument();
    });

    it("renders platform capabilities skeleton", () => {
      render(<HomePageSkeleton />);

      const container = screen.getByRole("status");
      // Platform capabilities with 3 cards
      const capabilitiesSection = container.querySelector('[data-testid="capabilities-skeleton"]');
      expect(capabilitiesSection).toBeInTheDocument();
    });

    it("renders featured dogs section skeleton", () => {
      render(<HomePageSkeleton />);

      const container = screen.getByRole("status");
      // Featured dogs grid
      const featuredSection = container.querySelector('[data-testid="featured-skeleton"]');
      expect(featuredSection).toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    it("has mobile-first responsive classes", () => {
      render(<HomePageSkeleton />);

      const container = screen.getByRole("status");
      // Should have responsive container
      expect(container).toHaveClass("min-h-screen");
    });

    it("renders desktop layout skeleton", () => {
      render(<HomePageSkeleton />);

      // Desktop section should be present
      const desktopSection = screen.getByTestId("desktop-skeleton");
      expect(desktopSection).toHaveClass("hidden", "sm:block");
    });

    it("renders mobile layout skeleton", () => {
      render(<HomePageSkeleton />);

      // Mobile section should be present
      const mobileSection = screen.getByTestId("mobile-skeleton");
      expect(mobileSection).toHaveClass("sm:hidden");
    });
  });

  describe("Skeleton Animation", () => {
    it("uses consistent skeleton styling", () => {
      render(<HomePageSkeleton />);

      const container = screen.getByRole("status");
      // Should have multiple skeleton elements with animate-pulse
      const skeletonElements = container.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletonElements.length).toBeGreaterThan(5);
    });
  });

  describe("Props Forwarding", () => {
    it("forwards data-testid prop", () => {
      render(<HomePageSkeleton data-testid="custom-skeleton" />);

      expect(screen.getByTestId("custom-skeleton")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(<HomePageSkeleton className="custom-class" />);

      const container = screen.getByRole("status");
      expect(container).toHaveClass("custom-class");
    });
  });

  describe("Performance", () => {
    it("renders efficiently", () => {
      const startTime = performance.now();
      render(<HomePageSkeleton />);
      const endTime = performance.now();

      // Should render in under 50ms
      expect(endTime - startTime).toBeLessThan(50);
    });
  });
});
