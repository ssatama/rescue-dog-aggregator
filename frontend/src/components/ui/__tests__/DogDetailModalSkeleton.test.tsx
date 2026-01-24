import React from "react";
import { render, screen } from "@testing-library/react";
import DogDetailModalSkeleton from "../DogDetailModalSkeleton";

describe("DogDetailModalSkeleton", () => {
  it("renders with proper accessibility attributes", () => {
    render(<DogDetailModalSkeleton />);

    const skeleton = screen.getByRole("status");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-label", "Loading dog details");
  });

  it("renders modal backdrop with loading indicator", () => {
    render(<DogDetailModalSkeleton />);

    const skeleton = screen.getByTestId("dog-detail-modal-skeleton");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass("fixed", "inset-0", "bg-black/50", "z-50");
  });

  it("displays loading text for users", () => {
    render(<DogDetailModalSkeleton />);

    expect(screen.getByText("Loading details...")).toBeInTheDocument();
  });
});
