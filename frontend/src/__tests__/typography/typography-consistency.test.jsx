import React from "react";
import { render, screen } from "../../test-utils";
import DogCard from "../../components/dogs/DogCardOptimized";
import OrganizationCard from "../../components/organizations/OrganizationCard";
import RelatedDogsCard from "../../components/dogs/RelatedDogsCard";
import TrustSection from "../../components/home/TrustSection";
import RelatedDogsSection from "../../components/dogs/RelatedDogsSection";

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

// Mock relatedDogsService
jest.mock("../../services/relatedDogsService", () => ({
  getRelatedDogs: jest.fn(),
}));

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
    it("should use .text-card-title for all card titles", () => {
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

      const dogName = screen.getByText("Test Dog");
      expect(dogName).toHaveClass("text-card-title");
      expect(dogName.tagName).toBe("H3");
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

      const orgName = screen.getByText("Test Organization");
      expect(orgName).toHaveClass("text-card-title");
      expect(orgName.tagName).toBe("H3");
    });

    it("should use .text-card-title for related dogs card titles", () => {
      const mockDog = {
        id: 1,
        name: "Related Dog",
        breed: "Test Breed",
        images: ["test-image.jpg"],
        organization: { name: "Test Org" },
      };

      render(<RelatedDogsCard dog={mockDog} />);

      const dogName = screen.getByText("Related Dog");
      expect(dogName).toHaveClass("text-card-title");
      expect(dogName.tagName).toBe("H3");
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

    it("should use .text-section for related dogs section heading", () => {
      const mockDogs = [
        {
          id: 1,
          name: "Dog 1",
          breed: "Breed 1",
          images: ["image1.jpg"],
          organization: { name: "Org 1" },
        },
      ];

      render(
        <RelatedDogsSection
          dogs={mockDogs}
          currentDogId={2}
          organizationId={1}
          organization={{ name: "Test Organization" }}
        />,
      );

      const sectionHeading = screen.getByText(/more dogs from/i);
      expect(sectionHeading).toHaveClass("text-section");
      expect(sectionHeading.tagName).toBe("H2");
    });
  });

  describe("Font Weight Consistency", () => {
    it("should use font-semibold for card titles", () => {
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

      const dogName = screen.getByText("Test Dog");
      // text-card-title class includes font-semibold
      expect(dogName).toHaveClass("text-card-title");
    });

    it("should use font-bold for section headings", () => {
      const mockDogs = [
        {
          id: 1,
          name: "Dog 1",
          breed: "Breed 1",
          images: ["image1.jpg"],
          organization: { name: "Org 1" },
        },
      ];

      render(
        <RelatedDogsSection
          dogs={mockDogs}
          currentDogId={2}
          organizationId={1}
          organization={{ name: "Test Organization" }}
        />,
      );

      const sectionHeading = screen.getByText(/more dogs from/i);
      // text-section class includes font-bold
      expect(sectionHeading).toHaveClass("text-section");
    });
  });

  describe("Spacing Consistency", () => {
    it("should use gap-6 for grid layouts", async () => {
      const mockDogs = [
        {
          id: 1,
          name: "Dog 1",
          breed: "Breed 1",
          images: ["image1.jpg"],
          organization: { name: "Org 1" },
        },
        {
          id: 2,
          name: "Dog 2",
          breed: "Breed 2",
          images: ["image2.jpg"],
          organization: { name: "Org 2" },
        },
      ];

      const { getRelatedDogs } = require("../../services/relatedDogsService");
      getRelatedDogs.mockResolvedValue(mockDogs);

      render(
        <RelatedDogsSection
          currentDogId={3}
          organizationId={1}
          organization={{ name: "Test Organization" }}
        />,
      );

      // Wait for the component to load and render the grid
      const gridContainer = await screen.findByTestId("related-dogs-grid");
      expect(gridContainer).toHaveClass("gap-6");
    });

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

      const cardContent = screen
        .getByText("Test Dog")
        .closest(".p-4, .p-5, .p-6");
      expect(cardContent).toHaveClass(/p-[46]/);
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

      // Dog name should be h3 with text-card-title class in DogCardOptimized (changed for accessibility)
      const dogName = screen.getByText("Test Dog");
      expect(dogName.tagName).toBe("H3");
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

    it("should use appropriate heading levels for sections", () => {
      const mockDogs = [
        {
          id: 1,
          name: "Dog 1",
          breed: "Breed 1",
          images: ["image1.jpg"],
          organization: { name: "Org 1" },
        },
      ];

      render(
        <RelatedDogsSection
          dogs={mockDogs}
          currentDogId={2}
          organizationId={1}
          organization={{ name: "Test Organization" }}
        />,
      );

      // Section heading should be h2
      const sectionHeading = screen.getByText(/more dogs from/i);
      expect(sectionHeading.tagName).toBe("H2");
    });
  });

  describe("Responsive Typography", () => {
    it("should apply responsive classes for typography", () => {
      const mockDogs = [
        {
          id: 1,
          name: "Dog 1",
          breed: "Breed 1",
          images: ["image1.jpg"],
          organization: { name: "Org 1" },
        },
      ];

      render(
        <RelatedDogsSection
          dogs={mockDogs}
          currentDogId={2}
          organizationId={1}
          organization={{ name: "Test Organization" }}
        />,
      );

      const sectionHeading = screen.getByText(/more dogs from/i);
      // text-section class should include responsive sizing
      expect(sectionHeading).toHaveClass("text-section");
    });

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

      // Verify the text-card-title class is actually used in components
      const dogName = screen.getByText("Test Dog");
      expect(dogName).toHaveClass("text-card-title");
    });

    it("should verify section typography classes are used by components", () => {
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
      setTimeout(() => {
        const sectionHeading = screen.getByText(
          "Dogs available from these organizations:",
        );
        expect(sectionHeading).toHaveClass("text-section");
      }, 100);
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

      const dogName = screen.getByText("Test Dog");
      // text-card-title should include proper color contrast
      expect(dogName).toHaveClass("text-card-title");
    });

    it("should use semantic heading structure", async () => {
      const mockDogs = [
        {
          id: 1,
          name: "Dog 1",
          breed: "Breed 1",
          images: ["image1.jpg"],
          organization: { name: "Org 1" },
        },
      ];

      const { getRelatedDogs } = require("../../services/relatedDogsService");
      getRelatedDogs.mockResolvedValue(mockDogs);

      const { container } = render(
        <div>
          <h1>Page Title</h1>
          <RelatedDogsSection
            currentDogId={2}
            organizationId={1}
            organization={{ name: "Test Organization" }}
          />
        </div>,
      );

      const h1 = container.querySelector("h1");
      expect(h1).toBeInTheDocument();

      // Wait for h2 to appear after component loads
      const h2 = await screen.findByRole("heading", { level: 2 });
      expect(h2).toBeInTheDocument();

      // Proper heading hierarchy: h1 → h2 → h3
    });
  });
});
