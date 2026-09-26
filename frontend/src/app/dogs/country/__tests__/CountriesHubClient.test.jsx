import { render, screen } from "@testing-library/react";
import CountriesHubClient from "../CountriesHubClient";

jest.mock("@/components/ui/Breadcrumbs", () => {
  return function MockBreadcrumbs({ items }) {
    return <nav data-testid="breadcrumbs">{items.length} items</nav>;
  };
});

const initialStats = {
  total: 4000,
  countries: [
    { code: "DE", count: 800, organizations: 3 },
    { code: "UK", count: 3000, organizations: 5 },
    { code: "IT", count: 0, organizations: 0 },
  ],
};
const adoptableOptions = [
  { value: "UK", label: "UK", count: 3200 },
  { value: "DE", label: "DE", count: 900 },
];

describe("CountriesHubClient", () => {
  it("lists countries with dogs, most dogs first, linking to lowercase URLs", () => {
    render(<CountriesHubClient initialStats={initialStats} adoptableOptions={adoptableOptions} />);

    const links = screen.getAllByRole("link").filter((link) => link.getAttribute("href").startsWith("/dogs/country/"));
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/dogs/country/uk", "/dogs/country/de"]);
  });

  it("gives both numbers for each country", () => {
    render(<CountriesHubClient initialStats={initialStats} adoptableOptions={adoptableOptions} />);

    expect(screen.getByText("3,000 dogs in the UK")).toBeInTheDocument();
    expect(screen.getByText("3,200 adoptable by people living there")).toBeInTheDocument();
    expect(screen.getByText("800 dogs in Germany")).toBeInTheDocument();
  });

  it("leaves the adoptable line out without counts", () => {
    render(<CountriesHubClient initialStats={initialStats} />);

    expect(screen.queryByText(/adoptable by people living there/)).not.toBeInTheDocument();
  });

  it("still offers every dog with no countries", () => {
    render(<CountriesHubClient initialStats={{ total: 0, countries: [] }} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rescue dogs by country");
    expect(screen.getByRole("link", { name: /Browse every dog/ })).toHaveAttribute("href", "/dogs");
  });
});
