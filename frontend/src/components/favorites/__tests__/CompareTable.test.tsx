import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CompareTable from "../CompareTable";
import type { Dog } from "../types";

// Mock dogs with different data completeness levels
const completeProfileDog: Dog = {
  id: 1,
  name: "Buddy",
  breed: "Labrador Retriever",
  standardized_breed: "Labrador Retriever",
  age_text: "2-3 years",
  sex: "Male",
  standardized_size: "Large",
  organization_name: "Complete Rescue",
  main_image: "/test-image.jpg",
  dog_profiler_data: {
    tagline: "Your adventure buddy!",
    energy_level: "high",
    experience_level: "some_experience",
    good_with_dogs: "yes",
    good_with_cats: "maybe",
    good_with_children: "yes",
  },
};

const partialProfileDog: Dog = {
  id: 2,
  name: "Luna",
  breed: "Golden Retriever",
  age_text: "1-2 years",
  sex: "Female",
  standardized_size: "Large",
  organization_name: "Partial Rescue",
  dog_profiler_data: {
    tagline: "Sweet Luna!",
    energy_level: "medium",
    // Missing experience_level, compatibilities
  },
};

const minimalDog: Dog = {
  id: 3,
  name: "Max",
  breed: "Mixed",
  age_text: "3 years",
  sex: "Male",
  standardized_size: "Medium",
  organization_name: "Minimal Rescue",
  // No dog_profiler_data
};

const mockComparisonData = {
  age: {
    values: ["2-3 years", "1-2 years", "3 years"],
    allSame: false,
    highlight: [false, false, false],
  },
  size: {
    values: ["Large", "Large", "Medium"],
    allSame: false,
  },
  organization: {
    values: ["Complete Rescue", "Partial Rescue", "Minimal Rescue"],
    allSame: false,
  },
  location: {
    values: ["Location A", "Location B", "Location C"],
    allSame: false,
  },
};

