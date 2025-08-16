// src/components/home/__tests__/TrustSection.integration.test.jsx
// TDD Phase 2: RED - Tests for homepage OrganizationCard integration

import React from "react";
import { render, screen, waitFor } from "../../../test-utils";
import "@testing-library/jest-dom";
import TrustSection from "../TrustSection";
import { getStatistics } from "../../../services/animalsService";

// Mock the animalsService
jest.mock("../../../services/animalsService");

// Mock OrganizationCard to verify props
jest.mock("../../organizations/OrganizationCard", () => {
  return function MockOrganizationCard({ organization, size }) {
    return (
      <div
        data-testid="organization-card-mock"
        data-size={size}
        data-org-id={organization?.id}
        data-org-name={organization?.name}
      >
        OrganizationCard - {organization?.name} - Size: {size}
      </div>
    );
  };
});

// Mock other components
jest.mock("../../ui/LoadingSkeleton", () => ({
  TrustStatsSkeleton: () => (
    <div data-testid="trust-stats-skeleton">Loading...</div>
  ),
}));

jest.mock("../../../utils/logger", () => ({
  reportError: jest.fn(),
}));

jest.mock("next/link", () => {
  return function MockedLink({ children, href, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

describe("TrustSection Homepage Integration", () => {
  const mockStatistics = {
    total_dogs: 237,
    total_organizations: 12,
    countries: ["TR", "DE"],
    organizations: [
      { id: 1, name: "Org 1", dog_count: 20 },
      { id: 2, name: "Org 2", dog_count: 15 },
      { id: 3, name: "Org 3", dog_count: 10 },
      { id: 4, name: "Org 4", dog_count: 8 },
      { id: 5, name: "Org 5", dog_count: 5 },
      { id: 6, name: "Org 6", dog_count: 4 },
      { id: 7, name: "Org 7", dog_count: 3 },
      { id: 8, name: "Org 8", dog_count: 2 },
      { id: 9, name: "Org 9", dog_count: 1 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getStatistics.mockResolvedValue(mockStatistics);
  });

  describe("OrganizationCard Integration", () => {
    test("renders OrganizationCard components instead of simple cards", async () => {
      render(<TrustSection />);

      await waitFor(() => {
        const orgCards = screen.getAllByTestId("organization-card-mock");
        expect(orgCards).toHaveLength(8); // Top 8 organizations
      });
    });

    test('passes size="small" prop to all OrganizationCard components', async () => {
      render(<TrustSection />);

      await waitFor(() => {
        const orgCards = screen.getAllByTestId("organization-card-mock");
        orgCards.forEach((card) => {
          expect(card).toHaveAttribute("data-size", "small");
        });
      });
    });

    test("passes correct organization data to each card", async () => {
      render(<TrustSection />);

      await waitFor(() => {
        const orgCards = screen.getAllByTestId("organization-card-mock");

        // Check first card
        expect(orgCards[0]).toHaveAttribute("data-org-id", "1");
        expect(orgCards[0]).toHaveAttribute("data-org-name", "Org 1");

        // Check last card
        expect(orgCards[7]).toHaveAttribute("data-org-id", "8");
        expect(orgCards[7]).toHaveAttribute("data-org-name", "Org 8");
      });
    });

    test("maintains responsive grid layout", async () => {
      render(<TrustSection />);

      await waitFor(() => {
        const grid = screen.getByTestId("organizations-grid");
        expect(grid).toHaveClass(
          "grid",
          "grid-cols-1",
          "sm:grid-cols-2",
          "lg:grid-cols-3",
          "xl:grid-cols-4",
        );
      });
    });

    test("no longer renders simple icon-based cards", async () => {
      render(<TrustSection />);

      await waitFor(() => {
        // Should not find the old HeartIcon or building icon
        expect(screen.queryByTestId("building-icon")).not.toBeInTheDocument();

        // Should not find the old simple card structure
        const oldCards = screen.queryAllByTestId("organization-card");
        expect(oldCards).toHaveLength(0);
      });
    });

    test("removes Link wrapper around OrganizationCard", async () => {
      render(<TrustSection />);

      await waitFor(() => {
        // OrganizationCards should not be wrapped in Link components
        // as they handle their own navigation
        const orgCards = screen.getAllByTestId("organization-card-mock");
        orgCards.forEach((card) => {
          const parentLink = card.closest('a[href^="/organizations/"]');
          expect(parentLink).not.toBeInTheDocument();
        });
      });
    });

    test("grid adjusts properly for responsive design", async () => {
      const { container } = render(<TrustSection />);

      await waitFor(() => {
        const grid = container.querySelector(
          '[data-testid="organizations-grid"]',
        );
        // Should have proper responsive classes
        expect(grid.className).toMatch(
          /grid-cols-1.*sm:grid-cols-2.*lg:grid-cols-3.*xl:grid-cols-4/,
        );
      });
    });

    test("show more button still works with remaining organizations", async () => {
      render(<TrustSection />);

      await waitFor(() => {
        // Should show "1 more organization" since we have 9 orgs but show 8
        const showMoreBtn = screen.getByText(/\+ 1 more organization/);
        expect(showMoreBtn).toBeInTheDocument();
      });
    });
  });

  describe("Layout and Spacing", () => {
    test("maintains proper responsive spacing between cards", async () => {
      render(<TrustSection />);

      await waitFor(() => {
        const grid = screen.getByTestId("organizations-grid");
        expect(grid).toHaveClass("gap-4", "sm:gap-6", "lg:gap-8");
      });
    });

    test("section heading text is updated", async () => {
      render(<TrustSection />);

      await waitFor(() => {
        const heading = screen.getByText(
          "Dogs available from these organizations:",
        );
        expect(heading).toHaveClass("text-section", "mb-6");
      });
    });

    test("uses expanded max width constraint", async () => {
      render(<TrustSection />);

      await waitFor(() => {
        const grid = screen.getByTestId("organizations-grid");
        expect(grid).toHaveClass("max-w-7xl", "mx-auto");
      });
    });
  });

  describe("Error Handling", () => {
    test("handles API error gracefully", async () => {
      getStatistics.mockRejectedValue(new Error("API Error"));

      render(<TrustSection />);

      await waitFor(() => {
        expect(
          screen.getByText(/Unable to load statistics/),
        ).toBeInTheDocument();
      });
    });

    test("handles empty organizations array", async () => {
      getStatistics.mockResolvedValue({
        ...mockStatistics,
        organizations: [],
      });

      render(<TrustSection />);

      await waitFor(() => {
        // Should still render statistics but no org cards
        expect(screen.getByText("237")).toBeInTheDocument();
        expect(screen.queryAllByTestId("organization-card-mock")).toHaveLength(
          0,
        );
      });
    });
  });

  describe("Loading State", () => {
    test("shows skeleton while loading", () => {
      render(<TrustSection />);

      expect(screen.getByTestId("trust-stats-skeleton")).toBeInTheDocument();
    });

    test("removes skeleton after data loads", async () => {
      render(<TrustSection />);

      await waitFor(() => {
        expect(
          screen.queryByTestId("trust-stats-skeleton"),
        ).not.toBeInTheDocument();
      });
    });
  });
});
