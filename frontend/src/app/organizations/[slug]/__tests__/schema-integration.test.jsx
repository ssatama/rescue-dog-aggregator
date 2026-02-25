import React from "react";
import { render } from "../../../../test-utils";
import "@testing-library/jest-dom";
import { OrganizationSchema, BreadcrumbSchema } from "../../../../components/seo";

describe("Organization Schema Integration", () => {
  const mockOrganization = {
    id: 1,
    slug: "happy-paws-rescue",
    name: "Happy Paws Rescue",
    description: "Dedicated to rescuing and rehoming dogs in need.",
    website_url: "https://happypaws.org",
    city: "San Francisco",
    country: "USA",
    logo_url: "https://happypaws.org/logo.png",
    total_dogs: 25,
    established_year: 2015,
    status: "active",
  };

  test("should render OrganizationSchema with correct JSON-LD", () => {
    const { container } = render(
      <OrganizationSchema organization={mockOrganization} />,
    );

    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(schemaScript).toBeInTheDocument();

    const schemaData = JSON.parse(schemaScript?.textContent || "{}");
    expect(schemaData["@context"]).toBe("https://schema.org");
    expect(schemaData["@type"]).toEqual(["LocalBusiness", "AnimalShelter"]);
    expect(schemaData.name).toBe("Happy Paws Rescue");
  });

  test("should include all expected organization properties in schema", () => {
    const { container } = render(
      <OrganizationSchema organization={mockOrganization} />,
    );

    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schemaData = JSON.parse(schemaScript?.textContent || "{}");

    expect(schemaData.name).toBe("Happy Paws Rescue");
    expect(schemaData.description).toBe(
      "Dedicated to rescuing and rehoming dogs in need.",
    );
    expect(schemaData.url).toBe("https://happypaws.org");
    expect(schemaData.logo).toBe("https://happypaws.org/logo.png");
    expect(schemaData.knowsAbout).toBe("Dog rescue and adoption services");
  });

  test("should render BreadcrumbSchema with organization navigation", () => {
    const breadcrumbItems = [
      { name: "Home", url: "/" },
      { name: "Organizations", url: "/organizations" },
      { name: "Happy Paws Rescue" },
    ];

    const { container } = render(
      <BreadcrumbSchema items={breadcrumbItems} />,
    );

    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(schemaScript).toBeInTheDocument();

    const schemaData = JSON.parse(schemaScript?.textContent || "{}");
    expect(schemaData["@context"]).toBe("https://schema.org");
    expect(schemaData["@type"]).toBe("BreadcrumbList");
    expect(schemaData.itemListElement).toHaveLength(3);

    const items = schemaData.itemListElement;
    expect(items[0].name).toBe("Home");
    expect(items[1].name).toBe("Organizations");
    expect(items[2].name).toBe("Happy Paws Rescue");
  });

  test("should not render schema for null organization", () => {
    const { container } = render(
      <OrganizationSchema organization={null} />,
    );

    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(schemaScript).toBeNull();
  });

  test("should handle organizations with minimal data gracefully", () => {
    const minimalOrganization = {
      id: 2,
      slug: "city-shelter",
      name: "City Animal Shelter",
      status: "active",
    };

    const { container } = render(
      <OrganizationSchema organization={minimalOrganization} />,
    );

    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(schemaScript).toBeInTheDocument();

    const schemaData = JSON.parse(schemaScript?.textContent || "{}");
    expect(schemaData["@type"]).toEqual(["LocalBusiness", "AnimalShelter"]);
    expect(schemaData.name).toBe("City Animal Shelter");
  });
});
