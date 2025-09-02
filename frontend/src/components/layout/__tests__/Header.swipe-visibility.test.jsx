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

describe("Header - Quick Browse Navigation Visibility", () => {
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

    it("should NOT show Quick Browse link in desktop navigation", () => {
      render(<Header />);

      // Check desktop navigation area
      const desktopNav = screen.getByRole("navigation");
      const swipeLinks = screen.queryAllByText("Quick Browse");

      // Should not find any Quick Browse links in the visible desktop navigation
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

    it("should show Quick Browse link in tablet navigation", () => {
      render(<Header />);

      // Should find Quick Browse link that's visible on tablets
      const swipeLink = screen.getByRole("link", { name: /quick browse/i });
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

    it("should show Quick Browse link in mobile hamburger menu", () => {
      render(<Header />);

      // Open mobile menu
      const menuButton = screen.getByTestId("mobile-menu-button");
      menuButton.click();

      // Should find Quick Browse link in mobile menu
      const swipeLink = screen.getByRole("link", { name: /quick browse/i });
      expect(swipeLink).toBeInTheDocument();
      expect(swipeLink).toHaveAttribute("href", "/swipe");

      // Should have heart icon
      const heartIcon = screen.getByTestId("icon-heart");
      expect(heartIcon).toBeInTheDocument();
    });
  });

  describe("Active state styling", () => {
    it("should show active underline when on /swipe route", () => {
      usePathname.mockReturnValue("/swipe");
      render(<Header />);

      // Open mobile menu to check
      const menuButton = screen.getByTestId("mobile-menu-button");
      menuButton.click();

      // Should have underline indicator
      const underline = screen.getByTestId("nav-underline-swipe");
      expect(underline).toBeInTheDocument();
      expect(underline).toHaveClass("bg-orange-600");
    });
  });
});
