import React from "react";
import { render, screen } from "../../../test-utils";
import EnergyTrainability from "./EnergyTrainability";
import { DogProfilerData } from "../../../types/dogProfiler";

describe("EnergyTrainability Component", () => {
  // Test data for energy levels
  const mockEnergyLowData: DogProfilerData = {
    energy_level: "low",
    confidence_scores: {
      energy_level: 0.8,
    },
  };

  const mockEnergyMediumData: DogProfilerData = {
    energy_level: "medium",
    confidence_scores: {
      energy_level: 0.9,
    },
  };

  const mockEnergyHighData: DogProfilerData = {
    energy_level: "high",
    confidence_scores: {
      energy_level: 0.7,
    },
  };

  const mockEnergyVeryHighData: DogProfilerData = {
    energy_level: "very_high",
    confidence_scores: {
      energy_level: 0.95,
    },
  };

  // Test data for trainability levels
  const mockTrainabilityEasyData: DogProfilerData = {
    trainability: "easy",
    confidence_scores: {
      trainability: 0.8,
    },
  };

  const mockTrainabilityModerateData: DogProfilerData = {
    trainability: "moderate",
    confidence_scores: {
      trainability: 0.6,
    },
  };

  const mockTrainabilityChallengingData: DogProfilerData = {
    trainability: "challenging",
    confidence_scores: {
      trainability: 0.85,
    },
  };

  // Test data for low confidence scores
  const mockLowConfidenceData: DogProfilerData = {
    energy_level: "high",
    trainability: "easy",
    confidence_scores: {
      energy_level: 0.3,
      trainability: 0.4,
    },
  };

  const mockBoundaryConfidenceData: DogProfilerData = {
    energy_level: "medium",
    trainability: "moderate",
    confidence_scores: {
      energy_level: 0.5,
      trainability: 0.5,
    },
  };

  const mockMissingConfidenceData: DogProfilerData = {
    energy_level: "high",
    trainability: "easy",
    confidence_scores: {},
  };

  describe("Energy Level Display", () => {
    test("renders energy level progress bar when confidence > 0.5", () => {
      render(<EnergyTrainability profilerData={mockEnergyHighData} />);

      expect(screen.getByTestId("energy-progress")).toBeInTheDocument();
      expect(screen.getByText("Energy Level")).toBeInTheDocument();
      expect(screen.getByText("High")).toBeInTheDocument();
    });

    test("does not render energy level when confidence <= 0.5", () => {
      render(<EnergyTrainability profilerData={mockLowConfidenceData} />);

      expect(screen.queryByTestId("energy-progress")).not.toBeInTheDocument();
    });

    test("does not render energy level when confidence is exactly 0.5", () => {
      render(<EnergyTrainability profilerData={mockBoundaryConfidenceData} />);

      expect(screen.queryByTestId("energy-progress")).not.toBeInTheDocument();
    });

    test("renders energy level when confidence score is missing (data should show)", () => {
      render(<EnergyTrainability profilerData={mockMissingConfidenceData} />);

      // With new behavior: show data if it exists, even without confidence scores
      expect(screen.getByTestId("energy-progress")).toBeInTheDocument();
    });

    test("shows correct progress fill for low energy (25%)", () => {
      render(<EnergyTrainability profilerData={mockEnergyLowData} />);

      const progressBar = screen.getByTestId("energy-progress-bar");
      expect(progressBar).toHaveStyle({ width: "25%" });
    });

    test("shows correct progress fill for medium energy (50%)", () => {
      render(<EnergyTrainability profilerData={mockEnergyMediumData} />);

      const progressBar = screen.getByTestId("energy-progress-bar");
      expect(progressBar).toHaveStyle({ width: "50%" });
    });

    test("shows correct progress fill for high energy (75%)", () => {
      render(<EnergyTrainability profilerData={mockEnergyHighData} />);

      const progressBar = screen.getByTestId("energy-progress-bar");
      expect(progressBar).toHaveStyle({ width: "75%" });
    });

    test("shows correct progress fill for very high energy (100%)", () => {
      render(<EnergyTrainability profilerData={mockEnergyVeryHighData} />);

      const progressBar = screen.getByTestId("energy-progress-bar");
      expect(progressBar).toHaveStyle({ width: "100%" });
    });

    test("applies correct color gradient for low energy (green)", () => {
      render(<EnergyTrainability profilerData={mockEnergyLowData} />);

      const progressBar = screen.getByTestId("energy-progress-bar");
      expect(progressBar).toHaveClass("bg-green-500");
    });

    test("applies correct color gradient for medium energy (yellow)", () => {
      render(<EnergyTrainability profilerData={mockEnergyMediumData} />);

      const progressBar = screen.getByTestId("energy-progress-bar");
      expect(progressBar).toHaveClass("bg-yellow-500");
    });

    test("applies correct color gradient for high energy (orange)", () => {
      render(<EnergyTrainability profilerData={mockEnergyHighData} />);

      const progressBar = screen.getByTestId("energy-progress-bar");
      expect(progressBar).toHaveClass("bg-orange-500");
    });

    test("applies correct color gradient for very high energy (red)", () => {
      render(<EnergyTrainability profilerData={mockEnergyVeryHighData} />);

      const progressBar = screen.getByTestId("energy-progress-bar");
      expect(progressBar).toHaveClass("bg-red-500");
    });
  });

  describe("Trainability Display", () => {
    test("renders trainability progress bar when confidence > 0.5", () => {
      render(<EnergyTrainability profilerData={mockTrainabilityEasyData} />);

      expect(screen.getByTestId("trainability-progress")).toBeInTheDocument();
      expect(screen.getByText("Trainability")).toBeInTheDocument();
      expect(screen.getByText("Easy")).toBeInTheDocument();
    });

    test("does not render trainability when confidence <= 0.5", () => {
      render(<EnergyTrainability profilerData={mockLowConfidenceData} />);

      expect(
        screen.queryByTestId("trainability-progress"),
      ).not.toBeInTheDocument();
    });

    test("shows correct progress fill for easy trainability (33%)", () => {
      render(<EnergyTrainability profilerData={mockTrainabilityEasyData} />);

      const progressBar = screen.getByTestId("trainability-progress-bar");
      expect(progressBar).toHaveStyle({ width: "33%" });
    });

    test("shows correct progress fill for moderate trainability (67%)", () => {
      render(
        <EnergyTrainability profilerData={mockTrainabilityModerateData} />,
      );

      const progressBar = screen.getByTestId("trainability-progress-bar");
      expect(progressBar).toHaveStyle({ width: "67%" });
    });

    test("shows correct progress fill for challenging trainability (100%)", () => {
      render(
        <EnergyTrainability profilerData={mockTrainabilityChallengingData} />,
      );

      const progressBar = screen.getByTestId("trainability-progress-bar");
      expect(progressBar).toHaveStyle({ width: "100%" });
    });

    test("applies correct color for easy trainability (green)", () => {
      render(<EnergyTrainability profilerData={mockTrainabilityEasyData} />);

      const progressBar = screen.getByTestId("trainability-progress-bar");
      expect(progressBar).toHaveClass("bg-green-500");
    });

    test("applies correct color for moderate trainability (yellow)", () => {
      render(
        <EnergyTrainability profilerData={mockTrainabilityModerateData} />,
      );

      const progressBar = screen.getByTestId("trainability-progress-bar");
      expect(progressBar).toHaveClass("bg-yellow-500");
    });

    test("applies correct color for challenging trainability (red)", () => {
      render(
        <EnergyTrainability profilerData={mockTrainabilityChallengingData} />,
      );

      const progressBar = screen.getByTestId("trainability-progress-bar");
      expect(progressBar).toHaveClass("bg-red-500");
    });
  });

  describe("Combined Display", () => {
    const mockBothHighConfidenceData: DogProfilerData = {
      energy_level: "high",
      trainability: "moderate",
      confidence_scores: {
        energy_level: 0.8,
        trainability: 0.9,
      },
    };

    test("renders both progress bars when both have high confidence", () => {
      render(<EnergyTrainability profilerData={mockBothHighConfidenceData} />);

      expect(screen.getByTestId("energy-progress")).toBeInTheDocument();
      expect(screen.getByTestId("trainability-progress")).toBeInTheDocument();
    });

    test("renders only energy when only energy has high confidence", () => {
      const data: DogProfilerData = {
        energy_level: "high",
        trainability: "easy",
        confidence_scores: {
          energy_level: 0.8,
          trainability: 0.3,
        },
      };

      render(<EnergyTrainability profilerData={data} />);

      expect(screen.getByTestId("energy-progress")).toBeInTheDocument();
      expect(
        screen.queryByTestId("trainability-progress"),
      ).not.toBeInTheDocument();
    });

    test("renders only trainability when only trainability has high confidence", () => {
      const data: DogProfilerData = {
        energy_level: "high",
        trainability: "easy",
        confidence_scores: {
          energy_level: 0.3,
          trainability: 0.8,
        },
      };

      render(<EnergyTrainability profilerData={data} />);

      expect(screen.queryByTestId("energy-progress")).not.toBeInTheDocument();
      expect(screen.getByTestId("trainability-progress")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("handles undefined profiler data gracefully", () => {
      render(<EnergyTrainability profilerData={undefined} />);

      expect(screen.queryByTestId("energy-progress")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("trainability-progress"),
      ).not.toBeInTheDocument();
    });

    test("handles null profiler data gracefully", () => {
      render(<EnergyTrainability profilerData={null} />);

      expect(screen.queryByTestId("energy-progress")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("trainability-progress"),
      ).not.toBeInTheDocument();
    });

    test("handles missing energy_level field", () => {
      const data: DogProfilerData = {
        trainability: "easy",
        confidence_scores: {
          trainability: 0.8,
        },
      };

      render(<EnergyTrainability profilerData={data} />);

      expect(screen.queryByTestId("energy-progress")).not.toBeInTheDocument();
      expect(screen.getByTestId("trainability-progress")).toBeInTheDocument();
    });

    test("handles missing trainability field", () => {
      const data: DogProfilerData = {
        energy_level: "high",
        confidence_scores: {
          energy_level: 0.8,
        },
      };

      render(<EnergyTrainability profilerData={data} />);

      expect(screen.getByTestId("energy-progress")).toBeInTheDocument();
      expect(
        screen.queryByTestId("trainability-progress"),
      ).not.toBeInTheDocument();
    });

    test("renders nothing when no valid data", () => {
      const data: DogProfilerData = {
        confidence_scores: {},
      };

      render(<EnergyTrainability profilerData={data} />);

      expect(screen.queryByTestId("energy-progress")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("trainability-progress"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Progress Bar Styling", () => {
    test("applies correct base styling to progress containers", () => {
      render(<EnergyTrainability profilerData={mockEnergyHighData} />);

      const progressContainer = screen.getByTestId("energy-progress");
      expect(progressContainer).toHaveClass("mb-4");
    });

    test("applies correct styling to progress bar background", () => {
      render(<EnergyTrainability profilerData={mockEnergyHighData} />);

      const progressBackground = screen.getByTestId("energy-progress-bg");
      expect(progressBackground).toHaveClass(
        "w-full",
        "bg-gray-200",
        "rounded-full",
        "h-2",
        "dark:bg-gray-700",
      );
    });

    test("applies correct styling to progress bar", () => {
      render(<EnergyTrainability profilerData={mockEnergyHighData} />);

      const progressBar = screen.getByTestId("energy-progress-bar");
      expect(progressBar).toHaveClass(
        "h-2",
        "rounded-full",
        "transition-all",
        "duration-300",
      );
    });
  });
});
