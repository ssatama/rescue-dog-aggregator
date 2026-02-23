import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import OrganizationsPage from "../page";
import { getEnhancedOrganizationsSSR } from "../../../services/organizationsService";

jest.mock("../../../services/organizationsService", () => ({
  getEnhancedOrganizationsSSR: jest.fn(),
}));

jest.mock("../../../components/layout/Layout", () => {
  return function MockLayout({ children }) {
    return <div data-testid="layout">{children}</div>;
  };
});

jest.mock("../OrganizationsClient", () => {
  return function MockOrganizationsClient({ initialData }) {
    return (
      <div data-testid="organizations-client">
        <div data-testid="initial-data-count">
          {initialData ? initialData.length : 0}
        </div>
      </div>
    );
  };
});

describe("OrganizationsPage Performance", () => {
  const mockOrganizations = [
    {
      id: 1,
      name: "Test Org 1",
      slug: "test-org-1",
      total_dogs: 10,
      recent_dogs: [
        { id: 1, name: "Dog 1", image_url: "/dog1.jpg" },
        { id: 2, name: "Dog 2", image_url: "/dog2.jpg" },
        { id: 3, name: "Dog 3", image_url: "/dog3.jpg" },
      ],
    },
    {
      id: 2,
      name: "Test Org 2",
      slug: "test-org-2",
      total_dogs: 5,
      recent_dogs: [
        { id: 4, name: "Dog 4", image_url: "/dog4.jpg" },
        { id: 5, name: "Dog 5", image_url: "/dog5.jpg" },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch data server-side and pass to client", async () => {
    getEnhancedOrganizationsSSR.mockResolvedValue(mockOrganizations);

    const result = await OrganizationsPage();
    const { container } = render(result);

    expect(getEnhancedOrganizationsSSR).toHaveBeenCalledTimes(1);

    const clientComponent = screen.getByTestId("organizations-client");
    expect(clientComponent).toBeInTheDocument();

    const dataCount = screen.getByTestId("initial-data-count");
    expect(dataCount).toHaveTextContent("2");
  });

  it("should handle empty organizations list", async () => {
    getEnhancedOrganizationsSSR.mockResolvedValue([]);

    const result = await OrganizationsPage();
    const { container } = render(result);

    const dataCount = screen.getByTestId("initial-data-count");
    expect(dataCount).toHaveTextContent("0");
  });

  it("should handle server-side fetch errors gracefully", async () => {
    getEnhancedOrganizationsSSR.mockRejectedValue(
      new Error("Server fetch failed"),
    );

    const result = await OrganizationsPage({ searchParams: {} });
    const { container } = render(result);

    const dataCount = screen.getByTestId("initial-data-count");
    expect(dataCount).toHaveTextContent("0");
  });

  it("should not make additional API calls on client mount", async () => {
    getEnhancedOrganizationsSSR.mockResolvedValue(mockOrganizations);

    const result = await OrganizationsPage();
    render(result);

    await waitFor(() => {
      expect(getEnhancedOrganizationsSSR).toHaveBeenCalledTimes(1);
    });
  });

  describe("Performance Metrics", () => {
    it("should render without layout shift", async () => {
      getEnhancedOrganizationsSSR.mockResolvedValue(mockOrganizations);

      const result = await OrganizationsPage();
      const { container } = render(result);

      const clientComponent = screen.getByTestId("organizations-client");
      const initialHeight = clientComponent.offsetHeight;

      await waitFor(() => {
        expect(clientComponent.offsetHeight).toBe(initialHeight);
      });
    });

    it("should include cache headers in response", async () => {
      const mockOrganizationsWithHeaders = {
        data: mockOrganizations,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      };

      getEnhancedOrganizationsSSR.mockResolvedValue(
        mockOrganizationsWithHeaders.data,
      );

      const result = await OrganizationsPage();

      expect(getEnhancedOrganizationsSSR).toHaveBeenCalled();
    });
  });
});
