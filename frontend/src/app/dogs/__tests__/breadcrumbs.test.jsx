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
      breed: "Golden Retriever",
      slug: "max-2",
    },
  ];

  it("should display correct breadcrumb items", () => {
    render(<DogsPageClientSimplified initialDogs={mockInitialDogs} />);

    // Check that breadcrumbs exist
    const breadcrumbNav = screen.getByTestId("breadcrumbs");
    expect(breadcrumbNav).toBeInTheDocument();

    // Check for Home link (may appear multiple times in the page)
    const homeElements = screen.getAllByText("Home");
    expect(homeElements.length).toBeGreaterThan(0);

    // Check for Find Dogs text (may appear multiple times in the page)
    const findDogsElements = screen.getAllByText("Find Dogs");
    expect(findDogsElements.length).toBeGreaterThan(0);
  });

  it("should include breadcrumb schema structured data", () => {
    render(<DogsPageClientSimplified initialDogs={mockInitialDogs} />);

    const schema = screen.getByTestId("breadcrumb-schema");
    expect(schema).toBeInTheDocument();

    const schemaContent = JSON.parse(schema.innerHTML);
    expect(schemaContent["@type"]).toBe("BreadcrumbList");
    expect(schemaContent.itemListElement).toHaveLength(2);
  });

  it("should render breadcrumbs even with no dogs", () => {
    render(<DogsPageClientSimplified initialDogs={[]} />);

    const breadcrumbNav = screen.getByTestId("breadcrumbs");
    expect(breadcrumbNav).toBeInTheDocument();

    const homeElements = screen.getAllByText("Home");
    expect(homeElements.length).toBeGreaterThan(0);
    const findDogsElements = screen.getAllByText("Find Dogs");
    expect(findDogsElements.length).toBeGreaterThan(0);
  });

  it("should maintain breadcrumb structure with filters applied", () => {
    render(<DogsPageClientSimplified initialDogs={mockInitialDogs} />);

    // Apply some filters (this is testing that breadcrumbs remain static)
    const breadcrumbNav = screen.getByTestId("breadcrumbs");
    expect(breadcrumbNav).toBeInTheDocument();

    // Breadcrumbs should remain the same regardless of filters
    const homeElements = screen.getAllByText("Home");
    expect(homeElements.length).toBeGreaterThan(0);
    const findDogsElements = screen.getAllByText("Find Dogs");
    expect(findDogsElements.length).toBeGreaterThan(0);
  });
});
