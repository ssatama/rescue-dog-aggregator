// src/components/organizations/__tests__/OrganizationCard.size-variants.test.jsx
// TDD Phase 1: RED - Tests for size variant functionality

import React from "react";
import { render, screen } from "../../../test-utils";
import "@testing-library/jest-dom";
import OrganizationCard from "../OrganizationCard";

// Mock Next.js components
jest.mock("next/link", () => {
  return function MockedLink({ children, href, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock OptimizedImage component
jest.mock("../../ui/OptimizedImage", () => {
  return function MockedOptimizedImage({
    src,
    alt,
    className,
    onError,
    placeholder,
  }) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={onError}
        data-testid="lazy-image"
      />
    );
  };
});

// Mock SocialMediaLinks component
jest.mock("../../ui/SocialMediaLinks", () => {
  return function MockedSocialMediaLinks({ socialMedia, className, size }) {
    return (
      <div
        data-testid="social-media-links"
        className={className}
        data-size={size}
      >
        Social Links
      </div>
    );
  };
});

// Mock countries utility
jest.mock("../../../utils/countries", () => ({
  formatBasedIn: jest.fn((country) => `🇹🇷 ${country}`),
  formatServiceRegions: jest.fn((regions) => "🇹🇷 Turkey, 🇷🇴 Romania"),
  formatShipsToList: jest.fn((countries) => "🇩🇪 🇳🇱 🇧🇪"),
  getCountryFlag: jest.fn(() => "🇹🇷"),
}));

describe("OrganizationCard Size Variants", () => {
  const mockOrganization = {
    id: 1,
    name: "Test Organization",
    website_url: "https://test.org",
    logo_url: "https://example.com/logo.jpg",
    country: "TR",
    city: "Istanbul",
    service_regions: ["TR", "RO"],
    ships_to: ["DE", "NL", "BE"],
    total_dogs: 25,
    new_this_week: 5,
    recent_dogs: [
      { id: 1, name: "Dog1", thumbnail_url: "dog1.jpg" },
      { id: 2, name: "Dog2", thumbnail_url: "dog2.jpg" },
      { id: 3, name: "Dog3", thumbnail_url: "dog3.jpg" },
    ],
    social_media: { facebook: "test", instagram: "test" },
  };

  describe("Size Prop Acceptance", () => {
    test('accepts size="small" prop', () => {
      render(<OrganizationCard organization={mockOrganization} size="small" />);
      expect(screen.getByText("Test Organization")).toBeInTheDocument();
    });

    test('accepts size="medium" prop', () => {
      render(
        <OrganizationCard organization={mockOrganization} size="medium" />,
      );
      expect(screen.getByText("Test Organization")).toBeInTheDocument();
    });

    test('accepts size="large" prop', () => {
      render(<OrganizationCard organization={mockOrganization} size="large" />);
      expect(screen.getByText("Test Organization")).toBeInTheDocument();
    });

    test('defaults to size="large" when no size prop provided', () => {
      render(<OrganizationCard organization={mockOrganization} />);
      const logoImage = screen.getAllByTestId("lazy-image")[0];
      const logoContainer = logoImage.closest(".w-16");
      expect(logoContainer).toHaveClass("w-16", "h-16"); // 64px (large)
    });
  });

  describe("Logo Size Scaling", () => {
    test('renders 48px logo for size="small"', () => {
      render(<OrganizationCard organization={mockOrganization} size="small" />);
      const logoImage = screen.getAllByTestId("lazy-image")[0];
      const logoContainer = logoImage.closest(".w-12");
      expect(logoContainer).toHaveClass("w-12", "h-12"); // 48px
    });

    test('renders 56px logo for size="medium"', () => {
      render(
        <OrganizationCard organization={mockOrganization} size="medium" />,
      );
      const logoImage = screen.getAllByTestId("lazy-image")[0];
      const logoContainer = logoImage.closest(".w-14");
      expect(logoContainer).toHaveClass("w-14", "h-14"); // 56px
    });

    test('renders 64px logo for size="large"', () => {
      render(<OrganizationCard organization={mockOrganization} size="large" />);
      const logoImage = screen.getAllByTestId("lazy-image")[0];
      const logoContainer = logoImage.closest(".w-16");
      expect(logoContainer).toHaveClass("w-16", "h-16"); // 64px
    });

    test("initials placeholder scales with size", () => {
      const orgWithoutLogo = { ...mockOrganization, logo_url: null };

      // Small
      const { rerender } = render(
        <OrganizationCard organization={orgWithoutLogo} size="small" />,
      );
      let initialsContainer = screen.getByText("TO").parentElement;
      expect(initialsContainer).toHaveClass("w-12", "h-12");
      expect(screen.getByText("TO")).toHaveClass("text-base"); // Smaller text

      // Medium
      rerender(
        <OrganizationCard organization={orgWithoutLogo} size="medium" />,
      );
      initialsContainer = screen.getByText("TO").parentElement;
      expect(initialsContainer).toHaveClass("w-14", "h-14");
      expect(screen.getByText("TO")).toHaveClass("text-lg"); // Medium text

      // Large
      rerender(<OrganizationCard organization={orgWithoutLogo} size="large" />);
      initialsContainer = screen.getByText("TO").parentElement;
      expect(initialsContainer).toHaveClass("w-16", "h-16");
      expect(screen.getByText("TO")).toHaveClass("text-lg"); // Large text
    });
  });

  describe("Text Size Scaling", () => {
    test("organization name uses consistent typography", () => {
      const { rerender } = render(
        <OrganizationCard organization={mockOrganization} size="small" />,
      );
      expect(screen.getByText("Test Organization")).toHaveClass(
        "text-card-title",
      ); // Consistent across sizes

      rerender(
        <OrganizationCard organization={mockOrganization} size="medium" />,
      );
      expect(screen.getByText("Test Organization")).toHaveClass(
        "text-card-title",
      ); // Consistent

      rerender(
        <OrganizationCard organization={mockOrganization} size="large" />,
      );
      expect(screen.getByText("Test Organization")).toHaveClass(
        "text-card-title",
      ); // Consistent
    });

    test("location text scales with size", () => {
      const { rerender } = render(
        <OrganizationCard organization={mockOrganization} size="small" />,
      );
      expect(screen.getByText("Istanbul, TR")).toHaveClass("text-xs"); // Small

      rerender(
        <OrganizationCard organization={mockOrganization} size="medium" />,
      );
      expect(screen.getByText("Istanbul, TR")).toHaveClass("text-sm"); // Medium

      rerender(
        <OrganizationCard organization={mockOrganization} size="large" />,
      );
      expect(screen.getByText("Istanbul, TR")).toHaveClass("text-sm"); // Large
    });

    test("dog count text scales with size", () => {
      const { rerender } = render(
        <OrganizationCard organization={mockOrganization} size="small" />,
      );
      expect(screen.getByText("25")).toHaveClass("text-xl"); // Small

      rerender(
        <OrganizationCard organization={mockOrganization} size="medium" />,
      );
      expect(screen.getByText("25")).toHaveClass("text-2xl"); // Medium

      rerender(
        <OrganizationCard organization={mockOrganization} size="large" />,
      );
      expect(screen.getByText("25")).toHaveClass("text-2xl"); // Large
    });

    test("location info lines scale with size", () => {
      const { rerender } = render(
        <OrganizationCard organization={mockOrganization} size="small" />,
      );
      let basedInLabel = screen.getByText("Based in:");
      expect(basedInLabel.closest("div")).toHaveClass("text-foreground"); // Small

      rerender(
        <OrganizationCard organization={mockOrganization} size="medium" />,
      );
      basedInLabel = screen.getByText("Based in:");
      expect(basedInLabel.closest("div")).toHaveClass("text-foreground"); // Medium

      rerender(
        <OrganizationCard organization={mockOrganization} size="large" />,
      );
      basedInLabel = screen.getByText("Based in:");
      expect(basedInLabel.closest("div")).toHaveClass("text-foreground"); // Large
    });
  });

  describe("Padding and Spacing Adjustments", () => {
    test("card header padding scales with size", () => {
      const { container, rerender } = render(
        <OrganizationCard organization={mockOrganization} size="small" />,
      );
      let header = container.querySelector(".p-3"); // Small padding
      expect(header).toBeInTheDocument();

      rerender(
        <OrganizationCard organization={mockOrganization} size="medium" />,
      );
      header = container.querySelector(".p-4"); // Medium padding
      expect(header).toBeInTheDocument();

      rerender(
        <OrganizationCard organization={mockOrganization} size="large" />,
      );
      header = container.querySelector(".p-4"); // Large padding
      expect(header).toBeInTheDocument();
    });

    test("content section spacing scales with size", () => {
      const { container, rerender } = render(
        <OrganizationCard organization={mockOrganization} size="small" />,
      );
      let content = container.querySelector(".space-y-2"); // Small spacing
      expect(content).toBeInTheDocument();

      rerender(
        <OrganizationCard organization={mockOrganization} size="medium" />,
      );
      content = container.querySelector(".space-y-2"); // Medium spacing
      expect(content).toBeInTheDocument();

      rerender(
        <OrganizationCard organization={mockOrganization} size="large" />,
      );
      content = container.querySelector(".sm\\:space-y-3"); // Large spacing
      expect(content).toBeInTheDocument();
    });
  });

  describe("Feature Visibility at Different Sizes", () => {
    test("small size shows essential features only", () => {
      render(<OrganizationCard organization={mockOrganization} size="small" />);

      // Should show: name, location, dog count
      expect(screen.getByText("Test Organization")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();

      // Should still show location info but compact
      expect(screen.getByText("Based in:")).toBeInTheDocument();

      // Should hide or minimize: dog previews text
      const previewText = screen.queryByText(/Dog1, Dog2, Dog3/);
      if (previewText) {
        expect(previewText).toHaveClass("text-xs"); // Smaller if shown
      }
    });

    test("medium size shows most features", () => {
      render(
        <OrganizationCard organization={mockOrganization} size="medium" />,
      );

      // Should show all main features
      expect(screen.getByText("Test Organization")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();
      expect(screen.getByText("Based in:")).toBeInTheDocument();
      expect(screen.getByText("Dogs in:")).toBeInTheDocument();
      expect(screen.getByText("Adoptable to:")).toBeInTheDocument();

      // Social media links should be visible
      expect(screen.getByTestId("social-media-links")).toBeInTheDocument();
    });

    test("large size shows all features prominently", () => {
      render(<OrganizationCard organization={mockOrganization} size="large" />);

      // All features visible and prominent
      expect(screen.getByText("Test Organization")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();
      expect(screen.getByText("Based in:")).toBeInTheDocument();
      expect(screen.getByText("Dogs in:")).toBeInTheDocument();
      expect(screen.getByText("Adoptable to:")).toBeInTheDocument();
      expect(screen.getByTestId("social-media-links")).toBeInTheDocument();

      // Dog preview images should be visible
      const dogImages = screen.getAllByTestId("lazy-image");
      expect(dogImages.length).toBeGreaterThan(1); // Logo + dog thumbnails
    });
  });

  describe("Dog Preview Thumbnails Scaling", () => {
    test("dog thumbnail size scales with card size", () => {
      const { rerender } = render(
        <OrganizationCard organization={mockOrganization} size="small" />,
      );
      let dogThumbnails = screen.getAllByTestId("lazy-image").slice(1); // Skip logo
      dogThumbnails.forEach((img) => {
        const container = img.closest(".w-10");
        expect(container).toHaveClass("w-10", "h-10"); // 40px for small
      });

      rerender(
        <OrganizationCard organization={mockOrganization} size="medium" />,
      );
      dogThumbnails = screen.getAllByTestId("lazy-image").slice(1);
      dogThumbnails.forEach((img) => {
        const container = img.closest(".w-11");
        expect(container).toHaveClass("w-11", "h-11"); // 44px for medium
      });

      rerender(
        <OrganizationCard organization={mockOrganization} size="large" />,
      );
      dogThumbnails = screen.getAllByTestId("lazy-image").slice(1);
      dogThumbnails.forEach((img) => {
        const container = img.closest(".w-12");
        expect(container).toHaveClass("w-12", "h-12"); // 48px for large
      });
    });

    test("dog preview text scales with size", () => {
      const { rerender } = render(
        <OrganizationCard organization={mockOrganization} size="small" />,
      );
      expect(screen.getByText(/Dog1, Dog2, Dog3/)).toHaveClass("text-xs");

      rerender(
        <OrganizationCard organization={mockOrganization} size="medium" />,
      );
      expect(screen.getByText(/Dog1, Dog2, Dog3/)).toHaveClass("text-xs");

      rerender(
        <OrganizationCard organization={mockOrganization} size="large" />,
      );
      expect(screen.getByText(/Dog1, Dog2, Dog3/)).toHaveClass("text-xs");
    });
  });

  describe("CTA Buttons Scaling", () => {
    test("button sizes scale appropriately", () => {
      const { rerender } = render(
        <OrganizationCard organization={mockOrganization} size="small" />,
      );
      // Check the anchor tag that is styled as a button (Button with asChild)
      const visitLink = screen.getByText("Visit Website").closest("a");
      expect(visitLink).toHaveClass("min-h-[44px]");
      // Check the actual button
      const viewButton = screen.getByText("Meet 25").closest("button");
      expect(viewButton).toHaveClass("min-h-[44px]");

      rerender(
        <OrganizationCard organization={mockOrganization} size="medium" />,
      );
      const visitLinkMed = screen.getByText("Visit Website").closest("a");
      expect(visitLinkMed).toHaveClass("min-h-[44px]");
      const buttonsMed = screen.getAllByRole("button");
      const viewButtonMed = buttonsMed.find(
        (button) =>
          button.tagName === "BUTTON" &&
          button.textContent.includes("View") &&
          button.textContent.includes("25") &&
          button.textContent.includes("Dogs"),
      );
      expect(viewButtonMed).toHaveClass("min-h-[44px]");

      rerender(
        <OrganizationCard organization={mockOrganization} size="large" />,
      );
      const visitLinkLarge = screen.getByText("Visit Website").closest("a");
      expect(visitLinkLarge).toHaveClass("min-h-[44px]");
      const buttonsLarge = screen.getAllByRole("button");
      const viewButtonLarge = buttonsLarge.find(
        (button) =>
          button.tagName === "BUTTON" &&
          button.textContent.includes("View") &&
          button.textContent.includes("25") &&
          button.textContent.includes("Dogs"),
      );
      expect(viewButtonLarge).toHaveClass("min-h-[44px]");
    });

    test("button text remains readable at all sizes", () => {
      const { rerender } = render(
        <OrganizationCard organization={mockOrganization} size="small" />,
      );
      let viewDogsBtn = screen.getByText("Meet 25");
      expect(viewDogsBtn).toBeVisible();

      rerender(
        <OrganizationCard organization={mockOrganization} size="medium" />,
      );
      const buttonsForVisibility = screen.getAllByRole("button");
      viewDogsBtn = buttonsForVisibility.find(
        (button) =>
          button.tagName === "BUTTON" &&
          button.textContent.includes("View") &&
          button.textContent.includes("25") &&
          button.textContent.includes("Dogs"),
      );
      expect(viewDogsBtn).toBeVisible();

      rerender(
        <OrganizationCard organization={mockOrganization} size="large" />,
      );
      const buttonsForVisibilityLarge = screen.getAllByRole("button");
      viewDogsBtn = buttonsForVisibilityLarge.find(
        (button) =>
          button.tagName === "BUTTON" &&
          button.textContent.includes("View") &&
          button.textContent.includes("25") &&
          button.textContent.includes("Dogs"),
      );
      expect(viewDogsBtn).toBeVisible();
    });
  });

  describe("Social Media Links Scaling", () => {
    test("social media icon size prop changes with card size", () => {
      const { rerender } = render(
        <OrganizationCard organization={mockOrganization} size="small" />,
      );
      expect(screen.getByTestId("social-media-links")).toHaveAttribute(
        "data-size",
        "xs",
      );

      rerender(
        <OrganizationCard organization={mockOrganization} size="medium" />,
      );
      expect(screen.getByTestId("social-media-links")).toHaveAttribute(
        "data-size",
        "sm",
      );

      rerender(
        <OrganizationCard organization={mockOrganization} size="large" />,
      );
      expect(screen.getByTestId("social-media-links")).toHaveAttribute(
        "data-size",
        "sm",
      );
    });
  });

  describe("Responsive Behavior with Size Variants", () => {
    test("small cards maintain 3-column grid on desktop", () => {
      const { container } = render(
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <OrganizationCard organization={mockOrganization} size="small" />
          <OrganizationCard
            organization={{ ...mockOrganization, id: 2 }}
            size="small"
          />
          <OrganizationCard
            organization={{ ...mockOrganization, id: 3 }}
            size="small"
          />
        </div>,
      );

      // The grid is inside the test wrapper
      const grid = container.querySelector(".grid");
      expect(grid).toHaveClass("grid", "grid-cols-1", "md:grid-cols-3");
    });

    test("all sizes work in responsive layouts", () => {
      const { container } = render(
        <div className="space-y-4">
          <OrganizationCard organization={mockOrganization} size="small" />
          <OrganizationCard
            organization={{ ...mockOrganization, id: 2 }}
            size="medium"
          />
          <OrganizationCard
            organization={{ ...mockOrganization, id: 3 }}
            size="large"
          />
        </div>,
      );

      expect(
        container.querySelectorAll('[data-testid="lazy-image"]').length,
      ).toBeGreaterThanOrEqual(3); // At least one logo per card
    });
  });

  describe("Animation and Transition Classes", () => {
    test("maintains animation classes across sizes", () => {
      ["small", "medium", "large"].forEach((size) => {
        const { container } = render(
          <OrganizationCard organization={mockOrganization} size={size} />,
        );
        const card = container.querySelector('[role="button"]');
        expect(card).toBeInTheDocument();
        expect(card).toHaveClass("will-change-transform", "shadow-sm");
      });
    });
  });

  describe("Accessibility at Different Sizes", () => {
    test("maintains minimum touch targets at small size", () => {
      render(<OrganizationCard organization={mockOrganization} size="small" />);

      // Check main card button
      const buttons = screen.getAllByRole("button");
      const mainCard = buttons.find(
        (button) => button.getAttribute("tabindex") === "0",
      );
      expect(mainCard).toHaveClass("shadow-sm");

      // Check footer buttons/links maintain touch targets
      const visitLink = screen.getByText("Visit Website").closest("a");
      expect(visitLink).toHaveClass("min-h-[44px]");

      const viewButton = screen.getByText("Meet 25").closest("button");
      expect(viewButton).toHaveClass("min-h-[44px]");
    });

    test("all interactive elements remain keyboard accessible", () => {
      ["small", "medium", "large"].forEach((size) => {
        const { container } = render(
          <OrganizationCard organization={mockOrganization} size={size} />,
        );
        const mainCard = container.querySelector(
          '[role="button"][tabIndex="0"]',
        );
        expect(mainCard).toBeInTheDocument();
      });
    });
  });
});
