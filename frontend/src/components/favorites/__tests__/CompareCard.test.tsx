import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CompareCard from "../CompareCard";
import type { Dog } from "../types";

const mockDog: Dog = {
  id: 1,
  name: "Buddy",
  breed: "Labrador Retriever",
  standardized_breed: "Labrador Retriever",
  age_min_months: 24,
  age_max_months: 36,
  age_text: "2-3 years",
  sex: "Male",
  standardized_size: "Large",
  organization_name: "Test Rescue",
  primary_image_url: "/test-image.jpg",
  adoption_url: "https://test.com/buddy",
  dog_profiler_data: {
    tagline: "Your new adventure buddy!",
    personality_traits: ["Friendly", "Energetic", "Loyal", "Playful", "Smart"],
    unique_quirk: "Loves to carry his favorite toy everywhere",
    energy_level: "high",
    experience_level: "some_experience",
    good_with_dogs: "yes",
    good_with_cats: "maybe",
    good_with_children: "yes",
    favorite_activities: ["Fetch", "Swimming", "Hiking"],
    confidence_scores: {
      personality: 0.9,
      behavior: 0.85,
      compatibility: 0.8,
    },
  },
};

const mockDogMinimal: Dog = {
  id: 2,
  name: "Luna",
  sex: "Female",
  organization_name: "Another Rescue",
};

