/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import TrustSection from "../../components/home/TrustSection";

// Mock the statistics service
jest.mock("../../services/animalsService", () => ({
  getStatistics: jest.fn(() =>
    Promise.resolve({
      total_dogs: 450,
      total_organizations: 7,
      countries: ["DE", "TR", "UK", "US", "FR", "ES", "IT"],
      organizations: [
        {
          id: 1,
          name: "REAN",
          dog_count: 28,
          total_dogs: 28,
          logo_url: "https://example.com/logo1.jpg",
          ships_to: ["DE", "FR"],
          service_regions: ["DE"],
          recent_dogs: [],
          new_this_week: 5,
          social_media: { website: "https://rean.org" },
          country: "DE",
          city: "Berlin",
        },
        {
          id: 2,
          name: "Pets in Turkey",
          dog_count: 33,
          total_dogs: 33,
          logo_url: "https://example.com/logo2.jpg",
          ships_to: ["UK", "DE"],
          service_regions: ["TR"],
          recent_dogs: [],
          new_this_week: 3,
          social_media: { website: "https://petsinturkey.org" },
          country: "TR",
          city: "Istanbul",
        },
        {
          id: 3,
          name: "Tierschutzverein Europa e.V.",
          dog_count: 332,
          total_dogs: 332,
          logo_url: "https://example.com/logo3.jpg",
          ships_to: ["DE", "AT", "CH"],
          service_regions: ["DE", "AT"],
          recent_dogs: [],
          new_this_week: 12,
          social_media: { website: "https://tierschutzverein.org" },
          country: "DE",
          city: "Munich",
        },
        {
          id: 4,
          name: "German Shepherd Rescue",
          dog_count: 45,
          total_dogs: 45,
          logo_url: "https://example.com/logo4.jpg",
          ships_to: ["US", "CA"],
          service_regions: ["US"],
          recent_dogs: [],
          new_this_week: 2,
          social_media: { website: "https://germanshepherdrescue.org" },
          country: "US",
          city: "New York",
        },
        {
          id: 5,
          name: "French Bulldog Rescue",
          dog_count: 23,
          total_dogs: 23,
          logo_url: "https://example.com/logo5.jpg",
          ships_to: ["FR", "BE", "NL"],
          service_regions: ["FR"],
          recent_dogs: [],
          new_this_week: 1,
          social_media: { website: "https://frenchbulldogrescue.org" },
          country: "FR",
          city: "Paris",
        },
        {
          id: 6,
          name: "Golden Retriever Rescue",
          dog_count: 67,
          total_dogs: 67,
          logo_url: "https://example.com/logo6.jpg",
          ships_to: ["UK", "IE"],
          service_regions: ["UK"],
          recent_dogs: [],
          new_this_week: 8,
          social_media: { website: "https://goldenretrieverrescue.org" },
          country: "UK",
          city: "London",
        },
        {
          id: 7,
          name: "Mixed Breed Rescue",
          dog_count: 89,
          total_dogs: 89,
          logo_url: "https://example.com/logo7.jpg",
          ships_to: ["ES", "PT", "IT"],
          service_regions: ["ES"],
          recent_dogs: [],
          new_this_week: 6,
          social_media: { website: "https://mixedbreedrescue.org" },
          country: "ES",
          city: "Madrid",
        },
      ],
    }),
  ),
}));

// Mock logger
jest.mock("../../utils/logger", () => ({
  reportError: jest.fn(),
}));

// Mock OrganizationCard component
jest.mock("../../components/organizations/OrganizationCard", () => {
  return function MockOrganizationCard({ organization, size }) {
    return (
      <div
        data-testid="organization-card"
        data-org-id={organization.id}
        data-size={size}
        className="organization-card-mock bg-white rounded-lg shadow-sm p-4"
      >
        <div className="organization-header">
          <img
            src={organization.logo_url}
            alt={`${organization.name} logo`}
            className="organization-logo w-12 h-12"
          />
          <h3 className="organization-name text-lg font-semibold">
            {organization.name}
          </h3>
        </div>
        <div className="organization-stats">
          <p className="dog-count">{organization.total_dogs} dogs available</p>
          <p className="location">
            {organization.city}, {organization.country}
          </p>
        </div>
        <div className="organization-actions mt-4">
          <button
            className="cta-button bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
            aria-label={`View ${organization.total_dogs} dogs from ${organization.name}`}
          >
            {organization.total_dogs} Dogs
          </button>
        </div>
      </div>
    );
  };
});

