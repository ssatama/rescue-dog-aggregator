/**
 * Tests for Breadcrumbs component
 * Following TDD approach and using existing schema utilities
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Breadcrumbs from "../Breadcrumbs";

// Mock Next.js Link component
jest.mock("next/link", () => {
  return function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

describe("Breadcrumbs Component", () => {
  const mockBreadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Dogs", url: "/dogs" },
    { name: "Buddy" }, // Current page - no URL
  ];

  test("should render breadcrumb navigation", () => {
    render(<Breadcrumbs items={mockBreadcrumbItems} />);

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByLabelText("Breadcrumb")).toBeInTheDocument();
  });

  test("should render all breadcrumb items", () => {
    render(<Breadcrumbs items={mockBreadcrumbItems} />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Dogs")).toBeInTheDocument();
    expect(screen.getByText("Buddy")).toBeInTheDocument();
  });

  test("should create links for items with URLs", () => {
    render(<Breadcrumbs items={mockBreadcrumbItems} />);

    const homeLink = screen.getByRole("link", { name: "Home" });
    const dogsLink = screen.getByRole("link", { name: "Dogs" });

    expect(homeLink).toHaveAttribute("href", "/");
    expect(dogsLink).toHaveAttribute("href", "/dogs");
  });

  test("should not create link for current page", () => {
    render(<Breadcrumbs items={mockBreadcrumbItems} />);

    const currentPageItem = screen.getByText("Buddy");
    expect(currentPageItem).not.toHaveAttribute("href");
    expect(currentPageItem.tagName).toBe("SPAN");
  });

  test("should include separators between items", () => {
    render(<Breadcrumbs items={mockBreadcrumbItems} />);

    // Should have separators but not after the last item
    const separators = screen.getAllByText("/");
    expect(separators).toHaveLength(2); // Between Home-Dogs and Dogs-Buddy
  });

  test("should include JSON-LD structured data script", () => {
    render(<Breadcrumbs items={mockBreadcrumbItems} />);

    // Check for JSON-LD script
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();

    const jsonLd = JSON.parse(script.textContent);
    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("BreadcrumbList");
    expect(jsonLd.itemListElement).toHaveLength(3);
  });

  test("should have correct schema.org structure", () => {
    render(<Breadcrumbs items={mockBreadcrumbItems} />);

    const script = document.querySelector('script[type="application/ld+json"]');
    const jsonLd = JSON.parse(script.textContent);

    // Check first item
    expect(jsonLd.itemListElement[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://rescuedogs.me/",
    });

    // Check second item
    expect(jsonLd.itemListElement[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "Dogs",
      item: "https://rescuedogs.me/dogs",
    });

    // Check current page (no item URL)
    expect(jsonLd.itemListElement[2]).toEqual({
      "@type": "ListItem",
      position: 3,
      name: "Buddy",
    });
  });

  test("should handle empty items array", () => {
    render(<Breadcrumbs items={[]} />);

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  test("should handle single item", () => {
    const singleItem = [{ name: "Home", url: "/" }];
    render(<Breadcrumbs items={singleItem} />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.queryByText("/")).not.toBeInTheDocument(); // No separators
  });

  test("should apply hover styles to links", () => {
    render(<Breadcrumbs items={mockBreadcrumbItems} />);

    const homeLink = screen.getByRole("link", { name: "Home" });
    expect(homeLink).toHaveClass("hover:text-orange-600");
  });

  test("should be accessible with proper ARIA attributes", () => {
    render(<Breadcrumbs items={mockBreadcrumbItems} />);

    const nav = screen.getByRole("navigation");
    expect(nav).toHaveAttribute("aria-label", "Breadcrumb");

    const list = screen.getByRole("list");
    expect(list).toBeInTheDocument();

    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(3);
  });

  test("should handle items without URLs gracefully", () => {
    const itemsWithoutUrls = [
      { name: "Home" },
      { name: "Dogs" },
      { name: "Buddy" },
    ];

    render(<Breadcrumbs items={itemsWithoutUrls} />);

    // All should be rendered as spans, not links
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Dogs")).toBeInTheDocument();
    expect(screen.getByText("Buddy")).toBeInTheDocument();
  });
});
