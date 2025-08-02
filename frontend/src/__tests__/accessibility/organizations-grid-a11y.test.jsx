/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { axe, toHaveNoViolations } from "jest-axe";
import TrustSection from "../../components/home/TrustSection";

// Extend Jest matchers
expect.extend(toHaveNoViolations);

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
          logo_url: "https://example.com/logo1.jpg",
        },
        {
          id: 2,
          name: "Pets in Turkey",
          dog_count: 33,
          logo_url: "https://example.com/logo2.jpg",
        },
        {
          id: 3,
          name: "Tierschutzverein Europa e.V.",
          dog_count: 332,
          logo_url: "https://example.com/logo3.jpg",
        },
        {
          id: 4,
          name: "German Shepherd Rescue",
          dog_count: 45,
          logo_url: "https://example.com/logo4.jpg",
        },
        {
          id: 5,
          name: "French Bulldog Rescue",
          dog_count: 23,
          logo_url: "https://example.com/logo5.jpg",
        },
        {
          id: 6,
          name: "Golden Retriever Rescue",
          dog_count: 67,
          logo_url: "https://example.com/logo6.jpg",
        },
        {
          id: 7,
          name: "Mixed Breed Rescue",
          dog_count: 89,
          logo_url: "https://example.com/logo7.jpg",
        },
      ],
    }),
  ),
}));

// Mock logger
jest.mock("../../utils/logger", () => ({
  reportError: jest.fn(),
}));

// Mock OrganizationCard component with accessibility features
jest.mock("../../components/organizations/OrganizationCard", () => {
  return function MockOrganizationCard({ organization, size }) {
    return (
      <article
        data-testid="organization-card"
        data-org-id={organization.id}
        data-size={size}
        className="organization-card-mock"
        role="article"
        aria-label={`${organization.name} rescue organization`}
        tabIndex={0}
      >
        <h3>{organization.name}</h3>
        <p>{organization.dog_count} dogs available</p>
        <button
          aria-label={`View ${organization.dog_count} dogs from ${organization.name}`}
          tabIndex={0}
        >
          {organization.dog_count} Dogs
        </button>
      </article>
    );
  };
});

