import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CompareMobile from "../CompareMobile";
import type { Dog } from "../types";

const mockDogWithStandardValues: Dog = {
  id: 1,
  name: "Buddy",
  breed: "Golden Retriever",
  age_months: 24,
  sex: "Male",
  organization_name: "Test Rescue",
  dog_profiler_data: {
    good_with_dogs: "yes",
    good_with_cats: "no",
    good_with_children: "maybe",
    tagline: "A friendly pup",
  },
  properties: {},
};

const mockDogWithNonStandardValues: Dog = {
  id: 2,
  name: "Luna",
  breed: "Mixed Breed",
  age_months: 36,
  sex: "Female",
  organization_name: "Another Rescue",
  dog_profiler_data: {
    // Non-standard DB values that are intentionally invalid types for testing
    good_with_dogs: "selective" as "yes" | "no" | "maybe" | "unknown",
    good_with_cats: "with_training" as "yes" | "no" | "maybe" | "unknown",
    good_with_children: "older_children" as "yes" | "no" | "maybe" | "unknown",
    tagline: "Needs special attention",
  },
  properties: {},
};

const mockDogWithUnknownValues: Dog = {
  id: 3,
  name: "Max",
  breed: "Labrador",
  age_months: 12,
  sex: "Male",
  organization_name: "Third Rescue",
  dog_profiler_data: {
    good_with_dogs: "unknown",
    good_with_cats: "unknown",
    good_with_children: "unknown",
    tagline: "Young and learning",
  },
  properties: {},
};

