import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EnergyIndicator } from "../EnergyIndicator";

describe("EnergyIndicator", () => {
  it("should render correct number of filled dots for energy level 1", () => {
    render(<EnergyIndicator level={1} />);

    const filledDots = screen.getAllByTestId(/energy-dot-filled/);
    const emptyDots = screen.getAllByTestId(/energy-dot-empty/);

    expect(filledDots).toHaveLength(1);
    expect(emptyDots).toHaveLength(4);
  });

  it("should render correct number of filled dots for energy level 3", () => {
    render(<EnergyIndicator level={3} />);

    const filledDots = screen.getAllByTestId(/energy-dot-filled/);
    const emptyDots = screen.getAllByTestId(/energy-dot-empty/);

    expect(filledDots).toHaveLength(3);
    expect(emptyDots).toHaveLength(2);
  });

  it("should render all dots filled for energy level 5", () => {
    render(<EnergyIndicator level={5} />);

    const filledDots = screen.getAllByTestId(/energy-dot-filled/);
    const emptyDots = screen.queryAllByTestId(/energy-dot-empty/);

    expect(filledDots).toHaveLength(5);
    expect(emptyDots).toHaveLength(0);
  });

  it("should render all dots empty for energy level 0", () => {
    render(<EnergyIndicator level={0} />);

    const filledDots = screen.queryAllByTestId(/energy-dot-filled/);
    const emptyDots = screen.getAllByTestId(/energy-dot-empty/);

    expect(filledDots).toHaveLength(0);
    expect(emptyDots).toHaveLength(5);
  });

  it("should display energy label", () => {
    render(<EnergyIndicator level={3} />);

    expect(screen.getByText("Energy:")).toBeInTheDocument();
  });

  it("should apply correct styling to filled dots", () => {
    render(<EnergyIndicator level={3} />);

    const filledDots = screen.getAllByTestId(/energy-dot-filled/);
    filledDots.forEach((dot) => {
      expect(dot).toHaveClass("bg-orange-500");
    });
  });

  it("should apply correct styling to empty dots", () => {
    render(<EnergyIndicator level={2} />);

    const emptyDots = screen.getAllByTestId(/energy-dot-empty/);
    emptyDots.forEach((dot) => {
      expect(dot).toHaveClass("bg-gray-300");
    });
  });

  it("should handle invalid energy levels gracefully", () => {
    render(<EnergyIndicator level={10} />);

    const filledDots = screen.getAllByTestId(/energy-dot-filled/);
    const emptyDots = screen.queryAllByTestId(/energy-dot-empty/);

    expect(filledDots).toHaveLength(5);
    expect(emptyDots).toHaveLength(0);
  });

  it("should handle negative energy levels gracefully", () => {
    render(<EnergyIndicator level={-1} />);

    const filledDots = screen.queryAllByTestId(/energy-dot-filled/);
    const emptyDots = screen.getAllByTestId(/energy-dot-empty/);

    expect(filledDots).toHaveLength(0);
    expect(emptyDots).toHaveLength(5);
  });

  it("should have proper accessibility attributes", () => {
    render(<EnergyIndicator level={3} />);

    const container = screen.getByRole("group", { name: /energy level/i });
    expect(container).toHaveAttribute("aria-label", "Energy level: 3 out of 5");
  });

  it("should use semantic HTML structure", () => {
    const { container } = render(<EnergyIndicator level={3} />);

    const dots = container.querySelectorAll(".w-2.h-2.rounded-full");
    expect(dots).toHaveLength(5);
  });

  it("should render with proper spacing between dots", () => {
    const { container } = render(<EnergyIndicator level={3} />);

    const dotsContainer = container.querySelector(".flex.gap-1");
    expect(dotsContainer).toBeInTheDocument();
  });
});
