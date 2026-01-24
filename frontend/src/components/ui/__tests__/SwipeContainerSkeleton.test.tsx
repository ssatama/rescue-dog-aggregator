import React from "react";
import { render, screen } from "@testing-library/react";
import SwipeContainerSkeleton from "../SwipeContainerSkeleton";

describe("SwipeContainerSkeleton", () => {
  it("renders with proper accessibility attributes", () => {
    render(<SwipeContainerSkeleton />);

    const skeleton = screen.getByRole("status");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-label", "Loading swipe interface");
  });

  it("renders swipe card skeleton", () => {
    render(<SwipeContainerSkeleton />);

    const skeleton = screen.getByTestId("swipe-container-skeleton");
    expect(skeleton).toBeInTheDocument();

    const card = screen.getByTestId("swipe-card-skeleton");
    expect(card).toBeInTheDocument();
  });

  it("renders filter bar skeleton", () => {
    render(<SwipeContainerSkeleton />);

    const filterBar = screen.getByTestId("swipe-filter-skeleton");
    expect(filterBar).toBeInTheDocument();
  });

  it("renders action buttons skeleton", () => {
    render(<SwipeContainerSkeleton />);

    const actions = screen.getByTestId("swipe-actions-skeleton");
    expect(actions).toBeInTheDocument();
  });
});
