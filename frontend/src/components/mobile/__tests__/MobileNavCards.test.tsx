import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import MobileNavCards from "../MobileNavCards";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("MobileNavCards", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders all 4 navigation cards", () => {
      render(<MobileNavCards />);

      expect(screen.getByText("Browse")).toBeInTheDocument();
      expect(screen.getByText("Swipe")).toBeInTheDocument();
      expect(screen.getByText("Breeds")).toBeInTheDocument();
      expect(screen.getByText("Favorites")).toBeInTheDocument();
    });

    it("displays NEW badge on Swipe card", () => {
      render(<MobileNavCards />);

      const newBadge = screen.getByText("NEW");
      expect(newBadge).toBeInTheDocument();
      expect(newBadge.parentElement).toContainElement(
        screen.getByText("Swipe"),
      );
    });

    it("has 2x2 grid layout", () => {
      const { container } = render(<MobileNavCards />);

      const grid = container.querySelector(".grid");
      expect(grid).toHaveClass("grid-cols-2");
      expect(grid).toHaveClass("gap-3");
    });

    it("is hidden on desktop viewports (md and above)", () => {
      const { container } = render(<MobileNavCards />);

      const navCards = container.firstChild as HTMLElement;
      expect(navCards).toHaveClass("md:hidden");
    });

    it("has proper gradient backgrounds for each card", () => {
      render(<MobileNavCards />);

      const browseCard = screen.getByText("Browse").closest("button");
      const swipeCard = screen.getByText("Swipe").closest("button");
      const breedsCard = screen.getByText("Breeds").closest("button");
      const favoritesCard = screen.getByText("Favorites").closest("button");

      expect(browseCard).toHaveClass("from-indigo-500", "to-violet-600");
      expect(swipeCard).toHaveClass("from-fuchsia-500", "to-pink-600");
      expect(breedsCard).toHaveClass("from-sky-500", "to-blue-600");
      expect(favoritesCard).toHaveClass("from-orange-500", "to-amber-500");
    });

    it("displays icons for each card", () => {
      render(<MobileNavCards />);

      // Check for icon elements (SVGs or icon components)
      const cards = screen.getAllByRole("button");
      cards.forEach((card) => {
        const svg = card.querySelector("svg");
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe("Navigation", () => {
    it("navigates to /dogs when Browse card is clicked", async () => {
      const user = userEvent.setup();
      render(<MobileNavCards />);

      const browseCard = screen.getByText("Browse").closest("button");
      await user.click(browseCard!);

      expect(mockPush).toHaveBeenCalledWith("/dogs");
    });

    it("navigates to /swipe when Swipe card is clicked", async () => {
      const user = userEvent.setup();
      render(<MobileNavCards />);

      const swipeCard = screen.getByText("Swipe").closest("button");
      await user.click(swipeCard!);

      expect(mockPush).toHaveBeenCalledWith("/swipe");
    });

    it("navigates to /breeds when Breeds card is clicked", async () => {
      const user = userEvent.setup();
      render(<MobileNavCards />);

      const breedsCard = screen.getByText("Breeds").closest("button");
      await user.click(breedsCard!);

      expect(mockPush).toHaveBeenCalledWith("/breeds");
    });

    it("navigates to /favorites when Favorites card is clicked", async () => {
      const user = userEvent.setup();
      render(<MobileNavCards />);

      const favoritesCard = screen.getByText("Favorites").closest("button");
      await user.click(favoritesCard!);

      expect(mockPush).toHaveBeenCalledWith("/favorites");
    });
  });

  describe("Interactions", () => {
    it("has active scale effect on press", () => {
      render(<MobileNavCards />);

      const cards = screen.getAllByRole("button");
      cards.forEach((card) => {
        expect(card).toHaveClass("active:scale-95");
      });
    });

    it("has transition effects", () => {
      render(<MobileNavCards />);

      const cards = screen.getAllByRole("button");
      cards.forEach((card) => {
        expect(card).toHaveClass("transition-transform");
      });
    });
  });

  describe("Accessibility", () => {
    it('all cards have role="button"', () => {
      render(<MobileNavCards />);

      const cards = screen.getAllByRole("button");
      expect(cards).toHaveLength(4);
    });

    it("all cards have proper labels", () => {
      render(<MobileNavCards />);

      expect(
        screen.getByRole("button", { name: /browse/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /swipe/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /breeds/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /favorites/i }),
      ).toBeInTheDocument();
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<MobileNavCards />);

      // Tab through all cards
      await user.tab();
      expect(screen.getByText("Browse").closest("button")).toHaveFocus();

      await user.tab();
      expect(screen.getByText("Swipe").closest("button")).toHaveFocus();

      await user.tab();
      expect(screen.getByText("Breeds").closest("button")).toHaveFocus();

      await user.tab();
      expect(screen.getByText("Favorites").closest("button")).toHaveFocus();
    });

    it("can be activated with Enter key", async () => {
      const user = userEvent.setup();
      render(<MobileNavCards />);

      const browseCard = screen.getByText("Browse").closest("button");
      browseCard?.focus();

      await user.keyboard("{Enter}");
      expect(mockPush).toHaveBeenCalledWith("/dogs");
    });
  });

  describe("Dark Mode", () => {
    it("has dark mode gradient classes", () => {
      render(<MobileNavCards />);

      const browseCard = screen.getByText("Browse").closest("button");
      expect(browseCard?.className).toMatch(/dark:from-indigo-600/);
      expect(browseCard?.className).toMatch(/dark:to-violet-700/);
    });
  });
});
