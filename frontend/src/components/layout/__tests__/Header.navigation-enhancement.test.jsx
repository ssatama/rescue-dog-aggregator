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
    it("should show orange active state for Find Dogs link", () => {
      usePathname.mockReturnValue("/dogs");
      render(<Header />);

      const findDogsLink = screen.getByRole("link", { name: "Find Dogs" });
      expect(findDogsLink).toHaveClass("text-orange-600");
      expect(findDogsLink).toHaveClass("font-semibold");
      expect(findDogsLink).not.toHaveClass("text-red-700");
      expect(findDogsLink).not.toHaveClass("bg-red-100");
    });

    it("should show orange active state for Organizations link", () => {
      usePathname.mockReturnValue("/organizations");
      render(<Header />);

      const organizationsLink = screen.getByRole("link", {
        name: "Organizations",
      });
      expect(organizationsLink).toHaveClass("text-orange-600");
      expect(organizationsLink).toHaveClass("font-semibold");
      expect(organizationsLink).not.toHaveClass("text-red-700");
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

      const findDogsLink = screen.getByRole("link", { name: "Find Dogs" });
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
          ["Find Dogs", "Organizations", "About"].includes(link.textContent),
        );

      allNavLinks.forEach((link) => {
        expect(link).toHaveClass("transition-colors");
        expect(link).toHaveClass("duration-200");
      });
    });
  });

  describe("Focus States", () => {
    it("should use orange focus rings", () => {
      render(<Header />);

      const mobileMenuButton = screen.getByRole("button", {
        name: /open menu/i,
      });
      expect(mobileMenuButton).toHaveClass("focus:ring-orange-600");
      expect(mobileMenuButton).not.toHaveClass("focus:ring-red-500");
    });
  });

  describe("Active State Underline Indicators", () => {
    it("should show underline indicator for active Find Dogs link", () => {
      usePathname.mockReturnValue("/dogs");
      render(<Header />);

      // Look for the underline div that should be present for active state
      const underlineIndicator = screen.getByTestId("nav-underline-dogs");
      expect(underlineIndicator).toHaveClass("bg-orange-600");
      expect(underlineIndicator).toHaveClass("h-0.5");
      expect(underlineIndicator).toHaveClass("absolute");
      expect(underlineIndicator).toHaveClass("bottom-0");
    });

    it("should show underline indicator for active Organizations link", () => {
      usePathname.mockReturnValue("/organizations");
      render(<Header />);

      const underlineIndicator = screen.getByTestId(
        "nav-underline-organizations",
      );
      expect(underlineIndicator).toHaveClass("bg-orange-600");
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
    it("should have proper touch targets for mobile links", () => {
      usePathname.mockReturnValue("/dogs");
      render(<Header />);

      // Check that mobile menu links have proper minimum height
      const mobileLinks = screen
        .getAllByRole("link")
        .filter(
          (link) =>
            link.className.includes("block") &&
            ["Find Dogs", "Organizations", "About"].includes(link.textContent),
        );

      mobileLinks.forEach((link) => {
        // Should have adequate padding for 44px minimum touch target
        expect(link).toHaveClass("py-2");
        expect(link).toHaveClass("px-3");
      });
    });

    it("should use same orange theme in mobile menu", () => {
      usePathname.mockReturnValue("/dogs");
      render(<Header />);

      // Open the mobile menu first
      const mobileMenuButton = screen.getByRole("button", {
        name: /open menu/i,
      });
      fireEvent.click(mobileMenuButton);

      // Now find the mobile navigation link
      const mobileFindDogsLink = screen
        .getAllByRole("link")
        .find(
          (link) =>
            link.textContent === "Find Dogs" &&
            link.className.includes("block"),
        );

      expect(mobileFindDogsLink).toHaveClass("text-orange-600");
      expect(mobileFindDogsLink).toHaveClass("font-semibold");
      expect(mobileFindDogsLink).toHaveClass("transition-colors");
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
          ["Find Dogs", "Organizations", "About"].includes(link.textContent),
        );

      navLinks.forEach((element) => {
        expect(element.className).not.toMatch(/text-red-\d+/);
        expect(element.className).not.toMatch(/bg-red-\d+/);
        expect(element.className).not.toMatch(/hover:text-red-\d+/);
      });
    });
  });
});
