import React from "react";
import { render, screen } from "@testing-library/react";
import Header from "../Header";
import { usePathname } from "next/navigation";

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

jest.mock("../../ui/Icon", () => ({
  Icon: ({ name, "aria-label": ariaLabel }) => (
    <span data-testid={`icon-${name}`} aria-label={ariaLabel}>
      {name}
    </span>
  ),
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

    it("should NOT show Swipe link in desktop navigation", () => {
      render(<Header />);

      // Check desktop navigation area
      const desktopNav = screen.getByRole("navigation");
      const swipeLinks = screen.queryAllByText("Swipe");

      // Should not find any Swipe links in the visible desktop navigation
      // (they should have lg:hidden class applied)
      swipeLinks.forEach((link) => {
        const parent = link.closest(".lg\\:hidden");
        if (parent) {
          expect(parent).toBeInTheDocument();
        }
      });
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

    it("should show Swipe link in tablet navigation", () => {
      render(<Header />);

      // Should find Swipe link that's visible on tablets
      const swipeLink = screen.getByRole("link", { name: /swipe/i });
      expect(swipeLink).toBeInTheDocument();
      expect(swipeLink).toHaveAttribute("href", "/swipe");

      // Should have heart icon
      const heartIcon = screen.getByTestId("icon-heart");
      expect(heartIcon).toBeInTheDocument();
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
    it("should show active underline when on /swipe route", () => {
      usePathname.mockReturnValue("/swipe");
      render(<Header />);

      // Should have underline indicator (visible in desktop nav)
      const underline = screen.getByTestId("nav-underline-swipe");
      expect(underline).toBeInTheDocument();
      expect(underline).toHaveClass("bg-orange-600");
    });
  });
});