describe("CompareMobile", () => {
  const onCloseMock = jest.fn();

  beforeEach(() => {
    onCloseMock.mockClear();
  });

  it("shows compatibility section when all dogs have standard values", () => {
    const dogsWithStandardValues = [mockDogWithStandardValues];

    render(
      <CompareMobile dogs={dogsWithStandardValues} onClose={onCloseMock} />,
    );

    // Should show compatibility section
    expect(screen.getByText("Good with")).toBeInTheDocument();
    expect(screen.getByText("Dogs")).toBeInTheDocument();
    expect(screen.getByText("Cats")).toBeInTheDocument();
    expect(screen.getByText("Kids")).toBeInTheDocument();
  });

  it("hides compatibility section when any dog has non-standard values", () => {
    const dogsWithMixedValues = [
      mockDogWithStandardValues,
      mockDogWithNonStandardValues,
    ];

    render(<CompareMobile dogs={dogsWithMixedValues} onClose={onCloseMock} />);

    // Should hide entire compatibility section
    expect(screen.queryByText("Good with")).not.toBeInTheDocument();
  });

  it("never shows Unknown text anywhere", () => {
    const dogsWithUnknownValues = [
      mockDogWithUnknownValues,
      mockDogWithNonStandardValues,
    ];

    render(
      <CompareMobile dogs={dogsWithUnknownValues} onClose={onCloseMock} />,
    );

    // Should never show "Unknown" text
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
  });

  it("never shows raw non-standard compatibility values", () => {
    const dogsWithNonStandardValues = [mockDogWithNonStandardValues];

    render(
      <CompareMobile dogs={dogsWithNonStandardValues} onClose={onCloseMock} />,
    );

    // Should not show the raw non-standard values
    expect(screen.queryByText("selective")).not.toBeInTheDocument();
    expect(screen.queryByText("with_training")).not.toBeInTheDocument();
    expect(screen.queryByText("older_children")).not.toBeInTheDocument();
  });

  it("handles dogs with missing profiler data gracefully", () => {
    const dogWithoutProfilerData: Dog = {
      id: 4,
      name: "Rex",
      breed: "Shepherd",
      age_months: 48,
      sex: "Male",
      organization_name: "Fourth Rescue",
      properties: {},
    };

    render(
      <CompareMobile dogs={[dogWithoutProfilerData]} onClose={onCloseMock} />,
    );

    // Should not show compatibility section for dogs without profiler data
    expect(screen.queryByText("Good with")).not.toBeInTheDocument();
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
  });

  describe("Swipe functionality", () => {
    const multipleDogs = [
      mockDogWithStandardValues,
      mockDogWithNonStandardValues,
    ];

    it("shows only one dog at a time in swipe mode", () => {
      render(<CompareMobile dogs={multipleDogs} onClose={onCloseMock} />);

      // Should show the first dog by default
      expect(screen.getByText("Buddy")).toBeInTheDocument();
      // Should not show the second dog initially
      expect(screen.queryByText("Luna")).not.toBeInTheDocument();
    });

    it("shows progress dots for multiple dogs", () => {
      render(<CompareMobile dogs={multipleDogs} onClose={onCloseMock} />);

      const progressDots = screen.getByTestId("progress-dots");
      expect(progressDots).toBeInTheDocument();

      // Should have 2 dots for 2 dogs
      const dots = screen.getAllByTestId(/progress-dot-/);
      expect(dots).toHaveLength(2);

      // First dot should be active
      expect(screen.getByTestId("progress-dot-0")).toHaveClass(
        "bg-orange-500",
        "border-orange-500",
      );
      expect(screen.getByTestId("progress-dot-1")).toHaveClass(
        "bg-white",
        "border-gray-300",
      );
    });

    it("navigates to next dog on swipe left", () => {
      render(<CompareMobile dogs={multipleDogs} onClose={onCloseMock} />);

      const swipeContainer = screen.getByTestId("swipe-container");

      // Simulate swipe left (next dog)
      fireEvent.touchStart(swipeContainer, {
        touches: [{ clientX: 200, clientY: 0 }],
      });
      fireEvent.touchMove(swipeContainer, {
        touches: [{ clientX: 50, clientY: 0 }],
      });
      fireEvent.touchEnd(swipeContainer, {
        changedTouches: [{ clientX: 50, clientY: 0 }],
      });

      // Should show second dog
      expect(screen.getByText("Luna")).toBeInTheDocument();
      expect(screen.queryByText("Buddy")).not.toBeInTheDocument();

      // Second dot should be active
      expect(screen.getByTestId("progress-dot-1")).toHaveClass(
        "bg-orange-500",
        "border-orange-500",
      );
      expect(screen.getByTestId("progress-dot-0")).toHaveClass(
        "bg-white",
        "border-gray-300",
      );
    });

    it("navigates to previous dog on swipe right", () => {
      render(<CompareMobile dogs={multipleDogs} onClose={onCloseMock} />);

      const swipeContainer = screen.getByTestId("swipe-container");

      // First navigate to second dog
      fireEvent.touchStart(swipeContainer, {
        touches: [{ clientX: 200, clientY: 0 }],
      });
      fireEvent.touchMove(swipeContainer, {
        touches: [{ clientX: 50, clientY: 0 }],
      });
      fireEvent.touchEnd(swipeContainer, {
        changedTouches: [{ clientX: 50, clientY: 0 }],
      });

      // Now swipe right (previous dog)
      fireEvent.touchStart(swipeContainer, {
        touches: [{ clientX: 50, clientY: 0 }],
      });
      fireEvent.touchMove(swipeContainer, {
        touches: [{ clientX: 200, clientY: 0 }],
      });
      fireEvent.touchEnd(swipeContainer, {
        changedTouches: [{ clientX: 200, clientY: 0 }],
      });

      // Should show first dog again
      expect(screen.getByText("Buddy")).toBeInTheDocument();
      expect(screen.queryByText("Luna")).not.toBeInTheDocument();
    });

    it("allows clicking on progress dots to navigate", async () => {
      const user = userEvent.setup();
      render(<CompareMobile dogs={multipleDogs} onClose={onCloseMock} />);

      // Click on second dot
      await user.click(screen.getByTestId("progress-dot-1"));

      // Should show second dog
      expect(screen.getByText("Luna")).toBeInTheDocument();
      expect(screen.queryByText("Buddy")).not.toBeInTheDocument();
    });

    it("doesn't show progress dots for single dog", () => {
      render(
        <CompareMobile
          dogs={[mockDogWithStandardValues]}
          onClose={onCloseMock}
        />,
      );

      expect(screen.queryByTestId("progress-dots")).not.toBeInTheDocument();
    });

    it("doesn't allow swiping beyond first dog", () => {
      render(<CompareMobile dogs={multipleDogs} onClose={onCloseMock} />);

      const swipeContainer = screen.getByTestId("swipe-container");

      // Try to swipe right when on first dog (should stay on first)
      fireEvent.touchStart(swipeContainer, {
        touches: [{ clientX: 50, clientY: 0 }],
      });
      fireEvent.touchMove(swipeContainer, {
        touches: [{ clientX: 200, clientY: 0 }],
      });
      fireEvent.touchEnd(swipeContainer, {
        changedTouches: [{ clientX: 200, clientY: 0 }],
      });

      // Should still show first dog
      expect(screen.getByText("Buddy")).toBeInTheDocument();
      expect(screen.queryByText("Luna")).not.toBeInTheDocument();
    });

    it("doesn't allow swiping beyond last dog", () => {
      render(<CompareMobile dogs={multipleDogs} onClose={onCloseMock} />);

      const swipeContainer = screen.getByTestId("swipe-container");

      // Navigate to last dog first
      fireEvent.touchStart(swipeContainer, {
        touches: [{ clientX: 200, clientY: 0 }],
      });
      fireEvent.touchMove(swipeContainer, {
        touches: [{ clientX: 50, clientY: 0 }],
      });
      fireEvent.touchEnd(swipeContainer, {
        changedTouches: [{ clientX: 50, clientY: 0 }],
      });

      // Try to swipe left when on last dog (should stay on last)
      fireEvent.touchStart(swipeContainer, {
        touches: [{ clientX: 200, clientY: 0 }],
      });
      fireEvent.touchMove(swipeContainer, {
        touches: [{ clientX: 50, clientY: 0 }],
      });
      fireEvent.touchEnd(swipeContainer, {
        changedTouches: [{ clientX: 50, clientY: 0 }],
      });

      // Should still show second dog
      expect(screen.getByText("Luna")).toBeInTheDocument();
      expect(screen.queryByText("Buddy")).not.toBeInTheDocument();
    });
  });

  describe("Enhanced dots styling", () => {
    const multipleDogs = [
      mockDogWithStandardValues,
      mockDogWithNonStandardValues,
    ];

    it("uses lollipop design for progress dots", () => {
      render(<CompareMobile dogs={multipleDogs} onClose={onCloseMock} />);

      const dots = screen.getAllByTestId(/progress-dot-/);

      // Dots should be large enough for touch targets
      dots.forEach((dot) => {
        expect(dot).toHaveClass("w-12", "h-12");
        expect(dot).toHaveClass("rounded-full");
        expect(dot).toHaveClass("border-2");
      });
    });

    it("uses strong color contrast for active and inactive dots", () => {
      render(<CompareMobile dogs={multipleDogs} onClose={onCloseMock} />);

      const activeDot = screen.getByTestId("progress-dot-0");
      const inactiveDot = screen.getByTestId("progress-dot-1");

      // Active dot should use orange-500/orange-600
      expect(activeDot).toHaveClass("bg-orange-500", "border-orange-500");

      // Inactive dot should use gray-200/gray-300
      expect(inactiveDot).toHaveClass("bg-white", "border-gray-300");
    });

    it("has larger spacing between dots", () => {
      render(<CompareMobile dogs={multipleDogs} onClose={onCloseMock} />);

      const progressDots = screen.getByTestId("progress-dots");
      expect(progressDots).toHaveClass("gap-3");
    });

    it("includes focus states for accessibility", () => {
      render(<CompareMobile dogs={multipleDogs} onClose={onCloseMock} />);

      const dots = screen.getAllByTestId(/progress-dot-/);
      dots.forEach((dot) => {
        expect(dot).toHaveClass(
          "focus:outline-none",
          "focus:ring-2",
          "focus:ring-orange-500",
        );
      });
    });

    it("maintains minimum 44px touch target", () => {
      render(<CompareMobile dogs={multipleDogs} onClose={onCloseMock} />);

      const dots = screen.getAllByTestId(/progress-dot-/);
      dots.forEach((dot) => {
        const styles = window.getComputedStyle(dot);
        const minWidth = parseInt(styles.minWidth);
        const minHeight = parseInt(styles.minHeight);

        expect(minWidth).toBeGreaterThanOrEqual(44);
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });
    });
  });

  describe("Content truncation fixes", () => {
    const dogWithLongExperience: Dog = {
      id: 5,
      name: "TestDog",
      breed: "Test Breed",
      age_months: 24,
      sex: "Male",
      organization_name: "Test Rescue",
      dog_profiler_data: {
        experience_level: "some_experience",
        tagline: "Test tagline",
      },
      properties: {},
    };

    it("displays full experience level text without truncation", () => {
      render(
        <CompareMobile dogs={[dogWithLongExperience]} onClose={onCloseMock} />,
      );

      // Should show "Some Experience" not "Some Experien"
      expect(screen.getByText("Some Experience")).toBeInTheDocument();
    });

    it("shows tagline when available", () => {
      const { container } = render(
        <CompareMobile dogs={[dogWithLongExperience]} onClose={onCloseMock} />,
      );

      // Should show tagline - check that it exists somewhere in the DOM
      expect(container.textContent).toContain("Test tagline");
    });

    it("handles long text content without overflow", () => {
      const dogWithLongContent: Dog = {
        id: 6,
        name: "Very Long Dog Name That Should Not Truncate",
        breed: "Very Long Breed Name That Should Also Display Properly",
        age_months: 24,
        sex: "Male",
        organization_name: "Very Long Organization Name",
        dog_profiler_data: {
          tagline:
            "This is a very long tagline that should wrap properly and not cause overflow issues",
          unique_quirk:
            "This is a very long unique quirk description that should also display properly without truncation",
        },
        properties: {},
      };

      const { container } = render(
        <CompareMobile dogs={[dogWithLongContent]} onClose={onCloseMock} />,
      );

      // All long text should be visible
      expect(
        screen.getByText("Very Long Dog Name That Should Not Truncate"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Very Long Breed Name That Should Also Display Properly",
        ),
      ).toBeInTheDocument();

      // Check tagline and unique quirk in container text content
      expect(container.textContent).toContain(
        "This is a very long tagline that should wrap properly and not cause overflow issues",
      );
      expect(
        screen.getByText(
          "This is a very long unique quirk description that should also display properly without truncation",
        ),
      ).toBeInTheDocument();
    });
  });
});
