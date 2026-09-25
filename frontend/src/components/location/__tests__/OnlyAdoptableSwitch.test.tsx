import React from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnlyAdoptableSwitch from "../OnlyAdoptableSwitch";
import AdoptableBadge from "../AdoptableBadge";
import { ANYWHERE, resetVisitorLocationForTests, setVisitorCountry } from "@/lib/visitorLocation";

jest.mock("@/lib/analytics", () => ({ trackLocationSet: jest.fn() }));
const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/dogs/senior",
  useSearchParams: () => new URLSearchParams("sex=Male"),
}));

const OPTIONS = ["Any country", "DE", "UK"];

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  // No connection country in these tests unless a test sets a choice
  sessionStorage.setItem("visitorCountryGeo", "");
  resetVisitorLocationForTests();
  replace.mockClear();
});

function renderSwitch(value = "Any country") {
  const onChange = jest.fn();
  render(<OnlyAdoptableSwitch countryOptions={OPTIONS} value={value} onChange={onChange} />);
  return onChange;
}

describe("OnlyAdoptableSwitch", () => {
  it("is hidden without a country", () => {
    renderSwitch();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("with no stored choice, never filters the list", () => {
    sessionStorage.setItem("visitorCountryGeo", "GB");
    resetVisitorLocationForTests();
    const onChange = renderSwitch();

    expect(screen.getByRole("switch", { name: /Only dogs I can adopt in .*United Kingdom/ })).toHaveAttribute("aria-checked", "false");
    expect(onChange).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("turns on with the catalog's own spelling and is remembered", async () => {
    act(() => setVisitorCountry("GB"));
    const onChange = renderSwitch();

    await userEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith("UK");
    expect(localStorage.getItem("onlyAdoptable")).toBe("true");
  });

  it("applies the remembered switch to a list without a country filter", () => {
    localStorage.setItem("visitorCountry", "GB");
    localStorage.setItem("onlyAdoptable", "true");
    renderSwitch();

    expect(replace).toHaveBeenCalledWith("/dogs/senior?sex=Male&available_country=UK", { scroll: false });
  });

  it("leaves a list alone that already has a country filter", () => {
    localStorage.setItem("visitorCountry", "GB");
    localStorage.setItem("onlyAdoptable", "true");
    const onChange = renderSwitch("DE");

    expect(onChange).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("disappears with Anywhere", () => {
    act(() => setVisitorCountry(ANYWHERE));
    renderSwitch();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("is hidden where no listed rescue adopts out", () => {
    act(() => setVisitorCountry("US"));
    renderSwitch();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });
});

describe("AdoptableBadge", () => {
  const dog = { organization: { id: 1, name: "Dogs Trust", ships_to: ["UK"] } };

  it("labels a dog the visitor can adopt", () => {
    act(() => setVisitorCountry("GB"));
    render(<AdoptableBadge dog={dog} />);
    expect(screen.getByText(/Adoptable to you/)).toHaveTextContent("in United Kingdom");
  });

  it("says nothing otherwise, and nothing with Anywhere", () => {
    act(() => setVisitorCountry("DE"));
    const { container, rerender } = render(<AdoptableBadge dog={dog} />);
    expect(container).toBeEmptyDOMElement();

    act(() => setVisitorCountry(ANYWHERE));
    rerender(<AdoptableBadge dog={dog} />);
    expect(container).toBeEmptyDOMElement();
  });
});
