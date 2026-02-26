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

    it("should handle missing age data", () => {
      const noAgeData = { ...mockBreedData, average_age_months: undefined };
      render(<BreedStatistics breedData={noAgeData} />);

      expect(screen.getByText("N/A")).toBeInTheDocument();
    });
  });

  describe("Sex Distribution Visualization", () => {
    it("should display sex distribution with both counts and percentages", () => {
      render(<BreedStatistics breedData={mockBreedData} />);

      expect(screen.getByText("25")).toBeInTheDocument();
      expect(screen.getAllByText(/60%/)[0]).toBeInTheDocument();
      expect(screen.getByText("17")).toBeInTheDocument();
      expect(screen.getAllByText(/40%/)[0]).toBeInTheDocument();
    });

    it("should render a visual bar chart for sex distribution", () => {
      render(<BreedStatistics breedData={mockBreedData} />);

      const maleBar = screen.getByTestId("male-bar");
      const femaleBar = screen.getByTestId("female-bar");

      expect(maleBar).toBeInTheDocument();
      expect(femaleBar).toBeInTheDocument();

      expect(maleBar).toHaveStyle("width: 60%");
      expect(femaleBar).toHaveStyle("width: 40%");
    });

    it("should handle all-male edge case gracefully", () => {
      const allMaleData = {
        ...mockBreedData,
        count: 42,
        sex_distribution: {
          male: 42,
          female: 0,
        },
      };

      render(<BreedStatistics breedData={allMaleData} />);

      const allTexts = screen.getAllByText("42");
      expect(allTexts.length).toBeGreaterThan(0);
      const hundredPercentTexts = screen.getAllByText(/100%/);
      expect(hundredPercentTexts.length).toBeGreaterThan(0);

      const zeroTexts = screen.getAllByText("0");
      expect(zeroTexts.length).toBeGreaterThan(0);
      const zeroPercentTexts = screen.getAllByText(/0%/);
      expect(zeroPercentTexts.length).toBeGreaterThan(0);
    });

    it("should handle all-female edge case gracefully", () => {
      const allFemaleData = {
        ...mockBreedData,
        count: 42,
        sex_distribution: {
          male: 0,
          female: 42,
        },
      };

      render(<BreedStatistics breedData={allFemaleData} />);

      const zeroTexts = screen.getAllByText("0");
      expect(zeroTexts.length).toBeGreaterThan(0);
      const zeroPercentTexts = screen.getAllByText(/0%/);
      expect(zeroPercentTexts.length).toBeGreaterThan(0);

      const allTexts = screen.getAllByText("42");
      expect(allTexts.length).toBeGreaterThan(0);
      const hundredPercentTexts = screen.getAllByText(/100%/);
      expect(hundredPercentTexts.length).toBeGreaterThan(0);
    });

    it("should handle missing sex distribution data", () => {
      const noSexData = {
        ...mockBreedData,
        sex_distribution: undefined,
      };

      render(<BreedStatistics breedData={noSexData} />);

      expect(screen.queryByTestId("male-bar")).not.toBeInTheDocument();
      expect(screen.queryByTestId("female-bar")).not.toBeInTheDocument();
    });

    it("should use accessible labels for screen readers", () => {
      render(<BreedStatistics breedData={mockBreedData} />);

      expect(
        screen.getByLabelText(/25 males out of 42 dogs/i),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/17 females out of 42 dogs/i),
      ).toBeInTheDocument();
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
