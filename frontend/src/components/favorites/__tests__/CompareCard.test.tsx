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
  main_image: "/test-image.jpg",
  adoption_url: "https://test.com/buddy",
  dog_profiler_data: {
    tagline: "Your new adventure buddy!",
    personality_traits: ["Friendly", "Energetic", "Loyal", "Playful", "Smart"],
    unique_quirk: "Loves to carry his favorite toy everywhere",
    energy_level: "high",
    experience_level: "some_experience_needed",
    good_with_dogs: "yes",
    good_with_cats: "maybe",
    good_with_children: "yes",
    favorite_activities: ["Fetch", "Swimming", "Hiking"],
    special_considerations: [
      "Needs regular exercise",
      "Strong puller on leash",
    ],
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

    it("displays organization name", () => {
      render(<CompareCard dog={mockDog} />);
      expect(screen.getByText("Test Rescue")).toBeInTheDocument();
    });
  });

  describe("LLM Data Display", () => {
    it("displays tagline prominently at top", () => {
      render(<CompareCard dog={mockDog} />);
      const tagline = screen.getByText('"Your new adventure buddy!"');
      expect(tagline).toBeInTheDocument();
      expect(tagline).toHaveClass("text-base", "font-semibold");
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
      expect(screen.getByText("Some Experience Needed")).toBeInTheDocument();
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
      const dogNoImage = { ...mockDog, main_image: undefined };
      render(<CompareCard dog={dogNoImage} />);
      expect(screen.getByTestId("dog-placeholder-icon")).toBeInTheDocument();
    });

    it("applies appropriate styling for card container", () => {
      const { container } = render(<CompareCard dog={mockDog} />);
      const card = container.firstChild;
      expect(card).toHaveClass("rounded-lg", "border", "shadow-sm");
    });
  });
});
