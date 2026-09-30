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

  });
});

describe("BreedInfo", () => {
  const mockBreedData = {
    primary_breed: "Golden Retriever",
    breed_slug: "golden-retriever",
    count: 42,
    average_age_months: 36,
  };

  it("shows no 'Updated' date, which was only the render time (#665)", () => {
    render(<BreedInfo breedData={mockBreedData} />);

    expect(screen.queryByText(/Updated/)).not.toBeInTheDocument();
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

    expect(screen.getByRole("button", { name: "See all 42 dogs" })).toBeInTheDocument();
  });

  it("never pluralises the breed name, which read 'Spitzs' (#666)", () => {
    render(<BreedInfo breedData={{ ...mockBreedData, primary_breed: "Spitz", count: 4 }} />);

    expect(screen.getByRole("button", { name: "See all 4 dogs" })).toBeInTheDocument();
    expect(screen.queryByText(/Spitzs/)).not.toBeInTheDocument();
  });

  it("says 'the 1 dog', not 'all 1 dogs'", () => {
    render(<BreedInfo breedData={{ ...mockBreedData, count: 1 }} />);

    expect(screen.getByRole("button", { name: "See the 1 dog" })).toBeInTheDocument();
  });

  it("has no 'Mixed Group' badge under 'Mixed Breed'", () => {
    render(<BreedInfo breedData={{ ...mockBreedData, primary_breed: "Mixed Breed", breed_group: "Mixed" }} />);

    expect(screen.queryByText("Mixed Group")).not.toBeInTheDocument();
  });

  it("shows no 'Popular Breed' badge (#666)", () => {
    render(<BreedInfo breedData={{ ...mockBreedData, count: 534 }} />);

    expect(screen.queryByText("Popular Breed")).not.toBeInTheDocument();
  });
});