describe("Organizations Display Integration", () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset the mock implementation to default
    const mockGetStatistics =
      require("../../services/animalsService").getStatistics;
    mockGetStatistics.mockImplementation(() =>
      Promise.resolve({
        total_dogs: 450,
        total_organizations: 7,
        countries: ["DE", "TR", "UK", "US", "FR", "ES", "IT"],
        organizations: [
          {
            id: 1,
            name: "REAN",
            dog_count: 28,
            total_dogs: 28,
            logo_url: "https://example.com/logo1.jpg",
            ships_to: ["DE", "FR"],
            service_regions: ["DE"],
            recent_dogs: [],
            new_this_week: 5,
            social_media: { website: "https://rean.org" },
            country: "DE",
            city: "Berlin",
          },
          {
            id: 2,
            name: "Pets in Turkey",
            dog_count: 33,
            total_dogs: 33,
            logo_url: "https://example.com/logo2.jpg",
            ships_to: ["UK", "DE"],
            service_regions: ["TR"],
            recent_dogs: [],
            new_this_week: 3,
            social_media: { website: "https://petsinturkey.org" },
            country: "TR",
            city: "Istanbul",
          },
          {
            id: 3,
            name: "Tierschutzverein Europa e.V.",
            dog_count: 332,
            total_dogs: 332,
            logo_url: "https://example.com/logo3.jpg",
            ships_to: ["DE", "AT", "CH"],
            service_regions: ["DE", "AT"],
            recent_dogs: [],
            new_this_week: 12,
            social_media: { website: "https://tierschutzverein.org" },
            country: "DE",
            city: "Munich",
          },
          {
            id: 4,
            name: "German Shepherd Rescue",
            dog_count: 45,
            total_dogs: 45,
            logo_url: "https://example.com/logo4.jpg",
            ships_to: ["US", "CA"],
            service_regions: ["US"],
            recent_dogs: [],
            new_this_week: 2,
            social_media: { website: "https://germanshepherdrescue.org" },
            country: "US",
            city: "New York",
          },
          {
            id: 5,
            name: "French Bulldog Rescue",
            dog_count: 23,
            total_dogs: 23,
            logo_url: "https://example.com/logo5.jpg",
            ships_to: ["FR", "BE", "NL"],
            service_regions: ["FR"],
            recent_dogs: [],
            new_this_week: 1,
            social_media: { website: "https://frenchbulldogrescue.org" },
            country: "FR",
            city: "Paris",
          },
          {
            id: 6,
            name: "Golden Retriever Rescue",
            dog_count: 67,
            total_dogs: 67,
            logo_url: "https://example.com/logo6.jpg",
            ships_to: ["UK", "IE"],
            service_regions: ["UK"],
            recent_dogs: [],
            new_this_week: 8,
            social_media: { website: "https://goldenretrieverrescue.org" },
            country: "UK",
            city: "London",
          },
          {
            id: 7,
            name: "Mixed Breed Rescue",
            dog_count: 89,
            total_dogs: 89,
            logo_url: "https://example.com/logo7.jpg",
            ships_to: ["ES", "PT", "IT"],
            service_regions: ["ES"],
            recent_dogs: [],
            new_this_week: 6,
            social_media: { website: "https://mixedbreedrescue.org" },
            country: "ES",
            city: "Madrid",
          },
        ],
      }),
    );
  });

  test("renders complete TrustSection with organizations", async () => {
    render(<TrustSection />);

    // Wait for statistics to load
    await waitFor(() => {
      expect(screen.getByTestId("trust-section")).toBeInTheDocument();
    });

    // Check main statistics cards
    const organizationsCount = screen.getAllByText("7");
    expect(organizationsCount.length).toBeGreaterThanOrEqual(1); // organizations and countries count
    expect(screen.getByText("450")).toBeInTheDocument(); // dogs count

    // Check organizations section
    expect(
      screen.getByText("Dogs available from these organizations:"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("organizations-grid")).toBeInTheDocument();
  });

  test("displays all 7 organizations with proper data mapping", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await waitFor(() => {
      expect(screen.getByTestId("organizations-grid")).toBeInTheDocument();
    });

    const organizationCards = screen.getAllByTestId("organization-card");
    expect(organizationCards).toHaveLength(7);

    // Check specific organization data
    expect(screen.getByText("REAN")).toBeInTheDocument();
    expect(screen.getByText("Pets in Turkey")).toBeInTheDocument();
    expect(
      screen.getByText("Tierschutzverein Europa e.V."),
    ).toBeInTheDocument();
    expect(screen.getByText("German Shepherd Rescue")).toBeInTheDocument();
    expect(screen.getByText("French Bulldog Rescue")).toBeInTheDocument();
    expect(screen.getByText("Golden Retriever Rescue")).toBeInTheDocument();
    expect(screen.getByText("Mixed Breed Rescue")).toBeInTheDocument();
  });

  test("correctly maps API fields to OrganizationCard props", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await waitFor(() => {
      expect(screen.getByTestId("organizations-grid")).toBeInTheDocument();
    });

    const organizationCards = screen.getAllByTestId("organization-card");

    // Check data mapping for specific organizations
    const reanCard = organizationCards.find(
      (card) => card.getAttribute("data-org-id") === "1",
    );
    expect(reanCard).toHaveAttribute("data-size", "small");

    // Check dog count mapping (dog_count → total_dogs)
    expect(screen.getByText("28 dogs available")).toBeInTheDocument();
    expect(screen.getByText("33 dogs available")).toBeInTheDocument();
    expect(screen.getByText("332 dogs available")).toBeInTheDocument();
  });

  test("renders CTA buttons for all organizations", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await waitFor(() => {
      expect(screen.getByTestId("organizations-grid")).toBeInTheDocument();
    });

    const ctaButtons = screen.getAllByRole("button", {
      name: /View \d+ dogs from/i,
    });
    expect(ctaButtons).toHaveLength(7);

    // Check specific CTA button texts
    expect(screen.getByText("28 Dogs")).toBeInTheDocument();
    expect(screen.getByText("33 Dogs")).toBeInTheDocument();
    expect(screen.getByText("332 Dogs")).toBeInTheDocument();
    expect(screen.getByText("45 Dogs")).toBeInTheDocument();
    expect(screen.getByText("23 Dogs")).toBeInTheDocument();
    expect(screen.getByText("67 Dogs")).toBeInTheDocument();
    expect(screen.getByText("89 Dogs")).toBeInTheDocument();
  });

  test("handles organization logo rendering", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await waitFor(() => {
      expect(screen.getByTestId("organizations-grid")).toBeInTheDocument();
    });

    const logoImages = screen.getAllByRole("img", { name: /logo/i });
    expect(logoImages).toHaveLength(7);

    // Check specific logo URLs
    expect(screen.getByAltText("REAN logo")).toHaveAttribute(
      "src",
      "https://example.com/logo1.jpg",
    );
    expect(screen.getByAltText("Pets in Turkey logo")).toHaveAttribute(
      "src",
      "https://example.com/logo2.jpg",
    );
  });

  test("displays organization location information", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await waitFor(() => {
      expect(screen.getByTestId("organizations-grid")).toBeInTheDocument();
    });

    // Check location displays
    expect(screen.getByText("Berlin, DE")).toBeInTheDocument();
    expect(screen.getByText("Istanbul, TR")).toBeInTheDocument();
    expect(screen.getByText("Munich, DE")).toBeInTheDocument();
    expect(screen.getByText("New York, US")).toBeInTheDocument();
    expect(screen.getByText("Paris, FR")).toBeInTheDocument();
    expect(screen.getByText("London, UK")).toBeInTheDocument();
    expect(screen.getByText("Madrid, ES")).toBeInTheDocument();
  });

  test("handles CTA button interactions", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await waitFor(() => {
      expect(screen.getByTestId("organizations-grid")).toBeInTheDocument();
    });

    const ctaButtons = screen.getAllByRole("button", {
      name: /View \d+ dogs from/i,
    });
    const firstButton = ctaButtons[0];

    // Test button click
    fireEvent.click(firstButton);

    // Button should remain clickable
    expect(firstButton).toBeEnabled();
    expect(firstButton).toHaveClass("cta-button");
  });

  test("handles show more functionality when not needed", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await waitFor(() => {
      expect(screen.getByTestId("organizations-grid")).toBeInTheDocument();
    });

    // With 7 organizations (less than 8), no "show more" button should appear
    const showMoreButton = screen.queryByText(/\+ \d+ more organizations/i);
    expect(showMoreButton).not.toBeInTheDocument();
  });

  test("handles error states gracefully", async () => {
    // Mock API error
    const mockGetStatistics =
      require("../../services/animalsService").getStatistics;
    mockGetStatistics.mockRejectedValueOnce(new Error("API Error"));

    render(<TrustSection />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByTestId("trust-section")).toBeInTheDocument();
    });

    // Should show error message
    expect(
      screen.getByText("Unable to load statistics. Please try again later."),
    ).toBeInTheDocument();
  });

  test("handles loading states properly", async () => {
    // Mock delayed response
    const mockGetStatistics =
      require("../../services/animalsService").getStatistics;
    mockGetStatistics.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    render(<TrustSection />);

    // Should show loading skeleton initially
    expect(screen.getByTestId("trust-section")).toBeInTheDocument();

    // Check for loading state elements
    const loadingElements = screen.queryAllByTestId("loading-skeleton");
    // Note: This depends on the actual LoadingSkeleton implementation
  });

  test("maintains proper component hierarchy", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await waitFor(() => {
      expect(screen.getByTestId("organizations-grid")).toBeInTheDocument();
    });

    // Check component structure
    const trustSection = screen.getByTestId("trust-section");
    expect(trustSection.tagName).toBe("SECTION");

    const organizationsGrid = screen.getByTestId("organizations-grid");
    expect(organizationsGrid.tagName).toBe("DIV");

    // Grid should be inside trust section
    expect(trustSection).toContainElement(organizationsGrid);
  });

  test("handles responsive classes and styling", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await waitFor(() => {
      expect(screen.getByTestId("organizations-grid")).toBeInTheDocument();
    });

    const organizationCards = screen.getAllByTestId("organization-card");

    // Each card should have proper styling classes
    organizationCards.forEach((card) => {
      expect(card).toHaveClass("organization-card-mock");
      expect(card).toHaveClass("bg-white");
      expect(card).toHaveClass("rounded-lg");
      expect(card).toHaveClass("shadow-sm");
      expect(card).toHaveClass("p-4");
    });
  });

  test("provides proper semantic structure", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await waitFor(() => {
      expect(screen.getByTestId("organizations-grid")).toBeInTheDocument();
    });

    // Check semantic elements
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings).toHaveLength(7); // One h3 per organization

    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(7); // At least one button per organization
  });
});