describe("CompareTable", () => {
  describe("Row Visibility Logic", () => {
    it("shows tagline row only when ALL dogs have taglines", () => {
      const dogsWithTaglines = [
        { ...completeProfileDog },
        { ...partialProfileDog },
      ];
      
      render(
        <CompareTable dogs={dogsWithTaglines} comparisonData={mockComparisonData} />
      );
      
      expect(screen.getByText("Tagline")).toBeInTheDocument();
      expect(screen.getByText((content, element) => 
        content.includes("Your adventure buddy!")
      )).toBeInTheDocument();
      expect(screen.getByText((content, element) => 
        content.includes("Sweet Luna!")
      )).toBeInTheDocument();
    });

    it("hides tagline row when ANY dog lacks tagline", () => {
      const dogsWithMissingTagline = [
        completeProfileDog,
        partialProfileDog,
        minimalDog, // No dog_profiler_data
      ];
      
      render(
        <CompareTable dogs={dogsWithMissingTagline} comparisonData={mockComparisonData} />
      );
      
      expect(screen.queryByText("Tagline")).not.toBeInTheDocument();
    });

    it("shows energy level row only when ALL dogs have energy level data", () => {
      const dogsWithEnergyLevel = [
        { ...completeProfileDog },
        { ...partialProfileDog },
      ];
      
      render(
        <CompareTable dogs={dogsWithEnergyLevel} comparisonData={mockComparisonData} />
      );
      
      expect(screen.getByText("Energy Level")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
      expect(screen.getByText("Moderate")).toBeInTheDocument();
    });

    it("hides energy level row when ANY dog lacks energy level data", () => {
      const dogsWithMissingEnergyLevel = [
        completeProfileDog,
        minimalDog, // No dog_profiler_data
      ];
      
      render(
        <CompareTable dogs={dogsWithMissingEnergyLevel} comparisonData={mockComparisonData} />
      );
      
      expect(screen.queryByText("Energy Level")).not.toBeInTheDocument();
    });

    it("shows experience level row only when ALL dogs have experience level data", () => {
      const dogsWithExperience = [
        { ...completeProfileDog },
        {
          ...partialProfileDog,
          dog_profiler_data: {
            ...partialProfileDog.dog_profiler_data!,
            experience_level: "first_time_owner",
          },
        },
      ];
      
      render(
        <CompareTable dogs={dogsWithExperience} comparisonData={mockComparisonData} />
      );
      
      expect(screen.getByText("Experience Needed")).toBeInTheDocument();
      expect(screen.getByText("Some Exp")).toBeInTheDocument();
      expect(screen.getByText("First Timer")).toBeInTheDocument();
    });

    it("hides experience level row when ANY dog lacks experience level data", () => {
      const dogsWithMissingExperience = [
        completeProfileDog,
        partialProfileDog, // Has dog_profiler_data but no experience_level
      ];
      
      render(
        <CompareTable dogs={dogsWithMissingExperience} comparisonData={mockComparisonData} />
      );
      
      expect(screen.queryByText("Experience Needed")).not.toBeInTheDocument();
    });

    it("shows compatibility rows only when ALL dogs have compatibility data", () => {
      const dogsWithCompleteCompatibility = [
        { ...completeProfileDog },
        {
          ...partialProfileDog,
          dog_profiler_data: {
            ...partialProfileDog.dog_profiler_data!,
            good_with_dogs: "yes",
            good_with_cats: "no",
            good_with_children: "maybe",
          },
        },
      ];
      
      render(
        <CompareTable dogs={dogsWithCompleteCompatibility} comparisonData={mockComparisonData} />
      );
      
      expect(screen.getByText("Good with Dogs")).toBeInTheDocument();
      expect(screen.getByText("Good with Cats")).toBeInTheDocument();
      expect(screen.getByText("Good with Children")).toBeInTheDocument();
    });

    it("hides compatibility rows when ANY dog lacks compatibility data", () => {
      const dogsWithMissingCompatibility = [
        completeProfileDog,
        partialProfileDog, // Missing compatibility data
      ];
      
      render(
        <CompareTable dogs={dogsWithMissingCompatibility} comparisonData={mockComparisonData} />
      );
      
      expect(screen.queryByText("Good with Dogs")).not.toBeInTheDocument();
      expect(screen.queryByText("Good with Cats")).not.toBeInTheDocument();
      expect(screen.queryByText("Good with Children")).not.toBeInTheDocument();
    });
  });

  describe("Always Visible Rows", () => {
    it("always shows basic information rows regardless of completeness", () => {
      const mixedCompletnessDogs = [completeProfileDog, partialProfileDog, minimalDog];
      
      render(
        <CompareTable dogs={mixedCompletnessDogs} comparisonData={mockComparisonData} />
      );
      
      // These should always be visible
      expect(screen.getByText("Age")).toBeInTheDocument();
      expect(screen.getByText("Size")).toBeInTheDocument();
      expect(screen.getByText("Organization")).toBeInTheDocument();
      expect(screen.getByText("Location")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles empty dog_profiler_data objects", () => {
      const dogsWithEmptyProfileData = [
        {
          ...completeProfileDog,
          dog_profiler_data: {},
        },
        {
          ...partialProfileDog,
          dog_profiler_data: {},
        },
      ];
      
      render(
        <CompareTable dogs={dogsWithEmptyProfileData} comparisonData={mockComparisonData} />
      );
      
      // Should not show any profiler-dependent rows
      expect(screen.queryByText("Tagline")).not.toBeInTheDocument();
      expect(screen.queryByText("Energy Level")).not.toBeInTheDocument();
      expect(screen.queryByText("Experience Needed")).not.toBeInTheDocument();
      expect(screen.queryByText("Good with Dogs")).not.toBeInTheDocument();
    });

    it("handles dogs with null dog_profiler_data", () => {
      const dogsWithNullProfileData = [
        {
          ...completeProfileDog,
          dog_profiler_data: null,
        },
        {
          ...partialProfileDog,
          dog_profiler_data: undefined,
        },
      ];
      
      render(
        <CompareTable dogs={dogsWithNullProfileData} comparisonData={mockComparisonData} />
      );
      
      // Should not show any profiler-dependent rows
      expect(screen.queryByText("Tagline")).not.toBeInTheDocument();
      expect(screen.queryByText("Energy Level")).not.toBeInTheDocument();
    });

    it("handles single dog comparison", () => {
      render(
        <CompareTable dogs={[completeProfileDog]} comparisonData={mockComparisonData} />
      );
      
      // Should show all rows for a complete dog
      expect(screen.getByText("Tagline")).toBeInTheDocument();
      expect(screen.getByText("Energy Level")).toBeInTheDocument();
      expect(screen.getByText("Experience Needed")).toBeInTheDocument();
      expect(screen.getByText("Good with Dogs")).toBeInTheDocument();
    });
  });

  describe("Data Quality", () => {
    it("does not show Unknown text in any cells", () => {
      const dogsWithMixedData = [completeProfileDog, partialProfileDog, minimalDog];
      
      render(
        <CompareTable dogs={dogsWithMixedData} comparisonData={mockComparisonData} />
      );
      
      // Should never show "Unknown" text
      expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
    });

    it("does not show dash placeholders for missing data", () => {
      const dogsWithMixedData = [completeProfileDog, partialProfileDog, minimalDog];
      
      const { container } = render(
        <CompareTable dogs={dogsWithMixedData} comparisonData={mockComparisonData} />
      );
      
      // Should not show dash placeholders in profiler-dependent rows
      const tableCells = container.querySelectorAll("td");
      const dashCells = Array.from(tableCells).filter(cell => 
        cell.textContent?.trim() === "-" && 
        !cell.closest("tr")?.textContent?.includes("Age") &&
        !cell.closest("tr")?.textContent?.includes("Size") &&
        !cell.closest("tr")?.textContent?.includes("Organization") &&
        !cell.closest("tr")?.textContent?.includes("Location")
      );
      
      expect(dashCells).toHaveLength(0);
    });
  });
});