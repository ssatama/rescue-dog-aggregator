import { render, screen } from "@testing-library/react";
import CountriesHubClient from "../CountriesHubClient";

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({ children, href }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock Breadcrumbs component
jest.mock("@/components/ui/Breadcrumbs", () => {
  return function MockBreadcrumbs({ items }) {
    return <nav data-testid="breadcrumbs">{items.length} items</nav>;
  };
});

// Mock Card and Button
jest.mock("@/components/ui/card", () => ({
  Card: ({ children, className }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({ children }) => <button>{children}</button>,
}));

const mockInitialStats = {
  total: 4500,
  countries: [
    { code: "UK", count: 3000, organizations: 5 },
    { code: "DE", count: 800, organizations: 3 },
    { code: "SR", count: 200, organizations: 2 },
  ],
};

describe("CountriesHubClient", () => {
  it("renders hero section with title", () => {
    render(<CountriesHubClient initialStats={mockInitialStats} />);

    expect(screen.getByText(/Rescue Dogs by Country/i)).toBeInTheDocument();
  });

  it("displays total dog count in hero", () => {
    render(<CountriesHubClient initialStats={mockInitialStats} />);

    expect(screen.getByText(/4,500 dogs waiting/i)).toBeInTheDocument();
  });

  it("renders country cards for countries with dogs", () => {
    render(<CountriesHubClient initialStats={mockInitialStats} />);

    // Check for short names from COUNTRIES config
    expect(screen.getByText("UK")).toBeInTheDocument();
    expect(screen.getByText("Germany")).toBeInTheDocument();
    expect(screen.getByText("Serbia")).toBeInTheDocument();
  });

  it("renders country card links with lowercase href", () => {
    render(<CountriesHubClient initialStats={mockInitialStats} />);

    const ukLinks = screen.getAllByRole("link", { name: /UK/i });
    // First link is the hero preview card
    expect(ukLinks[0]).toHaveAttribute("href", "/dogs/country/uk");
  });

  it("displays dog counts per country", () => {
    render(<CountriesHubClient initialStats={mockInitialStats} />);

    // Counts may appear multiple times (hero preview + cards)
    expect(screen.getAllByText("3,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("800").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("200").length).toBeGreaterThanOrEqual(1);
  });

  it("renders breadcrumbs", () => {
    render(<CountriesHubClient initialStats={mockInitialStats} />);

    expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();
  });

  it("does not render Layout wrapper (Layout is at server page level)", () => {
    render(<CountriesHubClient initialStats={mockInitialStats} />);

    expect(screen.queryByTestId("layout")).not.toBeInTheDocument();
  });

  it("handles empty countries array gracefully", () => {
    const emptyStats = { total: 0, countries: [] };
    render(<CountriesHubClient initialStats={emptyStats} />);

    expect(screen.getByText(/Rescue Dogs by Country/i)).toBeInTheDocument();
    expect(screen.getByText(/0 dogs waiting/i)).toBeInTheDocument();
  });

  it("renders Browse All Dogs CTA", () => {
    render(<CountriesHubClient initialStats={mockInitialStats} />);

    expect(screen.getByText("Browse All Dogs")).toBeInTheDocument();
  });

  it("shows country count in subtitle", () => {
    render(<CountriesHubClient initialStats={mockInitialStats} />);

    expect(screen.getByText(/3 countries/i)).toBeInTheDocument();
  });
});