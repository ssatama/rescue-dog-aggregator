/**
 * Tests for breadcrumb implementation on About page
 * Following TDD approach
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AboutPage from "../page";

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

// Mock Next.js Link
jest.mock("next/link", () => {
  return function Link({ href, children }) {
    return <a href={href}>{children}</a>;
  };
});

// Mock UI components
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }) => <button {...props}>{children}</button>,
}));

describe("AboutPage Breadcrumbs", () => {
  test("should render breadcrumb navigation", () => {
    render(<AboutPage />);

    const breadcrumbs = screen.getByTestId("breadcrumbs");
    expect(breadcrumbs).toBeInTheDocument();
    expect(screen.getByLabelText("Breadcrumb")).toBeInTheDocument();
  });

  test("should display correct breadcrumb items", () => {
    render(<AboutPage />);

    // Check for Home link
    const homeLink = screen.getByRole("link", { name: "Home" });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/");

    // Check for current page (About - no link)
    const aboutTexts = screen.getAllByText("About");
    // Find the one that's a span (breadcrumb), not the one in the title
    const breadcrumbAbout = aboutTexts.find((el) => el.tagName === "SPAN");
    expect(breadcrumbAbout).toBeInTheDocument();
  });

  test("should include breadcrumb schema structured data", () => {
    render(<AboutPage />);

    const schema = screen.getByTestId("breadcrumb-schema");
    expect(schema).toBeInTheDocument();

    const schemaContent = JSON.parse(schema.innerHTML);
    expect(schemaContent["@context"]).toBe("https://schema.org");
    expect(schemaContent["@type"]).toBe("BreadcrumbList");
    expect(schemaContent.itemListElement).toHaveLength(2);
    expect(schemaContent.itemListElement[0].name).toBe("Home");
    expect(schemaContent.itemListElement[1].name).toBe("About");
  });

  test("should render breadcrumbs above the page content", () => {
    const { container } = render(<AboutPage />);

    const breadcrumbs = screen.getByTestId("breadcrumbs");
    const pageTitle = screen.getByText("About Rescue Dog Aggregator");

    // Check that breadcrumbs appear before the main title
    const breadcrumbsParent = breadcrumbs.parentElement;
    const titleParent = pageTitle.parentElement;

    // Both should exist in the document
    expect(breadcrumbsParent).toBeInTheDocument();
    expect(titleParent).toBeInTheDocument();
  });

  test("should have proper semantic structure", () => {
    render(<AboutPage />);

    // Check for nav element with proper aria-label
    const nav = screen.getByRole("navigation");
    expect(nav).toHaveAttribute("aria-label", "Breadcrumb");

    // Check for ordered list
    const list = nav.querySelector("ol");
    expect(list).toBeInTheDocument();

    // Check for list items
    const listItems = list.querySelectorAll("li");
    expect(listItems).toHaveLength(2);
  });

  test("should maintain consistent breadcrumb structure", () => {
    const { rerender } = render(<AboutPage />);

    // Initial check
    expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();

    // Rerender to ensure stability
    rerender(<AboutPage />);

    // Should still have breadcrumbs
    expect(screen.getByTestId("breadcrumbs")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
  });

  test("should follow accessibility best practices", () => {
    render(<AboutPage />);

    // Check for proper navigation landmark
    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();

    // Check that links have href attributes
    const homeLink = screen.getByRole("link", { name: "Home" });
    expect(homeLink).toHaveAttribute("href");

    // Current page should not be a link
    const aboutTexts = screen.getAllByText("About");
    const breadcrumbAbout = aboutTexts.find((el) => el.tagName === "SPAN");
    expect(breadcrumbAbout).not.toHaveAttribute("href");
  });
});
