import React from "react";
import { render, screen, fireEvent } from "../../test-utils";
import { ThemeProvider } from "../../components/providers/ThemeProvider";
import Layout from "../../components/layout/Layout";
import Header from "../../components/layout/Header";
import Footer from "../../components/layout/Footer";

// Helper to render with ThemeProvider in dark mode
const renderWithDarkTheme = (component) => {
  // Set dark mode in localStorage
  localStorage.setItem("theme", "dark");
  document.documentElement.classList.add("dark");

  return render(<ThemeProvider>{component}</ThemeProvider>);
};

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/",
}));

describe("Layout Components - Dark Mode Support", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  describe("Layout Component Dark Mode", () => {
    test("should use semantic background and maintain structure in dark mode", () => {
      renderWithDarkTheme(
        <Layout>
          <div data-testid="layout-content">Test Content</div>
        </Layout>,
      );

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");

      // Layout should maintain semantic structure - main element has #main-content id
      const mainElement = document.getElementById("main-content");
      const layoutContainer = mainElement.parentElement; // This should be the div with Layout classes

      // Should use semantic classes that adapt to dark mode
      expect(layoutContainer).toHaveClass("flex");
      expect(layoutContainer).toHaveClass("flex-col");
      expect(layoutContainer).toHaveClass("min-h-screen");
      expect(layoutContainer).toHaveClass("bg-background");
      expect(layoutContainer).toHaveClass("text-foreground");

      // Content should be present
      expect(screen.getByTestId("layout-content")).toBeInTheDocument();
    });

    test("should include Header and Footer components in dark mode", () => {
      renderWithDarkTheme(
        <Layout>
          <div data-testid="main-content">Main Content</div>
        </Layout>,
      );

      // Should include navigation elements that Header provides
      const navigation = document.querySelector("nav");
      expect(navigation).toBeInTheDocument();

      // Should include footer elements
      const footer = document.querySelector("footer");
      expect(footer).toBeInTheDocument();

      // Main content should be wrapped properly
      expect(screen.getByTestId("main-content")).toBeInTheDocument();
    });
  });

  describe("Header Component Dark Mode", () => {
    test("should have proper background and shadow in dark mode", () => {
      renderWithDarkTheme(<Header />);

      const header = document.querySelector("header");

      // Should use semantic background that adapts to dark mode
      if (header) {
        expect(header).not.toHaveClass("bg-white"); // Should not use hard-coded white
        // Should use semantic background or have dark mode variant
        expect(header.className).toMatch(/bg-background|dark:bg-/);
      }

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");
    });

    test("should have proper navigation link colors in dark mode", () => {
      renderWithDarkTheme(<Header />);

      // Find navigation links
      const links = screen.getAllByRole("link");

      // Should have some navigation links
      expect(links.length).toBeGreaterThan(0);

      // Links should not use hard-coded gray colors in dark mode
      links.forEach((link) => {
        if (link.textContent && !link.textContent.includes("Skip to")) {
          expect(link.className).not.toMatch(/^.*text-gray-700(?!\s|$).*$/);
          // Should use semantic colors or have dark mode variants
          expect(link.className).toMatch(
            /text-foreground|text-muted-foreground|dark:text-/,
          );
        }
      });
    });

    test("should handle mobile menu styling in dark mode", () => {
      renderWithDarkTheme(<Header />);

      // Find mobile menu button (it has sr-only text "Open main menu")
      const mobileButton = screen.getByText(/Open menu/i).closest("button");
      expect(mobileButton).toBeInTheDocument();

      // Should have proper styling for dark mode
      expect(mobileButton.className).toMatch(
        /text-foreground|text-muted-foreground|dark:text-/,
      );
    });

    test("should maintain theme toggle functionality in dark mode", () => {
      renderWithDarkTheme(<Header />);

      // Theme toggle should be present and functional
      const themeButtons = screen.getAllByLabelText(/switch to light mode/i);
      expect(themeButtons.length).toBeGreaterThan(0);

      // Should show moon icon or appropriate theme icon in dark mode
      const moonIcons = document.querySelectorAll(
        'svg[data-testid*="moon"], svg[stroke*="currentColor"]',
      );
      expect(moonIcons.length).toBeGreaterThan(0);
    });

    test("should handle focus states properly in dark mode", () => {
      renderWithDarkTheme(<Header />);

      const links = screen.getAllByRole("link");
      const buttons = screen.getAllByRole("button");

      // All interactive elements should have focus styling
      [...links, ...buttons].forEach((element) => {
        if (element.getAttribute("href") !== "#main-content") {
          // Skip skip-link
          expect(element.className).toMatch(/focus:|focus-visible:/);
        }
      });
    });
  });

  describe("Footer Component Dark Mode", () => {
    test("should use semantic background colors in dark mode", () => {
      renderWithDarkTheme(<Footer />);

      const footer = document.querySelector("footer");
      expect(footer).toBeInTheDocument();

      // Should not use hard-coded dark colors for light mode
      expect(footer.className).not.toMatch(/bg-gray-900(?!\s+dark:)/);

      // Should use semantic background that works in both themes
      expect(footer.className).toMatch(/bg-background|bg-card|bg-muted/);
    });

    test("should have proper text colors in dark mode", () => {
      renderWithDarkTheme(<Footer />);

      const footer = document.querySelector("footer");

      // Should use semantic text colors - check for text-card-foreground which is the correct class
      expect(footer.className).toMatch(
        /text-foreground|text-muted-foreground|text-card-foreground/,
      );

      // Find text elements within footer
      const textElements = footer.querySelectorAll(
        "p, h1, h2, h3, h4, h5, h6, span",
      );
      textElements.forEach((element) => {
        if (element.textContent.trim()) {
          expect(element.className).toMatch(
            /text-foreground|text-muted-foreground|text-card-foreground/,
          );
        }
      });
    });

    test("should have proper link hover states in dark mode", () => {
      renderWithDarkTheme(<Footer />);

      const footerLinks = screen.getAllByRole("link");

      if (footerLinks.length > 0) {
        footerLinks.forEach((link) => {
          // Links should have hover states that work in dark mode
          expect(link.className).toMatch(/hover:/);
          // Should use semantic colors or dark mode variants
          expect(link.className).toMatch(
            /text-foreground|text-muted-foreground|dark:text-|hover:text-/,
          );
        });
      }
    });

    test("should handle footer sections properly in dark mode", () => {
      renderWithDarkTheme(<Footer />);

      const footer = document.querySelector("footer");

      // Should maintain proper structure
      expect(footer).toHaveClass("border-t");

      // Border should use semantic color
      expect(footer.className).toMatch(
        /border-border|border-muted|dark:border-/,
      );
    });
  });

  describe("Layout Components Integration in Dark Mode", () => {
    test("should work together cohesively in dark mode", () => {
      renderWithDarkTheme(
        <Layout>
          <main data-testid="main-content">
            <h1>Test Page</h1>
            <p>This is test content</p>
          </main>
        </Layout>,
      );

      // All components should be present
      expect(document.querySelector("header")).toBeInTheDocument();
      expect(screen.getByTestId("main-content")).toBeInTheDocument();
      expect(document.querySelector("footer")).toBeInTheDocument();

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");

      // Main content area should have proper styling
      const mainElement = document.getElementById("main-content");
      expect(mainElement).toHaveClass("flex-grow");
    });

    test("should maintain accessibility in dark mode", () => {
      renderWithDarkTheme(
        <Layout>
          <main data-testid="accessible-content">
            <h1>Accessible Content</h1>
          </main>
        </Layout>,
      );

      // Skip to content link should be present
      const skipLink = screen.getByText(/skip to main content/i);
      expect(skipLink).toBeInTheDocument();

      // Should have proper semantic structure
      expect(document.querySelector("header")).toBeInTheDocument();
      expect(document.querySelector("main")).toBeInTheDocument();
      expect(document.querySelector("footer")).toBeInTheDocument();

      // Theme toggle should be accessible
      const themeButtons = screen.getAllByLabelText(/switch to light mode/i);
      expect(themeButtons.length).toBeGreaterThan(0);
    });

    test("should handle responsive layout in dark mode", () => {
      renderWithDarkTheme(
        <Layout>
          <div data-testid="responsive-content">Responsive Content</div>
        </Layout>,
      );

      const mainElement = document.getElementById("main-content");
      const layoutContainer = mainElement.parentElement;

      // Should maintain responsive structure
      expect(layoutContainer).toHaveClass("min-h-screen");
      expect(layoutContainer).toHaveClass("flex");
      expect(layoutContainer).toHaveClass("flex-col");

      // Header should have mobile menu functionality
      const mobileMenuButton = screen.getByText(/Open menu/i).closest("button");
      expect(mobileMenuButton).toBeInTheDocument();
    });
  });
});
