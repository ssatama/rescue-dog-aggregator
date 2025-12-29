import React from "react";
import { render, screen } from "../../test-utils";
import { usePathname } from "next/navigation";
import Header from "./Header";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

// Mock the FavoriteBadge component
jest.mock("../favorites/FavoriteBadge", () => ({
  FavoriteBadge: () => <span data-testid="favorite-badge">3</span>,
}));

// Mock other dependencies

jest.mock("../ui/ThemeToggle", () => ({
  ThemeToggle: () => <button>Theme</button>,
}));

describe("Header", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/");
  });

  describe("Desktop Navigation Labels", () => {
    it("should display 'Dogs' dropdown trigger instead of a simple link", () => {
      render(<Header />);

      // Dogs is now a dropdown trigger button, not a link
      expect(screen.getByRole("button", { name: /dogs/i })).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /find dogs/i }),
      ).not.toBeInTheDocument();
    });

    it("should display 'Start Swiping' CTA button instead of 'Quick Browse'", () => {
      render(<Header />);

      const swipeButton = screen.getByRole("link", { name: /start swiping/i });
      expect(swipeButton).toBeInTheDocument();
      expect(swipeButton).toHaveAttribute("href", "/swipe");
      expect(screen.queryByText(/quick browse/i)).not.toBeInTheDocument();
    });

    it("should NOT display Organizations link in desktop navigation", () => {
      render(<Header />);

      // Organizations should not be in desktop nav (will be in footer)
      const organizationsLinks = screen.queryAllByRole("link", {
        name: /^organizations$/i,
      });
      expect(organizationsLinks.length).toBe(0);
    });
  });

  describe("Favorites Navigation Link", () => {
    it("should display heart icon without text label", () => {
      render(<Header />);

      // Favorites is now icon-only with aria-label
      const favoritesLink = screen.getByRole("link", { name: /favorites/i });
      expect(favoritesLink).toBeInTheDocument();
      expect(favoritesLink).toHaveAttribute("href", "/favorites");
    });

    it("should show count badge on favorites icon", () => {
      render(<Header />);

      const favoritesLink = screen.getByRole("link", { name: /favorites/i });
      const badge = screen.getByTestId("favorite-badge");

      // Badge should be within the link
      expect(favoritesLink.contains(badge)).toBe(true);
    });

    it.skip("favorites icon styling is consistent regardless of route", () => {
      // Favorites is now icon-only with consistent red heart styling
      // No longer changes based on active route
    });
  });

  describe("About Dropdown", () => {
    it("should display About as dropdown trigger", () => {
      render(<Header />);

      // About is now a dropdown trigger button
      const aboutButton = screen.getByRole("button", { name: /about/i });
      expect(aboutButton).toBeInTheDocument();
    });

    it("should show orange active state when on /about route", () => {
      usePathname.mockReturnValue("/about");
      render(<Header />);

      const aboutButton = screen.getByRole("button", { name: /about/i });
      expect(aboutButton).toHaveClass("text-orange-600");
    });
  });

  describe("Mobile Navigation", () => {
    it.skip("mobile menu removed - now using MobileBottomNav component", () => {
      // Mobile menu was removed from Header component
      // Mobile navigation now uses MobileBottomNav and MobileMenuDrawer components
      // The Favorites link with heart icon and badge is now in the bottom nav
    });
  });
});