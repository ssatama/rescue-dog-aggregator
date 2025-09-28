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

    it("NEW badge has proper styling", () => {
      render(<MobileNavCards />);

      const newBadge = screen.getByText("NEW");
      expect(newBadge).toHaveClass(
        "absolute",
        "top-2",
        "right-2",
        "rounded-full",
        "bg-[#D68FA3]/20",
        "dark:bg-[#D68FA3]/10",
        "text-[#D68FA3]",
        "dark:text-[#D68FA3]",
        "text-[10px]",
        "font-medium",
        "px-1.5",
        "py-0.5",
        "ring-1",
        "ring-[#D68FA3]/30",
        "dark:ring-[#D68FA3]/20"
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

    it("has uniform white/zinc styling for all cards", () => {
      render(<MobileNavCards />);

      const browseCard = screen.getByText("Browse").closest("button");
      const swipeCard = screen.getByText("Swipe").closest("button");
      const breedsCard = screen.getByText("Breeds").closest("button");
      const favoritesCard = screen.getByText("Favorites").closest("button");

      // All cards should have uniform white/zinc backgrounds
      [browseCard, swipeCard, breedsCard, favoritesCard].forEach((card) => {
        expect(card).toHaveClass("bg-white", "dark:bg-zinc-900");
      });
    });

    it("displays rose-colored icon chips for each card", () => {
      render(<MobileNavCards />);

      // Check for icon elements (SVGs or icon components)
      const cards = screen.getAllByRole("button");
      cards.forEach((card) => {
        const svg = card.querySelector("svg");
        expect(svg).toBeInTheDocument();

        // Check for rose-colored icon chip container
        const iconChip = card.querySelector("div.bg-\\[\\#D68FA3\\]\\/10");
        expect(iconChip).toBeInTheDocument();
        expect(iconChip).toHaveClass("rounded-full", "h-9", "w-9");
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
        expect(card).toHaveClass("active:scale-[0.98]");
      });
    });

    it("has transition effects", () => {
      render(<MobileNavCards />);

      const cards = screen.getAllByRole("button");
      cards.forEach((card) => {
        expect(card).toHaveClass("transition-all", "duration-200");
      });
    });
  });

  describe("Accessibility", () => {
    it('all cards have role="button"', () => {
      render(<MobileNavCards />);

      const cards = screen.getAllByRole("button");
      expect(cards).toHaveLength(4);
    });

    it("all cards have proper aria-labels", () => {
      render(<MobileNavCards />);

      expect(
        screen.getByRole("button", { name: "Navigate to Browse" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Navigate to Swipe" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Navigate to Breeds" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Navigate to Favorites" }),
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

  describe("Styling", () => {
    it("has proper shadow styling", () => {
      render(<MobileNavCards />);

      const cards = screen.getAllByRole("button");
      cards.forEach((card) => {
        expect(card).toHaveClass("shadow-[0_1px_0_rgba(0,0,0,0.06),0_8px_20px_rgba(0,0,0,0.04)]");
      });
    });

    it("has proper ring styling", () => {
      render(<MobileNavCards />);

      const cards = screen.getAllByRole("button");
      cards.forEach((card) => {
        expect(card).toHaveClass("ring-1", "ring-zinc-200/60", "dark:ring-zinc-800/60");
      });
    });

    it("has rounded corners", () => {
      render(<MobileNavCards />);

      const cards = screen.getAllByRole("button");
      cards.forEach((card) => {
        expect(card).toHaveClass("rounded-2xl");
      });
    });

    it("has focus-visible styling", () => {
      render(<MobileNavCards />);

      const cards = screen.getAllByRole("button");
      cards.forEach((card) => {
        expect(card).toHaveClass("focus-visible:ring-2", "focus-visible:ring-rose-500", "focus-visible:outline-none");
      });
    });
  });
});
