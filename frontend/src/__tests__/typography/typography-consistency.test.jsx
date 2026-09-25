import React from "react";
import { render, screen, waitFor } from "../../test-utils";
import DogCard from "../../components/dogs/DogCard";
import OrganizationCard from "../../components/organizations/OrganizationCard";
import TrustSection from "../../components/home/TrustSection";

// Mock Next.js components
jest.mock("next/link", () => {
  return function MockLink({ children, href, className, prefetch, ...props }) {
    // Handle prefetch prop properly to avoid React warnings
    const linkProps = {
      href,
      className,
      ...props,
    };

    // Only add prefetch if it's a string value
    if (typeof prefetch === "string") {
      linkProps.prefetch = prefetch;
    }

    return <a {...linkProps}>{children}</a>;
  };
});

jest.mock("next/image", () => {
  return function MockImage({ src, alt, className, ...props }) {
    return <img src={src} alt={alt} className={className} {...props} />;
  };
});

// Mock API calls
global.fetch = jest.fn();

// Mock useScrollAnimation hook for lazy loading
jest.mock("../../hooks/useScrollAnimation", () => ({
  useScrollAnimation: jest.fn(() => [jest.fn(), true]), // Always visible for tests
}));

describe("Typography Consistency Tests", () => {
  beforeEach(() => {
    fetch.mockClear();
    jest.clearAllMocks();
  });

  describe("Typography Class Usage", () => {
    it("dog card titles use the display face", () => {
      const mockDog = {
        id: 1,
        name: "Test Dog",
        breed: "Test Breed",
        age: "2 years",
        gender: "Male",
        images: ["test-image.jpg"],
        organization: { name: "Test Org" },
        location: { city: "Test City", country: "Test Country" },
      };

      render(<DogCard dog={mockDog} />);

      // Dog names use the display face (docs/technical/design-system.md)
      const dogName = screen.getByRole("heading", { level: 3, name: "Test Dog" });
      expect(dogName).toHaveClass("font-display");
    });

    it("should use .text-card-title for organization card titles", () => {
      const mockOrg = {
        id: 1,
        name: "Test Organization",
        country: "Test Country",
        total_dogs: 5,
        logo_url: "test-logo.jpg",
      };

      render(<OrganizationCard organization={mockOrg} size="medium" />);

      const orgName = screen.getByTestId("org-name");
      expect(orgName).toHaveClass("text-card-title");
      expect(orgName.tagName).toBe("H3");
    });

    it("should use .text-section for section headings", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_dogs: 100,
          total_organizations: 10,
          countries_served: 5,
        }),
      });

      render(<TrustSection />);

      // Wait for the component to render with fetched data
      const sectionHeading = await screen.findByText(
        /dogs available from these organizations:/i,
      );
      expect(sectionHeading).toHaveClass("text-section");
      expect(sectionHeading.tagName).toBe("H2");
    });

  });

  describe("Font Weight Consistency", () => {
    it("dog card titles are bold", () => {
      const mockDog = {
        id: 1,
        name: "Test Dog",
        breed: "Test Breed",
        age: "2 years",
        gender: "Male",
        images: ["test-image.jpg"],
        organization: { name: "Test Org" },
        location: { city: "Test City", country: "Test Country" },
      };

      render(<DogCard dog={mockDog} />);

      const dogName = screen.getByRole("heading", { level: 3, name: "Test Dog" });
      expect(dogName).toHaveClass("font-bold");
    });

  });

  describe("Spacing Consistency", () => {

    it("should use standardized card padding", () => {
      const mockDog = {
        id: 1,
        name: "Test Dog",
        breed: "Test Breed",
        age: "2 years",
        gender: "Male",
        images: ["test-image.jpg"],
        organization: { name: "Test Org" },
        location: { city: "Test City", country: "Test Country" },
      };

      render(<DogCard dog={mockDog} />);

      const cardContent = screen.getByText("Test Dog").closest(".px-3");
      expect(cardContent).toHaveClass("px-3", "pb-3");
    });

    it("should use consistent section spacing", () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_dogs: 100,
          total_organizations: 10,
          countries_served: 5,
        }),
      });

      render(<TrustSection />);

      const section = screen.getByTestId("trust-section");
      expect(section).toHaveClass(/py-12|py-16|py-20/);
    });
  });

  describe("Typography Hierarchy", () => {
    it("should maintain proper heading hierarchy in components", () => {
      const mockDog = {
        id: 1,
        name: "Test Dog",
        breed: "Test Breed",
        age: "2 years",
        gender: "Male",
        images: ["test-image.jpg"],
        organization: { name: "Test Org" },
        location: { city: "Test City", country: "Test Country" },
      };

      render(<DogCard dog={mockDog} />);

      // Dog name is an h3 inside the card
      expect(screen.getByRole("heading", { level: 3, name: "Test Dog" })).toBeInTheDocument();
    });

    it("should not have h1 elements in card components", () => {
      const mockOrg = {
        id: 1,
        name: "Test Organization",
        country: "Test Country",
        total_dogs: 5,
        logo_url: "test-logo.jpg",
      };

      const { container } = render(
        <OrganizationCard organization={mockOrg} size="medium" />,
      );

      const h1Elements = container.querySelectorAll("h1");
      expect(h1Elements).toHaveLength(0);
    });

  });

  describe("Responsive Typography", () => {

    it("should apply responsive padding for cards", () => {
      const mockOrg = {
        id: 1,
        name: "Test Organization",
        country: "Test Country",
        total_dogs: 5,
        logo_url: "test-logo.jpg",
      };

      render(<OrganizationCard organization={mockOrg} size="large" />);

      const card = screen
        .getByText("Test Organization")
        .closest('[class*="p-"]');
      // Should have responsive padding
      expect(card).toHaveClass(/p-\d+|sm:p-\d+/);
    });
  });

  describe("CSS Custom Properties Usage", () => {
    it("should verify custom typography classes are used by components", () => {
      const mockDog = {
        id: 1,
        name: "Test Dog",
        breed: "Test Breed",
        age: "2 years",
        gender: "Male",
        images: ["test-image.jpg"],
        organization: { name: "Test Org" },
        location: { city: "Test City", country: "Test Country" },
      };

      render(<DogCard dog={mockDog} />);

      // The card uses the design system's type tokens
      const dogName = screen.getByRole("heading", { level: 3, name: "Test Dog" });
      expect(dogName).toHaveClass("font-display", "text-ink");
    });

    it("should verify section typography classes are used by components", async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_dogs: 100,
          total_organizations: 10,
          countries_served: 5,
        }),
      });

      render(<TrustSection />);

      // Wait for the component to render with fetched data
      await waitFor(() => {
        const sectionHeading = screen.getByText(
          "Dogs available from these organizations:",
        );
        expect(sectionHeading).toHaveClass("text-section");
      });
    });
  });

  describe("Accessibility Typography", () => {
    it("should maintain proper color contrast in typography", () => {
      const mockDog = {
        id: 1,
        name: "Test Dog",
        breed: "Test Breed",
        age: "2 years",
        gender: "Male",
        images: ["test-image.jpg"],
        organization: { name: "Test Org" },
        location: { city: "Test City", country: "Test Country" },
      };

      render(<DogCard dog={mockDog} />);

      // Names use the ink token, the highest-contrast text colour
      expect(screen.getByRole("heading", { level: 3, name: "Test Dog" })).toHaveClass("text-ink");
    });

  });
});
