import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import DogStatusBadge from "../DogStatusBadge";

describe("DogStatusBadge", () => {
  it.each([
    ["available", "Available"],
    ["unknown", "Checking availability"],
    ["reserved", "Reserved"],
    ["adopted", "No longer listed"],
  ])("labels %s as %s", (status, label) => {
    render(<DogStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("uses the theme tokens, so it reads in dark mode too", () => {
    render(<DogStatusBadge status="available" />);
    expect(screen.getByText("Available")).toHaveClass("bg-good-soft", "text-good");
  });

  it("never claims a dog was adopted", () => {
    const { container } = render(<DogStatusBadge status="adopted" />);
    expect(container.textContent).not.toMatch(/adopt|forever home/i);
  });

  it("falls back to available for an unrecognised status", () => {
    render(<DogStatusBadge status="invalid" />);
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  it("defaults to available", () => {
    render(<DogStatusBadge />);
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  it("merges a custom className", () => {
    render(<DogStatusBadge status="available" className="ml-2" />);
    expect(screen.getByText("Available")).toHaveClass("ml-2");
  });
});
