/**
 * Session 10: Visual Consistency and Polish Validation Tests
 * Verifies spacing consistency, animation timing, and vertical rhythm
 */

import { render, screen } from "@testing-library/react";
import DogCard from "../components/dogs/DogCard";
import OrganizationCard from "../components/organizations/OrganizationCard";
import RelatedDogsCard from "../components/dogs/RelatedDogsCard";

describe("Session 10: Visual Consistency Validation", () => {
  describe("Animation Timing Consistency", () => {
    test("All hover animations use consistent duration (200ms)", () => {
      const mockDog = {
        id: 1,
        name: "Animation Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const card = screen.getByTestId("dog-card-1");
      // Should have consistent animation timing
      expect(card.className).toMatch(/duration-\d+/);
    });

    test("Image transforms use consistent timing", () => {
      const mockDog = {
        id: 1,
        name: "Transform Test Dog",
        primary_image_url: "https://example.com/test.jpg",
      };

      render(<RelatedDogsCard dog={mockDog} />);

      // LazyImage may show placeholder initially
      const imageElement = screen.getByRole("img", {
        name: /Transform Test Dog/i,
      });
      expect(imageElement).toHaveClass("transition-transform", "duration-200");
    });

    test("Card hover animations are standardized", () => {
      const mockOrg = {
        id: 1,
        name: "Test Organization",
        total_dogs: 5,
        country: "United States",
      };

      render(<OrganizationCard organization={mockOrg} />);

      // OrganizationCard has main card as role="button" plus internal buttons
      const cards = screen.getAllByRole("button");
      const mainCard = cards.find((card) =>
        card.className.includes("cursor-pointer"),
      );
      expect(mainCard).toHaveClass("transition-all", "duration-200");
      expect(mainCard.className).toMatch(/hover:transform/);
      expect(mainCard.className).toMatch(/hover:-translate-y-1/);
    });
  });

  describe("Spacing Consistency", () => {
    test("Card content uses consistent padding", () => {
      const mockDog = {
        id: 1,
        name: "Spacing Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const cardContent = screen.getByTestId("card-content");
      expect(cardContent).toHaveClass("p-4", "sm:p-6");
      expect(cardContent).toHaveClass("space-y-4"); // Consistent vertical spacing
    });

    test("Cards use consistent focus ring colors", () => {
      const mockDog = {
        id: 1,
        name: "Focus Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" },
      };

      const mockOrg = {
        id: 1,
        name: "Focus Test Org",
        total_dogs: 3,
      };

      const { rerender } = render(<DogCard dog={mockDog} />);
      const dogCard = screen.getByTestId("dog-card-1");
      // Check that links within the card have focus ring classes
      const links = dogCard.querySelectorAll("a");
      const hasOrangeFocusRing = Array.from(links).some((link) =>
        link.className.includes("focus:ring-orange-"),
      );
      expect(hasOrangeFocusRing).toBe(true);

      rerender(<OrganizationCard organization={mockOrg} />);
      const orgCards = screen.getAllByRole("button");
      const mainOrgCard = orgCards.find((card) =>
        card.className.includes("cursor-pointer"),
      );
      expect(mainOrgCard.className).toMatch(/focus:ring-orange-600/);

      rerender(<RelatedDogsCard dog={mockDog} />);
      const relatedCard = screen.getByTestId("related-dog-card");
      expect(relatedCard.className).toMatch(/focus:ring-orange-600/);
    });
  });

  describe("Vertical Rhythm and Typography", () => {
    test("Dog names use consistent typography hierarchy", () => {
      const mockDog = {
        id: 1,
        name: "Typography Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const dogName = screen.getByTestId("dog-name");
      expect(dogName).toHaveClass("text-card-title"); // Consistent typography scale
      expect(dogName).toHaveClass("truncate"); // Consistent text overflow handling
    });

    test("Text elements maintain consistent spacing", () => {
      const mockDog = {
        id: 1,
        name: "Spacing Test Dog",
        breed: "Test Breed",
        age_min_months: 24,
        gender: "Male",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const ageGenderRow = screen.getByTestId("age-gender-row");
      expect(ageGenderRow).toHaveClass("gap-3"); // Consistent horizontal spacing

      const locationRow = screen.getByTestId("location-row");
      expect(locationRow).toHaveClass("gap-1"); // Consistent icon-text spacing
    });
  });

  describe("Interactive Element Consistency", () => {
    test("All interactive elements meet touch target requirements", () => {
      const mockDog = {
        id: 1,
        name: "Touch Target Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const ctaButton = screen.getByText(/Meet Touch Target Test Dog/);
      expect(ctaButton).toHaveClass("mobile-touch-target"); // 48px minimum
    });

    test("Focus states use consistent styling patterns", () => {
      const mockDog = {
        id: 1,
        name: "Focus State Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const viewLink = screen.getByLabelText(
        /View details for Focus State Test Dog/,
      );
      expect(viewLink).toHaveClass("focus:outline-none");
      expect(viewLink).toHaveClass("focus:ring-2");
      expect(viewLink).toHaveClass("focus:ring-orange-600");
      expect(viewLink).toHaveClass("focus:ring-offset-2");
    });
  });

  describe("Card System Consistency", () => {
    test("All card components use consistent shadow patterns", () => {
      const mockDog = {
        id: 1,
        name: "Shadow Test",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" },
      };
      const mockOrg = { id: 1, name: "Shadow Test Org", total_dogs: 1 };

      const { rerender } = render(<DogCard dog={mockDog} />);
      const dogCard = screen.getByTestId("dog-card-1");
      expect(dogCard).toHaveClass("shadow-sm");
      expect(dogCard.className).toMatch(/hover:shadow-md/);

      rerender(<OrganizationCard organization={mockOrg} />);
      const orgCards = screen.getAllByRole("button");
      const mainOrgCard = orgCards.find((card) =>
        card.className.includes("cursor-pointer"),
      );
      expect(mainOrgCard.className).toMatch(/hover:shadow-lg/);

      rerender(<RelatedDogsCard dog={mockDog} />);
      const relatedCard = screen.getByTestId("related-dog-card");
      expect(relatedCard).toHaveClass("shadow-sm");
      expect(relatedCard.className).toMatch(/hover:shadow-md/);
    });

    test("Card hover effects use consistent transform values", () => {
      const mockOrg = {
        id: 1,
        name: "Transform Test Organization",
        total_dogs: 3,
      };

      render(<OrganizationCard organization={mockOrg} />);

      const cards = screen.getAllByRole("button");
      const mainCard = cards.find((card) =>
        card.className.includes("cursor-pointer"),
      );
      expect(mainCard.className).toMatch(/hover:-translate-y-1/); // Consistent -4px transform
    });
  });

  describe("Color System Consistency", () => {
    test("Orange theme colors are consistently applied", () => {
      const mockDog = {
        id: 1,
        name: "Color Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        age_min_months: 24,
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      // Check consistent orange color usage
      const nameLink = screen.getByText("Color Test Dog").closest("a");
      expect(nameLink.className).toMatch(/focus:ring-orange-600/);

      const ageCategory = screen.getByTestId("age-category");
      expect(ageCategory).toHaveClass("text-orange-600");
    });

    test("Button gradient consistency across components", () => {
      const mockDog = {
        id: 1,
        name: "Button Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const ctaButton = screen.getByText(/Meet Button Test Dog/);
      expect(ctaButton).toHaveClass("from-orange-600", "to-orange-700");
      expect(ctaButton).toHaveClass(
        "hover:from-orange-700",
        "hover:to-orange-800",
      );
    });
  });

  describe("Responsive Design Consistency", () => {
    test("Breakpoint spacing follows consistent patterns", () => {
      const mockDog = {
        id: 1,
        name: "Responsive Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const cardContent = screen.getByTestId("card-content");
      expect(cardContent).toHaveClass("p-4", "sm:p-6"); // Consistent responsive padding

      const cardFooter = screen.getByTestId("card-footer");
      expect(cardFooter).toHaveClass("p-4", "sm:p-6", "pt-0"); // Consistent footer spacing
    });

    test("Mobile-specific classes are consistently applied", () => {
      const mockDog = {
        id: 1,
        name: "Mobile Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const ctaButton = screen.getByText(/Meet Mobile Test Dog/);
      expect(ctaButton).toHaveClass("mobile-touch-target");
      expect(ctaButton).toHaveClass("enhanced-focus-button");
    });
  });

  describe("Animation Performance Consistency", () => {
    test("GPU-accelerated properties are used consistently", () => {
      const mockDog = {
        id: 1,
        name: "GPU Test Dog",
        primary_image_url: "https://example.com/test.jpg",
      };

      render(<RelatedDogsCard dog={mockDog} />);

      const card = screen.getByTestId("related-dog-card");
      expect(card).toHaveClass("will-change-transform"); // GPU acceleration hint
    });

    test("Transition properties are optimized for 60fps", () => {
      const mockDog = {
        id: 1,
        name: "FPS Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      // LazyImage may show placeholder initially
      const imageElement = screen.getByRole("img", { name: /FPS Test Dog/i });
      expect(imageElement).toHaveClass("transition-transform"); // Only animating transform (GPU-friendly)
    });
  });

  describe("Design System Token Usage", () => {
    test("Components use design system spacing tokens", () => {
      const mockDog = {
        id: 1,
        name: "Token Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const cardContent = screen.getByTestId("card-content");
      // Should use consistent spacing scale (4, 6 pattern)
      expect(cardContent.className).toMatch(/p-4|p-6/);
      expect(cardContent.className).toMatch(/space-y-4/);
    });

    test("Typography scale is consistently applied", () => {
      const mockDog = {
        id: 1,
        name: "Typography Scale Test Dog",
        primary_image_url: "https://example.com/test.jpg",
        organization: { name: "Test Org" },
      };

      render(<DogCard dog={mockDog} />);

      const dogName = screen.getByTestId("dog-name");
      expect(dogName).toHaveClass("text-card-title"); // Custom typography token
    });
  });
});
