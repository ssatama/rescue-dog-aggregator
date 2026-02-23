// frontend/src/components/home/__tests__/HeroSection.test.jsx

import React from "react";
import { render, screen } from "../../../test-utils";
import HeroSection from "../HeroSection";

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

// Mock next/image for testing
jest.mock("next/image", () => {
  return function MockImage({ src, alt, priority, ...props }) {
    return (
      <img
        src={src}
        alt={alt}
        data-priority={priority ? "true" : "false"}
        {...props}
      />
    );
  };
});

// Mock HeroDogPreviewCard
jest.mock("../HeroDogPreviewCard", () => {
  return function MockHeroDogPreviewCard({ dog, priority }) {
    return (
      <div data-testid="hero-dog-preview-card" data-dog-name={dog.name}>
        <span>{dog.name}</span>
        <a href={`/dogs/${dog.slug || `dog-${dog.id}`}`}>Meet {dog.name}</a>
      </div>
    );
  };
});

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

  const mockPreviewDogs = [
    { id: 1, name: "Bella", slug: "bella-123", primary_image_url: "/test.jpg" },
    { id: 2, name: "Max", slug: "max-456", primary_image_url: "/test2.jpg" },
    { id: 3, name: "Luna", slug: "luna-789", primary_image_url: "/test3.jpg" },
  ];

  describe("Successful data rendering", () => {
    test("should display statistics from props", () => {
      render(<HeroSection statistics={mockStatistics} />);

      expect(screen.getByTestId("statistics-content")).toBeInTheDocument();

      const counters = screen.getAllByTestId("animated-counter");
      expect(counters).toHaveLength(3);

      expect(screen.getByText("412")).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
    });

    test("should display correct labels for statistics", () => {
      render(<HeroSection statistics={mockStatistics} />);

      expect(screen.getByText("Dogs need homes")).toBeInTheDocument();
      expect(screen.getByText("Rescue organizations")).toBeInTheDocument();
      expect(screen.getByText("Countries")).toBeInTheDocument();
    });

    test("should render 3 dog preview cards when previewDogs provided", () => {
      render(
        <HeroSection
          statistics={mockStatistics}
          previewDogs={mockPreviewDogs}
        />,
      );

      const dogCards = screen.getAllByTestId("hero-dog-preview-card");
      expect(dogCards).toHaveLength(3);
      expect(screen.getByText("Bella")).toBeInTheDocument();
      expect(screen.getByText("Max")).toBeInTheDocument();
      expect(screen.getByText("Luna")).toBeInTheDocument();
    });

    test("should render fallback link when no dogs provided", () => {
      render(<HeroSection statistics={mockStatistics} previewDogs={[]} />);

      expect(screen.getByText("Browse all dogs →")).toBeInTheDocument();
      expect(
        screen.queryByTestId("hero-dog-preview-card"),
      ).not.toBeInTheDocument();
    });

    test("should handle fewer than 3 dogs gracefully", () => {
      const twoDogs = mockPreviewDogs.slice(0, 2);

      render(
        <HeroSection statistics={mockStatistics} previewDogs={twoDogs} />,
      );

      const dogCards = screen.getAllByTestId("hero-dog-preview-card");
      expect(dogCards).toHaveLength(2);
    });

    test("should handle empty statistics gracefully", () => {
      const emptyStats = {
        total_dogs: 0,
        total_organizations: 0,
        countries: [],
        organizations: [],
      };

      render(<HeroSection statistics={emptyStats} previewDogs={[]} />);

      expect(screen.getAllByText("0")).toHaveLength(3);
      expect(screen.getByText("Browse all dogs →")).toBeInTheDocument();

      // Subtitle should show marketing fallback values, not "0 dogs"
      const subtitle = screen.getByTestId("hero-subtitle");
      expect(subtitle).toHaveTextContent("Browse 3,186 dogs");
      expect(subtitle).toHaveTextContent("from 13 rescue organizations");
    });
  });

  describe("Visual design", () => {
    test("should have hero gradient background", () => {
      render(<HeroSection statistics={mockStatistics} />);

      const heroSection = screen.getByTestId("hero-section");
      expect(heroSection).toHaveClass("hero-gradient");
    });

    test("should render new headline", () => {
      render(<HeroSection statistics={mockStatistics} />);

      const heroTitle = screen.getByTestId("hero-title");
      expect(heroTitle).toHaveTextContent("Find Your Perfect Rescue Dog");
    });

    test("should render subtitle with dynamic counts from statistics prop", () => {
      render(<HeroSection statistics={mockStatistics} />);

      const heroSubtitle = screen.getByTestId("hero-subtitle");
      expect(heroSubtitle).toHaveTextContent(
        "Browse 412 dogs aggregated from 3 rescue organizations across Europe & UK. Adopt Don't Shop.",
      );
    });

    test("should have responsive typography", () => {
      render(<HeroSection statistics={mockStatistics} />);

      const heroTitle = screen.getByTestId("hero-title");
      expect(heroTitle).toHaveClass("text-hero");

      const heroSubtitle = screen.getByTestId("hero-subtitle");
      expect(heroSubtitle).toHaveClass("text-body");
    });

    test("should display CTA buttons with correct text", () => {
      render(<HeroSection statistics={mockStatistics} />);

      const primaryCta = screen.getByTestId("hero-primary-cta");
      expect(primaryCta).toBeInTheDocument();
      expect(primaryCta).toHaveTextContent("Browse All Dogs");

      const linkElement = primaryCta.closest("a");
      expect(linkElement).toHaveAttribute("href", "/dogs");

      const secondaryCta = screen.getByTestId("hero-secondary-cta");
      expect(secondaryCta).toBeInTheDocument();
      expect(secondaryCta).toHaveTextContent("🐾");
      expect(secondaryCta).toHaveTextContent("Start Swiping");
    });

    test("should have only 2 CTA buttons", () => {
      render(<HeroSection statistics={mockStatistics} />);

      const primaryCta = screen.getByTestId("hero-primary-cta");
      const secondaryCta = screen.getByTestId("hero-secondary-cta");

      expect(primaryCta).toBeInTheDocument();
      expect(secondaryCta).toBeInTheDocument();
      expect(screen.queryByTestId("hero-swipe-cta")).not.toBeInTheDocument();
    });
  });

  describe("Responsive design", () => {
    test("should have mobile-first responsive classes", () => {
      render(<HeroSection statistics={mockStatistics} />);

      const container = screen.getByTestId("hero-container");
      expect(container).toHaveClass("px-4", "sm:px-6", "lg:px-8");

      const statisticsGrid = screen.getByTestId("statistics-grid");
      expect(statisticsGrid).toHaveClass("grid-cols-1", "md:grid-cols-3");
    });

    test("should stack elements properly on mobile", () => {
      render(<HeroSection statistics={mockStatistics} />);

      const heroContent = screen.getByTestId("hero-content");
      expect(heroContent).toHaveClass("flex", "flex-col", "lg:flex-row");
    });

    test("should have proper spacing for different screen sizes", () => {
      render(<HeroSection statistics={mockStatistics} />);

      const heroSection = screen.getByTestId("hero-section");
      expect(heroSection).toHaveClass("py-12", "md:py-20", "lg:py-24");
    });
  });

  describe("Accessibility", () => {
    test("should have proper semantic structure", () => {
      render(<HeroSection statistics={mockStatistics} />);

      const heroSection = screen.getByTestId("hero-section");
      expect(heroSection.tagName).toBe("SECTION");

      const heroTitle = screen.getByTestId("hero-title");
      expect(heroTitle.tagName).toBe("H1");
    });

    test("should have proper ARIA labels for statistics", () => {
      render(<HeroSection statistics={mockStatistics} />);

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

    test("should have descriptive text for screen readers", () => {
      render(
        <HeroSection
          statistics={mockStatistics}
          previewDogs={mockPreviewDogs}
        />,
      );

      expect(
        screen.getByText("Ready for their forever home"),
      ).toBeInTheDocument();

      const srText = screen.getByTestId("statistics-description");
      expect(srText).toHaveClass("sr-only");
      expect(srText).toHaveTextContent(/statistics about rescue dogs/);
    });

    test("should have keyboard accessible CTA buttons", () => {
      render(<HeroSection statistics={mockStatistics} />);

      const buttons = screen.getAllByRole("link");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("href");
        expect(button).not.toHaveAttribute("tabindex", "-1");
      });
    });
  });

  describe("Integration", () => {
    test("should work with all components together", () => {
      render(<HeroSection statistics={mockStatistics} />);

      expect(screen.getByTestId("hero-section")).toBeInTheDocument();
      expect(screen.getByTestId("statistics-content")).toBeInTheDocument();
      expect(screen.getByTestId("hero-primary-cta")).toBeInTheDocument();
    });

    test("should have correct CTA button links", () => {
      render(<HeroSection statistics={mockStatistics} />);

      const primaryCTA = screen.getByTestId("hero-primary-cta");
      expect(primaryCTA.closest("a")).toHaveAttribute("href", "/dogs");
      expect(primaryCTA).toHaveTextContent("Browse All Dogs");

      const secondaryCTA = screen.getByTestId("hero-secondary-cta");
      expect(secondaryCTA.closest("a")).toHaveAttribute("href", "/swipe");
      expect(secondaryCTA).toHaveTextContent("Start Swiping");
    });

    test("should pass correct props to AnimatedCounter components", () => {
      render(<HeroSection statistics={mockStatistics} />);

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
});