describe("CompareCard", () => {
  describe("Basic Rendering", () => {
    it("renders dog name prominently", () => {
      render(<CompareCard dog={mockDog} />);
      expect(screen.getByText("Buddy")).toBeInTheDocument();
    });

    it("renders with minimal data gracefully", () => {
      render(<CompareCard dog={mockDogMinimal} />);
      expect(screen.getByText("Luna")).toBeInTheDocument();
      expect(screen.getByText(/Mixed breed/)).toBeInTheDocument();
      expect(screen.getByText(/Unknown age/)).toBeInTheDocument();
    });

    it("does not display organization name redundantly", () => {
      render(<CompareCard dog={mockDog} />);
      // Organization name should not appear in the footer anymore
      expect(screen.queryByText("Test Rescue")).not.toBeInTheDocument();
    });
  });

  describe("LLM Data Display", () => {
    it("displays tagline prominently in header section", () => {
      render(<CompareCard dog={mockDog} />);
      const tagline = screen.getByText(/Your new adventure buddy!/);
      expect(tagline).toBeInTheDocument();
      expect(tagline).toHaveClass("text-sm", "font-medium", "text-orange-600");
    });

    it("shows personality traits as badges", () => {
      render(<CompareCard dog={mockDog} />);
      expect(screen.getByText("Friendly")).toBeInTheDocument();
      expect(screen.getByText("Energetic")).toBeInTheDocument();
      expect(screen.getByText("Loyal")).toBeInTheDocument();
    });

    it("displays unique quirk in special section", () => {
      render(<CompareCard dog={mockDog} />);
      expect(
        screen.getByText("Loves to carry his favorite toy everywhere"),
      ).toBeInTheDocument();
      expect(screen.getByText("What makes Buddy special")).toBeInTheDocument();
    });

    it("shows energy level with visual indicator", () => {
      render(<CompareCard dog={mockDog} />);
      expect(screen.getByText("High Energy")).toBeInTheDocument();
      expect(screen.getByTestId("energy-icon-high")).toBeInTheDocument();
    });

    it("displays experience level requirement", () => {
      render(<CompareCard dog={mockDog} />);
      expect(screen.getByText("Some Experience")).toBeInTheDocument();
    });
  });

  describe("Compatibility Scores", () => {
    it("shows visual compatibility with dogs", () => {
      render(<CompareCard dog={mockDog} />);
      const dogsCompat = screen.getByTestId("compat-dogs");
      expect(dogsCompat).toHaveTextContent("Dogs");
      expect(screen.getByTestId("compat-dogs-score")).toHaveAttribute(
        "data-score",
        "5",
      );
    });

    it("shows visual compatibility with cats", () => {
      render(<CompareCard dog={mockDog} />);
      const catsCompat = screen.getByTestId("compat-cats");
      expect(catsCompat).toHaveTextContent("Cats");
      expect(screen.getByTestId("compat-cats-score")).toHaveAttribute(
        "data-score",
        "3",
      );
    });

    it("shows visual compatibility with children", () => {
      render(<CompareCard dog={mockDog} />);
      const kidsCompat = screen.getByTestId("compat-children");
      expect(kidsCompat).toHaveTextContent("Kids");
      expect(screen.getByTestId("compat-children-score")).toHaveAttribute(
        "data-score",
        "5",
      );
    });

    it("handles unknown compatibility gracefully", () => {
      const dogUnknown = {
        ...mockDog,
        dog_profiler_data: {
          ...mockDog.dog_profiler_data,
          good_with_dogs: "unknown",
        },
      };
      render(<CompareCard dog={dogUnknown} />);
      expect(screen.getByTestId("compat-dogs-score")).toHaveAttribute(
        "data-score",
        "0",
      );
    });
  });

  describe("Perfect For Section", () => {
    it("shows lifestyle matches based on energy level", () => {
      render(<CompareCard dog={mockDog} />);
      expect(screen.getByText("Perfect for:")).toBeInTheDocument();
      expect(screen.getByText("Active families")).toBeInTheDocument();
    });

    it("shows apartment suitability for low energy dogs", () => {
      const lowEnergyDog = {
        ...mockDog,
        standardized_size: "Small",
        dog_profiler_data: {
          ...mockDog.dog_profiler_data!,
          energy_level: "low",
        },
      };
      render(<CompareCard dog={lowEnergyDog} />);
      expect(screen.getByText("Apartment living")).toBeInTheDocument();
    });
  });

  describe("Call to Action", () => {
    it("displays adoption link when available", () => {
      render(<CompareCard dog={mockDog} />);
      const link = screen.getByRole("link", { name: /Visit Buddy/i });
      expect(link).toHaveAttribute("href", "https://test.com/buddy");
      expect(link).toHaveAttribute("target", "_blank");
    });

    it("handles missing adoption URL gracefully", () => {
      const dogNoUrl = { ...mockDog, adoption_url: undefined };
      render(<CompareCard dog={dogNoUrl} />);
      expect(
        screen.queryByRole("link", { name: /Visit/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Visual Design", () => {
    it("displays dog image when available", () => {
      render(<CompareCard dog={mockDog} />);
      const image = screen.getByAltText("Buddy");
      expect(image).toBeInTheDocument();
    });

    it("shows placeholder when no image available", () => {
      const dogNoImage = { ...mockDog, primary_image_url: undefined };
      render(<CompareCard dog={dogNoImage} />);
      expect(screen.getByTestId("dog-placeholder-icon")).toBeInTheDocument();
    });

    it("applies appropriate styling for card container", () => {
      const { container } = render(<CompareCard dog={mockDog} />);
      const card = container.firstChild;
      expect(card).toHaveClass("rounded-lg", "border", "shadow-sm");
    });
  });

  describe("Card Layout Consistency", () => {
    it("renders tagline inline in header when present", () => {
      render(<CompareCard dog={mockDog} />);
      const tagline = screen.getByText(/Your new adventure buddy!/);
      expect(tagline).toBeInTheDocument();
      // Should be within the header section
      expect(screen.getByTestId("dog-header")).toContainElement(tagline);
    });

    it("always renders personality traits section even when empty", () => {
      const dogNoTraits = {
        ...mockDog,
        dog_profiler_data: {
          ...mockDog.dog_profiler_data!,
          personality_traits: [],
        },
      };
      render(<CompareCard dog={dogNoTraits} />);
      expect(screen.getByTestId("personality-section")).toBeInTheDocument();
    });

    it("always renders energy section even when data missing", () => {
      const dogNoEnergy = {
        ...mockDog,
        dog_profiler_data: {
          ...mockDog.dog_profiler_data!,
          energy_level: undefined,
          experience_level: undefined,
        },
      };
      render(<CompareCard dog={dogNoEnergy} />);
      expect(screen.getByTestId("energy-section")).toBeInTheDocument();
    });

    it("always renders perfect-for section even when empty", () => {
      const dogNoMatches = {
        ...mockDog,
        standardized_size: undefined,
        dog_profiler_data: {
          ...mockDog.dog_profiler_data!,
          energy_level: undefined,
          good_with_children: undefined,
          experience_level: undefined,
        },
      };
      render(<CompareCard dog={dogNoMatches} />);
      expect(screen.getByTestId("perfect-for-section")).toBeInTheDocument();
    });

    it("always renders unique quirk section even when empty", () => {
      const dogNoQuirk = {
        ...mockDog,
        dog_profiler_data: {
          ...mockDog.dog_profiler_data!,
          unique_quirk: undefined,
        },
      };
      render(<CompareCard dog={dogNoQuirk} />);
      expect(screen.getByTestId("unique-quirk-section")).toBeInTheDocument();
    });

    it("renders all sections with consistent structure for alignment", () => {
      const { container } = render(<CompareCard dog={mockDogMinimal} />);

      // All cards should have the same structural sections
      expect(screen.getByTestId("dog-header")).toBeInTheDocument();
      expect(screen.getByTestId("personality-section")).toBeInTheDocument();
      expect(screen.getByTestId("energy-section")).toBeInTheDocument();
      expect(screen.getByTestId("compatibility-section")).toBeInTheDocument();
      expect(screen.getByTestId("perfect-for-section")).toBeInTheDocument();
      expect(screen.getByTestId("unique-quirk-section")).toBeInTheDocument();
      expect(screen.getByTestId("footer-section")).toBeInTheDocument();
    });
  });
});