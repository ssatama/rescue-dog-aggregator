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
  primary_image_url: "/test-image.jpg",
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
        <CompareTable
          dogs={dogsWithTaglines}
          comparisonData={mockComparisonData}
        />,
      );

      expect(screen.getByText("Tagline")).toBeInTheDocument();
      expect(
        screen.getByText((content, element) =>
          content.includes("Your adventure buddy!"),
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText((content, element) => content.includes("Sweet Luna!")),
      ).toBeInTheDocument();
    });

    it("hides tagline row when ANY dog lacks tagline", () => {
      const dogsWithMissingTagline = [
        completeProfileDog,
        partialProfileDog,
        minimalDog, // No dog_profiler_data
      ];

      render(
        <CompareTable
          dogs={dogsWithMissingTagline}
          comparisonData={mockComparisonData}
        />,
      );

      expect(screen.queryByText("Tagline")).not.toBeInTheDocument();
    });

    it("shows energy level row only when ALL dogs have energy level data", () => {
      const dogsWithEnergyLevel = [
        { ...completeProfileDog },
        { ...partialProfileDog },
      ];

      render(
        <CompareTable
          dogs={dogsWithEnergyLevel}
          comparisonData={mockComparisonData}
        />,
      );

      expect(screen.getByText("Energy Level")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
      // Check for energy level formatting - should have both visual indicator and table row
      expect(screen.getAllByText("Medium")).toHaveLength(2); // One in visual indicator, one in row
    });

    it("hides energy level row when ANY dog lacks energy level data", () => {
      const dogsWithMissingEnergyLevel = [
        completeProfileDog,
        minimalDog, // No dog_profiler_data
      ];

      render(
        <CompareTable
          dogs={dogsWithMissingEnergyLevel}
          comparisonData={mockComparisonData}
        />,
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
        <CompareTable
          dogs={dogsWithExperience}
          comparisonData={mockComparisonData}
        />,
      );

      expect(screen.getByText("Experience Needed")).toBeInTheDocument();
      expect(screen.getByText("Some Experience")).toBeInTheDocument();
      expect(screen.getByText("First-time owners")).toBeInTheDocument();
    });

    it("hides experience level row when ANY dog lacks experience level data", () => {
      const dogsWithMissingExperience = [
        completeProfileDog,
        partialProfileDog, // Has dog_profiler_data but no experience_level
      ];

      render(
        <CompareTable
          dogs={dogsWithMissingExperience}
          comparisonData={mockComparisonData}
        />,
      );

      expect(screen.queryByText("Experience Needed")).not.toBeInTheDocument();
    });

    it("shows compatibility rows only when ALL dogs have standard compatibility values", () => {
      const dogsWithStandardCompatibility = [
        { ...completeProfileDog }, // Has yes/maybe/yes values
        {
          ...partialProfileDog,
          dog_profiler_data: {
            ...partialProfileDog.dog_profiler_data!,
            good_with_dogs: "maybe",
            good_with_cats: "maybe",
            good_with_children: "maybe",
          },
        },
      ];

      render(
        <CompareTable
          dogs={dogsWithStandardCompatibility}
          comparisonData={mockComparisonData}
        />,
      );

      expect(screen.getByText("Good with Dogs")).toBeInTheDocument();
      expect(screen.getByText("Good with Cats")).toBeInTheDocument();
      expect(screen.getByText("Good with Children")).toBeInTheDocument();

      // Should show the actual icon values (there will be multiple instances)
      expect(screen.getAllByText("✓")).toHaveLength(2); // Dogs: yes+maybe, Children: yes+maybe -> 1+1 = 2
      expect(screen.queryByText("✗")).not.toBeInTheDocument(); // No "no" values
      expect(screen.getAllByText("?")).toHaveLength(4); // Dogs: yes+maybe, Cats: maybe+maybe, Children: yes+maybe -> 1+2+1 = 4
    });

    it("hides compatibility rows when ANY dog lacks compatibility data", () => {
      const dogsWithMissingCompatibility = [
        completeProfileDog,
        partialProfileDog, // Missing compatibility data
      ];

      render(
        <CompareTable
          dogs={dogsWithMissingCompatibility}
          comparisonData={mockComparisonData}
        />,
      );

      expect(screen.queryByText("Good with Dogs")).not.toBeInTheDocument();
      expect(screen.queryByText("Good with Cats")).not.toBeInTheDocument();
      expect(screen.queryByText("Good with Children")).not.toBeInTheDocument();
    });
  });

  describe("Always Visible Rows", () => {
    it("always shows basic information rows regardless of completeness", () => {
      const mixedCompletnessDogs = [
        completeProfileDog,
        partialProfileDog,
        minimalDog,
      ];

      render(
        <CompareTable
          dogs={mixedCompletnessDogs}
          comparisonData={mockComparisonData}
        />,
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
        <CompareTable
          dogs={dogsWithEmptyProfileData}
          comparisonData={mockComparisonData}
        />,
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
          dog_profiler_data: undefined,
        },
        {
          ...partialProfileDog,
          dog_profiler_data: undefined,
        },
      ];

      render(
        <CompareTable
          dogs={dogsWithNullProfileData}
          comparisonData={mockComparisonData}
        />,
      );

      // Should not show any profiler-dependent rows
      expect(screen.queryByText("Tagline")).not.toBeInTheDocument();
      expect(screen.queryByText("Energy Level")).not.toBeInTheDocument();
    });

    it("handles single dog comparison", () => {
      render(
        <CompareTable
          dogs={[completeProfileDog]}
          comparisonData={mockComparisonData}
        />,
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
      const dogsWithMixedData = [
        completeProfileDog,
        partialProfileDog,
        minimalDog,
      ];

      render(
        <CompareTable
          dogs={dogsWithMixedData}
          comparisonData={mockComparisonData}
        />,
      );

      // Should never show "Unknown" text
      expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
    });

    it("handles non-standard compatibility values from real database", () => {
      const dogsWithRealDbValues = [
        {
          ...completeProfileDog,
          dog_profiler_data: {
            ...completeProfileDog.dog_profiler_data!,
            good_with_cats: "with_training", // Real DB value
            good_with_children: "older_children", // Real DB value
            good_with_dogs: "selective", // Real DB value
          },
        },
        {
          ...partialProfileDog,
          dog_profiler_data: {
            ...partialProfileDog.dog_profiler_data!,
            good_with_cats: "unknown", // Real DB value
            good_with_children: "unknown", // Real DB value
            good_with_dogs: "unknown", // Real DB value
          },
        },
      ];

      render(
        <CompareTable
          dogs={dogsWithRealDbValues}
          comparisonData={mockComparisonData}
        />,
      );

      // Since one dog has "unknown" values, compatibility rows should be hidden
      expect(screen.queryByText("Good with Dogs")).not.toBeInTheDocument();
      expect(screen.queryByText("Good with Cats")).not.toBeInTheDocument();
      expect(screen.queryByText("Good with Children")).not.toBeInTheDocument();

      // Should never show "Unknown", "with_training", "older_children", or "selective" text
      expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
      expect(screen.queryByText("with_training")).not.toBeInTheDocument();
      expect(screen.queryByText("older_children")).not.toBeInTheDocument();
      expect(screen.queryByText("selective")).not.toBeInTheDocument();
    });

    it("hides compatibility rows when dogs have non-standard values", () => {
      const dogsWithNonStandardValues = [
        {
          ...completeProfileDog,
          dog_profiler_data: {
            ...completeProfileDog.dog_profiler_data!,
            good_with_cats: "with_training", // Non-standard DB value
            good_with_children: "older_children", // Non-standard DB value
            good_with_dogs: "selective", // Non-standard DB value
          },
        },
        {
          ...partialProfileDog,
          dog_profiler_data: {
            ...partialProfileDog.dog_profiler_data!,
            good_with_cats: "yes", // Valid value
            good_with_children: "no", // Valid value
            good_with_dogs: "maybe", // Valid value
          },
        },
      ];

      render(
        <CompareTable
          dogs={dogsWithNonStandardValues}
          comparisonData={mockComparisonData}
        />,
      );

      // Since one dog has non-standard values, compatibility rows should be HIDDEN
      expect(screen.queryByText("Good with Dogs")).not.toBeInTheDocument();
      expect(screen.queryByText("Good with Cats")).not.toBeInTheDocument();
      expect(screen.queryByText("Good with Children")).not.toBeInTheDocument();

      // Should NOT show any compatibility-related text
      expect(screen.queryByText("with_training")).not.toBeInTheDocument();
      expect(screen.queryByText("older_children")).not.toBeInTheDocument();
      expect(screen.queryByText("selective")).not.toBeInTheDocument();
      expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
      expect(screen.queryByText("Yes")).not.toBeInTheDocument();
      expect(screen.queryByText("No")).not.toBeInTheDocument();
      expect(screen.queryByText("Maybe")).not.toBeInTheDocument();
    });

    it("shows proper behavior with real database edge cases", () => {
      // Test case that simulates the user's reported bug
      const realWorldScenario = [
        {
          ...completeProfileDog,
          dog_profiler_data: {
            ...completeProfileDog.dog_profiler_data!,
            good_with_dogs: "yes",
            good_with_cats: "unknown", // This should cause compatibility rows to be hidden
            good_with_children: "yes",
          },
        },
        {
          ...partialProfileDog,
          dog_profiler_data: {
            ...partialProfileDog.dog_profiler_data!,
            good_with_dogs: "selective", // Non-standard value
            good_with_cats: "with_training", // Non-standard value
            good_with_children: "older_children", // Non-standard value
          },
        },
      ];

      render(
        <CompareTable
          dogs={realWorldScenario}
          comparisonData={mockComparisonData}
        />,
      );

      // Both dogs have issues: one has "unknown", other has non-standard values
      // So compatibility rows should be HIDDEN entirely
      expect(screen.queryByText("Good with Dogs")).not.toBeInTheDocument();
      expect(screen.queryByText("Good with Cats")).not.toBeInTheDocument();
      expect(screen.queryByText("Good with Children")).not.toBeInTheDocument();

      // Most importantly: should NEVER show "Unknown" text anywhere
      expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
      expect(screen.queryByText("unknown")).not.toBeInTheDocument();

      // Should not show non-standard values as text either
      expect(screen.queryByText("selective")).not.toBeInTheDocument();
      expect(screen.queryByText("with_training")).not.toBeInTheDocument();
      expect(screen.queryByText("older_children")).not.toBeInTheDocument();
    });

    it("does not show dash placeholders for missing data", () => {
      const dogsWithMixedData = [
        completeProfileDog,
        partialProfileDog,
        minimalDog,
      ];

      const { container } = render(
        <CompareTable
          dogs={dogsWithMixedData}
          comparisonData={mockComparisonData}
        />,
      );

      // Should not show dash placeholders in profiler-dependent rows
      const tableCells = container.querySelectorAll("td");
      const dashCells = Array.from(tableCells).filter(
        (cell) =>
          cell.textContent?.trim() === "-" &&
          !cell.closest("tr")?.textContent?.includes("Age") &&
          !cell.closest("tr")?.textContent?.includes("Size") &&
          !cell.closest("tr")?.textContent?.includes("Organization") &&
          !cell.closest("tr")?.textContent?.includes("Location"),
      );

      expect(dashCells).toHaveLength(0);
    });
  });
});