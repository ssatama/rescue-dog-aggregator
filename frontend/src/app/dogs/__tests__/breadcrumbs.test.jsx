/**
 * Tests for breadcrumb implementation on Dogs page
 * Following TDD approach
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import DogsPageClientSimplified from "../DogsPageClientSimplified";

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/dogs",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock layout
jest.mock("../../../components/layout/Layout", () => {
  return function Layout({ children }) {
    return <div>{children}</div>;
  };
});

// Mock breadcrumb components
jest.mock("../../../components/ui/Breadcrumbs", () => {
  return function Breadcrumbs({ items }) {
    return (
      <nav aria-label="Breadcrumb" data-testid="breadcrumbs">
        <ol>
          {items.map((item, index) => (
            <li key={index}>
              {item.url ? (
                <a href={item.url}>{item.name}</a>
              ) : (
                <span>{item.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    );
  };
});

jest.mock("../../../components/seo", () => ({
  BreadcrumbSchema: ({ items }) => (
    <script
      type="application/ld+json"
      data-testid="breadcrumb-schema"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
          })),
        }),
      }}
    />
  ),
}));

// Mock other components
jest.mock("../../../components/dogs/DogCardOptimized", () => {
  return function DogCardOptimized({ dog }) {
    return <div data-testid="dog-card">{dog.name}</div>;
  };
});

jest.mock("../../../components/filters/DesktopFilters", () => {
  return function DesktopFilters() {
    return <div data-testid="desktop-filters">Desktop Filters</div>;
  };
});

jest.mock("../../../components/filters/MobileFilterDrawer", () => {
  return function MobileFilterDrawer() {
    return <div data-testid="mobile-filter-drawer">Mobile Filter Drawer</div>;
  };
});

describe("DogsPageClientSimplified Breadcrumbs", () => {
  const mockInitialDogs = [
    {
      id: 1,
      name: "Buddy",
      breed: "Labrador",
      slug: "buddy-1",
    },
    {
      id: 2,
      name: "Max",
      breed: "German Shepherd",
      slug: "max-2",
    },
  ];

  const mockMetadata = {
    organizations: [
      { id: 1, name: "Test Org 1" },
      { id: 2, name: "Test Org 2" },
    ],
  };

  test("should render breadcrumb navigation", () => {
    render(
      <DogsPageClientSimplified
        initialDogs={mockInitialDogs}
        metadata={mockMetadata}
      />,
    );

    const breadcrumbs = screen.getByTestId("breadcrumbs");
    expect(breadcrumbs).toBeInTheDocument();
    expect(screen.getByLabelText("Breadcrumb")).toBeInTheDocument();
  });

  test("should display correct breadcrumb items", () => {
    render(
      <DogsPageClientSimplified
        initialDogs={mockInitialDogs}
        metadata={mockMetadata}
      />,
    );

    // Check for Home link
    const homeLink = screen.getByRole("link", { name: "Home" });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/");

    // Check for current page (Find Dogs - no link)
    const currentPage = screen.getByText("Find Dogs");
    expect(currentPage).toBeInTheDocument();
    expect(currentPage.tagName).toBe("SPAN");
  });

  test("should include breadcrumb schema structured data", () => {
    const { container } = render(
      <DogsPageClientSimplified
        initialDogs={mockInitialDogs}
        metadata={mockMetadata}
      />,
    );

    const schema = screen.getByTestId("breadcrumb-schema");
    expect(schema).toBeInTheDocument();

    const schemaContent = JSON.parse(schema.innerHTML);
    expect(schemaContent["@context"]).toBe("https://schema.org");
    expect(schemaContent["@type"]).toBe("BreadcrumbList");
    expect(schemaContent.itemListElement).toHaveLength(2);
    expect(schemaContent.itemListElement[0].name).toBe("Home");
    expect(schemaContent.itemListElement[1].name).toBe("Find Dogs");
  });

  test("should render breadcrumbs even with no dogs", () => {
    render(
      <DogsPageClientSimplified initialDogs={[]} metadata={mockMetadata} />,
    );

    const breadcrumbs = screen.getByTestId("breadcrumbs");
    expect(breadcrumbs).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByText("Find Dogs")).toBeInTheDocument();
  });

  test("should maintain breadcrumb structure with filters applied", () => {
    const { rerender } = render(
      <DogsPageClientSimplified
        initialDogs={mockInitialDogs}
        metadata={mockMetadata}
      />,
    );

    // Initial check
    expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();

    // Simulate filter change by rerendering with different props
    rerender(
      <DogsPageClientSimplified
        initialDogs={[mockInitialDogs[0]]}
        metadata={mockMetadata}
      />,
    );

    // Breadcrumbs should still be present
    expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByText("Find Dogs")).toBeInTheDocument();
  });
});
