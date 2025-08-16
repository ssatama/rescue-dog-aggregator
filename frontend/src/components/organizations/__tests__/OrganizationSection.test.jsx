import React from "react";
import { render as rtlRender, screen } from "@testing-library/react";
import { render as customRender } from "../../../test-utils";
import "@testing-library/jest-dom";
import OrganizationSection from "../OrganizationSection";

// Use custom render for most tests, but rtlRender for null checks
const render = customRender;

// Mock Next.js Link component
jest.mock("next/link", () => {
  return function MockedLink({ children, href, ...props }) {
    // Render as anchor for testing
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

describe("OrganizationSection", () => {
  const mockOrganization = {
    id: 1,
    name: "Pets in Turkey",
    website_url: "https://example.org",
  };

  const mockOrganizationWithoutWebsite = {
    id: 2,
    name: "Test Rescue Organization",
  };

  describe("Basic Rendering", () => {
    test("renders organization section with complete data", () => {
      render(
        <OrganizationSection
          organization={mockOrganization}
          organizationId={1}
        />,
      );

      // Check if main container is rendered
      expect(screen.getByTestId("organization-section")).toBeInTheDocument();

      // Check header elements
      expect(screen.getByTestId("organization-header")).toBeInTheDocument();
      expect(screen.getByText("Rescue Organization")).toBeInTheDocument();

      // Check organization name
      expect(screen.getByTestId("organization-name")).toBeInTheDocument();
      expect(screen.getByText("Pets in Turkey")).toBeInTheDocument();

      // Check action links
      expect(screen.getByTestId("view-all-dogs-link")).toBeInTheDocument();
      expect(screen.getByTestId("visit-website-button")).toBeInTheDocument();
    });

    test("does not render when organization is null", () => {
      const { container } = rtlRender(
        <OrganizationSection organization={null} organizationId={1} />,
      );

      expect(container.firstChild).toBeNull();
    });

    test("does not render when organization is undefined", () => {
      const { container } = rtlRender(
        <OrganizationSection organizationId={1} />,
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("Organization Information Display", () => {
    test("displays organization name correctly", () => {
      render(
        <OrganizationSection
          organization={mockOrganization}
          organizationId={1}
        />,
      );

      const nameElement = screen.getByTestId("organization-name");
      expect(nameElement).toHaveTextContent("Pets in Turkey");
      expect(nameElement).toHaveClass(
        "text-2xl",
        "font-semibold",
        "text-gray-900",
      );
    });

    test('displays "Unknown Organization" when name is missing', () => {
      const orgWithoutName = { id: 1, website_url: "https://example.org" };

      render(
        <OrganizationSection
          organization={orgWithoutName}
          organizationId={1}
        />,
      );

      expect(screen.getByText("Unknown Organization")).toBeInTheDocument();
    });

    test("displays home icon and rescue organization label", () => {
      render(
        <OrganizationSection
          organization={mockOrganization}
          organizationId={1}
        />,
      );

      const header = screen.getByTestId("organization-header");
      const homeIcon = header.querySelector("svg");

      expect(homeIcon).toBeInTheDocument();
      expect(homeIcon).toHaveAttribute("aria-hidden", "true");
      expect(screen.getByText("Rescue Organization")).toBeInTheDocument();
    });
  });

  describe("Action Links", () => {
    test('renders "View all dogs" link with correct href', () => {
      render(
        <OrganizationSection
          organization={mockOrganization}
          organizationId={1}
        />,
      );

      const viewAllDogsLink = screen.getByTestId("view-all-dogs-link");
      expect(viewAllDogsLink).toBeInTheDocument();
      expect(viewAllDogsLink).toHaveAttribute(
        "href",
        "/dogs?organization_id=1",
      );
      expect(viewAllDogsLink).toHaveTextContent(
        "View all dogs from this rescue",
      );
    });

    test('does not render "View all dogs" link when organizationId is missing and organization has no id', () => {
      const orgWithoutId = { name: "Test Org" };
      render(<OrganizationSection organization={orgWithoutId} />);

      expect(
        screen.queryByTestId("view-all-dogs-link"),
      ).not.toBeInTheDocument();
    });

    test("uses organization.id as fallback for organizationId", () => {
      render(
        <OrganizationSection
          organization={mockOrganization}
          // No organizationId prop provided
        />,
      );

      const viewAllDogsLink = screen.getByTestId("view-all-dogs-link");
      expect(viewAllDogsLink).toHaveAttribute(
        "href",
        "/dogs?organization_id=1",
      );
    });

    test('renders "Visit Website" button with correct attributes', () => {
      render(
        <OrganizationSection
          organization={mockOrganization}
          organizationId={1}
        />,
      );

      const visitWebsiteButton = screen.getByTestId("visit-website-button");

      expect(visitWebsiteButton).toBeInTheDocument();
      expect(visitWebsiteButton).toHaveAttribute("href", "https://example.org");
      expect(visitWebsiteButton).toHaveAttribute("target", "_blank");
      expect(visitWebsiteButton).toHaveAttribute("rel", "noopener noreferrer");
      expect(visitWebsiteButton).toHaveTextContent("Visit Website");
    });

    test('does not render "Visit Website" button when website_url is missing', () => {
      render(
        <OrganizationSection
          organization={mockOrganizationWithoutWebsite}
          organizationId={2}
        />,
      );

      expect(
        screen.queryByTestId("visit-website-button"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Styling and Classes", () => {
    test("applies correct CSS classes to main container", () => {
      render(
        <OrganizationSection
          organization={mockOrganization}
          organizationId={1}
        />,
      );

      const container = screen.getByTestId("organization-section");
      expect(container).toHaveClass(
        "border",
        "rounded-lg",
        "p-6",
        "bg-gray-50",
      );
    });

    test("applies correct layout classes", () => {
      render(
        <OrganizationSection
          organization={mockOrganization}
          organizationId={1}
        />,
      );

      const container = screen.getByTestId("organization-section");
      const flexContainer = container.querySelector(
        ".flex.justify-between.items-start",
      );

      expect(flexContainer).toBeInTheDocument();
    });

    test("applies hover and transition classes to links", () => {
      render(
        <OrganizationSection
          organization={mockOrganization}
          organizationId={1}
        />,
      );

      const viewAllDogsLink = screen.getByTestId("view-all-dogs-link");
      expect(viewAllDogsLink).toHaveClass(
        "text-blue-600",
        "hover:text-blue-800",
        "transition-all",
        "duration-300",
        "bg-blue-50",
        "hover:bg-blue-100",
        "rounded-lg",
      );
    });
  });

  describe("Icons", () => {
    test("renders home icon in header", () => {
      render(
        <OrganizationSection
          organization={mockOrganization}
          organizationId={1}
        />,
      );

      const header = screen.getByTestId("organization-header");
      const homeIcon = header.querySelector("svg");

      expect(homeIcon).toBeInTheDocument();
      expect(homeIcon).toHaveClass("w-5", "h-5");
    });

    test('renders arrow icon in "View all dogs" link', () => {
      render(
        <OrganizationSection
          organization={mockOrganization}
          organizationId={1}
        />,
      );

      const viewAllDogsLink = screen.getByTestId("view-all-dogs-link");
      const arrowIcon = viewAllDogsLink.querySelector("svg");

      expect(arrowIcon).toBeInTheDocument();
      expect(arrowIcon).toHaveClass("w-4", "h-4");
    });

    test('renders external link icon in "Visit Website" button', () => {
      render(
        <OrganizationSection
          organization={mockOrganization}
          organizationId={1}
        />,
      );

      const visitWebsiteButton = screen.getByTestId("visit-website-button");
      const externalIcon = visitWebsiteButton.querySelector("svg");

      expect(externalIcon).toBeInTheDocument();
      expect(externalIcon).toHaveClass("w-4", "h-4");
    });
  });

  describe("Accessibility", () => {
    test("all SVG icons have aria-hidden attribute", () => {
      render(
        <OrganizationSection
          organization={mockOrganization}
          organizationId={1}
        />,
      );

      const allSvgs = screen
        .getByTestId("organization-section")
        .querySelectorAll("svg");
      allSvgs.forEach((svg) => {
        expect(svg).toHaveAttribute("aria-hidden", "true");
      });
    });

    test("external link has proper rel attributes", () => {
      render(
        <OrganizationSection
          organization={mockOrganization}
          organizationId={1}
        />,
      );

      const visitWebsiteButton = screen.getByTestId("visit-website-button");

      expect(visitWebsiteButton).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  describe("Security", () => {
    test("sanitizes organization name", () => {
      const orgWithMaliciousName = {
        id: 1,
        name: '<script>alert("xss")</script>Pets in Turkey',
        website_url: "https://example.org",
      };

      render(
        <OrganizationSection
          organization={orgWithMaliciousName}
          organizationId={1}
        />,
      );

      // The sanitizeText function should clean this up
      const nameElement = screen.getByTestId("organization-name");
      expect(nameElement.textContent).not.toContain("<script>");
    });
  });
});
