import React from "react";
import { render, screen } from "../../../test-utils";
import HomeHero, { QUICK_CHIPS } from "../HomeHero";

jest.mock("../../search/GlobalSearch", () => ({
  __esModule: true,
  default: ({ surface }: { surface: string }) => <div data-testid={`search-${surface}`} />,
}));

describe("HomeHero", () => {
  it("leads with the one H1, the live numbers, the big search and the quick chips", () => {
    render(<HomeHero totalDogs={1722} totalRescues={11} />);

    expect(screen.getByRole("heading", { level: 1, name: "Find a rescue dog you can adopt" })).toBeInTheDocument();
    expect(screen.getByText(/1,722 dogs from 11 rescues/)).toBeInTheDocument();
    expect(screen.getByTestId("search-home")).toBeInTheDocument();
    const chips = screen.getAllByRole("link");
    expect(chips.map((chip) => chip.getAttribute("href"))).toEqual(QUICK_CHIPS.map((chip) => chip.href));
    expect(screen.getByRole("link", { name: "Good with children" })).toHaveAttribute("href", "/dogs?good_with_kids=true");
  });

  it("says the update frequency the scrapers keep and no jargon", () => {
    const { container } = render(<HomeHero totalDogs={1722} totalRescues={11} />);
    expect(container).toHaveTextContent("updated three times a week");
    expect(container).not.toHaveTextContent(/aggregat|twice weekly/i);
  });

  it("invents no numbers when the statistics are missing", () => {
    const { container } = render(<HomeHero totalDogs={0} totalRescues={0} />);
    expect(container).not.toHaveTextContent(/\d/);
  });
});
