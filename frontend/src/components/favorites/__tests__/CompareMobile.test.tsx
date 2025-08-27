import React from "react";
import { render, screen } from "@testing-library/react";
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
    good_with_dogs: "selective",
    good_with_cats: "with_training",
    good_with_children: "older_children",
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
});
