// frontend/src/components/home/__tests__/HeroSection.test.jsx

import React from "react";
import { render, screen, waitFor, fireEvent } from "../../../test-utils";
import HeroSection from "../HeroSection";
import { getStatistics } from "../../../services/animalsService";

// Mock the statistics service
jest.mock("../../../services/animalsService");

// Mock AnimatedCounter component
jest.mock("../../ui/AnimatedCounter", () => {
  return function MockAnimatedCounter({ value, label, className }) {
    return (
      <span
        data-testid="animated-counter"
        className={className}
        aria-label={`${label}: ${value}`}
      >
        {value}
      </span>
    );
  };
});

// Mock Link component
jest.mock("next/link", () => {
  return function MockLink({ children, href, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock logger
jest.mock("../../../utils/logger", () => ({
  reportError: jest.fn(),
}));

describe("HeroSection", () => {
  const mockStatistics = {
    total_dogs: 412,
    total_organizations: 3,
    countries: [
      { country: "Turkey", count: 33 },
      { country: "Germany", count: 200 },
    ],
    organizations: [
      { id: 11, name: "Tierschutzverein Europa e.V.", dog_count: 353 },
      { id: 2, name: "Pets in Turkey", dog_count: 33 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading states", () => {
    test("should show loading skeleton while fetching statistics", () => {
      getStatistics.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<HeroSection />);

      expect(screen.getByTestId("hero-section")).toBeInTheDocument();
      expect(screen.getByTestId("statistics-loading")).toBeInTheDocument();
      expect(
        screen.queryByTestId("statistics-content"),
      ).not.toBeInTheDocument();
    });

    test("should show shimmer animation during loading", () => {
      getStatistics.mockReturnValue(new Promise(() => {}));

      render(<HeroSection />);

      const loadingElements = screen.getAllByTestId("stat-loading");
      expect(loadingElements).toHaveLength(3); // Dogs, Organizations, Countries

      loadingElements.forEach((element) => {
        expect(element).toHaveClass("animate-shimmer");
      });
    });
  });

  describe("Successful data loading", () => {
    test("should display statistics when loaded", async () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      await waitFor(() => {
        expect(screen.getByTestId("statistics-content")).toBeInTheDocument();
      });

      // Check animated counters are rendered with correct values
      const counters = screen.getAllByTestId("animated-counter");
      expect(counters).toHaveLength(3);

      // Verify the main statistics
      expect(screen.getByText("412")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument(); // Countries count
    });

    test("should display correct labels for statistics", async () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      await waitFor(() => {
        expect(screen.getByText("Dogs need homes")).toBeInTheDocument();
        expect(screen.getByText("Rescue organizations")).toBeInTheDocument();
        expect(screen.getByText("Countries")).toBeInTheDocument();
      });
    });

    test("should show organization breakdown", async () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      await waitFor(() => {
        expect(
          screen.getByText("Dogs available from these organizations:"),
        ).toBeInTheDocument();
        expect(
          screen.getByText("Tierschutzverein Europa e.V."),
        ).toBeInTheDocument();
        expect(screen.getByText("(353)")).toBeInTheDocument();
        expect(screen.getByText("Pets in Turkey")).toBeInTheDocument();
        expect(screen.getByText("(33)")).toBeInTheDocument();
      });
    });

    test("should limit organization display to top 4", async () => {
      const manyOrgsStats = {
        ...mockStatistics,
        organizations: Array.from({ length: 10 }, (_, i) => ({
          id: i,
          name: `Organization ${i}`,
          dog_count: 50 - i,
        })),
      };

      getStatistics.mockResolvedValue(manyOrgsStats);

      render(<HeroSection />);

      await waitFor(() => {
        const orgElements = screen.getAllByText(/Organization \d+/);
        expect(orgElements).toHaveLength(4);
        expect(screen.getByText("+ 6 more organizations")).toBeInTheDocument();
      });
    });
  });

  describe("Error handling", () => {
    test("should show error message when statistics fetch fails", async () => {
      getStatistics.mockRejectedValue(new Error("Network error"));

      render(<HeroSection />);

      await waitFor(() => {
        expect(screen.getByTestId("statistics-error")).toBeInTheDocument();
        expect(
          screen.getByText(/Unable to load statistics/),
        ).toBeInTheDocument();
      });
    });

    test("should show retry button on error", async () => {
      getStatistics.mockRejectedValue(new Error("Network error"));

      render(<HeroSection />);

      await waitFor(() => {
        const retryButton = screen.getByTestId("retry-button");
        expect(retryButton).toBeInTheDocument();
        expect(retryButton).toHaveTextContent("Try again");
      });
    });

    test("should retry fetching statistics when retry button clicked", async () => {
      getStatistics
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce(mockStatistics);

      render(<HeroSection />);

      await waitFor(() => {
        expect(screen.getByTestId("statistics-error")).toBeInTheDocument();
      });

      const retryButton = screen.getByTestId("retry-button");
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId("statistics-content")).toBeInTheDocument();
      });

      expect(getStatistics).toHaveBeenCalledTimes(2);
    });

    test("should handle empty statistics gracefully", async () => {
      const emptyStats = {
        total_dogs: 0,
        total_organizations: 0,
        countries: [],
        organizations: [],
      };

      getStatistics.mockResolvedValue(emptyStats);

      render(<HeroSection />);

      await waitFor(() => {
        expect(screen.getAllByText("0")).toHaveLength(3); // Three counters showing 0
        expect(
          screen.getByText("No organizations currently available"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Visual design", () => {
    test("should have hero gradient background", () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      const heroSection = screen.getByTestId("hero-section");
      expect(heroSection).toHaveClass("hero-gradient");
    });

    test("should have responsive typography", () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      const heroTitle = screen.getByTestId("hero-title");
      expect(heroTitle).toHaveClass("text-hero");

      const heroSubtitle = screen.getByTestId("hero-subtitle");
      expect(heroSubtitle).toHaveClass("text-body");
    });

    test("should display CTA buttons", () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      const primaryCta = screen.getByTestId("hero-primary-cta");
      expect(primaryCta).toBeInTheDocument();
      expect(primaryCta).toHaveTextContent("Find Your New Best Friend");

      // Check that the button is inside a link with correct href
      const linkElement = primaryCta.closest("a");
      expect(linkElement).toHaveAttribute("href", "/dogs");

      const secondaryCta = screen.getByTestId("hero-secondary-cta");
      expect(secondaryCta).toBeInTheDocument();
      expect(secondaryCta).toHaveTextContent("About Our Mission");
    });
  });

  describe("Responsive design", () => {
    test("should have mobile-first responsive classes", async () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      const container = screen.getByTestId("hero-container");
      expect(container).toHaveClass("px-4", "sm:px-6", "lg:px-8");

      await waitFor(() => {
        const statisticsGrid = screen.getByTestId("statistics-grid");
        expect(statisticsGrid).toHaveClass("grid-cols-1", "md:grid-cols-3");
      });
    });

    test("should stack elements properly on mobile", () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      const heroContent = screen.getByTestId("hero-content");
      expect(heroContent).toHaveClass("flex", "flex-col", "lg:flex-row");
    });

    test("should have proper spacing for different screen sizes", () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      const heroSection = screen.getByTestId("hero-section");
      expect(heroSection).toHaveClass("py-12", "md:py-20", "lg:py-24");
    });
  });

  describe("Accessibility", () => {
    test("should have proper semantic structure", () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      const heroSection = screen.getByTestId("hero-section");
      expect(heroSection.tagName).toBe("SECTION");

      const heroTitle = screen.getByTestId("hero-title");
      expect(heroTitle.tagName).toBe("H1");
    });

    test("should have proper ARIA labels for statistics", async () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      await waitFor(() => {
        const counters = screen.getAllByTestId("animated-counter");
        expect(counters[0]).toHaveAttribute(
          "aria-label",
          "Dogs need homes: 412",
        );
        expect(counters[1]).toHaveAttribute(
          "aria-label",
          "Rescue organizations: 3",
        );
        expect(counters[2]).toHaveAttribute("aria-label", "Countries: 2");
      });
    });

    test("should have descriptive text for screen readers", async () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      await waitFor(() => {
        expect(
          screen.getByText("Dogs available from these organizations:"),
        ).toBeInTheDocument();
      });

      const srText = screen.getByTestId("statistics-description");
      expect(srText).toHaveClass("sr-only");
      expect(srText).toHaveTextContent(/statistics about rescue dogs/);
    });

    test("should have keyboard accessible CTA buttons", () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      const buttons = screen.getAllByRole("link");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("href");
        expect(button).not.toHaveAttribute("tabindex", "-1");
      });
    });
  });

  describe("Performance", () => {
    test("should call getStatistics only once on mount", () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      expect(getStatistics).toHaveBeenCalledTimes(1);
    });

    test("should not re-fetch statistics on re-render with same props", () => {
      getStatistics.mockResolvedValue(mockStatistics);

      const { rerender } = render(<HeroSection />);
      rerender(<HeroSection />);

      expect(getStatistics).toHaveBeenCalledTimes(1);
    });

    test("should cleanup effects on unmount", () => {
      getStatistics.mockResolvedValue(mockStatistics);

      const { unmount } = render(<HeroSection />);

      // Should not throw errors on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe("Integration", () => {
    test("should work with all components together", async () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      // Should render all main sections
      expect(screen.getByTestId("hero-section")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByTestId("statistics-content")).toBeInTheDocument();
        expect(screen.getByTestId("hero-primary-cta")).toBeInTheDocument();
      });
    });

    test("should have correct CTA button links", async () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      await waitFor(() => {
        // Primary CTA should link to dogs page
        const primaryCTA = screen.getByTestId("hero-primary-cta");
        expect(primaryCTA.closest("a")).toHaveAttribute("href", "/dogs");
        expect(primaryCTA).toHaveTextContent("Find Your New Best Friend");

        // Secondary CTA should link to about page
        const secondaryCTA = screen.getByTestId("hero-secondary-cta");
        expect(secondaryCTA.closest("a")).toHaveAttribute("href", "/about");
        expect(secondaryCTA).toHaveTextContent("About Our Mission");
      });
    });

    test("should pass correct props to AnimatedCounter components", async () => {
      getStatistics.mockResolvedValue(mockStatistics);

      render(<HeroSection />);

      await waitFor(() => {
        const counters = screen.getAllByTestId("animated-counter");

        // Check that AnimatedCounter receives correct props
        expect(counters[0]).toHaveAttribute(
          "aria-label",
          "Dogs need homes: 412",
        );
        expect(counters[1]).toHaveAttribute(
          "aria-label",
          "Rescue organizations: 3",
        );
        expect(counters[2]).toHaveAttribute("aria-label", "Countries: 2");
      });
    });
  });
});