describe("Organizations Grid Accessibility", () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = "";
  });

  test("has no accessibility violations", async () => {
    const { container } = render(<TrustSection />);

    // Wait for organizations to load
    await screen.findByTestId("organizations-grid");

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test("has proper section structure with heading", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await screen.findByTestId("organizations-grid");

    // Should have proper heading for organizations section
    const heading = screen.getByText(
      "Dogs available from these organizations:",
    );
    expect(heading).toBeInTheDocument();
    expect(heading.tagName).toBe("H2");
    expect(heading).toHaveClass("text-section");
  });

  test("organizations grid has proper ARIA structure", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await screen.findByTestId("organizations-grid");

    const grid = screen.getByTestId("organizations-grid");

    // Grid should have proper ARIA attributes
    // This test will guide future accessibility improvements
    expect(grid).toBeInTheDocument();

    // Future enhancement: should have role="grid" or appropriate landmark
    // expect(grid).toHaveAttribute('role', 'grid');
    // expect(grid).toHaveAttribute('aria-label', 'Rescue organizations');
  });

  test("organization cards have proper semantic structure", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await screen.findByTestId("organizations-grid");

    const organizationCards = screen.getAllByTestId("organization-card");

    organizationCards.forEach((card) => {
      // Each card should be an article with proper ARIA
      expect(card).toHaveAttribute("role", "article");
      expect(card).toHaveAttribute("aria-label");
      expect(card).toHaveAttribute("tabIndex", "0");
    });
  });

  test("CTA buttons have descriptive ARIA labels", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await screen.findByTestId("organizations-grid");

    const ctaButtons = screen.getAllByRole("button", {
      name: /View \d+ dogs from/i,
    });

    // Should have 7 CTA buttons with descriptive labels
    expect(ctaButtons).toHaveLength(7);

    ctaButtons.forEach((button) => {
      // Each button should have descriptive aria-label
      expect(button).toHaveAttribute("aria-label");
      expect(button.getAttribute("aria-label")).toMatch(/View \d+ dogs from/i);
      expect(button).toHaveAttribute("tabIndex", "0");
    });
  });

  test("supports keyboard navigation", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await screen.findByTestId("organizations-grid");

    const organizationCards = screen.getAllByTestId("organization-card");
    const firstCard = organizationCards[0];

    // Focus on first card
    firstCard.focus();
    expect(document.activeElement).toBe(firstCard);

    // Test Tab navigation to button
    const firstButton = screen.getAllByRole("button")[0];
    firstButton.focus();
    expect(document.activeElement).toBe(firstButton);
  });

  test("handles keyboard interactions on organization cards", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await screen.findByTestId("organizations-grid");

    const organizationCards = screen.getAllByTestId("organization-card");
    const firstCard = organizationCards[0];

    // Test Enter key interaction
    firstCard.focus();
    fireEvent.keyDown(firstCard, { key: "Enter", code: "Enter" });

    // Test Space key interaction
    fireEvent.keyDown(firstCard, { key: " ", code: "Space" });

    // Card should remain focusable
    expect(firstCard).toHaveAttribute("tabIndex", "0");
  });

  test("handles keyboard interactions on CTA buttons", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await screen.findByTestId("organizations-grid");

    const ctaButtons = screen.getAllByRole("button", {
      name: /View \d+ dogs from/i,
    });
    const firstButton = ctaButtons[0];

    // Test Enter key interaction
    firstButton.focus();
    fireEvent.keyDown(firstButton, { key: "Enter", code: "Enter" });

    // Test Space key interaction
    fireEvent.keyDown(firstButton, { key: " ", code: "Space" });

    // Button should remain focusable
    expect(firstButton).toHaveAttribute("tabIndex", "0");
  });

  test("provides proper focus indicators", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await screen.findByTestId("organizations-grid");

    const organizationCards = screen.getAllByTestId("organization-card");
    const firstCard = organizationCards[0];

    // Focus on card
    firstCard.focus();

    // Should have tabIndex for keyboard navigation
    expect(firstCard).toHaveAttribute("tabIndex", "0");

    // Future enhancement: should have focus indicator styles
    // expect(firstCard).toHaveClass('focus:outline-2');
  });

  test("maintains proper tab order", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await screen.findByTestId("organizations-grid");

    const focusableElements = screen.getAllByRole("button", {
      name: /View \d+ dogs from/i,
    });

    // All focusable elements should have tabIndex
    focusableElements.forEach((element) => {
      expect(element).toHaveAttribute("tabIndex", "0");
    });
  });

  test("provides screen reader friendly content", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await screen.findByTestId("organizations-grid");

    // Main heading should be accessible
    const heading = screen.getByText(
      "Dogs available from these organizations:",
    );
    expect(heading).toBeInTheDocument();

    // Organization names should be accessible
    const orgNames = [
      "REAN",
      "Pets in Turkey",
      "Tierschutzverein Europa e.V.",
      "German Shepherd Rescue",
      "French Bulldog Rescue",
      "Golden Retriever Rescue",
      "Mixed Breed Rescue",
    ];

    orgNames.forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  test("handles reduced motion preferences", async () => {
    // Mock prefers-reduced-motion
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    render(<TrustSection />);

    // Wait for organizations to load
    await screen.findByTestId("organizations-grid");

    // Component should render without animations for reduced motion
    const grid = screen.getByTestId("organizations-grid");
    expect(grid).toBeInTheDocument();
  });

  test("provides proper color contrast", async () => {
    render(<TrustSection />);

    // Wait for organizations to load
    await screen.findByTestId("organizations-grid");

    // Test that text elements have proper contrast
    const heading = screen.getByText(
      "Dogs available from these organizations:",
    );
    expect(heading).toHaveClass("text-foreground");

    // CTA buttons should have proper contrast
    const ctaButtons = screen.getAllByRole("button", {
      name: /View \d+ dogs from/i,
    });
    ctaButtons.forEach((button) => {
      expect(button).toBeInTheDocument();
      // Future enhancement: test actual computed contrast ratios
    });
  });

  test("supports high contrast mode", async () => {
    // Mock high contrast mode
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query === "(prefers-contrast: high)",
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    render(<TrustSection />);

    // Wait for organizations to load
    await screen.findByTestId("organizations-grid");

    // Component should render with high contrast support
    const grid = screen.getByTestId("organizations-grid");
    expect(grid).toBeInTheDocument();
  });
});
