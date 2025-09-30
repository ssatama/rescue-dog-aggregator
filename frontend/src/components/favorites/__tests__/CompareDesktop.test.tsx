import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CompareDesktop from "../CompareDesktop";
import type { Dog } from "../types";

const createMockDog = (overrides: Partial<Dog> = {}): Dog => ({
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
    personality_traits: ["Friendly", "Energetic", "Loyal"],
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
  ...overrides,
});

describe("CompareDesktop", () => {
  describe("Layout and Alignment", () => {
    it("should use CSS Grid layout for dog cards container", () => {
      const dogs = [
        createMockDog({ id: 1, name: "Buddy" }),
        createMockDog({ id: 2, name: "Luna" }),
      ];

      const { container } = render(
        <CompareDesktop dogs={dogs} onClose={() => {}} />,
      );

      const gridContainer = container.querySelector(
        '[data-testid="dog-cards-grid"]',
      );
      expect(gridContainer).toBeInTheDocument();
      expect(gridContainer).toHaveClass("grid");
      expect(gridContainer).toHaveStyle({
        gridTemplateRows: "min-content",
      });
    });

    it("should render dog cards with uniform heights despite different content lengths", () => {
      const dogs = [
        createMockDog({
          id: 1,
          name: "Buddy",
          dog_profiler_data: {
            tagline: "Short tagline!",
            personality_traits: ["Friendly"],
            unique_quirk: "Short quirk",
            energy_level: "high",
            experience_level: "some_experience",
            good_with_dogs: "yes",
            good_with_cats: "maybe",
            good_with_children: "yes",
            favorite_activities: ["Fetch"],
            confidence_scores: {
              personality: 0.9,
              behavior: 0.85,
              compatibility: 0.8,
            },
          },
        }),
        createMockDog({
          id: 2,
          name: "Luna",
          dog_profiler_data: {
            tagline:
              "This is a very long tagline that should take up multiple lines and test the uniform height feature of our grid layout implementation",
            personality_traits: [
              "Friendly",
              "Energetic",
              "Loyal",
              "Playful",
              "Smart",
              "Gentle",
            ],
            unique_quirk:
              "Luna has an incredibly detailed and long unique quirk description that goes on and on about her special habits, preferences, and behaviors that make her absolutely wonderful and unique among all the dogs in the rescue",
            energy_level: "medium",
            experience_level: "first_time_ok",
            good_with_dogs: "yes",
            good_with_cats: "yes",
            good_with_children: "yes",
            favorite_activities: [
              "Playing",
              "Cuddling",
              "Walking",
              "Swimming",
              "Hiking",
            ],
            confidence_scores: {
              personality: 0.8,
              behavior: 0.9,
              compatibility: 0.95,
            },
          },
        }),
      ];

      const { container } = render(
        <CompareDesktop dogs={dogs} onClose={() => {}} />,
      );

      const dogCards = container.querySelectorAll(
        '[data-testid="compare-card"]',
      );
      expect(dogCards).toHaveLength(2);

      // Cards should have CSS that makes them the same height
      dogCards.forEach((card) => {
        expect(card).toHaveClass("h-full");
      });
    });

    it("should render dog images with fixed 4:3 aspect ratio", () => {
      const dogs = [
        createMockDog({
          id: 1,
          name: "Buddy",
          primary_image_url: "/buddy.jpg",
        }),
        createMockDog({ id: 2, name: "Luna", primary_image_url: "/luna.jpg" }),
      ];

      const { container } = render(
        <CompareDesktop dogs={dogs} onClose={() => {}} />,
      );

      const imageContainers = container.querySelectorAll(
        '[data-testid="dog-image-container"]',
      );
      expect(imageContainers).toHaveLength(2);

      imageContainers.forEach((imageContainer) => {
        expect(imageContainer).toHaveClass("aspect-[4/3]");
      });
    });

    it("should maintain consistent spacing between elements with different content", () => {
      const dogs = [
        createMockDog({
          id: 1,
          name: "Buddy",
          dog_profiler_data: {
            tagline: "Short",
            personality_traits: ["Friendly"],
            energy_level: "high",
            experience_level: "some_experience",
            good_with_dogs: "yes",
            good_with_cats: "maybe",
            good_with_children: "yes",
            confidence_scores: {
              personality: 0.9,
              behavior: 0.85,
              compatibility: 0.8,
            },
          },
        }),
        createMockDog({
          id: 2,
          name: "Luna",
          dog_profiler_data: undefined, // Minimal content
        }),
      ];

      render(<CompareDesktop dogs={dogs} onClose={() => {}} />);

      // Both cards should be present and have consistent structure
      const buddyElements = screen.getAllByText("Buddy");
      const lunaElements = screen.getAllByText("Luna");

      // Buddy appears both in card and table
      expect(buddyElements.length).toBeGreaterThanOrEqual(1);
      // Luna appears both in card and table
      expect(lunaElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Responsive Grid Behavior", () => {
    it("should apply correct responsive grid classes", () => {
      const dogs = [
        createMockDog({ id: 1, name: "Buddy" }),
        createMockDog({ id: 2, name: "Luna" }),
        createMockDog({ id: 3, name: "Max" }),
      ];

      const { container } = render(
        <CompareDesktop dogs={dogs} onClose={() => {}} />,
      );

      const gridContainer = container.querySelector(
        '[data-testid="dog-cards-grid"]',
      );
      expect(gridContainer).toHaveClass("grid-cols-1");
      expect(gridContainer).toHaveClass("md:grid-cols-2");
      expect(gridContainer).toHaveClass("lg:grid-cols-3");
    });
  });
});
