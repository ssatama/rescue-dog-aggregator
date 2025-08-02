import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import OrganizationHero from "../../components/organizations/OrganizationHero";

// Mock Next.js Link
jest.mock("next/link", () => {
  return function MockedLink({ children, href, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock countries utility
jest.mock("../../utils/countries", () => ({
  formatBasedIn: jest.fn((country, city, mobile) =>
    mobile ? `${country}` : `${country}${city ? ` (${city})` : ""}`,
  ),
  formatServiceRegions: jest.fn((regions, showFlags, mobile) =>
    mobile ? regions.slice(0, 2).join(", ") : regions.join(", "),
  ),
  formatShipsToList: jest.fn((countries, limit) =>
    countries.length <= limit
      ? countries.join(" ")
      : `${countries.slice(0, limit).join(" ")} +${countries.length - limit} more`,
  ),
  getCountryName: jest.fn(
    (code) => ({ TR: "Turkey", DE: "Germany", RO: "Romania" })[code] || code,
  ),
}));

// Mock SocialMediaLinks component
jest.mock("../../components/ui/SocialMediaLinks", () => {
  return function MockedSocialMediaLinks({ socialMedia }) {
    return <div data-testid="social-media-section">Social Links</div>;
  };
});

describe("Organization Statistics Bug Fix", () => {
  test("displays correct statistics when organization has enhanced data", () => {
    const organizationWithStats = {
      id: 1,
      name: "REAN (Rescuing European Animals in Need)",
      description:
        "UK charity rescuing dogs from Romanian shelters and streets, transporting to UK homes",
      country: "UK",
      city: "London",
      logo_url:
        "https://img1.wsimg.com/isteam/ip/a820747c-53ff-4d63-a4ae-ca1899d8137c/REAN%20LOGO.jpeg",
      service_regions: ["RO", "UK"],
      ships_to: ["UK", "GB"],
      total_dogs: 52,
      new_this_week: 8,
      website_url: "https://rean.org.uk",
      social_media: {
        facebook: "https://facebook.com/rean",
        instagram: "https://instagram.com/rean",
      },
    };

    render(<OrganizationHero organization={organizationWithStats} />);

    // Check that statistics show actual values, not 0
    expect(screen.getByText("52")).toBeInTheDocument(); // Total dogs
    expect(screen.getByText("Dogs Available")).toBeInTheDocument();

    expect(screen.getByText("2")).toBeInTheDocument(); // Ships to countries (UK, GB)
    expect(screen.getByText("Countries")).toBeInTheDocument();

    expect(screen.getByText("8")).toBeInTheDocument(); // New this week
    expect(screen.getByText("New This Week")).toBeInTheDocument();
  });

  test("handles zero statistics gracefully", () => {
    const organizationWithZeroStats = {
      id: 2,
      name: "Empty Organization",
      description: "An organization with no dogs",
      total_dogs: 0,
      ships_to: [],
      new_this_week: 0,
      service_regions: [],
      website_url: "https://example.org",
    };

    render(<OrganizationHero organization={organizationWithZeroStats} />);

    // Should display 0 for both statistics (there will be multiple 0s)
    const zeroElements = screen.getAllByText("0");
    expect(zeroElements.length).toBeGreaterThanOrEqual(2); // At least dogs and countries
    expect(screen.getByText("Dogs Available")).toBeInTheDocument();
    expect(screen.getByText("Countries")).toBeInTheDocument();

    // Should NOT display new this week section when 0
    expect(screen.queryByText("New This Week")).not.toBeInTheDocument();
  });

  test("handles missing statistics fields gracefully", () => {
    const organizationWithMissingStats = {
      id: 3,
      name: "Legacy Organization",
      description: "An organization without enhanced stats fields",
      // Missing: total_dogs, ships_to, new_this_week, service_regions
    };

    render(<OrganizationHero organization={organizationWithMissingStats} />);

    // Should display 0 for missing fields (multiple 0s expected)
    const zeroElements = screen.getAllByText("0");
    expect(zeroElements.length).toBeGreaterThanOrEqual(2); // At least dogs and countries
    expect(screen.getByText("Dogs Available")).toBeInTheDocument();
    expect(screen.getByText("Countries")).toBeInTheDocument();

    // Should NOT display new this week section when missing
    expect(screen.queryByText("New This Week")).not.toBeInTheDocument();
  });

  test("calculates countries served correctly from ships_to array", () => {
    const organizationWithManyCountries = {
      id: 4,
      name: "Multi-Country Org",
      ships_to: ["DE", "NL", "BE", "FR", "IT", "AT", "CH"], // 7 countries
      total_dogs: 100,
      new_this_week: 5,
    };

    render(<OrganizationHero organization={organizationWithManyCountries} />);

    // Should show 7 countries served
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Countries")).toBeInTheDocument();
  });
});
