// Test to verify countries statistics consistency between HeroSection and TrustSection
import React from "react";
import { render, screen, waitFor } from "../test-utils";
import HeroSection from "../components/home/HeroSection";
import TrustSection from "../components/home/TrustSection";

// Mock the statistics service
jest.mock("../services/animalsService");
const { getStatistics } = require("../services/animalsService");

// Mock other dependencies for HeroSection
jest.mock("../utils/logger", () => ({
  reportError: jest.fn(),
}));

jest.mock("../components/ui/AnimatedCounter", () => {
  return function MockAnimatedCounter({ value, label, className }) {
    return (
      <span
        data-testid="animated-counter"
        className={className}
        aria-label={`${label}: ${value}`}
      >
        {value}
      </span>
    );
  };
});

jest.mock("next/link", () => {
  return function MockLink({ children, href, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

jest.mock("../components/organizations/OrganizationCard", () => {
  return function MockOrganizationCard({ organization, size }) {
    return (
      <div data-testid="organization-card">
        {organization.name} - {size}
      </div>
    );
  };
});

describe("Countries Statistics Consistency", () => {
  const mockStatistics = {
    total_dogs: 237,
    total_organizations: 12,
    countries: [
      { country: "Turkey", count: 150 },
      { country: "United States", count: 87 },
    ],
    organizations: [
      { id: 1, name: "Pets in Turkey", dog_count: 45 },
      { id: 2, name: "Berlin Rescue", dog_count: 23 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getStatistics.mockResolvedValue(mockStatistics);
  });

  test("HeroSection and TrustSection should display same countries count", async () => {
    // Render both sections with same data
    const { rerender } = render(<HeroSection />);

    await waitFor(() => {
      expect(screen.getByTestId("statistics-content")).toBeInTheDocument();
    });

    // Get countries count from HeroSection (should be 2)
    const heroCounters = screen.getAllByTestId("animated-counter");
    const heroCountriesCounter = heroCounters.find((counter) =>
      counter.getAttribute("aria-label")?.includes("Countries"),
    );
    expect(heroCountriesCounter).toHaveTextContent("2");

    // Clear and render TrustSection
    rerender(<TrustSection />);

    await waitFor(() => {
      expect(screen.getByTestId("trust-section")).toBeInTheDocument();
    });

    // Get countries count from TrustSection (should also be 2)
    expect(screen.getByText("2")).toBeInTheDocument(); // The countries stat
    expect(screen.getByText("Countries")).toBeInTheDocument();
  });

  test("both sections handle empty countries array correctly", async () => {
    const emptyCountriesStats = {
      ...mockStatistics,
      countries: [],
    };

    getStatistics.mockResolvedValue(emptyCountriesStats);

    const { rerender } = render(<HeroSection />);

    await waitFor(() => {
      expect(screen.getByTestId("statistics-content")).toBeInTheDocument();
    });

    // HeroSection should show 0 countries
    const heroCounters = screen.getAllByTestId("animated-counter");
    const heroCountriesCounter = heroCounters.find((counter) =>
      counter.getAttribute("aria-label")?.includes("Countries"),
    );
    expect(heroCountriesCounter).toHaveTextContent("0");

    // TrustSection should also show 0 countries
    rerender(<TrustSection />);

    await waitFor(() => {
      expect(screen.getByTestId("trust-section")).toBeInTheDocument();
    });

    // Find the countries stat specifically in TrustSection
    const trustSection = screen.getByTestId("trust-section");
    const countriesSection = trustSection.querySelector(
      '[data-testid="countries-icon"]',
    ).parentElement;
    expect(countriesSection.querySelector(".text-4xl")).toHaveTextContent("0");
  });

  test("both sections handle single country correctly", async () => {
    const singleCountryStats = {
      ...mockStatistics,
      countries: [{ country: "Turkey", count: 237 }],
    };

    getStatistics.mockResolvedValue(singleCountryStats);

    const { rerender } = render(<HeroSection />);

    await waitFor(() => {
      expect(screen.getByTestId("statistics-content")).toBeInTheDocument();
    });

    // HeroSection should show 1 country
    const heroCounters = screen.getAllByTestId("animated-counter");
    const heroCountriesCounter = heroCounters.find((counter) =>
      counter.getAttribute("aria-label")?.includes("Countries"),
    );
    expect(heroCountriesCounter).toHaveTextContent("1");

    // TrustSection should also show 1 country
    rerender(<TrustSection />);

    await waitFor(() => {
      expect(screen.getByTestId("trust-section")).toBeInTheDocument();
    });

    // Find the countries stat specifically in TrustSection
    const trustSection = screen.getByTestId("trust-section");
    const countriesSection = trustSection.querySelector(
      '[data-testid="countries-icon"]',
    ).parentElement;
    expect(countriesSection.querySelector(".text-4xl")).toHaveTextContent("1");
  });
});
