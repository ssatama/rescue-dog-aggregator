import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import BreedStatistics, { BreedInfo } from "../BreedStatistics";

describe("BreedStatistics", () => {
  const mockBreedData = {
    primary_breed: "Golden Retriever",
    breed_slug: "golden-retriever",
    count: 42,
    average_age_months: 36,
    sex_distribution: {
      male: 25,
      female: 17,
    },
  };

  describe("Inline Stats Display", () => {
    it("should display available count and average age inline", () => {
      render(<BreedStatistics breedData={mockBreedData} />);

      expect(screen.getByText("42")).toBeInTheDocument();
      expect(screen.getByText("available")).toBeInTheDocument();
      expect(screen.getByText("3 yrs")).toBeInTheDocument();
      expect(screen.getByText("avg age")).toBeInTheDocument();
    });

    it("should handle months under 12", () => {
      const puppyData = { ...mockBreedData, average_age_months: 8 };
      render(<BreedStatistics breedData={puppyData} />);

      expect(screen.getByText("8 mo")).toBeInTheDocument();
    });

    it("leaves the age out when it is unknown, never N/A", () => {
      render(<BreedStatistics breedData={{ ...mockBreedData, average_age_months: null }} />);

      expect(screen.queryByText("N/A")).not.toBeInTheDocument();
      expect(screen.queryByText("avg age")).not.toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("no longer shows the sex ratio (#500)", () => {
      render(<BreedStatistics breedData={mockBreedData} />);

      expect(screen.queryByTestId("male-bar")).not.toBeInTheDocument();
      expect(screen.queryByText("25")).not.toBeInTheDocument();
    });
  });
});

describe("BreedInfo", () => {
  const mockBreedData = {
    primary_breed: "Golden Retriever",
    breed_slug: "golden-retriever",
    count: 42,
    average_age_months: 36,
    sex_distribution: { male: 25, female: 17 },
  };

  it("should render 'Updated' with formatted date when lastUpdated is a valid ISO string", () => {
    render(
      <BreedInfo breedData={mockBreedData} lastUpdated="2026-02-24T10:30:00.000Z" />,
    );

    const timeElement = screen.getByText("24 Feb 2026");
    expect(timeElement).toBeInTheDocument();
    expect(timeElement.tagName).toBe("TIME");
    expect(timeElement).toHaveAttribute("dateTime", "2026-02-24T10:30:00.000Z");
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
  });

  it("should not render 'Updated' when lastUpdated is undefined", () => {
    render(<BreedInfo breedData={mockBreedData} />);

    expect(screen.queryByText(/Updated/)).not.toBeInTheDocument();
  });

  it("should not render 'Updated' when lastUpdated is an invalid date string", () => {
    render(
      <BreedInfo breedData={mockBreedData} lastUpdated="not-a-date" />,
    );

    expect(screen.queryByText(/Updated/)).not.toBeInTheDocument();
    expect(screen.queryByText("Invalid Date")).not.toBeInTheDocument();
  });

  it("should render breed name as h1", () => {
    render(<BreedInfo breedData={mockBreedData} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Golden Retriever",
    );
  });

  it("should render breed group badge when available", () => {
    const dataWithGroup = { ...mockBreedData, breed_group: "Sporting" };
    render(<BreedInfo breedData={dataWithGroup} />);

    expect(screen.getByText("Sporting Group")).toBeInTheDocument();
  });

  it("should render description when available", () => {
    const dataWithDesc = {
      ...mockBreedData,
      description: "Golden Retrievers are wonderful dogs.",
    };
    render(<BreedInfo breedData={dataWithDesc} />);

    expect(screen.getByText("Golden Retrievers are wonderful dogs.")).toBeInTheDocument();
  });

  it("should render CTA button with count", () => {
    render(<BreedInfo breedData={mockBreedData} />);

    expect(
      screen.getByRole("button", { name: /View All 42 Golden Retrievers/i }),
    ).toBeInTheDocument();
  });
});
