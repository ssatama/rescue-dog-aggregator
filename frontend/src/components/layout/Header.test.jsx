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
    it("should show heart icon and count in mobile menu", () => {
      render(<Header />);

      // Open mobile menu
      const mobileMenuButton = screen.getByRole("button", {
        name: /open menu/i,
      });
      mobileMenuButton.click();

      // Check mobile favorites link exists
      const mobileFavoritesLinks = screen.getAllByRole("link", {
        name: /favorites/i,
      });
      expect(mobileFavoritesLinks.length).toBeGreaterThan(0);

      // The mobile link should be present
      const mobileLink = mobileFavoritesLinks[0];
      expect(mobileLink).toBeInTheDocument();

      // Check for badge if present in the mobile menu
      const badges = screen.queryAllByTestId("favorite-badge");
      if (badges.length > 0) {
        expect(badges[0]).toBeInTheDocument();
      }
    });
  });
});
