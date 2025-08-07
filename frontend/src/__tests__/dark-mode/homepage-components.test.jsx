import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { ThemeProvider } from "../../components/providers/ThemeProvider";
import HeroSection from "../../components/home/HeroSection";
import TrustSection from "../../components/home/TrustSection";
import DogSection from "../../components/home/DogSection";

// Helper to render with ThemeProvider in dark mode
const renderWithDarkTheme = (component) => {
  // Set dark mode in localStorage
  localStorage.setItem("theme", "dark");
  document.documentElement.classList.add("dark");

  return render(<ThemeProvider>{component}</ThemeProvider>);
};

// Mock next/navigation for components that use it
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/",
}));

// Mock API calls for data-dependent components
jest.mock("../../services/animalsService", () => ({
  getStatistics: jest.fn().mockRejectedValue(new Error("Test error")),
  getAnimalsByCuration: jest.fn().mockRejectedValue(new Error("Test error")),
}));

jest.mock("../../utils/api", () => ({
  fetchStats: jest.fn().mockResolvedValue({
    totalDogs: 1234,
    totalOrganizations: 45,
    totalAdoptions: 567,
  }),
  fetchDogs: jest.fn().mockResolvedValue([
    {
      id: 1,
      name: "Test Dog",
      breed: "Golden Retriever",
      age_months: 24,
      size: "large",
      primary_image_url: "https://example.com/dog.jpg",
    },
  ]),
  fetchOrganizations: jest.fn().mockResolvedValue([
    {
      id: 1,
      name: "Test Rescue",
      website_url: "https://test.com",
      logo_url: "https://example.com/logo.jpg",
    },
  ]),
}));

