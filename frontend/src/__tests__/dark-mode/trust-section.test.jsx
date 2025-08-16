/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "../../test-utils";
import "@testing-library/jest-dom";
import TrustSection from "../../components/home/TrustSection";
import * as animalsService from "../../services/animalsService";

// Mock the animals service
jest.mock("../../services/animalsService");

// Mock OrganizationCard component
jest.mock("../../components/organizations/OrganizationCard", () => {
  return function MockOrganizationCard({ organization, size }) {
    return (
      <div
        data-testid="organization-card"
        data-org-id={organization.id}
        data-size={size}
      >
        {organization.name}
      </div>
    );
  };
});

// Mock UI components
jest.mock("@/components/ui/button", () => ({
  Button: function MockButton({ children, variant, className, ...props }) {
    return (
      <button className={className} {...props}>
        {children}
      </button>
    );
  },
}));

const mockStatistics = {
  total_dogs: 1250,
  total_organizations: 25,
  countries: ["DE", "TR", "GB", "FR", "NL"],
  organizations: [
    {
      id: 1,
      name: "REAN",
      dog_count: 125,
      ships_to: ["GB", "DE"],
      service_regions: ["GB"],
      recent_dogs: [],
      new_this_week: 5,
      social_media: {},
      logo_url: null,
      country: "GB",
      city: "London",
    },
    {
      id: 2,
      name: "Pets in Turkey",
      dog_count: 89,
      ships_to: ["DE", "NL"],
      service_regions: ["TR"],
      recent_dogs: [],
      new_this_week: 3,
      social_media: {},
      logo_url: null,
      country: "TR",
      city: "Istanbul",
    },
  ],
};

describe("TrustSection Dark Mode", () => {
  beforeEach(() => {
    // Reset document classes
    document.documentElement.className = "";
    jest.clearAllMocks();
  });

  test("section has proper dark mode background", async () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    animalsService.getStatistics.mockResolvedValue(mockStatistics);

    render(<TrustSection />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId("trust-section")).toBeInTheDocument();
    });

    const section = screen.getByTestId("trust-section");

    // Should have muted background which works with CSS variables
    expect(section).toHaveClass("bg-muted");

    // Verify dark class is applied to document
    expect(document.documentElement).toHaveClass("dark");
  });

  test("statistics cards have proper dark mode styling", async () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    animalsService.getStatistics.mockResolvedValue(mockStatistics);

    render(<TrustSection />);

    await waitFor(() => {
      expect(screen.getByTestId("trust-section")).toBeInTheDocument();
    });

    // Find the statistics cards by finding the card containers (should have bg-card class)
    const cardsContainer = screen.getByTestId("trust-section");
    const cards = cardsContainer.querySelectorAll(".bg-card");

    // Should have 3 statistics cards
    expect(cards).toHaveLength(3);

    // All cards should use bg-card class
    cards.forEach((card) => {
      expect(card).toHaveClass("bg-card");
      expect(card).toHaveClass("rounded-lg");
      expect(card).toHaveClass("shadow-sm");

      // Should have proper text content with foreground color
      const numberElement = card.querySelector(".text-foreground");
      expect(numberElement).toBeInTheDocument();
    });
  });

  test("icon backgrounds have dark mode styling", async () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    animalsService.getStatistics.mockResolvedValue(mockStatistics);

    render(<TrustSection />);

    await waitFor(() => {
      expect(screen.getByTestId("trust-section")).toBeInTheDocument();
    });

    // Check organization icon
    const orgIcon = screen.getByTestId("organizations-icon");
    expect(orgIcon).toHaveClass("bg-orange-100");
    expect(orgIcon).toHaveClass("dark:bg-orange-950/30");

    // Check dogs icon
    const dogsIcon = screen.getByTestId("dogs-icon");
    expect(dogsIcon).toHaveClass("bg-orange-100");
    expect(dogsIcon).toHaveClass("dark:bg-orange-950/30");

    // Check countries icon
    const countriesIcon = screen.getByTestId("countries-icon");
    expect(countriesIcon).toHaveClass("bg-green-100");
    expect(countriesIcon).toHaveClass("dark:bg-green-950/30");
  });

  test("organization cards are rendered with proper size", async () => {
    // Set dark mode
    document.documentElement.classList.add("dark");

    animalsService.getStatistics.mockResolvedValue(mockStatistics);

    render(<TrustSection />);

    await waitFor(() => {
      expect(screen.getByTestId("trust-section")).toBeInTheDocument();
    });

    // Should render organization cards
    const orgCards = screen.getAllByTestId("organization-card");
    expect(orgCards).toHaveLength(2);

    // All should be small size
    orgCards.forEach((card) => {
      expect(card).toHaveAttribute("data-size", "small");
    });
  });

  test("show more button has dark mode styling", async () => {
    // Set dark mode and create more organizations to trigger show more button
    document.documentElement.classList.add("dark");

    const manyOrganizations = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1,
      name: `Organization ${i + 1}`,
      dog_count: 50,
      ships_to: ["DE"],
      service_regions: ["DE"],
      recent_dogs: [],
      new_this_week: 2,
      social_media: {},
      logo_url: null,
      country: "DE",
      city: "Berlin",
    }));

    const manyOrgsStats = {
      ...mockStatistics,
      organizations: manyOrganizations,
    };

    animalsService.getStatistics.mockResolvedValue(manyOrgsStats);

    render(<TrustSection />);

    await waitFor(() => {
      expect(screen.getByTestId("trust-section")).toBeInTheDocument();
    });

    // Should have a show more button
    const showMoreButton = screen.getByText(/more organizations/);
    expect(showMoreButton).toBeInTheDocument();
    expect(showMoreButton).toHaveClass("text-orange-600");
    expect(showMoreButton).toHaveClass("hover:text-orange-800");
    expect(showMoreButton).toHaveClass("hover:bg-orange-50");
    expect(showMoreButton).toHaveClass("dark:hover:bg-orange-950/30");
  });
});
