/**
 * Tests for Schema.org integration in DogDetailClient
 * Following TDD approach for SEO implementation - Phase 1B
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import DogDetailClient from "../DogDetailClient";
import { getAnimalBySlug } from "../../../../services/animalsService";

// Mock the service
jest.mock("../../../../services/animalsService", () => ({
  getAnimalBySlug: jest.fn(),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ slug: "test-dog-mixed-breed-1" }),
  useRouter: () => ({ back: jest.fn() }),
  usePathname: () => "/dogs/test-dog-mixed-breed-1",
  useSearchParams: () => ({ get: () => null }),
}));

// Mock UI components to focus on schema testing
jest.mock("../../../../components/ui/Loading", () => () => (
  <div data-testid="loading" />
));
jest.mock("../../../../components/ui/DogDetailSkeleton", () => () => (
  <div data-testid="loading" />
));

describe("DogDetailClient - Schema Integration", () => {
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

  const mockDog = {
    id: 1,
    slug: "buddy-labrador-mix",
    name: "Buddy",
    standardized_breed: "Labrador Retriever",
    breed: "Labrador",
    sex: "male",
    age_text: "Adult",
    primary_image_url: "https://images.rescuedogs.me/buddy.jpg",
    description: "Friendly dog looking for a loving home.",
    properties: {
      description: "Very active and loves playing fetch.",
    },
    organization: {
      id: 1,
      name: "Happy Paws Rescue",
      city: "San Francisco",
      country: "USA",
      website_url: "https://happypaws.org",
    },
    status: "available",
  };

  test("should render DogSchema component with correct JSON-LD", async () => {
    getAnimalBySlug.mockResolvedValue(mockDog);

    const { container } = render(<DogDetailClient />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    // Check for JSON-LD script tag with Product schema
    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(schemaScript).toBeInTheDocument();

    const schemaData = JSON.parse(schemaScript?.textContent || "{}");
    expect(schemaData["@context"]).toBe("https://schema.org");
    expect(schemaData["@type"]).toBe("Product");
    expect(schemaData.additionalType).toBe("http://dbpedia.org/ontology/Dog");
    expect(schemaData.name).toBe("Buddy - Labrador Retriever");
  });

  test("should include offers and source attribution in schema", async () => {
    getAnimalBySlug.mockResolvedValue(mockDog);

    const { container } = render(<DogDetailClient />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    const schemaData = JSON.parse(schemaScript?.textContent || "{}");

    // Check offers structure
    expect(schemaData.offers).toEqual({
      "@type": "Offer",
      price: "adoption fee",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    });

    // Check source attribution
    expect(schemaData.isBasedOn).toEqual({
      "@type": "WebPage",
      url: "https://happypaws.org",
      name: "Happy Paws Rescue",
    });
  });

  test("should not render schema when dog is not loaded", async () => {
    getAnimalBySlug.mockRejectedValue(new Error("Dog not found"));

    const { container } = render(<DogDetailClient />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    // Should not have schema script when dog fails to load
    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(schemaScript).toBeNull();
  });

  test("should handle dogs with minimal data gracefully", async () => {
    const minimalDog = {
      id: 2,
      slug: "luna-rescue-dog",
      name: "Luna",
      organization: {
        name: "City Shelter",
      },
      status: "available",
    };

    getAnimalBySlug.mockResolvedValue(minimalDog);

    const { container } = render(<DogDetailClient />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    const schemaScript = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(schemaScript).toBeInTheDocument();

    const schemaData = JSON.parse(schemaScript?.textContent || "{}");
    expect(schemaData["@type"]).toBe("Product");
    expect(schemaData.name).toBe("Luna");
    expect(schemaData.isBasedOn.name).toBe("City Shelter");
  });

  test("should render BreadcrumbSchema component with navigation hierarchy", async () => {
    getAnimalBySlug.mockResolvedValue(mockDog);

    const { container } = render(<DogDetailClient />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    // Check for breadcrumb JSON-LD script tag
    const schemaScripts = container.querySelectorAll(
      'script[type="application/ld+json"]',
    );
    expect(schemaScripts.length).toBeGreaterThan(1); // Should have both Dog and Breadcrumb schemas

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
    expect(items[1].name).toBe("Find Dogs");
    expect(items[2].name).toBe("Buddy");
  });
});
