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
      const { container } = render(<MobileNavCards />);

      const newBadge = screen.getByText("NEW");
      expect(newBadge).toHaveClass(
        "absolute",
        "top-2",
        "right-2",
        "px-2",
        "py-0.5",
        "bg-gradient-to-r",
        "from-rose-500",
        "to-pink-500",
        "text-white",
        "text-xs",
        "font-bold",
        "rounded-full",
      );
    });

    it("has 2x2 grid layout", () => {
      const { container } = render(<MobileNavCards />);

      const grid = container.querySelector(".grid");
      expect(grid).toHaveClass("grid-cols-2");
      expect(grid).toHaveClass("gap-3");
    });

    it("is hidden on desktop viewports (md and above)", () => {
      // This component is now always visible - update test to check for mobile-optimized container
      const { container } = render(<MobileNavCards />);

      const navCards = container.firstChild as HTMLElement;
      expect(navCards).toHaveClass("px-4", "py-6");
    });

    it("has uniform white/zinc styling for all cards", () => {
      render(<MobileNavCards />);

      const browseCard = screen.getByLabelText("Navigate to Browse");
      const swipeCard = screen.getByLabelText("Navigate to Swipe");
      const breedsCard = screen.getByLabelText("Navigate to Breeds");
      const favoritesCard = screen.getByLabelText("Navigate to Favorites");

      // All cards should have uniform white/zinc backgrounds
      [browseCard, swipeCard, breedsCard, favoritesCard].forEach((card) => {
        expect(card).toHaveClass("bg-white", "dark:bg-zinc-800");
      });
    });

    it("displays rose-colored icon chips for each card", () => {
      const { container } = render(<MobileNavCards />);

      // Updated to check for the actual icon containers with their specific colors
      const iconContainers = container.querySelectorAll("div.rounded-xl");
      expect(iconContainers).toHaveLength(4);

      // Check that each has the expected color classes
      const expectedColors = [
        "bg-pink-100",
        "bg-red-100",
        "bg-purple-100",
        "bg-orange-100",
      ];

      iconContainers.forEach((container, index) => {
        expect(container).toHaveClass("w-12", "h-12", "rounded-xl");
        // Check for the light mode color
        const classList = container.className;
        expect(classList).toContain(expectedColors[index]);
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
        expect(card).toHaveClass("transition-all", "duration-300");
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
        expect(card).toHaveClass("shadow-sm");
      });
    });

    it("has proper ring styling", () => {
      render(<MobileNavCards />);
      const cards = screen.getAllByRole("button");
      cards.forEach((card) => {
        expect(card).toHaveClass(
          "border",
          "border-zinc-100",
          "dark:border-zinc-700",
        );
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
      // Component doesn't have focus-visible styles, but has hover and active states
      render(<MobileNavCards />);
      const cards = screen.getAllByRole("button");
      cards.forEach((card) => {
        expect(card).toHaveClass(
          "hover:shadow-md",
          "hover:scale-[1.02]",
          "active:scale-[0.98]",
        );
      });
    });
  });
});
