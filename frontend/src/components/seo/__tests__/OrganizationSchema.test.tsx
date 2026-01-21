/**
 * Tests for OrganizationSchema component
 * Following TDD approach for SEO implementation
 */

import React from "react";
import { render } from "../../../test-utils";
import OrganizationSchema from "../OrganizationSchema";

describe("OrganizationSchema Component", () => {
  const mockOrganization = {
    id: 1,
    name: "Happy Paws Rescue",
    description: "Dedicated to rescuing and rehoming dogs in need.",
    website_url: "https://happypaws.org",
    city: "San Francisco",
    country: "USA",
    logo_url: "https://happypaws.org/logo.png",
    total_dogs: 25,
    established_year: 2015,
  };

  test("should render JSON-LD script with Organization schema", () => {
    const { container } = render(
      <OrganizationSchema organization={mockOrganization} />,
    );

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeInTheDocument();

    const schemaData = JSON.parse(script?.textContent || "{}");
    expect(schemaData["@context"]).toBe("https://schema.org");
    expect(schemaData["@type"]).toEqual(["LocalBusiness", "AnimalShelter"]);
    expect(schemaData.name).toBe("Happy Paws Rescue");
  });

  test("should include all expected organization properties", () => {
    const { container } = render(
      <OrganizationSchema organization={mockOrganization} />,
    );

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schemaData = JSON.parse(script?.textContent || "{}");

    // Check core properties
    expect(schemaData.name).toBe("Happy Paws Rescue");
    expect(schemaData.description).toBe(
      "Dedicated to rescuing and rehoming dogs in need.",
    );
    expect(schemaData.url).toBe("https://happypaws.org");
    expect(schemaData.logo).toBe("https://happypaws.org/logo.png");

    // Check address if present
    if (schemaData.address) {
      expect(schemaData.address["@type"]).toBe("PostalAddress");
      expect(schemaData.address.addressLocality).toBe("San Francisco");
      expect(schemaData.address.addressCountry).toBe("USA");
    }
  });

  test("should handle minimal organization data gracefully", () => {
    const minimalOrganization = {
      id: 2,
      name: "City Animal Shelter",
    };

    const { container } = render(
      <OrganizationSchema organization={minimalOrganization} />,
    );

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeInTheDocument();

    const schemaData = JSON.parse(script?.textContent || "{}");
    expect(schemaData["@type"]).toEqual(["LocalBusiness", "AnimalShelter"]);
    expect(schemaData.name).toBe("City Animal Shelter");
  });

  test("should not render when organization is null or undefined", () => {
    // @ts-expect-error testing error handling with null
    const { container: nullContainer } = render(<OrganizationSchema organization={null} />);
    expect(nullContainer.querySelector("script")).toBeNull();

    // @ts-expect-error testing error handling with undefined
    const { container: undefinedContainer } = render(<OrganizationSchema organization={undefined} />);
    expect(undefinedContainer.querySelector("script")).toBeNull();
  });

  test("should not render when organization has no name", () => {
    const invalidOrganization = {
      id: 3,
      description: "An organization without a name",
      website_url: "https://example.org",
    };

    // @ts-expect-error testing error handling with invalid data (missing name)
    const { container } = render(<OrganizationSchema organization={invalidOrganization} />);
    expect(container.querySelector("script")).toBeNull();
  });

  test("should handle organization with website_url but no other location data", () => {
    const webOnlyOrg = {
      id: 4,
      name: "Online Pet Rescue",
      website_url: "https://onlinepetrescue.org",
      description: "Virtual rescue organization",
    };

    const { container } = render(
      <OrganizationSchema organization={webOnlyOrg} />,
    );

    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).toBeInTheDocument();

    const schemaData = JSON.parse(script?.textContent || "{}");
    expect(schemaData.name).toBe("Online Pet Rescue");
    expect(schemaData.url).toBe("https://onlinepetrescue.org");
  });
});
