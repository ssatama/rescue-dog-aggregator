import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdoptableToYouCount from "../AdoptableToYouCount";
import { resetVisitorLocationForTests } from "@/lib/visitorLocation";

describe("AdoptableToYouCount (#500, #501)", () => {
  const options = [
    { value: "DE", label: "Germany", count: 12 },
    { value: "UK", label: "United Kingdom", count: 30 },
  ];

  afterEach(() => {
    localStorage.clear();
    resetVisitorLocationForTests();
  });

  it("counts the dogs adoptable to the visitor's country and filters to them", () => {
    localStorage.setItem("visitorCountry", "DE");
    const onShow = jest.fn();
    render(<AdoptableToYouCount options={options} onShow={onShow} />);

    const button = screen.getByRole("button", { name: /12 adoptable to you in Germany/ });
    fireEvent.click(button);
    expect(onShow).toHaveBeenCalledWith("DE");
  });

  it("says nothing without a country, for Anywhere, or when none are adoptable there", () => {
    const { container, rerender } = render(<AdoptableToYouCount options={options} />);
    expect(container).toBeEmptyDOMElement();

    localStorage.setItem("visitorCountry", "ANYWHERE");
    resetVisitorLocationForTests();
    rerender(<AdoptableToYouCount options={options} />);
    expect(container).toBeEmptyDOMElement();

    localStorage.setItem("visitorCountry", "FR");
    resetVisitorLocationForTests();
    rerender(<AdoptableToYouCount options={options} />);
    expect(container).toBeEmptyDOMElement();
  });
});

