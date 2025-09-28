import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import MobileTopHeader from "../MobileTopHeader";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("MobileTopHeader", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the logo/brand on the left", () => {
      render(<MobileTopHeader />);

      const logo = screen.getByText(/Rescue Dogs/i);
      expect(logo).toBeInTheDocument();
    });

    it("renders search icon button on the right", () => {
      render(<MobileTopHeader />);

      const searchButton = screen.getByRole("button", { name: /search/i });
      expect(searchButton).toBeInTheDocument();
    });

    it("renders favorites icon button on the right", () => {
      render(<MobileTopHeader />);

      const favoritesButton = screen.getByRole("button", {
        name: /favorites/i,
      });
      expect(favoritesButton).toBeInTheDocument();
    });

    it("is hidden on desktop viewports (md and above)", () => {
      const { container } = render(<MobileTopHeader />);

      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass("md:hidden");
    });

    it("has sticky positioning", () => {
      const { container } = render(<MobileTopHeader />);

      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass("sticky");
      expect(header).toHaveClass("top-0");
    });

    it("has backdrop blur effect", () => {
      const { container } = render(<MobileTopHeader />);

      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass("backdrop-blur-md");
    });

    it("has proper z-index for layering", () => {
      const { container } = render(<MobileTopHeader />);

      const header = container.firstChild as HTMLElement;
      expect(header).toHaveClass("z-40");
    });
  });

  describe("Navigation", () => {
    it("navigates to /dogs when search button is clicked", async () => {
      const user = userEvent.setup();
      render(<MobileTopHeader />);

      const searchButton = screen.getByRole("button", { name: /search/i });
      await user.click(searchButton);

      expect(mockPush).toHaveBeenCalledWith("/dogs");
    });

    it("navigates to /favorites when favorites button is clicked", async () => {
      const user = userEvent.setup();
      render(<MobileTopHeader />);

      const favoritesButton = screen.getByRole("button", {
        name: /favorites/i,
      });
      await user.click(favoritesButton);

      expect(mockPush).toHaveBeenCalledWith("/favorites");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels on icon buttons", () => {
      render(<MobileTopHeader />);

      const searchButton = screen.getByRole("button", { name: /search/i });
      const favoritesButton = screen.getByRole("button", {
        name: /favorites/i,
      });

      expect(searchButton).toHaveAttribute("aria-label");
      expect(favoritesButton).toHaveAttribute("aria-label");
    });

    it("has minimum touch target size of 44px", () => {
      render(<MobileTopHeader />);

      const searchButton = screen.getByRole("button", { name: /search/i });
      const favoritesButton = screen.getByRole("button", {
        name: /favorites/i,
      });

      // Check for h-11 w-11 classes (44px)
      expect(searchButton).toHaveClass("h-11");
      expect(searchButton).toHaveClass("w-11");
      expect(favoritesButton).toHaveClass("h-11");
      expect(favoritesButton).toHaveClass("w-11");
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<MobileTopHeader />);

      // Tab to search button
      await user.tab();
      const searchButton = screen.getByRole("button", { name: /search/i });
      expect(searchButton).toHaveFocus();

      // Tab to favorites button
      await user.tab();
      const favoritesButton = screen.getByRole("button", {
        name: /favorites/i,
      });
      expect(favoritesButton).toHaveFocus();
    });
  });

  describe("Dark Mode", () => {
    it("has dark mode classes for background", () => {
      const { container } = render(<MobileTopHeader />);

      const header = container.firstChild as HTMLElement;
      expect(header.className).toMatch(/dark:bg-gray-900/);
    });

    it("has dark mode classes for border", () => {
      const { container } = render(<MobileTopHeader />);

      const header = container.firstChild as HTMLElement;
      expect(header.className).toMatch(/dark:border-gray-800/);
    });

    it("has dark mode classes for buttons", () => {
      render(<MobileTopHeader />);

      const searchButton = screen.getByRole("button", { name: /search/i });
      expect(searchButton.className).toMatch(/dark:bg-gray-800/);
    });
  });

  describe("Safe Area Support", () => {
    it("has safe area padding for iOS devices", () => {
      const { container } = render(<MobileTopHeader />);

      const header = container.firstChild as HTMLElement;
      // Check for pt-safe class or inline style
      const styles = window.getComputedStyle(header);
      expect(header.className).toMatch(/pt-safe|safe/);
    });
  });
});
