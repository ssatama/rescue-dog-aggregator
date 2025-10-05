import { render, screen, fireEvent } from "../../../test-utils";
import { usePathname } from "next/navigation";
import Header from "../Header";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

describe("Header Navigation Enhancement - Orange Theme", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/");
  });

  describe("Active Navigation States", () => {
    it("should show orange active state for Dogs link", () => {
      usePathname.mockReturnValue("/dogs");
      render(<Header />);

      const findDogsLink = screen.getByRole("link", { name: "Dogs" });
      expect(findDogsLink).toHaveClass("text-orange-600");
      expect(findDogsLink).toHaveClass("font-semibold");
      expect(findDogsLink).not.toHaveClass("text-red-700");
      expect(findDogsLink).not.toHaveClass("bg-red-100");
    });

    it.skip("should show orange active state for Organizations link (removed from header)", () => {
      // Organizations link was removed from header navigation
      // It's now only in footer and mobile menu drawer
    });

    it("should show orange active state for About link", () => {
      usePathname.mockReturnValue("/about");
      render(<Header />);

      const aboutLink = screen.getByRole("link", { name: "About" });
      expect(aboutLink).toHaveClass("text-orange-600");
      expect(aboutLink).toHaveClass("font-semibold");
      expect(aboutLink).not.toHaveClass("text-red-700");
    });
  });

  describe("Hover and Transition States", () => {
    it("should have orange hover states for inactive links", () => {
      usePathname.mockReturnValue("/");
      render(<Header />);

      const findDogsLink = screen.getByRole("link", { name: "Dogs" });
      expect(findDogsLink).toHaveClass("hover:text-orange-600");
      expect(findDogsLink).toHaveClass("transition-colors");
      expect(findDogsLink).toHaveClass("duration-200");
      expect(findDogsLink).not.toHaveClass("hover:text-red-500");
    });

    it("should have smooth transitions on all navigation links", () => {
      render(<Header />);

      const allNavLinks = screen
        .getAllByRole("link")
        .filter((link) =>
          ["Dogs", "Organizations", "About"].includes(link.textContent),
        );

      allNavLinks.forEach((link) => {
        expect(link).toHaveClass("transition-colors");
        expect(link).toHaveClass("duration-200");
      });
    });
  });

  describe("Focus States", () => {
    it.skip("mobile menu button removed - focus handled by bottom nav", () => {
      // Mobile menu button was removed from Header component
      // Mobile navigation now uses MobileBottomNav and MobileMenuDrawer
    });
  });

  describe("Active State Underline Indicators", () => {
    it("should show underline indicator for active Dogs link", () => {
      usePathname.mockReturnValue("/dogs");
      render(<Header />);

      // Look for the underline div that should be present for active state
      const underlineIndicator = screen.getByTestId("nav-underline-dogs");
      expect(underlineIndicator).toHaveClass("bg-orange-600");
      expect(underlineIndicator).toHaveClass("h-0.5");
      expect(underlineIndicator).toHaveClass("absolute");
      expect(underlineIndicator).toHaveClass("bottom-0");
    });

    it.skip("should show underline indicator for active Organizations link (removed from header)", () => {
      // Organizations link was removed from header navigation
      // It's now only in footer and mobile menu drawer
    });

    it("should show underline indicator for active About link", () => {
      usePathname.mockReturnValue("/about");
      render(<Header />);

      const underlineIndicator = screen.getByTestId("nav-underline-about");
      expect(underlineIndicator).toHaveClass("bg-orange-600");
    });

    it("should not show underline indicators for inactive links", () => {
      usePathname.mockReturnValue("/");
      render(<Header />);

      expect(
        screen.queryByTestId("nav-underline-dogs"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("nav-underline-organizations"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("nav-underline-about"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Mobile Menu Styling", () => {
    it.skip("mobile menu removed - now using MobileBottomNav component", () => {
      // Mobile menu was removed from Header component
      // Mobile navigation now uses MobileBottomNav and MobileMenuDrawer components
    });
  });

  describe("No Blue or Red Colors", () => {
    it("should not contain any blue navigation colors", () => {
      render(<Header />);

      const allNavElements = screen.getAllByRole("link");
      allNavElements.forEach((element) => {
        expect(element.className).not.toMatch(/text-blue-\d+/);
        expect(element.className).not.toMatch(/bg-blue-\d+/);
        expect(element.className).not.toMatch(/hover:text-blue-\d+/);
      });
    });

    it("should not contain red navigation colors (except logo)", () => {
      render(<Header />);

      const navLinks = screen
        .getAllByRole("link")
        .filter((link) =>
          ["Dogs", "Organizations", "About"].includes(link.textContent),
        );

      navLinks.forEach((element) => {
        expect(element.className).not.toMatch(/text-red-\d+/);
        expect(element.className).not.toMatch(/bg-red-\d+/);
        expect(element.className).not.toMatch(/hover:text-red-\d+/);
      });
    });
  });
});
