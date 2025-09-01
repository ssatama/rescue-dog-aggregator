import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SwipeEmpty } from "../SwipeEmpty";

describe("SwipeEmpty", () => {
  it("should display empty state message", () => {
    render(<SwipeEmpty onChangeFilters={() => {}} />);

    expect(screen.getByText("More dogs coming!")).toBeInTheDocument();
    expect(
      screen.getByText(/We're adding new dogs every day/),
    ).toBeInTheDocument();
  });

  it("should show change filters button", () => {
    const onChangeFilters = jest.fn();
    render(<SwipeEmpty onChangeFilters={onChangeFilters} />);

    const button = screen.getByText(/Change Filters/);
    expect(button).toBeInTheDocument();
  });

  it("should call onChangeFilters when button clicked", () => {
    const onChangeFilters = jest.fn();
    render(<SwipeEmpty onChangeFilters={onChangeFilters} />);

    const button = screen.getByText(/Change Filters/);
    button.click();

    expect(onChangeFilters).toHaveBeenCalledTimes(1);
  });

  it("should display service dog emoji", () => {
    render(<SwipeEmpty onChangeFilters={() => {}} />);

    expect(screen.getByText("🦮")).toBeInTheDocument();
  });

  it("should have proper styling", () => {
    render(<SwipeEmpty onChangeFilters={() => {}} />);

    const container = screen.getByTestId("swipe-empty");
    expect(container).toHaveClass(
      "flex",
      "flex-col",
      "items-center",
      "justify-center",
    );
  });
});
