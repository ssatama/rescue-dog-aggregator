import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SwipeFilters from "../SwipeFilters";

describe("SwipeFilters - Age Filter", () => {
  const mockOnFiltersChange = jest.fn();

  beforeEach(() => {
    localStorage.clear();
    mockOnFiltersChange.mockClear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("should render age filter options", () => {
    render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

    expect(screen.getByText("Age Group (optional)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /puppy/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /young/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /adult/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /senior/i })).toBeInTheDocument();
  });

  it("should toggle age selection on click", () => {
    render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

    const puppyButton = screen.getByRole("button", { name: /puppy/i });

    // Click to select
    fireEvent.click(puppyButton);
    expect(puppyButton).toHaveClass("selected");

    // Need to click Apply button to trigger onFiltersChange
    const applyButton = screen.getByRole("button", { name: /Apply Filters/i });
    fireEvent.click(applyButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        ages: ["puppy"],
      }),
    );

    // Click to deselect
    fireEvent.click(puppyButton);
    expect(puppyButton).not.toHaveClass("selected");

    // Click Apply again
    fireEvent.click(applyButton);

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({
        ages: [],
      }),
    );
  });

  it("should allow multiple age selections", () => {
    render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

    const puppyButton = screen.getByRole("button", { name: /puppy/i });
    const adultButton = screen.getByRole("button", { name: /adult/i });

    fireEvent.click(puppyButton);
    fireEvent.click(adultButton);

    expect(puppyButton).toHaveClass("selected");
    expect(adultButton).toHaveClass("selected");

    // Need to click Apply button to trigger onFiltersChange
    const applyButton = screen.getByRole("button", { name: /Apply Filters/i });
    fireEvent.click(applyButton);

    expect(mockOnFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ages: ["puppy", "adult"],
      }),
    );
  });

  it("should show clear ages button when ages are selected", () => {
    render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

    const puppyButton = screen.getByRole("button", { name: /puppy/i });

    // Initially, no clear button
    expect(screen.queryByText("Clear ages")).not.toBeInTheDocument();

    // Select an age
    fireEvent.click(puppyButton);

    // Clear button should appear
    const clearButton = screen.getByText("Clear ages");
    expect(clearButton).toBeInTheDocument();

    // Click clear
    fireEvent.click(clearButton);

    // Ages should be cleared
    expect(puppyButton).not.toHaveClass("selected");

    // Need to click Apply button to trigger onFiltersChange
    const applyButton = screen.getByRole("button", { name: /Apply Filters/i });
    fireEvent.click(applyButton);

    expect(mockOnFiltersChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        ages: [],
      }),
    );
  });

  it("should persist age selections to localStorage", () => {
    render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

    const youngButton = screen.getByRole("button", { name: /young/i });
    const seniorButton = screen.getByRole("button", { name: /senior/i });

    fireEvent.click(youngButton);
    fireEvent.click(seniorButton);

    const stored = JSON.parse(localStorage.getItem("swipeFilters") || "{}");
    expect(stored.ages).toEqual(["young", "senior"]);
  });

  it("should load persisted age selections from localStorage", () => {
    localStorage.setItem(
      "swipeFilters",
      JSON.stringify({
        country: "DE",
        sizes: ["small"],
        ages: ["adult", "senior"],
      }),
    );

    render(<SwipeFilters onFiltersChange={mockOnFiltersChange} />);

    const adultButton = screen.getByRole("button", { name: /adult/i });
    const seniorButton = screen.getByRole("button", { name: /senior/i });

    expect(adultButton).toHaveClass("selected");
    expect(seniorButton).toHaveClass("selected");
  });

  it("should display selected ages in compact mode", () => {
    localStorage.setItem(
      "swipeFilters",
      JSON.stringify({
        country: "GB",
        sizes: [],
        ages: ["puppy", "young"],
      }),
    );

    render(<SwipeFilters onFiltersChange={mockOnFiltersChange} compact />);

    expect(screen.getByText("Puppy & Young")).toBeInTheDocument();
  });
});
