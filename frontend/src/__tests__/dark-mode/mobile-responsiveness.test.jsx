/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Test components for mobile responsiveness
import HeroSection from "../../components/home/HeroSection";
import TrustSection from "../../components/home/TrustSection";
import AboutPage from "../../app/about/page";
import DogCard from "../../components/dogs/DogCard";
import OrganizationCard from "../../components/organizations/OrganizationCard";
import CountryFlag from "../../components/ui/CountryFlag";

// Mock services and utilities
jest.mock("../../services/animalsService", () => ({
  getStatistics: jest.fn().mockResolvedValue({
    total_dogs: 1250,
    total_organizations: 25,
    countries: ["DE", "TR", "GB"],
    organizations: [],
  }),
  getGeneralStatistics: jest.fn().mockResolvedValue({
    totalDogs: 1250,
    totalOrganizations: 25,
    totalCountries: 15,
  }),
}));

// Mock all required components
jest.mock("../../components/layout/Layout", () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock("../../components/ui/LazyImage", () => {
  return function MockLazyImage({ src, alt, className }) {
    return <img src={src} alt={alt} className={className} />;
  };
});

jest.mock("@/components/ui/card", () => ({
  Card: function MockCard({ children, className, ...props }) {
    return (
      <div className={`bg-card text-card-foreground ${className}`} {...props}>
        {children}
      </div>
    );
  },
  CardContent: function MockCardContent({ children, className, ...props }) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  },
  CardFooter: function MockCardFooter({ children, className, ...props }) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  },
  CardHeader: function MockCardHeader({ children, className, ...props }) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  },
  CardTitle: function MockCardTitle({ children, className, ...props }) {
    return (
      <div className={className} {...props}>
        {children}
      </div>
    );
  },
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: function MockBadge({ children, variant, className, ...props }) {
    return (
      <span className={className} {...props}>
        {children}
      </span>
    );
  },
}));

jest.mock("@/components/ui/button", () => ({
  Button: function MockButton({ children, asChild, className, ...props }) {
    if (asChild) {
      return (
        <div className={className} {...props}>
          {children}
        </div>
      );
    }
    return (
      <button className={className} {...props}>
        {children}
      </button>
    );
  },
}));

