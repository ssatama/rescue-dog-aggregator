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
    it("should show orange active state for Dogs dropdown trigger", () => {
      usePathname.mockReturnValue("/dogs");
      render(<Header />);

      // Dogs is now a dropdown trigger button
      const dogsButton = screen.getByRole("button", { name: /dogs/i });
      expect(dogsButton).toHaveClass("text-orange-600");
      expect(dogsButton).toHaveClass("font-semibold");
      expect(dogsButton).not.toHaveClass("text-red-700");
      expect(dogsButton).not.toHaveClass("bg-red-100");
    });

    it.skip("should show orange active state for Organizations link (removed from header)", () => {
      // Organizations link was removed from header navigation
      // It's now only in footer and mobile menu drawer
    });

    it("should show orange active state for About dropdown trigger", () => {
      usePathname.mockReturnValue("/about");
      render(<Header />);

      // About is now a dropdown trigger button
      const aboutButton = screen.getByRole("button", { name: /about/i });
      expect(aboutButton).toHaveClass("text-orange-600");
      expect(aboutButton).toHaveClass("font-semibold");
      expect(aboutButton).not.toHaveClass("text-red-700");
    });
  });

  describe("Hover and Transition States", () => {
    it("should have orange hover states for Dogs dropdown trigger", () => {
      usePathname.mockReturnValue("/");
      render(<Header />);

      // Dogs is now a dropdown trigger button
      const dogsButton = screen.getByRole("button", { name: /dogs/i });
      expect(dogsButton).toHaveClass("hover:text-orange-600");
      expect(dogsButton).toHaveClass("transition-colors");
      expect(dogsButton).toHaveClass("duration-200");
      expect(dogsButton).not.toHaveClass("hover:text-red-500");
    });

    it("should have smooth transitions on navigation links", () => {
      render(<Header />);

      const allNavLinks = screen
        .getAllByRole("link")
        .filter((link) =>
          ["About", "Breeds", "Guides"].includes(link.textContent?.trim()),
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
    it.skip("Dogs dropdown trigger does not use underline indicator pattern", () => {
      // Dogs is now a dropdown, not a simple nav link
      // Dropdown triggers don't use the underline indicator pattern
    });

    it.skip("should show underline indicator for active Organizations link (removed from header)", () => {
      // Organizations link was removed from header navigation
      // It's now only in footer and mobile menu drawer
    });

    it.skip("About is now a dropdown trigger, not a simple link", () => {
      // About is now a dropdown, not a simple nav link
      // Dropdown triggers don't use the underline indicator pattern
    });

    it("should not show underline indicators for inactive links", () => {
      usePathname.mockReturnValue("/");
      render(<Header />);

      // Dogs no longer uses underline indicator (it's a dropdown)
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

      // Filter for nav links (excluding Dogs which is now a dropdown button)
      const navLinks = screen
        .getAllByRole("link")
        .filter((link) =>
          ["About", "Breeds", "Guides"].includes(link.textContent?.trim()),
        );

      navLinks.forEach((element) => {
        expect(element.className).not.toMatch(/text-red-\d+/);
        expect(element.className).not.toMatch(/bg-red-\d+/);
        expect(element.className).not.toMatch(/hover:text-red-\d+/);
      });
    });
  });
});