// TDD Red Phase: Failing tests for RelatedDogsCard component
import React from "react";
import { render, screen, fireEvent } from "../../../test-utils";
import { useRouter } from "next/navigation";
import RelatedDogsCard from "../RelatedDogsCard";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock image error handling
jest.mock("../../../utils/imageUtils", () => ({
  getThumbnailImage: jest.fn((url) => url),
  handleImageError: jest.fn(),
}));

describe("RelatedDogsCard", () => {
  const mockPush = jest.fn();
  const mockDog = {
    id: 123,
    slug: "luna-mixed-breed-123",
    name: "Luna",
    breed: "Mixed Breed",
    age_text: "2 years",
    primary_image_url: "https://example.com/luna.jpg",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({
      push: mockPush,
    });
  });

  describe("Rendering", () => {
    it("should render dog card with all required elements", () => {
      // Act
      render(<RelatedDogsCard dog={mockDog} />);

      // Assert
      expect(screen.getByText("Luna")).toBeInTheDocument();
      expect(screen.getByText("Mixed Breed")).toBeInTheDocument();
      expect(screen.getByText("2 years")).toBeInTheDocument();

      // LazyImage may show placeholder initially, so check for either image or placeholder
      const imageContainer = screen.getByTestId("related-dog-image-container");
      expect(imageContainer).toBeInTheDocument();
    });

    it("should have proper dark mode styling classes", () => {
      // Act
      render(<RelatedDogsCard dog={mockDog} />);

      // Assert
      const card = screen.getByTestId("related-dog-card");
      expect(card).toHaveClass("bg-card"); // Theme-aware background

      const dogName = screen.getByTestId("related-dog-name");
      expect(dogName).toHaveClass("dark:text-gray-100");

      // Check breed and age text have dark mode variants
      const breedText = screen.getByText("Mixed Breed");
      expect(breedText).toHaveClass("dark:text-gray-400");

      const ageText = screen.getByText("2 years");
      expect(ageText).toHaveClass("dark:text-gray-400");
    });

    it("should render with 4:3 aspect ratio image container", () => {
      // Act
      render(<RelatedDogsCard dog={mockDog} />);

      // Assert
      const imageContainer = screen.getByTestId("related-dog-image-container");
      expect(imageContainer).toHaveClass("aspect-[4/3]");
    });

    it("should handle missing breed gracefully", () => {
      // Arrange
      const dogWithoutBreed = { ...mockDog, breed: null };

      // Act
      render(<RelatedDogsCard dog={dogWithoutBreed} />);

      // Assert
      expect(screen.getByText("Luna")).toBeInTheDocument();
      expect(screen.getByText("2 years")).toBeInTheDocument();
      // Should not crash when breed is null
    });

    it("should handle missing age gracefully", () => {
      // Arrange
      const dogWithoutAge = { ...mockDog, age_text: null };

      // Act
      render(<RelatedDogsCard dog={dogWithoutAge} />);

      // Assert
      expect(screen.getByText("Luna")).toBeInTheDocument();
      expect(screen.getByText("Mixed Breed")).toBeInTheDocument();
      // Should not crash when age is null
    });

    it("should handle missing image gracefully", () => {
      // Arrange
      const dogWithoutImage = { ...mockDog, primary_image_url: null };

      // Act
      render(<RelatedDogsCard dog={dogWithoutImage} />);

      // Assert
      expect(screen.getByText("Luna")).toBeInTheDocument();
      // Should render a placeholder or handle missing image gracefully
    });
  });

  describe("Interactions", () => {
    it("should navigate to dog detail page when clicked", () => {
      // Act
      render(<RelatedDogsCard dog={mockDog} />);
      const card = screen.getByTestId("related-dog-card");
      fireEvent.click(card);

      // Assert
      expect(mockPush).toHaveBeenCalledWith("/dogs/luna-mixed-breed-123");
    });

    it("should apply hover effects on card", () => {
      // Act
      render(<RelatedDogsCard dog={mockDog} />);
      const card = screen.getByTestId("related-dog-card");

      // Assert
      expect(card).toHaveClass("hover:shadow-md");
      expect(card).toHaveClass("transition-all");
    });

    it("should apply hover effects on dog name", () => {
      // Act
      render(<RelatedDogsCard dog={mockDog} />);
      const dogName = screen.getByTestId("related-dog-name");

      // Assert
      expect(dogName).toHaveClass("hover:text-orange-600");
    });

    it("should be keyboard accessible", () => {
      // Act
      render(<RelatedDogsCard dog={mockDog} />);
      const card = screen.getByTestId("related-dog-card");

      // Assert
      expect(card).toHaveAttribute("tabIndex", "0");
      expect(card).toHaveAttribute("role", "button");
    });

    it("should handle keyboard navigation (Enter key)", () => {
      // Act
      render(<RelatedDogsCard dog={mockDog} />);
      const card = screen.getByTestId("related-dog-card");
      fireEvent.keyDown(card, { key: "Enter", code: "Enter" });

      // Assert
      expect(mockPush).toHaveBeenCalledWith("/dogs/luna-mixed-breed-123");
    });

    it("should handle keyboard navigation (Space key)", () => {
      // Act
      render(<RelatedDogsCard dog={mockDog} />);
      const card = screen.getByTestId("related-dog-card");
      fireEvent.keyDown(card, { key: " ", code: "Space" });

      // Assert
      expect(mockPush).toHaveBeenCalledWith("/dogs/luna-mixed-breed-123");
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes", () => {
      // Act
      render(<RelatedDogsCard dog={mockDog} />);
      const card = screen.getByTestId("related-dog-card");

      // Assert
      expect(card).toHaveAttribute("aria-label", "View details for Luna");
    });

    it("should have semantic HTML structure", () => {
      // Act
      render(<RelatedDogsCard dog={mockDog} />);

      // Assert
      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveTextContent("Luna");

      // Check for image container since LazyImage may show placeholder
      const imageContainer = screen.getByTestId("related-dog-image-container");
      expect(imageContainer).toBeInTheDocument();
    });
  });
});
