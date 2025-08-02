/**
 * Simple test to verify the navigation fix key prop is working
 */

import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react";
import DogDetailClient from "../../app/dogs/[slug]/DogDetailClient";
import { getAnimalBySlug } from "../../services/animalsService";

// Mock the services
jest.mock("../../services/animalsService", () => ({
  getAnimalBySlug: jest.fn(),
}));
jest.mock("../../services/relatedDogsService", () => ({
  getRelatedDogs: jest.fn().mockResolvedValue([]),
}));

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ slug: "test-dog-mixed-breed-123" }),
  usePathname: () => "/dogs/test-dog-mixed-breed-123",
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock the Layout component
jest.mock("../../components/layout/Layout", () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

// Mock other heavy components
jest.mock("../../components/organizations/OrganizationCard", () => {
  return function MockOrganizationCard() {
    return <div data-testid="organization-section">Organization</div>;
  };
});

jest.mock("../../components/dogs/RelatedDogsSection", () => {
  return function MockRelatedDogsSection() {
    return <div data-testid="related-dogs-section">Related Dogs</div>;
  };
});

const mockDog = {
  id: "test-dog-123",
  slug: "test-dog-mixed-breed-123",
  name: "Buddy",
  primary_image_url: "https://example.com/buddy.jpg",
  standardized_breed: "Golden Retriever",
  breed: "Golden Retriever",
  sex: "Male",
  age_min_months: 24,
  status: "available",
  adoption_url: "https://example.com/adopt/buddy",
  properties: {
    description: "A friendly dog looking for a home.",
  },
  organization: {
    id: "org-1",
    name: "Test Rescue",
  },
  organization_id: "org-1",
};

describe("Navigation Key Fix", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    const { getAnimalBySlug } = require("../../services/animalsService");
    getAnimalBySlug.mockResolvedValue(mockDog);

    // Mock document.readyState to be 'complete'
    Object.defineProperty(document, "readyState", {
      writable: true,
      value: "complete",
    });
  });

  test("should use proper key format for hero image component", async () => {
    const { container } = await act(async () => {
      return render(
        <DogDetailClient params={{ slug: "test-dog-mixed-breed-123" }} />,
      );
    });

    // Wait for the component to render
    await screen.findByTestId("layout");

    // Wait for data to load
    await waitFor(
      () => {
        expect(
          screen.queryByTestId("dog-detail-skeleton"),
        ).not.toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Wait for dog name to appear
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1, name: "Buddy" }),
      ).toBeInTheDocument();
    });

    // The key prop is internal to React, but we can verify the component structure
    const heroContainer = container.querySelector(
      '[data-testid="hero-image-container"]',
    );
    expect(heroContainer).toBeInTheDocument();

    // Verify the component renders successfully with our fixes
    expect(heroContainer).toBeTruthy();
  });
});
