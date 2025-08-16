/**
 * Tests for Schema.org integration in OrganizationDetailClient
 * Following TDD approach for SEO implementation - Phase 1B
 */

import React from "react";
import { render, screen, waitFor } from "../../../../test-utils";
import "@testing-library/jest-dom";
import OrganizationDetailClient from "../OrganizationDetailClient";
import {
  getOrganizationBySlug,
  getOrganizationDogs,
} from "../../../../services/organizationsService";

// Mock the service
jest.mock("../../../../services/organizationsService", () => ({
  getOrganizationBySlug: jest.fn(),
  getOrganizationDogs: jest.fn(),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ slug: "happy-paws-rescue" }),
  useRouter: () => ({ back: jest.fn() }),
  usePathname: () => "/organizations/happy-paws-rescue",
  useSearchParams: () => ({ get: () => null }),
}));

// Mock UI components to focus on schema testing
jest.mock("../../../../components/ui/Loading", () => () => (
  <div data-testid="loading" />
));
jest.mock("../../../../components/ui/DogDetailSkeleton", () => () => (
  <div data-testid="loading" />
));

describe("OrganizationDetailClient - Schema Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods for cleaner test output
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.warn.mockRestore();
  });

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

  test("should render OrganizationSchema component with correct JSON-LD", async () => {
    getOrganizationBySlug.mockResolvedValue(mockOrganization);
    getOrganizationDogs.mockResolvedValue([]);

    const { container, debug } = render(<OrganizationDetailClient />);

    // Wait for organization to load
    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    // Check for JSON-LD script tag with Organization schema
    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(schemaScript).toBeInTheDocument();

    const schemaData = JSON.parse(schemaScript?.textContent || "{}");
    expect(schemaData["@context"]).toBe("https://schema.org");
    expect(schemaData["@type"]).toEqual(["LocalBusiness", "AnimalShelter"]);
    expect(schemaData.name).toBe("Happy Paws Rescue");
  });

  test("should include all expected organization properties in schema", async () => {
    getOrganizationBySlug.mockResolvedValue(mockOrganization);
    getOrganizationDogs.mockResolvedValue([]);

    const { container } = render(<OrganizationDetailClient />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schemaData = JSON.parse(schemaScript?.textContent || "{}");

    // Check core properties
    expect(schemaData.name).toBe("Happy Paws Rescue");
    expect(schemaData.description).toBe(
      "Dedicated to rescuing and rehoming dogs in need.",
    );
    expect(schemaData.url).toBe("https://happypaws.org");
    expect(schemaData.logo).toBe("https://happypaws.org/logo.png");
    expect(schemaData.knowsAbout).toBe("Dog rescue and adoption services");
  });

  test("should render BreadcrumbSchema component with organization navigation", async () => {
    getOrganizationBySlug.mockResolvedValue(mockOrganization);
    getOrganizationDogs.mockResolvedValue([]);

    const { container } = render(<OrganizationDetailClient />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    // Check for breadcrumb JSON-LD script tag
    const schemaScripts = container.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    expect(schemaScripts.length).toBeGreaterThan(1); // Should have both Organization and Breadcrumb schemas

    // Find breadcrumb schema (will have @type: "BreadcrumbList")
    let breadcrumbSchema = null;
    schemaScripts.forEach((script) => {
      const data = JSON.parse(script.textContent || "{}");
      if (data["@type"] === "BreadcrumbList") {
        breadcrumbSchema = data;
      }
    });

    expect(breadcrumbSchema).not.toBeNull();
    expect(breadcrumbSchema["@context"]).toBe("https://schema.org");
    expect(breadcrumbSchema.itemListElement).toHaveLength(3);

    // Check breadcrumb items structure
    const items = breadcrumbSchema.itemListElement;
    expect(items[0].name).toBe("Home");
    expect(items[1].name).toBe("Organizations");
    expect(items[2].name).toBe("Happy Paws Rescue");
  });

  test("should not render schema when organization is not loaded", async () => {
    getOrganizationBySlug.mockRejectedValue(
      new Error("Organization not found"),
    );

    const { container } = render(<OrganizationDetailClient />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    // Should not have schema script when organization fails to load
    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(schemaScript).toBeNull();
  });

  test("should handle organizations with minimal data gracefully", async () => {
    const minimalOrganization = {
      id: 2,
      slug: "city-shelter",
      name: "City Animal Shelter",
      status: "active",
    };

    getOrganizationBySlug.mockResolvedValue(minimalOrganization);
    getOrganizationDogs.mockResolvedValue([]);

    const { container } = render(<OrganizationDetailClient />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(schemaScript).toBeInTheDocument();

    const schemaData = JSON.parse(schemaScript?.textContent || "{}");
    expect(schemaData["@type"]).toEqual(["LocalBusiness", "AnimalShelter"]);
    expect(schemaData.name).toBe("City Animal Shelter");
  });
});
