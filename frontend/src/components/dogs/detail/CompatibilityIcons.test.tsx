import React from "react";
import { render, screen } from "../../../test-utils";
import CompatibilityIcons from "./CompatibilityIcons";
import { DogProfilerData } from "../../../types/dogProfiler";

describe("CompatibilityIcons Component", () => {
  // Mock data for different compatibility values
  const mockCompatibilityData: DogProfilerData = {
    good_with_dogs: "yes",
    good_with_cats: "no",
    good_with_children: "maybe",
    confidence_scores: {
      good_with_dogs: 0.8,
      good_with_cats: 0.9,
      good_with_children: 0.7,
    },
  };

  const mockSelectiveData: DogProfilerData = {
    good_with_dogs: "maybe",
    good_with_cats: "maybe",
    good_with_children: "maybe",
    confidence_scores: {
      good_with_dogs: 0.6,
      good_with_cats: 0.8,
      good_with_children: 0.9,
    },
  };

  const mockUnknownData: DogProfilerData = {
    good_with_dogs: "unknown",
    good_with_cats: "unknown",
    good_with_children: "unknown",
    confidence_scores: {
      good_with_dogs: 0.6,
      good_with_cats: 0.7,
      good_with_children: 0.8,
    },
  };

  const mockLowConfidenceData: DogProfilerData = {
    good_with_dogs: "yes",
    good_with_cats: "no",
    good_with_children: "maybe",
    confidence_scores: {
      good_with_dogs: 0.3,
      good_with_cats: 0.4,
      good_with_children: 0.2,
    },
  };

  const mockBoundaryConfidenceData: DogProfilerData = {
    good_with_dogs: "yes",
    good_with_cats: "no",
    good_with_children: "maybe",
    confidence_scores: {
      good_with_dogs: 0.5,
      good_with_cats: 0.5,
      good_with_children: 0.5,
    },
  };

  const mockMissingConfidenceData: DogProfilerData = {
    good_with_dogs: "yes",
    good_with_cats: "no",
    good_with_children: "maybe",
    confidence_scores: {},
  };

  describe("Icon Display", () => {
    test("renders correct icons for different compatibility values", () => {
      render(<CompatibilityIcons profilerData={mockCompatibilityData} />);

      expect(screen.getByText("✓")).toBeInTheDocument(); // dogs: yes
      expect(screen.getByText("✗")).toBeInTheDocument(); // cats: no
      expect(screen.getByText("?")).toBeInTheDocument(); // children: maybe
    });

    test("renders question mark for maybe values", () => {
      render(<CompatibilityIcons profilerData={mockSelectiveData} />);

      const questionMarks = screen.getAllByText("?");
      expect(questionMarks).toHaveLength(3); // All three are "maybe"
    });

    test("renders dash for unknown values", () => {
      render(<CompatibilityIcons profilerData={mockUnknownData} />);

      const dashes = screen.getAllByText("-");
      expect(dashes).toHaveLength(3); // all unknown
    });
  });

  describe("Background Colors", () => {
    test("applies correct background colors for different values", () => {
      render(<CompatibilityIcons profilerData={mockCompatibilityData} />);

      expect(screen.getByTestId("compatibility-icon-dogs")).toHaveClass(
        "bg-green-100",
      ); // yes
      expect(screen.getByTestId("compatibility-icon-cats")).toHaveClass(
        "bg-red-100",
      ); // no
      expect(screen.getByTestId("compatibility-icon-children")).toHaveClass(
        "bg-yellow-100",
      ); // maybe
    });

    test("applies gray background for unknown values", () => {
      render(<CompatibilityIcons profilerData={mockUnknownData} />);

      expect(screen.getByTestId("compatibility-icon-dogs")).toHaveClass(
        "bg-gray-100",
      );
      expect(screen.getByTestId("compatibility-icon-cats")).toHaveClass(
        "bg-gray-100",
      );
      expect(screen.getByTestId("compatibility-icon-children")).toHaveClass(
        "bg-gray-100",
      );
    });
  });

  describe("Confidence Score Filtering", () => {
    test("only shows icons with confidence > 0.5", () => {
      render(<CompatibilityIcons profilerData={mockLowConfidenceData} />);

      expect(
        screen.queryByTestId("dogs-compatibility"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("cats-compatibility"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("children-compatibility"),
      ).not.toBeInTheDocument();
    });

    test("does not show icons with confidence exactly 0.5", () => {
      render(<CompatibilityIcons profilerData={mockBoundaryConfidenceData} />);

      expect(
        screen.queryByTestId("dogs-compatibility"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("cats-compatibility"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("children-compatibility"),
      ).not.toBeInTheDocument();
    });

    test("does not show icons when confidence scores are missing", () => {
      render(<CompatibilityIcons profilerData={mockMissingConfidenceData} />);

      expect(
        screen.queryByTestId("dogs-compatibility"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("cats-compatibility"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("children-compatibility"),
      ).not.toBeInTheDocument();
    });

    test("shows only icons with high enough confidence", () => {
      const mixedConfidenceData: DogProfilerData = {
        good_with_dogs: "yes",
        good_with_cats: "no",
        good_with_children: "maybe",
        confidence_scores: {
          good_with_dogs: 0.8, // show
          good_with_cats: 0.3, // hide
          good_with_children: 0.9, // show
        },
      };

      render(<CompatibilityIcons profilerData={mixedConfidenceData} />);

      expect(screen.getByTestId("dogs-compatibility")).toBeInTheDocument();
      expect(
        screen.queryByTestId("cats-compatibility"),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("children-compatibility")).toBeInTheDocument();
    });
  });

  describe("Labels", () => {
    test("displays correct labels for each compatibility type", () => {
      render(<CompatibilityIcons profilerData={mockCompatibilityData} />);

      expect(screen.getByText("Dogs")).toBeInTheDocument();
      expect(screen.getByText("Cats")).toBeInTheDocument();
      expect(screen.getByText("Children")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("handles undefined profiler data gracefully", () => {
      render(<CompatibilityIcons profilerData={undefined} />);

      expect(
        screen.queryByTestId("dogs-compatibility"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("cats-compatibility"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("children-compatibility"),
      ).not.toBeInTheDocument();
    });

    test("handles null profiler data gracefully", () => {
      render(<CompatibilityIcons profilerData={null} />);

      expect(
        screen.queryByTestId("dogs-compatibility"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("cats-compatibility"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("children-compatibility"),
      ).not.toBeInTheDocument();
    });

    test("handles missing compatibility fields", () => {
      const partialData: DogProfilerData = {
        good_with_dogs: "yes",
        confidence_scores: {
          good_with_dogs: 0.8,
        },
      };

      render(<CompatibilityIcons profilerData={partialData} />);

      expect(screen.getByTestId("dogs-compatibility")).toBeInTheDocument();
      expect(
        screen.queryByTestId("cats-compatibility"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("children-compatibility"),
      ).not.toBeInTheDocument();
    });

    test("renders nothing when no valid data", () => {
      const emptyData: DogProfilerData = {
        confidence_scores: {},
      };

      render(<CompatibilityIcons profilerData={emptyData} />);

      expect(
        screen.queryByTestId("dogs-compatibility"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("cats-compatibility"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("children-compatibility"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Component Styling", () => {
    test("applies correct container styling", () => {
      render(<CompatibilityIcons profilerData={mockCompatibilityData} />);

      const container = screen.getByTestId("compatibility-icons-container");
      expect(container).toHaveClass("flex", "gap-3");
    });

    test("applies correct icon styling", () => {
      render(<CompatibilityIcons profilerData={mockCompatibilityData} />);

      const icons = [
        screen.getByTestId("compatibility-icon-dogs"),
        screen.getByTestId("compatibility-icon-cats"),
        screen.getByTestId("compatibility-icon-children"),
      ];

      icons.forEach((icon) => {
        expect(icon).toHaveClass(
          "w-8",
          "h-8",
          "rounded-full",
          "flex",
          "items-center",
          "justify-center",
          "text-sm",
          "font-medium",
        );
      });
    });
  });
});