/**
 * Tests for Breadcrumbs component
 * Following TDD approach and using existing schema utilities
 */

import React from "react";
import { render, screen } from "../../../test-utils";
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
      item: "https://www.rescuedogs.me/",
    });

    // Check second item
    expect(jsonLd.itemListElement[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "Dogs",
      item: "https://www.rescuedogs.me/dogs",
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

describe("Dark Mode Support Tests", () => {
  test("should have dark mode text variants for all text elements", () => {
    const items = [
      { name: "Home", url: "/" },
      { name: "Dogs", url: "/dogs" },
      { name: "Labrador" },
    ];

    const { container } = render(<Breadcrumbs items={items} />);

    // Test navigation container has dark mode variant
    const nav = container.querySelector("nav ol");
    // This will FAIL - currently only has text-gray-600 without dark: variant
    expect(nav).toHaveClass("text-gray-600");
    expect(nav).toHaveClass("dark:text-gray-400"); // Missing in current implementation

    // Test separators have dark mode variant
    const separators = container.querySelectorAll('span[aria-hidden="true"]');
    separators.forEach((separator) => {
      // This will FAIL - currently only has text-gray-400 without dark: variant
      expect(separator).toHaveClass("text-gray-400");
      expect(separator).toHaveClass("dark:text-gray-500"); // Missing in current implementation
    });

    // Test current page (non-link) has dark mode variant
    const currentPage = container.querySelector("span.text-gray-900");
    // This will FAIL - currently only has text-gray-900 without dark: variant
    expect(currentPage).toHaveClass("text-gray-900");
    expect(currentPage).toHaveClass("dark:text-gray-100"); // Missing in current implementation
  });

  test("should maintain readability for linked items in dark mode", () => {
    const items = [
      { name: "Home", url: "/" },
      { name: "Dogs", url: "/dogs" },
    ];

    const { container } = render(<Breadcrumbs items={items} />);

    const links = container.querySelectorAll("a");
    links.forEach((link) => {
      // Verify links have proper hover states for dark mode
      expect(link).toHaveClass("hover:text-orange-600");
      // Could also verify dark:hover:text-orange-400 for softer orange in dark mode
    });
  });

  test("should handle all breadcrumb configurations with proper dark mode support", () => {
    // Test with single item (no separators)
    const { rerender, container } = render(
      <Breadcrumbs items={[{ name: "Home" }]} />,
    );
    let currentPage = container.querySelector("span.font-medium");
    expect(currentPage).toHaveClass("text-gray-900");
    expect(currentPage).toHaveClass("dark:text-gray-100"); // Will fail

    // Test with multiple items
    rerender(
      <Breadcrumbs
        items={[{ name: "Home", url: "/" }, { name: "Current Page" }]}
      />,
    );

    const separator = container.querySelector('span[aria-hidden="true"]');
    expect(separator).toHaveClass("text-gray-400");
    expect(separator).toHaveClass("dark:text-gray-500"); // Will fail
  });
});
