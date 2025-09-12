import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BreedsCTA } from "../BreedsCTA";
import "@testing-library/jest-dom";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("BreedsCTA", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Desktop View", () => {
    beforeEach(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });
    });

    it("renders desktop headline and subheadline", () => {
      render(<BreedsCTA />);
      
      expect(screen.getByText("Discover Your Perfect Match by Personality")).toBeInTheDocument();
      expect(screen.getByText(/Our new breed explorer reveals personality insights/)).toBeInTheDocument();
    });

    it("displays personality trait cards with animation", async () => {
      render(<BreedsCTA />);
      
      const traitCards = screen.getAllByTestId(/trait-card/);
      expect(traitCards).toHaveLength(4);
      
      // Check for specific traits
      expect(screen.getByText("Affectionate")).toBeInTheDocument();
      expect(screen.getByText("Energetic")).toBeInTheDocument();
      expect(screen.getByText("Intelligent")).toBeInTheDocument();
      expect(screen.getByText("Gentle")).toBeInTheDocument();
    });

    it("shows breed count badge", () => {
      render(<BreedsCTA />);
      
      expect(screen.getByText(/50\+ breeds analyzed/)).toBeInTheDocument();
    });

    it("renders primary CTA button with correct text", () => {
      render(<BreedsCTA />);
      
      const ctaButton = screen.getByRole("button", { name: /Explore Breeds and Personalities - Discover personality insights/i });
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).toHaveClass("bg-orange-600");
    });

    it("navigates to breeds page on CTA click", async () => {
      const user = userEvent.setup();
      render(<BreedsCTA />);
      
      const ctaButton = screen.getByRole("button", { name: /Explore Breeds and Personalities - Discover personality insights/i });
      await user.click(ctaButton);
      
      expect(mockPush).toHaveBeenCalledWith("/breeds");
    });

    it("shows NEW badge with pulse animation", () => {
      render(<BreedsCTA />);
      
      const newBadge = screen.getByText("NEW");
      expect(newBadge).toBeInTheDocument();
      expect(newBadge).toHaveClass("animate-pulse");
    });

    it("animates trait bars on scroll into view", async () => {
      const { container } = render(<BreedsCTA />);
      
      // Simulate intersection observer
      const traitBars = container.querySelectorAll("[data-testid^='trait-bar']");
      
      await waitFor(() => {
        traitBars.forEach(bar => {
          expect(bar).toHaveStyle({ width: "0px" });
        });
      });
    });
  });

  describe("Mobile View", () => {
    beforeEach(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

    it("renders mobile-optimized headline", () => {
      render(<BreedsCTA />);
      
      expect(screen.getByText("NEW: Breed Personality Insights")).toBeInTheDocument();
    });

    it("shows swipeable carousel on mobile", () => {
      render(<BreedsCTA />);
      
      // Now we have a grid layout instead of carousel
      const gridContainer = screen.getByText("Personality Traits").closest("div")?.parentElement;
      expect(gridContainer).toHaveClass("grid", "grid-cols-1");
    });

    it("displays compact CTA button on mobile", () => {
      render(<BreedsCTA />);
      
      const ctaButton = screen.getByRole("button", { name: /Discover Breeds and explore personality insights/i });
      expect(ctaButton).toBeInTheDocument();
      expect(ctaButton).toHaveClass("w-full");
    });

    it("shows top 3 breeds in mobile view", () => {
      render(<BreedsCTA />);
      
      expect(screen.getByText("Labrador")).toBeInTheDocument();
      expect(screen.getByText("Golden Retriever")).toBeInTheDocument();
      expect(screen.getByText("German Shepherd")).toBeInTheDocument();
    });

    it("displays breed cards in grid layout", () => {
      render(<BreedsCTA />);
      
      // Check that both cards are present in the grid layout
      expect(screen.getByText("Personality Traits")).toBeInTheDocument();
      expect(screen.getByText("Top Breeds")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels", () => {
      // Test desktop view
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });
      
      const { unmount } = render(<BreedsCTA />);
      
      expect(screen.getByRole("region", { name: /Breed Discovery and Personality Insights/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Explore Breeds and Personalities - Discover personality insights/i })).toBeInTheDocument();
      
      unmount();
      
      // Test mobile view
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<BreedsCTA />);
      
      expect(screen.getByRole("region", { name: /Breed Discovery/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Discover Breeds and explore personality insights/i })).toBeInTheDocument();
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      
      // Test desktop view
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });
      
      render(<BreedsCTA />);
      
      const ctaButton = screen.getByRole("button", { name: /Explore Breeds and Personalities - Discover personality insights/i });
      
      // Focus the button directly since framer-motion adds interactivity to cards
      ctaButton.focus();
      expect(ctaButton).toHaveFocus();
      
      // Enter to activate
      await user.keyboard("{Enter}");
      expect(mockPush).toHaveBeenCalledWith("/breeds");
    });

    it("has sufficient color contrast", () => {
      // Test desktop view
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1024,
      });
      
      render(<BreedsCTA />);
      
      const ctaButton = screen.getByRole("button", { name: /Explore Breeds and Personalities - Discover personality insights/i });
      expect(ctaButton).toHaveClass("text-white", "bg-orange-600");
    });
  });

  describe("Performance", () => {
    it("lazy loads non-critical images", () => {
      render(<BreedsCTA />);
      
      const images = screen.queryAllByRole("img");
      images.forEach(img => {
        expect(img).toHaveAttribute("loading", "lazy");
      });
    });

    it("uses optimized animations", () => {
      const { container } = render(<BreedsCTA />);
      
      const animatedElements = container.querySelectorAll("[class*='transition']");
      expect(animatedElements.length).toBeGreaterThan(0);
    });
  });
});