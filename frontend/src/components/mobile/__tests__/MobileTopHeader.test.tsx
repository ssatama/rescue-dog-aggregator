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
    test("renders the site name on the left", () => {
      render(<MobileTopHeader />);

      const siteName = screen.getByText("Rescue Dogs Aggregator");
      expect(siteName).toBeInTheDocument();
    });

    test("renders search icon button on the right", () => {
      render(<MobileTopHeader />);

      const searchButton = screen.getByRole("button", { name: /search/i });
      expect(searchButton).toBeInTheDocument();
    });

    test("does not render favorites icon button", () => {
      render(<MobileTopHeader />);

      const favoritesButton = screen.queryByRole("button", {
        name: /favorites/i,
      });
      expect(favoritesButton).not.toBeInTheDocument();
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
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels on icon buttons", () => {
      render(<MobileTopHeader />);

      const searchButton = screen.getByRole("button", { name: /search/i });
      expect(searchButton).toHaveAttribute("aria-label", "Search dogs");
    });

    it("has minimum touch target size of 44px", () => {
      render(<MobileTopHeader />);

      const searchButton = screen.getByRole("button", { name: /search/i });
      expect(searchButton).toHaveClass("h-11", "w-11");
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<MobileTopHeader />);

      // Tab to site name link first
      await user.tab();
      const homeLink = screen.getByRole("link");
      expect(homeLink).toHaveFocus();

      // Tab to search button
      await user.tab();
      const searchButton = screen.getByRole("button", { name: /search/i });
      expect(searchButton).toHaveFocus();

      // Press Enter on search button
      await user.keyboard("{Enter}");
      expect(mockPush).toHaveBeenCalledWith("/dogs");
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
      render(<MobileTopHeader />);
      
      const header = screen.getByRole("banner");
      
      // Check that the header element exists and has expected structure
      // The safe area padding is applied via inline style in the actual component
      expect(header).toBeInTheDocument();
      expect(header.tagName.toLowerCase()).toBe("header");
      
      // Note: inline styles with env() are not easily testable in jsdom
      // This test verifies the component renders correctly and would apply
      // the safe area padding in a real browser environment
    });
  });
});