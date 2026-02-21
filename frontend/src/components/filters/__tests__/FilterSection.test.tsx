import React from "react";
import { render, screen, fireEvent } from "../../../test-utils";
import "@testing-library/jest-dom";
import FilterSection from "../FilterSection";

describe("FilterSection", () => {
  test("renders with title", () => {
    render(
      <FilterSection id="size" title="Size">
        <p>filter content</p>
      </FilterSection>,
    );

    expect(screen.getByText("Size")).toBeInTheDocument();
    expect(screen.getByText("filter content")).toBeInTheDocument();
  });

  test("is closed by default", () => {
    render(
      <FilterSection id="age" title="Age">
        <p>content</p>
      </FilterSection>,
    );

    const details = screen.getByTestId("filter-section-age");
    expect(details).toHaveAttribute("data-open", "false");
  });

  test("opens when defaultOpen is true", () => {
    render(
      <FilterSection id="breed" title="Breed" defaultOpen>
        <p>content</p>
      </FilterSection>,
    );

    const details = screen.getByTestId("filter-section-breed");
    expect(details).toHaveAttribute("data-open", "true");
  });

  test("toggles open/close on summary click", () => {
    render(
      <FilterSection id="sex" title="Sex">
        <p>content</p>
      </FilterSection>,
    );

    const summary = screen.getByTestId("filter-summary-sex");
    const details = screen.getByTestId("filter-section-sex");

    expect(details).toHaveAttribute("data-open", "false");

    fireEvent.click(summary);
    expect(details).toHaveAttribute("data-open", "true");

    fireEvent.click(summary);
    expect(details).toHaveAttribute("data-open", "false");
  });

  test("toggles on Enter key", () => {
    render(
      <FilterSection id="org" title="Organization">
        <p>content</p>
      </FilterSection>,
    );

    const summary = screen.getByTestId("filter-summary-org");
    const details = screen.getByTestId("filter-section-org");

    fireEvent.keyDown(summary, { key: "Enter" });
    expect(details).toHaveAttribute("data-open", "true");
  });

  test("toggles on Space key", () => {
    render(
      <FilterSection id="country" title="Country">
        <p>content</p>
      </FilterSection>,
    );

    const summary = screen.getByTestId("filter-summary-country");
    const details = screen.getByTestId("filter-section-country");

    fireEvent.keyDown(summary, { key: " " });
    expect(details).toHaveAttribute("data-open", "true");
  });

  test("shows count badge when count > 0", () => {
    render(
      <FilterSection id="size" title="Size" count={3}>
        <p>content</p>
      </FilterSection>,
    );

    expect(screen.getByText("(3)")).toBeInTheDocument();
  });

  test("hides count badge when count is 0", () => {
    render(
      <FilterSection id="size" title="Size" count={0}>
        <p>content</p>
      </FilterSection>,
    );

    expect(screen.queryByText("(0)")).not.toBeInTheDocument();
  });

  test("has correct data-testid attributes", () => {
    render(
      <FilterSection id="test-section" title="Test">
        <p>content</p>
      </FilterSection>,
    );

    expect(screen.getByTestId("filter-section-test-section")).toBeInTheDocument();
    expect(screen.getByTestId("filter-summary-test-section")).toBeInTheDocument();
    expect(screen.getByTestId("filter-content-test-section")).toBeInTheDocument();
  });

  test("applies active class when count > 0", () => {
    render(
      <FilterSection id="active" title="Active" count={2}>
        <p>content</p>
      </FilterSection>,
    );

    const details = screen.getByTestId("filter-section-active");
    expect(details.className).toContain("filter-section-active");
  });

  test("has accessible aria attributes", () => {
    render(
      <FilterSection id="accessible" title="Accessible">
        <p>content</p>
      </FilterSection>,
    );

    const details = screen.getByTestId("filter-section-accessible");
    expect(details).toHaveAttribute("aria-label", "Accessible filters section");

    const summary = screen.getByTestId("filter-summary-accessible");
    expect(summary).toHaveAttribute("aria-expanded", "false");
    expect(summary).toHaveAttribute("role", "button");
    expect(summary).toHaveAttribute("tabIndex", "0");
  });
});
