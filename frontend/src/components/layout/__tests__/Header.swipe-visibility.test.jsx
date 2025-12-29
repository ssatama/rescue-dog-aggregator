import React from "react";
import { render, screen } from "@testing-library/react";
import Header from "../Header";
import { usePathname } from "next/navigation";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

jest.mock("../../ui/ThemeToggle", () => ({
  ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

jest.mock("../../favorites/FavoriteBadge", () => ({
  FavoriteBadge: () => <span data-testid="favorite-badge">0</span>,
}));

describe("Header - Swipe Navigation Visibility", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/");
  });

  describe("Desktop viewport (>= 1024px)", () => {
    beforeEach(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1280,
      });
    });

    it("should show Start Swiping CTA button in desktop navigation", () => {
      render(<Header />);

      // Swipe is now a CTA button with "Start Swiping" text
      const swipeButton = screen.getByRole("link", { name: /start swiping/i });
      expect(swipeButton).toBeInTheDocument();
      expect(swipeButton).toHaveAttribute("href", "/swipe");
      // Should have orange button styling
      expect(swipeButton).toHaveClass("bg-orange-600");
    });
  });

  describe("Tablet viewport (768px - 1023px)", () => {
    beforeEach(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 900,
      });
    });

    it("should show Start Swiping button in tablet navigation", () => {
      render(<Header />);

      // Should find Start Swiping button that's visible on tablets
      const swipeButton = screen.getByRole("link", { name: /start swiping/i });
      expect(swipeButton).toBeInTheDocument();
      expect(swipeButton).toHaveAttribute("href", "/swipe");
    });
  });

  describe("Mobile viewport (< 768px)", () => {
    beforeEach(() => {
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

    it.skip("mobile menu removed - Swipe now in MobileBottomNav", () => {
      // Mobile menu was removed from Header component
      // Swipe link is now in the MobileBottomNav component
    });
  });

  describe("Active state styling", () => {
    it.skip("Start Swiping button is always styled as CTA, no underline indicator", () => {
      // Swipe is now a CTA button, not a nav link
      // It doesn't use the underline indicator pattern
    });
  });
});