describe("Homepage Components - Dark Mode Support", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  describe("HeroSection Component Dark Mode", () => {
    test("should use semantic text colors instead of hard-coded grays in dark mode", () => {
      renderWithDarkTheme(<HeroSection />);

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");

      // Find the hero section
      const heroSection = document
        .querySelector(".hero-gradient")
        .closest("section");

      // Should not use hard-coded gray colors
      const textElements = heroSection.querySelectorAll("h1, h2, p, span");
      textElements.forEach((element) => {
        if (element.textContent.trim()) {
          // Should not have hard-coded gray colors
          expect(element.className).not.toMatch(/text-gray-900(?!\s+dark:)/);
          expect(element.className).not.toMatch(/text-gray-700(?!\s+dark:)/);
          expect(element.className).not.toMatch(/text-gray-600(?!\s+dark:)/);

          // Should use semantic colors or have dark mode variants
          if (element.className.includes("text-")) {
            expect(element.className).toMatch(
              /text-foreground|text-muted-foreground|dark:text-/,
            );
          }
        }
      });
    });

    test("should have dark mode variant for hero gradient background", () => {
      renderWithDarkTheme(<HeroSection />);

      const heroGradient = document.querySelector(".hero-gradient");
      expect(heroGradient).toBeInTheDocument();

      // Hero gradient should work in dark mode context
      expect(document.documentElement).toHaveClass("dark");

      // The gradient should be styled to work in dark mode
      // This will be implemented when we update the CSS
    });

    test("should use semantic background for statistics cards in dark mode", async () => {
      // Mock successful API response
      const { getStatistics } = require("../../services/animalsService");
      getStatistics.mockResolvedValueOnce({
        total_dogs: 123,
        total_organizations: 45,
        countries: ["DE", "US"],
        organizations: [{ id: 1, name: "Test Rescue", dog_count: 10 }],
      });

      renderWithDarkTheme(<HeroSection />);

      // Wait for statistics to load or error to show
      await waitFor(() => {
        const loadedStats = screen.queryByTestId("statistics-content");
        const errorState = screen.queryByTestId("statistics-error");
        expect(loadedStats || errorState).toBeInTheDocument();
      });

      // Find any cards with background classes
      const allCards = document.querySelectorAll(
        '[class*="bg-card"], [class*="bg-white"]',
      );

      // Should use semantic backgrounds
      allCards.forEach((card) => {
        // Should not use hard-coded white backgrounds without dark variants
        expect(card.className).not.toMatch(/\bbg-white(?!\s|$)/);
        // Should use semantic background
        expect(card.className).toMatch(/bg-card|bg-background|bg-muted/);
      });
    });

    test("should handle loading states properly in dark mode", () => {
      renderWithDarkTheme(<HeroSection />);

      // Check for loading skeletons
      const loadingElements = document.querySelectorAll(
        '[class*="animate-pulse"]',
      );

      loadingElements.forEach((element) => {
        // Should not use hard-coded gray gradients
        expect(element.className).not.toMatch(/from-gray-200(?!\s+dark:)/);
        expect(element.className).not.toMatch(/to-gray-300(?!\s+dark:)/);

        // Should use semantic colors or dark mode variants
        if (
          element.className.includes("from-") ||
          element.className.includes("to-")
        ) {
          expect(element.className).toMatch(
            /bg-muted|from-muted|to-muted|dark:/,
          );
        }
      });
    });

    test("should maintain orange theme for call-to-action buttons in dark mode", () => {
      renderWithDarkTheme(<HeroSection />);

      const ctaButtons = screen
        .getAllByRole("button")
        .filter(
          (button) =>
            button.className.includes("bg-orange") ||
            button.textContent.includes("Find"),
        );

      ctaButtons.forEach((button) => {
        // Orange theme should be preserved but may have dark mode variants
        expect(button.className).toMatch(
          /bg-orange|hover:bg-orange|dark:bg-orange/,
        );
      });
    });
  });

  describe("TrustSection Component Dark Mode", () => {
    test("should use semantic background instead of hard-coded gray-50 in dark mode", async () => {
      renderWithDarkTheme(<TrustSection />);

      // Wait for the section to render (could be error state or success state)
      await waitFor(() => {
        const trustSection = screen.getByTestId("trust-section");
        expect(trustSection).toBeInTheDocument();
      });

      const trustSection = screen.getByTestId("trust-section");

      // Should not use hard-coded gray background
      expect(trustSection.className).not.toMatch(/bg-gray-50(?!\s+dark:)/);

      // Should use semantic background
      expect(trustSection.className).toMatch(/bg-muted/);
    });

    test("should use semantic colors for statistics cards in dark mode", async () => {
      renderWithDarkTheme(<TrustSection />);

      // Wait for statistics to load
      await waitFor(() => {
        const statsContainer = document.querySelector('[class*="bg-white"]');
        if (statsContainer) {
          expect(statsContainer).toBeInTheDocument();
        }
      });

      // Find statistics cards
      const statsCards = document.querySelectorAll('[class*="bg-white"]');

      statsCards.forEach((card) => {
        // Should not use hard-coded white backgrounds
        expect(card.className).not.toMatch(/bg-white(?!\s+dark:)/);

        // Should use semantic background
        if (card.className.includes("bg-")) {
          expect(card.className).toMatch(/bg-card|bg-background|dark:bg-/);
        }
      });

      // Check text colors in cards
      const cardTexts = document.querySelectorAll(
        '[class*="text-gray-900"], [class*="text-gray-600"]',
      );
      cardTexts.forEach((text) => {
        // Should not use hard-coded gray text
        expect(text.className).not.toMatch(/text-gray-900(?!\s+dark:)/);
        expect(text.className).not.toMatch(/text-gray-600(?!\s+dark:)/);

        // Should use semantic text colors
        if (text.className.includes("text-")) {
          expect(text.className).toMatch(
            /text-foreground|text-muted-foreground|dark:text-/,
          );
        }
      });
    });

    test("should maintain icon colors but ensure proper contrast in dark mode", async () => {
      // Mock successful API response to show icons
      const { getStatistics } = require("../../services/animalsService");
      getStatistics.mockResolvedValueOnce({
        total_dogs: 123,
        total_organizations: 45,
        countries: ["DE", "US"],
        organizations: [{ id: 1, name: "Test Rescue", dog_count: 10 }],
      });

      renderWithDarkTheme(<TrustSection />);

      // Wait for icons to render in success state
      await waitFor(() => {
        const icons = document.querySelectorAll("svg");
        expect(icons.length).toBeGreaterThan(0);
      });

      const iconContainers = document.querySelectorAll(
        '[class*="text-orange"], [class*="text-green"]',
      );

      // Should have some icon containers
      expect(iconContainers.length).toBeGreaterThan(0);

      iconContainers.forEach((container) => {
        // Icon colors should be preserved or have dark mode variants
        const classString = container.getAttribute("class") || "";
        if (classString) {
          expect(classString).toMatch(/text-orange|text-green|dark:text-/);
        }
      });
    });

    test("should handle error states properly in dark mode", async () => {
      // The getStatistics mock is already set to reject by default
      renderWithDarkTheme(<TrustSection />);

      // Wait for error state
      await waitFor(() => {
        const errorText = screen.getByText(/unable to load statistics/i);
        expect(errorText).toBeInTheDocument();
      });

      const errorText = screen.getByText(/unable to load statistics/i);

      // Should use semantic destructive color
      expect(errorText.className).toMatch(/text-destructive/);
    });
  });

  describe("DogSection Component Dark Mode", () => {
    test("should use semantic text colors for section headers in dark mode", async () => {
      renderWithDarkTheme(
        <DogSection
          title="Featured Rescue Dogs"
          subtitle="Meet some amazing dogs looking for homes"
          curationType="featured"
          viewAllHref="/dogs"
        />,
      );

      // Wait for section to render
      await waitFor(() => {
        const sectionHeader = screen.getByText(/featured rescue dogs/i);
        expect(sectionHeader).toBeInTheDocument();
      });

      // Find section headers
      const headers = document.querySelectorAll("h1, h2, h3");

      headers.forEach((header) => {
        if (
          header.textContent.includes("Featured") ||
          header.textContent.includes("Dogs")
        ) {
          // Should not use hard-coded gray colors
          expect(header.className).not.toMatch(/text-gray-900(?!\s+dark:)/);
          expect(header.className).not.toMatch(/text-gray-600(?!\s+dark:)/);

          // Should use semantic colors
          if (header.className.includes("text-")) {
            expect(header.className).toMatch(
              /text-foreground|text-muted-foreground|dark:text-/,
            );
          }
        }
      });
    });

    test("should handle loading states with proper dark mode styling", () => {
      renderWithDarkTheme(
        <DogSection
          title="Test Dogs"
          subtitle="Test subtitle"
          curationType="featured"
          viewAllHref="/dogs"
        />,
      );

      // Find loading elements (DogCardSkeleton components)
      const loadingElements = document.querySelectorAll(
        '[class*="skeleton-element"]',
      );

      // Should have loading elements in dark mode context
      expect(loadingElements.length).toBeGreaterThan(0);
      expect(document.documentElement).toHaveClass("dark");
    });

    test("should handle empty state properly in dark mode", async () => {
      // Mock API to return empty array
      const { getAnimalsByCuration } = require("../../services/animalsService");
      getAnimalsByCuration.mockResolvedValueOnce([]);

      renderWithDarkTheme(
        <DogSection
          title="Empty Dogs"
          subtitle="Test subtitle"
          curationType="featured"
          viewAllHref="/dogs"
        />,
      );

      // Wait for empty state
      await waitFor(() => {
        const emptyText = screen.getByText(/no dogs available/i);
        expect(emptyText).toBeInTheDocument();
      });

      const emptyStateTexts = document.querySelectorAll(
        '[class*="text-gray-500"]',
      );
      emptyStateTexts.forEach((text) => {
        // Should not use hard-coded gray colors
        expect(text.className).not.toMatch(/text-gray-500(?!\s+dark:)/);

        // Should use semantic muted color
        if (text.className.includes("text-")) {
          expect(text.className).toMatch(/text-muted-foreground|dark:text-/);
        }
      });
    });

    test("should handle error states with proper dark mode colors", async () => {
      // Mock API to throw error
      const { getAnimalsByCuration } = require("../../services/animalsService");
      getAnimalsByCuration.mockRejectedValueOnce(new Error("Failed to fetch"));

      renderWithDarkTheme(
        <DogSection
          title="Error Dogs"
          subtitle="Test subtitle"
          curationType="featured"
          viewAllHref="/dogs"
        />,
      );

      // Wait for error state
      await waitFor(() => {
        const errorButton = screen.getByText(/try again/i);
        expect(errorButton).toBeInTheDocument();
      });

      const errorButton = screen.getByText(/retry/i);

      // Error button should use semantic destructive color
      expect(errorButton.className).not.toMatch(/text-red-700(?!\s+dark:)/);
      expect(errorButton.className).toMatch(/text-destructive/);
    });
  });

  describe("Homepage Components Integration in Dark Mode", () => {
    test("should work together cohesively in dark mode", async () => {
      renderWithDarkTheme(
        <div>
          <HeroSection />
          <TrustSection />
          <DogSection
            title="Featured Rescue Dogs"
            subtitle="Meet some of our amazing rescue dogs looking for their forever homes"
            curationType="featured"
            viewAllHref="/dogs"
          />
        </div>,
      );

      // Should be in dark mode context
      expect(document.documentElement).toHaveClass("dark");

      // Wait for components to render
      await waitFor(() => {
        expect(
          screen.getByText(/helping rescue dogs find loving homes/i),
        ).toBeInTheDocument();
        expect(screen.getByText(/featured rescue dogs/i)).toBeInTheDocument();
      });

      // All sections should be present and working
      const heroSection = document
        .querySelector(".hero-gradient")
        .closest("section");
      const dogSection = screen
        .getByText(/featured rescue dogs/i)
        .closest("section");

      expect(heroSection).toBeInTheDocument();
      expect(dogSection).toBeInTheDocument();
    });

    test("should maintain consistent theming across all homepage sections", async () => {
      renderWithDarkTheme(
        <div data-testid="homepage">
          <HeroSection />
          <TrustSection />
          <DogSection
            title="Featured Rescue Dogs"
            subtitle="Meet some of our amazing rescue dogs looking for their forever homes"
            curationType="featured"
            viewAllHref="/dogs"
          />
        </div>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("homepage")).toBeInTheDocument();
      });

      // Check that no hard-coded colors are used across sections
      const homepage = screen.getByTestId("homepage");
      const allTextElements = homepage.querySelectorAll('[class*="text-gray"]');

      allTextElements.forEach((element) => {
        // All elements should either have dark mode variants or use semantic tokens
        if (element.className.includes("text-gray")) {
          expect(element.className).toMatch(
            /dark:text-|text-foreground|text-muted-foreground/,
          );
        }
      });

      const allBgElements = homepage.querySelectorAll(
        '[class*="bg-gray"], [class*="bg-white"]',
      );

      allBgElements.forEach((element) => {
        // All backgrounds should either have dark mode variants or use semantic tokens
        if (
          element.className.includes("bg-gray") ||
          element.className.includes("bg-white")
        ) {
          expect(element.className).toMatch(
            /dark:bg-|bg-background|bg-card|bg-muted/,
          );
        }
      });
    });
  });
});
