import React from "react";
import { render, screen, waitFor } from "../../../../test-utils";
import "@testing-library/jest-dom";
import OrgDetailPage from "../page";
import {
  getOrganizationBySlug,
  getOrganizationDogs,
} from "../../../../services/organizationsService";

// mock the service
jest.mock("../../../../services/organizationsService", () => ({
  getOrganizationBySlug: jest.fn(),
  getOrganizationDogs: jest.fn().mockResolvedValue([]),
}));

// mock next/navigation
jest.mock("next/navigation", () => ({
  useParams: () => ({ slug: "test-org-42" }),
  useRouter: () => ({ back: jest.fn() }),
  usePathname: () => "/organizations/test-org-42",
  useSearchParams: () => ({ get: () => null }),
}));

// mock Loading
jest.mock("../../../../components/ui/Loading", () => {
  const MockLoading = () => <div data-testid="loading" />;
  MockLoading.displayName = "MockLoading";
  return MockLoading;
});

// Console error suppression is handled globally in jest.setup.js

describe("OrgDetailPage – share buttons", () => {
  it("renders SocialMediaLinks with the org social_media URLs", async () => {
    // arrange: service returns an org with social_media
    getOrganizationBySlug.mockResolvedValueOnce({
      id: 42,
      name: "Test Org",
      description: "Desc",
      website_url: "https://test.org",
      social_media: {
        twitter: "https://twitter.com/testorg",
        linkedin: "https://linkedin.com/company/testorg",
      },
    });

    render(<OrgDetailPage />);

    // wait for loading to disappear
    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    // now ensure the two links render
    expect(screen.getByRole("link", { name: /twitter/i })).toHaveAttribute(
      "href",
      "https://twitter.com/testorg",
    );

    expect(screen.getByRole("link", { name: /linkedin/i })).toHaveAttribute(
      "href",
      "https://linkedin.com/company/testorg",
    );
  });

  it("hides SocialMediaLinks when social_media is empty", async () => {
    getOrganizationBySlug.mockResolvedValueOnce({
      id: 42,
      name: "Test Org",
      description: "Desc",
      website_url: "https://test.org",
      social_media: {}, // ← empty
    });

    render(<OrgDetailPage />);

    await waitFor(() =>
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument(),
    );

    expect(screen.queryByRole("link", { name: /twitter/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /linkedin/i })).toBeNull();
  });
});
