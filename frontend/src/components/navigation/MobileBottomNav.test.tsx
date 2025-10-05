import React from "react";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import MobileBottomNav from "./MobileBottomNav";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}));

describe("MobileBottomNav", () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue("/");
    // Mock window.innerWidth to be mobile size
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });
  });

  describe("Navigation Items", () => {
    it("should render exactly 5 navigation items (4 links + 1 button)", () => {
      render(<MobileBottomNav />);

      const navLinks = screen.getAllByRole("link");
      const menuButton = screen.getByRole("button", { name: /menu/i });

      expect(navLinks.length).toBe(4);
      expect(menuButton).toBeInTheDocument();
    });

    it("should have Browse, Breeds, Swipe, Saved links and Menu button in correct order", () => {
      render(<MobileBottomNav />);

      const navLinks = screen.getAllByRole("link");
      const menuButton = screen.getByRole("button", { name: /menu/i });

      expect(navLinks[0]).toHaveAccessibleName(/browse/i);
      expect(navLinks[1]).toHaveAccessibleName(/breeds/i);
      expect(navLinks[2]).toHaveAccessibleName(/swipe/i);
      expect(navLinks[3]).toHaveAccessibleName(/saved/i);
      expect(menuButton).toHaveAccessibleName(/menu/i);
    });

    it("should have Swipe in center position (index 2 of links)", () => {
      render(<MobileBottomNav />);

      const navLinks = screen.getAllByRole("link");
      // Center item is index 2 out of 5 items (0-4), but Menu is a button so checking links only
      expect(navLinks[2]).toHaveAccessibleName(/swipe/i);
    });

    it("should NOT include Home or Organizations items", () => {
      render(<MobileBottomNav />);

      expect(
        screen.queryByRole("link", { name: /home/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /organizations/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /orgs/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Navigation Paths", () => {
    it("should navigate to correct paths", () => {
      render(<MobileBottomNav />);

      expect(screen.getByRole("link", { name: /browse/i })).toHaveAttribute(
        "href",
        "/dogs",
      );
      expect(screen.getByRole("link", { name: /breeds/i })).toHaveAttribute(
        "href",
        "/breeds",
      );
      expect(screen.getByRole("link", { name: /swipe/i })).toHaveAttribute(
        "href",
        "/swipe",
      );
      expect(screen.getByRole("link", { name: /saved/i })).toHaveAttribute(
        "href",
        "/favorites",
      );
    });

    it("should have Menu as a button, not a link", () => {
      render(<MobileBottomNav />);

      const menuButton = screen.getByRole("button", { name: /menu/i });
      expect(menuButton).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: /menu/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Visibility on Swipe Page", () => {
    it("should not render on swipe page", () => {
      (usePathname as jest.Mock).mockReturnValue("/swipe");

      const { container } = render(<MobileBottomNav />);

      // Component should not render anything on swipe page
      expect(container.firstChild).toBeNull();
    });
  });
});
