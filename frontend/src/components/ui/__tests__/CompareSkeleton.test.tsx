import React from "react";
import { render, screen } from "@testing-library/react";
import CompareSkeleton from "../CompareSkeleton";

describe("CompareSkeleton", () => {
  it("renders with proper accessibility attributes", () => {
    render(<CompareSkeleton />);

    const skeleton = screen.getByRole("status");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-label", "Loading comparison view");
  });

  it("renders modal-like structure with header and content areas", () => {
    render(<CompareSkeleton />);

    const skeleton = screen.getByTestId("compare-skeleton");
    expect(skeleton).toBeInTheDocument();

    const header = screen.getByTestId("compare-skeleton-header");
    expect(header).toBeInTheDocument();

    const content = screen.getByTestId("compare-skeleton-content");
    expect(content).toBeInTheDocument();
  });

  it("renders placeholder dog cards", () => {
    render(<CompareSkeleton />);

    const cards = screen.getAllByTestId("compare-skeleton-card");
    expect(cards.length).toBeGreaterThanOrEqual(2);
  });
});
