import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PersonalityTraits } from "../PersonalityTraits";

describe("PersonalityTraits", () => {
  it("should render all provided traits", () => {
    const traits = ["Playful", "Loyal", "Gentle"];

    render(<PersonalityTraits traits={traits} />);

    expect(screen.getByText("Playful")).toBeInTheDocument();
    expect(screen.getByText("Loyal")).toBeInTheDocument();
    expect(screen.getByText("Gentle")).toBeInTheDocument();
  });

  it("should limit display to maximum of 3 traits", () => {
    const traits = ["Playful", "Loyal", "Gentle", "Smart", "Curious"];

    render(<PersonalityTraits traits={traits} maxTraits={3} />);

    expect(screen.getByText("Playful")).toBeInTheDocument();
    expect(screen.getByText("Loyal")).toBeInTheDocument();
    expect(screen.getByText("Gentle")).toBeInTheDocument();
    expect(screen.queryByText("Smart")).not.toBeInTheDocument();
    expect(screen.queryByText("Curious")).not.toBeInTheDocument();
  });

  it("should render nothing when no traits provided", () => {
    const { container } = render(<PersonalityTraits traits={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it("should render nothing when traits is undefined", () => {
    const { container } = render(<PersonalityTraits traits={undefined} />);

    expect(container.firstChild).toBeNull();
  });

  it("should apply purple pill styling to each trait", () => {
    const traits = ["Playful", "Loyal"];

    render(<PersonalityTraits traits={traits} />);

    const playfulPill = screen.getByText("Playful");
    const loyalPill = screen.getByText("Loyal");

    expect(playfulPill).toHaveClass("bg-purple-100");
    expect(playfulPill).toHaveClass("text-purple-700");
    expect(loyalPill).toHaveClass("bg-purple-100");
    expect(loyalPill).toHaveClass("text-purple-700");
  });

  it("should have proper rounded pill shape", () => {
    const traits = ["Playful"];

    render(<PersonalityTraits traits={traits} />);

    const pill = screen.getByText("Playful");
    expect(pill).toHaveClass("rounded-full");
  });

  it("should apply proper spacing between traits", () => {
    const traits = ["Playful", "Loyal", "Gentle"];

    const { container } = render(<PersonalityTraits traits={traits} />);

    const wrapper = container.querySelector(".flex.flex-wrap.gap-2");
    expect(wrapper).toBeInTheDocument();
  });

  it("should have proper padding for each trait pill", () => {
    const traits = ["Playful"];

    render(<PersonalityTraits traits={traits} />);

    const pill = screen.getByText("Playful");
    expect(pill).toHaveClass("px-3");
    expect(pill).toHaveClass("py-1");
  });

  it("should use correct text size", () => {
    const traits = ["Playful"];

    render(<PersonalityTraits traits={traits} />);

    const pill = screen.getByText("Playful");
    expect(pill).toHaveClass("text-sm");
  });

  it("should handle single trait correctly", () => {
    const traits = ["Friendly"];

    render(<PersonalityTraits traits={traits} />);

    expect(screen.getByText("Friendly")).toBeInTheDocument();
  });

  it("should respect custom maxTraits prop", () => {
    const traits = ["Playful", "Loyal", "Gentle", "Smart"];

    render(<PersonalityTraits traits={traits} maxTraits={2} />);

    expect(screen.getByText("Playful")).toBeInTheDocument();
    expect(screen.getByText("Loyal")).toBeInTheDocument();
    expect(screen.queryByText("Gentle")).not.toBeInTheDocument();
    expect(screen.queryByText("Smart")).not.toBeInTheDocument();
  });

  it("should have proper accessibility with list semantics", () => {
    const traits = ["Playful", "Loyal", "Gentle"];

    const { container } = render(<PersonalityTraits traits={traits} />);

    const list = container.querySelector('[role="list"]');
    expect(list).toBeInTheDocument();

    const listItems = container.querySelectorAll('[role="listitem"]');
    expect(listItems).toHaveLength(3);
  });

  it("should trim whitespace from traits", () => {
    const traits = ["  Playful  ", " Loyal ", "Gentle   "];

    render(<PersonalityTraits traits={traits} />);

    expect(screen.getByText("Playful")).toBeInTheDocument();
    expect(screen.getByText("Loyal")).toBeInTheDocument();
    expect(screen.getByText("Gentle")).toBeInTheDocument();
  });

  it("should filter out empty string traits", () => {
    const traits = ["Playful", "", "Loyal", "   ", "Gentle"];

    render(<PersonalityTraits traits={traits} />);

    const pills = screen.getAllByRole("listitem");
    expect(pills).toHaveLength(3);
    expect(screen.getByText("Playful")).toBeInTheDocument();
    expect(screen.getByText("Loyal")).toBeInTheDocument();
    expect(screen.getByText("Gentle")).toBeInTheDocument();
  });
});
