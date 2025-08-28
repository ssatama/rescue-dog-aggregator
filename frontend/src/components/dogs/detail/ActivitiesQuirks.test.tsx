import React from "react";
import { render, screen } from "../../../test-utils";
import ActivitiesQuirks from "./ActivitiesQuirks";
import { DogProfilerData } from "../../../types/dogProfiler";

describe("ActivitiesQuirks Component", () => {
  const mockProfileDataWithHighConfidence: DogProfilerData = {
    favorite_activities: ["running", "swimming", "playing", "cuddling"],
    unique_quirk: "Loves to carry toys in his mouth everywhere",
    confidence_scores: {
      favorite_activities: 0.8,
      unique_quirk: 0.9,
    },
  };

  const mockProfileDataWithLowActivityConfidence: DogProfilerData = {
    favorite_activities: ["running", "swimming"],
    unique_quirk: "Loves belly rubs",
    confidence_scores: {
      favorite_activities: 0.3,
      unique_quirk: 0.8,
    },
  };

  const mockProfileDataWithLowQuirkConfidence: DogProfilerData = {
    favorite_activities: ["running", "swimming"],
    unique_quirk: "Loves belly rubs",
    confidence_scores: {
      favorite_activities: 0.8,
      unique_quirk: 0.3,
    },
  };

  const mockProfileDataWithNoActivities: DogProfilerData = {
    favorite_activities: [],
    unique_quirk: "Loves belly rubs",
    confidence_scores: {
      favorite_activities: 0.9,
      unique_quirk: 0.8,
    },
  };

  const mockProfileDataWithNoQuirk: DogProfilerData = {
    favorite_activities: ["running"],
    unique_quirk: "",
    confidence_scores: {
      favorite_activities: 0.8,
      unique_quirk: 0.9,
    },
  };

  const mockProfileDataWithNoConfidence: DogProfilerData = {
    favorite_activities: ["running"],
    unique_quirk: "Loves belly rubs",
    confidence_scores: {},
  };

  test("renders activities with correct emojis when confidence > 0.5", () => {
    render(
      <ActivitiesQuirks profilerData={mockProfileDataWithHighConfidence} />,
    );

    expect(screen.getByTestId("activities-quirks")).toBeInTheDocument();
    expect(screen.getByTestId("activities-section")).toBeInTheDocument();

    // Check activities and their emojis separately
    expect(screen.getByText("🏃")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("🏊")).toBeInTheDocument();
    expect(screen.getByText("Swimming")).toBeInTheDocument();
    expect(screen.getByText("🎾")).toBeInTheDocument();
    expect(screen.getByText("Playing")).toBeInTheDocument();
    expect(screen.getByText("🤗")).toBeInTheDocument();
    expect(screen.getByText("Cuddling")).toBeInTheDocument();
  });

  test("renders unique quirk when confidence > 0.5", () => {
    render(
      <ActivitiesQuirks profilerData={mockProfileDataWithHighConfidence} />,
    );

    expect(screen.getByTestId("quirk-section")).toBeInTheDocument();
    expect(
      screen.getByText("Loves to carry toys in his mouth everywhere"),
    ).toBeInTheDocument();
  });

  test("does not render activities when confidence <= 0.5", () => {
    render(
      <ActivitiesQuirks
        profilerData={mockProfileDataWithLowActivityConfidence}
      />,
    );

    expect(screen.queryByTestId("activities-section")).not.toBeInTheDocument();
    // But quirk should still render
    expect(screen.getByTestId("quirk-section")).toBeInTheDocument();
  });

  test("does not render quirk when confidence <= 0.5", () => {
    render(
      <ActivitiesQuirks profilerData={mockProfileDataWithLowQuirkConfidence} />,
    );

    expect(screen.getByTestId("activities-section")).toBeInTheDocument();
    expect(screen.queryByTestId("quirk-section")).not.toBeInTheDocument();
  });

  test("does not render activities when no activities available", () => {
    render(<ActivitiesQuirks profilerData={mockProfileDataWithNoActivities} />);

    expect(screen.queryByTestId("activities-section")).not.toBeInTheDocument();
    expect(screen.getByTestId("quirk-section")).toBeInTheDocument();
  });

  test("does not render quirk when no quirk available", () => {
    render(<ActivitiesQuirks profilerData={mockProfileDataWithNoQuirk} />);

    expect(screen.getByTestId("activities-section")).toBeInTheDocument();
    expect(screen.queryByTestId("quirk-section")).not.toBeInTheDocument();
  });

  test("does not render when confidence scores are missing", () => {
    render(<ActivitiesQuirks profilerData={mockProfileDataWithNoConfidence} />);

    expect(screen.queryByTestId("activities-quirks")).not.toBeInTheDocument();
  });

  test("handles empty profiler data gracefully", () => {
    render(<ActivitiesQuirks profilerData={undefined} />);

    expect(screen.queryByTestId("activities-quirks")).not.toBeInTheDocument();
  });

  test("handles null profiler data gracefully", () => {
    render(<ActivitiesQuirks profilerData={null} />);

    expect(screen.queryByTestId("activities-quirks")).not.toBeInTheDocument();
  });

  test("applies correct emoji mapping for different activities", () => {
    const dataWithVariousActivities: DogProfilerData = {
      favorite_activities: [
        "running",
        "zooming",
        "swimming",
        "playing",
        "toys",
        "fetch",
        "cuddling",
        "snuggling",
        "walking",
        "rolling",
        "sleeping",
      ],
      confidence_scores: {
        favorite_activities: 0.9,
      },
    };

    render(<ActivitiesQuirks profilerData={dataWithVariousActivities} />);

    // Check specific activity containers for correct emoji/text combinations
    const runningActivity = screen.getByTestId("activity-running");
    expect(runningActivity).toHaveTextContent("🏃");
    expect(runningActivity).toHaveTextContent("Running");

    const zoomingActivity = screen.getByTestId("activity-zooming");
    expect(zoomingActivity).toHaveTextContent("🏃");
    expect(zoomingActivity).toHaveTextContent("Zooming");

    const swimmingActivity = screen.getByTestId("activity-swimming");
    expect(swimmingActivity).toHaveTextContent("🏊");
    expect(swimmingActivity).toHaveTextContent("Swimming");

    const playingActivity = screen.getByTestId("activity-playing");
    expect(playingActivity).toHaveTextContent("🎾");
    expect(playingActivity).toHaveTextContent("Playing");

    const toysActivity = screen.getByTestId("activity-toys");
    expect(toysActivity).toHaveTextContent("🎾");
    expect(toysActivity).toHaveTextContent("Toys");

    const fetchActivity = screen.getByTestId("activity-fetch");
    expect(fetchActivity).toHaveTextContent("🎾");
    expect(fetchActivity).toHaveTextContent("Fetch");

    const cuddlingActivity = screen.getByTestId("activity-cuddling");
    expect(cuddlingActivity).toHaveTextContent("🤗");
    expect(cuddlingActivity).toHaveTextContent("Cuddling");

    const snugglingActivity = screen.getByTestId("activity-snuggling");
    expect(snugglingActivity).toHaveTextContent("🤗");
    expect(snugglingActivity).toHaveTextContent("Snuggling");

    const walkingActivity = screen.getByTestId("activity-walking");
    expect(walkingActivity).toHaveTextContent("🚶");
    expect(walkingActivity).toHaveTextContent("Walking");

    const rollingActivity = screen.getByTestId("activity-rolling");
    expect(rollingActivity).toHaveTextContent("🌀");
    expect(rollingActivity).toHaveTextContent("Rolling");

    const sleepingActivity = screen.getByTestId("activity-sleeping");
    expect(sleepingActivity).toHaveTextContent("🐾");
    expect(sleepingActivity).toHaveTextContent("Sleeping");
  });

  test("capitalizes activity names correctly", () => {
    const dataWithLowercaseActivities: DogProfilerData = {
      favorite_activities: ["running", "swimming"],
      confidence_scores: {
        favorite_activities: 0.8,
      },
    };

    render(<ActivitiesQuirks profilerData={dataWithLowercaseActivities} />);

    expect(screen.getByText("🏃")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("🏊")).toBeInTheDocument();
    expect(screen.getByText("Swimming")).toBeInTheDocument();
  });

  test("applies engaging Tailwind colors for activities", () => {
    render(
      <ActivitiesQuirks profilerData={mockProfileDataWithHighConfidence} />,
    );

    const activities = screen.getAllByTestId(/^activity-/);

    // Check that activities have proper styling
    expect(activities[0]).toHaveClass("bg-orange-100", "text-orange-800");
    expect(activities[1]).toHaveClass("bg-blue-100", "text-blue-800");
    expect(activities[2]).toHaveClass("bg-green-100", "text-green-800");
    expect(activities[3]).toHaveClass("bg-pink-100", "text-pink-800");
  });

  test("applies proper styling to unique quirk", () => {
    render(
      <ActivitiesQuirks profilerData={mockProfileDataWithHighConfidence} />,
    );

    const quirkElement = screen.getByTestId("quirk-callout");
    expect(quirkElement).toHaveClass(
      "bg-purple-50",
      "border-l-4",
      "border-purple-400",
      "p-4",
      "rounded-r-lg",
    );
  });

  test("handles boundary confidence scores (exactly 0.5)", () => {
    const dataWithBoundaryConfidence: DogProfilerData = {
      favorite_activities: ["running"],
      unique_quirk: "Loves belly rubs",
      confidence_scores: {
        favorite_activities: 0.5,
        unique_quirk: 0.5,
      },
    };

    render(<ActivitiesQuirks profilerData={dataWithBoundaryConfidence} />);

    // Should not render when confidence is exactly 0.5 (requirement is > 0.5)
    expect(screen.queryByTestId("activities-quirks")).not.toBeInTheDocument();
  });

  test("renders only when at least one section has valid data", () => {
    const dataWithOnlyValidActivity: DogProfilerData = {
      favorite_activities: ["running"],
      unique_quirk: "",
      confidence_scores: {
        favorite_activities: 0.8,
        unique_quirk: 0.3,
      },
    };

    render(<ActivitiesQuirks profilerData={dataWithOnlyValidActivity} />);

    expect(screen.getByTestId("activities-quirks")).toBeInTheDocument();
    expect(screen.getByTestId("activities-section")).toBeInTheDocument();
    expect(screen.queryByTestId("quirk-section")).not.toBeInTheDocument();
  });

  describe("Dark mode support", () => {
    test("applies dark mode classes to section headings", () => {
      render(
        <ActivitiesQuirks profilerData={mockProfileDataWithHighConfidence} />,
      );

      // Get section headings
      const activitiesHeading = screen.getByRole("heading", {
        name: "Favorite Activities",
      });
      const quirkHeading = screen.getByRole("heading", {
        name: "What Makes Me Special",
      });

      // Verify dark mode classes are applied
      expect(activitiesHeading).toHaveClass("dark:text-gray-200");
      expect(quirkHeading).toHaveClass("dark:text-gray-200");
    });

    test("maintains accessibility in dark mode", () => {
      render(
        <ActivitiesQuirks profilerData={mockProfileDataWithHighConfidence} />,
      );

      // Verify headings are accessible
      expect(
        screen.getByRole("heading", { name: "Favorite Activities" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { name: "What Makes Me Special" }),
      ).toBeInTheDocument();
    });

    test("renders correctly with only activities in dark mode", () => {
      render(
        <ActivitiesQuirks
          profilerData={mockProfileDataWithLowQuirkConfidence}
        />,
      );

      const activitiesHeading = screen.getByRole("heading", {
        name: "Favorite Activities",
      });
      expect(activitiesHeading).toHaveClass("dark:text-gray-200");
      expect(
        screen.queryByRole("heading", { name: "What Makes Me Special" }),
      ).not.toBeInTheDocument();
    });

    test("renders correctly with only quirk in dark mode", () => {
      render(
        <ActivitiesQuirks
          profilerData={mockProfileDataWithLowActivityConfidence}
        />,
      );

      const quirkHeading = screen.getByRole("heading", {
        name: "What Makes Me Special",
      });
      expect(quirkHeading).toHaveClass("dark:text-gray-200");
      expect(
        screen.queryByRole("heading", { name: "Favorite Activities" }),
      ).not.toBeInTheDocument();
    });
  });
});
