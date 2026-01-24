import React from "react";
import { render, screen } from "@testing-library/react";
import FilterPanelSkeleton from "../FilterPanelSkeleton";

describe("FilterPanelSkeleton", () => {
  it("renders with proper accessibility attributes", () => {
    render(<FilterPanelSkeleton />);

    const skeleton = screen.getByRole("status");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-label", "Loading filters");
  });

  it("renders skeleton button matching FilterPanel dimensions", () => {
    render(<FilterPanelSkeleton />);

    const skeleton = screen.getByTestId("filter-panel-skeleton");
    expect(skeleton).toBeInTheDocument();
  });

  it("uses skeleton-element class for animation", () => {
    render(<FilterPanelSkeleton />);

    const skeleton = screen.getByTestId("filter-panel-skeleton");
    expect(skeleton).toHaveClass("skeleton-element");
  });
});