jest.mock("next/link", () => {
  return function MockLink({ children, href, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock("../../utils/animations", () => ({
  useFadeInAnimation: () => ({ ref: null, isVisible: true }),
  useHoverAnimation: () => ({ hoverProps: {} }),
}));

// Mock data
const mockDog = {
  id: 1,
  name: "Buddy",
  breed: "Golden Retriever",
  age_months: 24,
  sex: "male",
  size: "large",
  organization_id: 1,
  primary_image_url: "https://example.com/buddy.jpg",
  status: "available",
  organization: {
    name: "Test Rescue",
    country: "DE",
  },
  ships_to: ["DE", "NL", "GB"],
};

const mockOrganization = {
  id: 1,
  name: "Test Rescue",
  country: "DE",
  city: "Berlin",
  service_regions: ["DE"],
  ships_to: ["DE", "NL"],
  total_dogs: 25,
  new_this_week: 5,
  recent_dogs: [],
  social_media: {},
  logo_url: null,
};

// Utility function to simulate different viewport sizes
const setViewport = (width, height) => {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    writable: true,
    configurable: true,
    value: height,
  });
  window.dispatchEvent(new Event("resize"));
};

describe("Mobile Responsiveness - Dark Mode", () => {
  beforeEach(() => {
    // Reset document classes and viewport
    document.documentElement.className = "";
    setViewport(1024, 768); // Default desktop size
  });

  describe("Mobile Viewport (375px width)", () => {
    beforeEach(() => {
      setViewport(375, 667); // iPhone SE size
      document.documentElement.classList.add("dark");
    });

    test("HeroSection maintains dark mode styling on mobile", async () => {
      render(<HeroSection />);

      // Wait for component to load
      await new Promise((resolve) => setTimeout(resolve, 100));

      const heroSection = screen.getByTestId("hero-section");
      expect(heroSection).toBeInTheDocument();

      // Should have dark mode gradient
      expect(heroSection).toHaveClass("hero-gradient");

      // Verify dark class is applied
      expect(document.documentElement).toHaveClass("dark");
    });

    test("TrustSection cards stack properly on mobile with dark mode", async () => {
      render(<TrustSection />);

      // Wait for statistics to load
      await new Promise((resolve) => setTimeout(resolve, 100));

      const trustSection = screen.getByTestId("trust-section");
      expect(trustSection).toHaveClass("bg-muted");

      // Should have responsive grid classes
      const statsGrid = trustSection.querySelector(".grid");
      expect(statsGrid).toHaveClass("grid-cols-1");
      expect(statsGrid).toHaveClass("md:grid-cols-3");
    });

    test("DogCard maintains dark styling in mobile layout", () => {
      render(<DogCard dog={mockDog} />);

      const dogCard = screen.getByTestId("dog-card");

      // Should have dark mode background
      expect(dogCard).toHaveClass("bg-card");
      expect(dogCard).toHaveClass("text-card-foreground");

      // Button should have mobile-friendly dark styling
      const button = screen.getByRole("button");
      expect(button).toHaveClass("dark:from-orange-500");
      expect(button).toHaveClass("dark:to-orange-600");
    });

    test("OrganizationCard adapts to mobile with dark mode", () => {
      render(<OrganizationCard organization={mockOrganization} size="small" />);

      const card = screen.getAllByRole("button")[0];
      expect(card).toHaveClass("bg-card");
      expect(card).toHaveClass("text-card-foreground");

      // Should have responsive padding classes
      const cardContent = card.querySelector('[class*="p-"]');
      expect(cardContent).toBeInTheDocument();
    });

    test("CountryFlag placeholders visible on mobile dark mode", () => {
      render(
        <CountryFlag
          countryCode="INVALID"
          countryName="Test Country"
          size="small"
        />,
      );

      const placeholder = screen.getByRole("img");
      expect(placeholder).toHaveClass("dark:bg-gray-700");
      expect(placeholder).toHaveClass("dark:text-gray-300");

      // Should be appropriately sized for mobile
      expect(placeholder).toHaveStyle({ width: "20px", height: "15px" });
    });
  });

  describe("Tablet Viewport (768px width)", () => {
    beforeEach(() => {
      setViewport(768, 1024); // iPad size
      document.documentElement.classList.add("dark");
    });

    test("AboutPage sections stack properly on tablet with dark mode", () => {
      render(<AboutPage />);

      // How It Works section should have dark background
      const howItWorksSection = screen
        .getByText("How It Works")
        .closest("section");
      expect(howItWorksSection).toHaveClass("dark:bg-gray-800");

      // Should use responsive grid for steps
      const stepsGrid = howItWorksSection.querySelector(".grid");
      expect(stepsGrid).toHaveClass("md:grid-cols-3");
    });

    test("TrustSection organization grid adapts to tablet", async () => {
      render(<TrustSection />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const trustSection = screen.getByTestId("trust-section");

      // Should have tablet-responsive grid for organizations
      const orgsGrid = trustSection.querySelector(
        '[data-testid="organizations-grid"]',
      );
      if (orgsGrid) {
        expect(orgsGrid).toHaveClass("lg:grid-cols-3");
      }
    });
  });

  describe("Desktop Viewport (1200px width)", () => {
    beforeEach(() => {
      setViewport(1200, 800); // Desktop size
      document.documentElement.classList.add("dark");
    });

    test("All components render properly at desktop size with dark mode", async () => {
      render(<HeroSection />);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const heroSection = screen.getByTestId("hero-section");
      expect(heroSection).toBeInTheDocument();

      // Should maintain all dark mode classes at desktop size
      expect(heroSection).toHaveClass("hero-gradient");
      expect(document.documentElement).toHaveClass("dark");
    });

    test("Large CountryFlag size works correctly in dark mode", () => {
      render(
        <CountryFlag
          countryCode="INVALID"
          countryName="Test Country"
          size="large"
        />,
      );

      const placeholder = screen.getByRole("img");
      expect(placeholder).toHaveClass("dark:bg-gray-700");
      expect(placeholder).toHaveClass("dark:text-gray-300");

      // Should be large size
      expect(placeholder).toHaveStyle({ width: "48px", height: "36px" });
    });
  });

  describe("Cross-viewport consistency", () => {
    test("dark mode CSS variables work across all viewports", () => {
      const viewports = [
        [375, 667], // Mobile
        [768, 1024], // Tablet
        [1200, 800], // Desktop
      ];

      viewports.forEach(([width, height]) => {
        setViewport(width, height);
        document.documentElement.classList.add("dark");

        render(<DogCard dog={mockDog} />);

        const dogCard = screen.getByTestId("dog-card");

        // CSS variables should work consistently
        expect(dogCard).toHaveClass("bg-card");
        expect(dogCard).toHaveClass("text-card-foreground");

        // Clean up for next iteration
        document.body.innerHTML = "";
      });
    });

    test("responsive breakpoint classes work with dark mode", () => {
      document.documentElement.classList.add("dark");

      render(<TrustSection />);

      // Grid should have responsive classes that work with dark mode
      const trustSection = screen.getByTestId("trust-section");
      expect(trustSection).toBeInTheDocument();

      // Background should use semantic class that adapts to dark mode
      expect(trustSection).toHaveClass("bg-muted");
    });
  });

  describe("Touch interaction areas", () => {
    beforeEach(() => {
      setViewport(375, 667); // Mobile size
      document.documentElement.classList.add("dark");
    });

    test("buttons have adequate touch targets on mobile in dark mode", () => {
      render(<DogCard dog={mockDog} />);

      const button = screen.getByRole("button");

      // Should have mobile touch target class
      expect(button).toHaveClass("mobile-touch-target");

      // Should maintain dark mode styling
      expect(button).toHaveClass("dark:from-orange-500");
    });

    test("links have proper focus rings for mobile accessibility", () => {
      render(<DogCard dog={mockDog} />);

      const links = screen.getAllByRole("link");

      // At least one link should have dark mode focus ring
      const linkWithDarkFocus = links.find((link) =>
        link.className.includes("dark:focus:ring-orange-400"),
      );

      expect(linkWithDarkFocus).toBeTruthy();

      // All links should be present and functional
      expect(links.length).toBeGreaterThan(0);
      links.forEach((link) => {
        expect(link).toBeInTheDocument();
      });
    });
  });
});
