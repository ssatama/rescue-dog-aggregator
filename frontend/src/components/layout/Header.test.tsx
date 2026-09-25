import React from "react";
import { render, screen } from "../../test-utils";
import { usePathname } from "next/navigation";

const mockUsePathname = usePathname as jest.Mock;
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
    mockUsePathname.mockReturnValue("/");
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

    it("has no Start Swiping button: swipe lives in the mobile tab bar", () => {
      render(<Header />);

      expect(
        screen.queryByRole("link", { name: /start swiping/i }),
      ).not.toBeInTheDocument();
    });

    it("links Breeds, Rescues and Guides in the main nav", () => {
      render(<Header />);

      expect(screen.getByRole("link", { name: "Breeds" })).toHaveAttribute("href", "/breeds");
      expect(screen.getByRole("link", { name: "Rescues" })).toHaveAttribute(
        "href",
        "/organizations",
      );
      expect(screen.getByRole("link", { name: "Guides" })).toHaveAttribute("href", "/guides");
    });

    it("has no About menu: About, FAQ and Privacy live in the footer", () => {
      render(<Header />);

      expect(screen.queryByRole("button", { name: /about/i })).not.toBeInTheDocument();
    });

    it("shows the compact rescuedogs wordmark linking home", () => {
      render(<Header />);

      const home = screen.getByRole("link", { name: /rescuedogs home/i });
      expect(home).toHaveAttribute("href", "/");
      expect(home).toHaveTextContent("rescuedogs");
    });
  });

  describe("Saved Navigation Link", () => {
    it("links to favorites with a heart, a label and the count badge", () => {
      render(<Header />);

      const saved = screen.getByRole("link", { name: /saved/i });
      expect(saved).toHaveAttribute("href", "/favorites");
      expect(saved.contains(screen.getByTestId("favorite-badge"))).toBe(true);
    });

    it("marks the current page", () => {
      mockUsePathname.mockReturnValue("/organizations/some-rescue");
      render(<Header />);

      expect(screen.getByRole("link", { name: "Rescues" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      expect(screen.getByTestId("nav-underline-rescues")).toBeInTheDocument();
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
// The search field has its own tests (GlobalSearch.test.tsx)
jest.mock("../search/GlobalSearch", () => ({ __esModule: true, default: () => null }));
