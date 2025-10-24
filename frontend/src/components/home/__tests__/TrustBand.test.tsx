// frontend/src/components/home/__tests__/TrustBand.test.tsx

import React from "react";
import { render, screen } from "../../../test-utils";
import TrustBand from "../TrustBand";

// Mock Next.js Image component
jest.mock("next/image", () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe("TrustBand", () => {
  const mockOrganizations = [
    { id: 1, name: "Rescue Org 1", logo_url: "/logos/org1.png" },
    { id: 2, name: "Rescue Org 2", logo_url: "/logos/org2.png" },
    { id: 3, name: "Rescue Org 3", logo_url: "/logos/org3.png" },
    { id: 4, name: "Rescue Org 4", logo_url: "/logos/org4.png" },
    { id: 5, name: "Rescue Org 5", logo_url: "/logos/org5.png" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Loading State", () => {
    test("should show loading skeleton when no organizations provided", () => {
      render(<TrustBand initialOrganizations={[]} />);

      // Should show loading placeholders
      const placeholders = screen
        .getAllByRole("generic")
        .filter((el) => el.className.includes("animate-pulse"));
      expect(placeholders.length).toBeGreaterThan(0);
    });

    test("should display default count when no organizations provided", () => {
      render(<TrustBand />);

      expect(
        screen.getByText(/Aggregating rescue dogs from multiple organizations/),
      ).toBeInTheDocument();
    });
  });

  describe("Successful Data Display", () => {
    test("should render text with organization count", () => {
      render(<TrustBand initialOrganizations={mockOrganizations} />);

      expect(
        screen.getByText(
          /Aggregating rescue dogs from 5 organizations across Europe & UK/,
        ),
      ).toBeInTheDocument();
    });

    test("should display organization logos", () => {
      render(<TrustBand initialOrganizations={mockOrganizations} />);

      const logo1 = screen.getByAltText("Rescue Org 1");
      expect(logo1).toBeInTheDocument();
      expect(logo1).toHaveAttribute("src", "/logos/org1.png");
    });

    test("should show max 8 logos", () => {
      const manyOrgs = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        name: `Org ${i}`,
        logo_url: `/logo${i}.png`,
      }));

      render(<TrustBand initialOrganizations={manyOrgs} />);

      const logos = screen.getAllByRole("img");
      expect(logos).toHaveLength(8);
    });

    test("should apply grayscale filter to logos", () => {
      render(<TrustBand initialOrganizations={mockOrganizations} />);

      const logo = screen.getByAltText("Rescue Org 1");
      expect(logo).toHaveClass("grayscale-[50%]", "opacity-70");
    });

    test("should have hover effect on logos", () => {
      render(<TrustBand initialOrganizations={mockOrganizations} />);

      const logo = screen.getByAltText("Rescue Org 1");
      expect(logo).toHaveClass(
        "hover:opacity-100",
        "hover:grayscale-0",
        "hover:scale-110",
        "transition-all",
      );
    });

    test("should update total count from props", () => {
      const customOrgs = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        name: `Org ${i}`,
        logo_url: `/logo${i}.png`,
      }));

      render(<TrustBand initialOrganizations={customOrgs} />);

      expect(
        screen.getByText(/Aggregating rescue dogs from 20 organizations/),
      ).toBeInTheDocument();
    });

    test("should show additional organizations message when more than 8", () => {
      const manyOrgs = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        name: `Org ${i}`,
        logo_url: `/logo${i}.png`,
      }));

      render(<TrustBand initialOrganizations={manyOrgs} />);

      expect(screen.getByText(/\+ 7 more organizations/)).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    test("should handle empty organizations array", () => {
      render(<TrustBand initialOrganizations={[]} />);

      const logos = screen.queryAllByRole("img");
      expect(logos).toHaveLength(0);
    });

    test("should handle missing logo_url", () => {
      const orgsWithoutLogos = [
        { id: 1, name: "Org 1" } as any, // No logo_url
        { id: 2, name: "Org 2", logo_url: "/logo.png" },
      ];

      render(<TrustBand initialOrganizations={orgsWithoutLogos} />);

      const logos = screen.queryAllByRole("img");
      expect(logos).toHaveLength(1); // Only the one with logo_url
    });
  });

  describe("Responsive Design", () => {
    test("should have responsive padding", () => {
      const { container } = render(<TrustBand initialOrganizations={mockOrganizations} />);

      const section = container.querySelector("section");
      expect(section).toHaveClass("py-32");
    });

    test("should have centered layout", () => {
      const { container } = render(<TrustBand initialOrganizations={mockOrganizations} />);

      const innerDiv = container.querySelector(".max-w-7xl");
      expect(innerDiv).toHaveClass("mx-auto", "px-4", "text-center");
    });

    test("should use grid layout for responsive display", () => {
      const { container } = render(<TrustBand initialOrganizations={mockOrganizations} />);

      const logosContainer = container.querySelector(".grid");
      expect(logosContainer).toBeInTheDocument();
      expect(logosContainer).toHaveClass("grid-cols-2", "md:grid-cols-4");
    });
  });

  describe("Dark Mode", () => {
    test("should have dark mode classes", () => {
      const { container } = render(<TrustBand initialOrganizations={mockOrganizations} />);

      const section = container.querySelector("section");
      expect(section).toHaveClass("bg-gray-100", "dark:bg-gray-800");
    });

    test("should have dark mode text colors", () => {
      render(<TrustBand initialOrganizations={mockOrganizations} />);

      const text = screen.getByText(/Aggregating rescue dogs from/);
      expect(text).toHaveClass("text-gray-700", "dark:text-gray-300");
    });
  });

  describe("Accessibility", () => {
    test("should use semantic section element", () => {
      const { container } = render(<TrustBand initialOrganizations={mockOrganizations} />);

      const section = container.querySelector("section");
      expect(section).toBeInTheDocument();
    });

    test("should have aria-label on section", () => {
      const { container } = render(<TrustBand initialOrganizations={mockOrganizations} />);

      const section = container.querySelector("section");
      expect(section).toHaveAttribute(
        "aria-label",
        "Partner rescue organizations",
      );
    });

    test("should have alt text for all logos", () => {
      render(<TrustBand initialOrganizations={mockOrganizations} />);

      mockOrganizations.forEach((org) => {
        const logo = screen.getByAltText(org.name);
        expect(logo).toBeInTheDocument();
      });
    });
  });
});