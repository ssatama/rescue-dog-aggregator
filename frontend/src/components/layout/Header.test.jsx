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

jest.mock("../ui/Icon", () => ({
  Icon: ({ name }) => <span>{name}</span>,
}));

jest.mock("../ui/ThemeToggle", () => ({
  ThemeToggle: () => <button>Theme</button>,
}));

describe("Header", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/");
  });

  describe("Desktop Navigation Labels", () => {
    it("should display 'Dogs' instead of 'Find Dogs'", () => {
      render(<Header />);

      expect(screen.getByRole("link", { name: /^dogs$/i })).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /find dogs/i }),
      ).not.toBeInTheDocument();
    });

    it("should display 'Swipe' instead of 'Quick Browse'", () => {
      render(<Header />);

      const swipeLink = screen.getByRole("link", { name: /swipe/i });
      expect(swipeLink).toBeInTheDocument();
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
    it("should display heart icon inline with Favorites text", () => {
      render(<Header />);

      const favoritesLink = screen.getByRole("link", { name: /favorites/i });
      expect(favoritesLink).toBeInTheDocument();

      // Check that heart icon is rendered inline
      const heartIcon = favoritesLink.querySelector(".heart-icon");
      expect(heartIcon).toBeInTheDocument();
    });

    it("should show count badge inline when favorites exist", () => {
      render(<Header />);

      const favoritesLink = screen.getByRole("link", { name: /favorites/i });
      const badge = screen.getByTestId("favorite-badge");

      // Badge should be within the link, not absolutely positioned outside
      expect(favoritesLink.contains(badge)).toBe(true);
    });

    it("should style favorites link with red heart when active", () => {
      usePathname.mockReturnValue("/favorites");
      render(<Header />);

      const favoritesLink = screen.getByRole("link", { name: /favorites/i });
      expect(favoritesLink).toHaveClass("text-orange-600");
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
