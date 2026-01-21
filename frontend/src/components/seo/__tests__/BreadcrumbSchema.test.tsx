/**
 * Tests for BreadcrumbSchema component
 * Following TDD approach for SEO implementation
 */

import React from "react";
import { render } from "../../../test-utils";
import BreadcrumbSchema from "../BreadcrumbSchema";

describe("BreadcrumbSchema Component", () => {
  const mockBreadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Dogs", url: "/dogs" },
    { name: "Buddy", url: "/dogs/buddy-123" },
  ];

  test("should render JSON-LD script with BreadcrumbList schema", () => {
    const { container } = render(<BreadcrumbSchema items={mockBreadcrumbs} />);

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeInTheDocument();

    const schemaData = JSON.parse(script?.textContent || "{}");
    expect(schemaData["@context"]).toBe("https://schema.org");
    expect(schemaData["@type"]).toBe("BreadcrumbList");
    expect(Array.isArray(schemaData.itemListElement)).toBe(true);
  });

  test("should include all breadcrumb items with correct structure", () => {
    const { container } = render(<BreadcrumbSchema items={mockBreadcrumbs} />);

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schemaData = JSON.parse(script?.textContent || "{}");

    const items = schemaData.itemListElement;
    expect(items).toHaveLength(3);

    // Check first item
    expect(items[0]).toEqual({
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://www.rescuedogs.me/",
    });

    // Check second item
    expect(items[1]).toEqual({
      "@type": "ListItem",
      position: 2,
      name: "Dogs",
      item: "https://www.rescuedogs.me/dogs",
    });

    // Check third item (current page)
    expect(items[2]).toEqual({
      "@type": "ListItem",
      position: 3,
      name: "Buddy",
      item: "https://www.rescuedogs.me/dogs/buddy-123",
    });
  });

  test("should handle breadcrumbs without URLs", () => {
    const breadcrumbsWithoutUrls = [
      { name: "Home", url: "/" },
      { name: "Search Results" }, // No URL (current page)
    ];

    const { container } = render(
      <BreadcrumbSchema items={breadcrumbsWithoutUrls} />,
    );

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeInTheDocument();

    const schemaData = JSON.parse(script?.textContent || "{}");
    const items = schemaData.itemListElement;

    expect(items).toHaveLength(2);
    expect(items[0].item).toBe("https://www.rescuedogs.me/");
    expect(items[1].name).toBe("Search Results");
    expect(items[1].item).toBeUndefined();
  });

  test("should handle single breadcrumb item", () => {
    const singleItem = [{ name: "Home", url: "/" }];

    const { container } = render(<BreadcrumbSchema items={singleItem} />);

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeInTheDocument();

    const schemaData = JSON.parse(script?.textContent || "{}");
    const items = schemaData.itemListElement;

    expect(items).toHaveLength(1);
    expect(items[0].position).toBe(1);
    expect(items[0].name).toBe("Home");
    expect(items[0].item).toBe("https://www.rescuedogs.me/");
  });

  test("should not render when items is null or undefined", () => {
    // @ts-expect-error testing error handling with null
    const { container: nullContainer } = render(<BreadcrumbSchema items={null} />);
    expect(nullContainer.querySelector("script")).toBeNull();

    // @ts-expect-error testing error handling with undefined
    const { container: undefinedContainer } = render(<BreadcrumbSchema items={undefined} />);
    expect(undefinedContainer.querySelector("script")).toBeNull();
  });

  test("should not render when items array is empty", () => {
    const { container } = render(<BreadcrumbSchema items={[]} />);
    expect(container.querySelector("script")).toBeNull();
  });

  test("should not render when items is not an array", () => {
    // @ts-expect-error testing error handling with invalid type
    const { container } = render(<BreadcrumbSchema items={"not-an-array"} />);
    expect(container.querySelector("script")).toBeNull();
  });

  test("should include all items even those without names", () => {
    const itemsWithInvalid: Array<{ name?: string; url: string }> = [
      { name: "Home", url: "/" },
      { url: "/invalid" }, // No name
      { name: "Dogs", url: "/dogs" },
    ];

    const { container } = render(
      // @ts-expect-error testing error handling with partial data
      <BreadcrumbSchema items={itemsWithInvalid} />,
    );

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeInTheDocument();

    const schemaData = JSON.parse(script?.textContent || "{}");
    const items = schemaData.itemListElement;

    // Should include all items (implementation doesn't filter)
    expect(items).toHaveLength(3);
    expect(items[0].name).toBe("Home");
    expect(items[1].name).toBeUndefined();
    expect(items[2].name).toBe("Dogs");
  });
});
