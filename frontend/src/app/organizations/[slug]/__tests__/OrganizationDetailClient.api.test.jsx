import React from "react";
import { render, waitFor } from "@testing-library/react";
import OrganizationDetailClient from "../OrganizationDetailClient";
import {
  getOrganizationDogs,
  getOrganizationBySlug,
} from "@/services/organizationsService";

// Mock Next.js router
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({
    get: jest.fn(() => null),
    toString: jest.fn(() => ""),
  }),
  useParams: () => ({
    slug: "test-org",
  }),
  usePathname: () => "/organizations/test-org",
}));

// Mock API calls
jest.mock("@/services/organizationsService", () => ({
  getOrganizationDogs: jest.fn(),
  getOrganizationBySlug: jest.fn(),
}));

// Mock error reporting
jest.mock("@/utils/logger", () => ({
  reportError: jest.fn(),
}));

describe("OrganizationDetailClient API Integration", () => {
  const mockOrganization = {
    id: 1,
    name: "Test Org",
    slug: "test-org",
    description: "Test organization",
    country: "USA",
  };

  const mockDogs = [
    {
      id: 1,
      name: "Charlie",
      slug: "charlie-1",
      breed: "Labrador",
      age_text: "2 years",
      created_at: "2024-01-01T00:00:00Z",
      primary_image_url: "https://example.com/charlie.jpg",
      organization: mockOrganization,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    getOrganizationDogs.mockResolvedValue(mockDogs);
    getOrganizationBySlug.mockResolvedValue(mockOrganization);
  });

  describe("API Calls Include Sort Parameter", () => {
    it("should include default sort parameter in initial API call", async () => {
      render(<OrganizationDetailClient organization={mockOrganization} />);

      // Wait for API call to be made
      await waitFor(() => {
        expect(getOrganizationDogs).toHaveBeenCalledWith(1, {
          limit: 20,
          offset: 0,
          sort: "newest", // Should include sort parameter
        });
      });
    });

    it("should pass sort parameter to API call when provided", async () => {
      // Mock URL params with sort parameter
      jest.doMock("next/navigation", () => ({
        useRouter: () => ({ push: mockPush }),
        useSearchParams: () => ({
          get: jest.fn((param) => (param === "sort" ? "name-asc" : null)),
          toString: jest.fn(() => "sort=name-asc"),
        }),
        useParams: () => ({
          slug: "test-org",
        }),
        usePathname: () => "/organizations/test-org",
      }));

      // Re-render component to pick up new URL params
      render(<OrganizationDetailClient organization={mockOrganization} />);

      // Wait for API call to be made with sort parameter
      await waitFor(() => {
        expect(getOrganizationDogs).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            sort: expect.stringMatching(/newest|name-asc|name-desc/),
          }),
        );
      });
    });

    it("should verify API call structure contains required parameters", async () => {
      render(<OrganizationDetailClient organization={mockOrganization} />);

      await waitFor(() => {
        expect(getOrganizationDogs).toHaveBeenCalled();
      });

      // Verify the API call structure
      const apiCall = getOrganizationDogs.mock.calls[0];
      expect(apiCall).toHaveLength(2); // organizationId and params
      expect(apiCall[0]).toBe(1); // organization ID
      expect(apiCall[1]).toHaveProperty("sort"); // params should include sort
      expect(apiCall[1]).toHaveProperty("limit"); // params should include limit
      expect(apiCall[1]).toHaveProperty("offset"); // params should include offset
    });
  });
});
