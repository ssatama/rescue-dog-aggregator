/**
 * Advanced accessibility tests for Breadcrumbs component - Phase 4A
 * Focus: Enhanced accessibility features, WCAG compliance, screen reader support
 */

import React from "react";
import { render, screen, fireEvent } from "../../test-utils";
import "@testing-library/jest-dom";
import Breadcrumbs from "../../components/ui/Breadcrumbs";

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

describe("Breadcrumbs Accessibility - Phase 4A", () => {
  const mockBreadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Organizations", url: "/organizations" },
    { name: "Happy Paws Rescue" }, // Current page - no URL
  ];

  describe("WCAG 2.1 Compliance", () => {
    test("should meet WCAG 2.1 AA standards for navigation", () => {
      render(<Breadcrumbs items={mockBreadcrumbItems} />);

      // Should have proper navigation landmark
      const nav = screen.getByRole("navigation");
      expect(nav).toHaveAttribute("aria-label", "Breadcrumb");

      // Should use proper list semantics
      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();

      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(3);
    });

    test("should provide proper contrast and focus indicators", () => {
      render(<Breadcrumbs items={mockBreadcrumbItems} />);

      const homeLink = screen.getByRole("link", { name: "Home" });

      // Should have focus styles for keyboard navigation
      expect(homeLink).toHaveClass("focus:outline-none");
      expect(homeLink).toHaveClass("focus:ring-2");
      expect(homeLink).toHaveClass("focus:ring-orange-600");
      expect(homeLink).toHaveClass("focus:ring-offset-2");
    });

    test("should separate visual and semantic separators correctly", () => {
      render(<Breadcrumbs items={mockBreadcrumbItems} />);

      // Visual separators should be hidden from screen readers
      const separators = screen.getAllByText("/");
      separators.forEach((separator) => {
        expect(separator).toHaveAttribute("aria-hidden", "true");
      });
    });
  });

  describe("Screen Reader Support", () => {
    test("should provide clear context for screen readers", () => {
      render(<Breadcrumbs items={mockBreadcrumbItems} />);

      // Navigation should be clearly labeled
      expect(screen.getByLabelText("Breadcrumb")).toBeInTheDocument();

      // Current page should be distinguishable
      const currentPage = screen.getByText("Happy Paws Rescue");
      expect(currentPage).toHaveClass("font-medium");
      expect(currentPage.tagName).toBe("SPAN"); // Not a link
    });

    test("should handle complex breadcrumb structures", () => {
      const complexItems = [
        { name: "Home", url: "/" },
        { name: "Dogs", url: "/dogs" },
        { name: "Search Results", url: "/dogs?search=golden" },
        { name: "Golden Retriever Dogs", url: "/dogs?breed=golden-retriever" },
        { name: "Buddy - Golden Retriever Mix" },
      ];

      render(<Breadcrumbs items={complexItems} />);

      // Should handle long breadcrumb chains properly
      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(5);

      // Should have correct number of separators (n-1)
      const separators = screen.getAllByText("/");
      expect(separators).toHaveLength(4);
    });
  });

  describe("Keyboard Navigation", () => {
    test("should support keyboard navigation through breadcrumbs", () => {
      render(<Breadcrumbs items={mockBreadcrumbItems} />);

      const homeLink = screen.getByRole("link", { name: "Home" });
      const orgsLink = screen.getByRole("link", { name: "Organizations" });

      // Focus should be manageable via keyboard
      homeLink.focus();
      expect(homeLink).toHaveFocus();

      // Tab should move to next link
      fireEvent.keyDown(homeLink, { key: "Tab" });

      // Links should be in tab order
      expect(homeLink.tabIndex).toBe(0);
      expect(orgsLink.tabIndex).toBe(0);
    });

    test("should have proper keyboard interaction attributes", () => {
      render(<Breadcrumbs items={mockBreadcrumbItems} />);

      const homeLink = screen.getByRole("link", { name: "Home" });
      const orgsLink = screen.getByRole("link", { name: "Organizations" });

      // Links should be keyboard accessible
      expect(homeLink.tagName).toBe("A");
      expect(orgsLink.tagName).toBe("A");

      // Should have proper href attributes
      expect(homeLink).toHaveAttribute("href", "/");
      expect(orgsLink).toHaveAttribute("href", "/organizations");

      // Should be focusable
      expect(homeLink.tabIndex).toBe(0);
      expect(orgsLink.tabIndex).toBe(0);
    });
  });

  describe("Responsive Design Accessibility", () => {
    test("should maintain accessibility across different viewport sizes", () => {
      render(<Breadcrumbs items={mockBreadcrumbItems} />);

      // Should have responsive-friendly spacing
      const list = screen.getByRole("list");
      expect(list).toHaveClass("flex");
      expect(list).toHaveClass("items-center");
      expect(list).toHaveClass("space-x-2");

      // Text size should be appropriate for mobile
      expect(list).toHaveClass("text-sm");
    });

    test("should handle very long breadcrumb names gracefully", () => {
      const longNameItems = [
        { name: "Home", url: "/" },
        {
          name: "Very Long Organization Name That Might Wrap on Mobile Devices",
          url: "/organizations",
        },
        {
          name: "Current Page with Another Very Long Name That Tests Text Wrapping",
        },
      ];

      render(<Breadcrumbs items={longNameItems} />);

      // Should still maintain proper structure
      const listItems = screen.getAllByRole("listitem");
      expect(listItems).toHaveLength(3);

      // Long names should still be accessible
      expect(
        screen.getByText(
          "Very Long Organization Name That Might Wrap on Mobile Devices",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Current Page with Another Very Long Name That Tests Text Wrapping",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Enhanced Features", () => {
    test("should include structured data for enhanced SEO and accessibility", () => {
      render(<Breadcrumbs items={mockBreadcrumbItems} />);

      // Should have JSON-LD structured data
      const script = document.querySelector(
        'script[type="application/ld+json"]',
      );
      expect(script).toBeInTheDocument();

      const jsonLd = JSON.parse(script.textContent);
      expect(jsonLd["@type"]).toBe("BreadcrumbList");

      // Structured data helps screen readers and search engines understand context
      expect(jsonLd.itemListElement).toHaveLength(3);
      expect(jsonLd.itemListElement[2]).toEqual({
        "@type": "ListItem",
        position: 3,
        name: "Happy Paws Rescue",
      });
    });

    test("should work with assistive technologies", () => {
      render(<Breadcrumbs items={mockBreadcrumbItems} />);

      // Should provide proper landmarks
      expect(screen.getByRole("navigation")).toBeInTheDocument();
      expect(screen.getByRole("list")).toBeInTheDocument();

      // Should have proper text alternatives
      const currentPage = screen.getByText("Happy Paws Rescue");
      expect(currentPage).not.toHaveAttribute("href"); // Current page is not a link

      // Links should be distinguishable from current page
      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(2); // Home and Organizations are links
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle null or undefined items gracefully", () => {
      render(<Breadcrumbs items={null} />);
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

      render(<Breadcrumbs items={undefined} />);
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    test("should handle items with missing names", () => {
      const itemsWithMissingNames = [
        { name: "Home", url: "/" },
        { name: "", url: "/empty" }, // Empty name
        { url: "/no-name" }, // No name property
        { name: "Valid Page" },
      ];

      render(<Breadcrumbs items={itemsWithMissingNames} />);

      // Should still render valid items
      expect(screen.getByText("Home")).toBeInTheDocument();
      expect(screen.getByText("Valid Page")).toBeInTheDocument();
    });
  });
});
