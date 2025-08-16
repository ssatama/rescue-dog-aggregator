// Tests for RelatedDogsSection component with lazy loading support
import React from "react";
import { render, screen, waitFor, act } from "../../../test-utils";
import RelatedDogsSection from "../RelatedDogsSection";
import { getRelatedDogs } from "../../../services/relatedDogsService";

// Mock the relatedDogsService
jest.mock("../../../services/relatedDogsService");

// Mock RelatedDogsCard component
jest.mock("../RelatedDogsCard", () => {
  return function MockRelatedDogsCard({ dog }) {
    return (
      <div data-testid={`related-dog-card-${dog.id}`}>
        <span>{dog.name}</span>
      </div>
    );
  };
});

// Mock Next.js Link
jest.mock("next/link", () => {
  return function MockLink({ href, children, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock the useScrollAnimation hook to trigger immediately in tests
jest.mock("../../../hooks/useScrollAnimation", () => ({
  useScrollAnimation: (options = {}) => {
    const ref = React.useRef();
    // Always return visible immediately in tests
    return [ref, true];
  },
  ScrollAnimationWrapper: ({ children, ...props }) => (
    <div {...props}>{children}</div>
  ),
}));

describe("RelatedDogsSection", () => {
  const mockOrganization = {
    id: 456,
    name: "Pets in Turkey",
  };

  const mockRelatedDogs = [
    {
      id: 124,
      name: "Luna",
      breed: "Mixed Breed",
      age_text: "2 years",
      primary_image_url: "https://example.com/luna.jpg",
    },
    {
      id: 125,
      name: "Max",
      breed: "Terrier Mix",
      age_text: "4 years",
      primary_image_url: "https://example.com/max.jpg",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading State", () => {
    it("should show loading skeleton while fetching related dogs", async () => {
      // Arrange
      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      getRelatedDogs.mockReturnValue(promise);

      // Act
      await act(async () => {
        render(
          <RelatedDogsSection
            organizationId={456}
            currentDogId={123}
            organization={mockOrganization}
          />,
        );
      });

      // Assert - Should show loading state
      expect(screen.getByTestId("related-dogs-loading")).toBeInTheDocument();

      // Cleanup
      await act(async () => {
        resolvePromise([]);
      });
    });

    it("should show section title even during loading", async () => {
      // Arrange
      getRelatedDogs.mockReturnValue(new Promise(() => {}));

      // Act
      await act(async () => {
        render(
          <RelatedDogsSection
            organizationId={456}
            currentDogId={123}
            organization={mockOrganization}
          />,
        );
      });

      // Assert
      expect(
        screen.getByText("More Dogs from Pets in Turkey"),
      ).toBeInTheDocument();
    });
  });

  describe("Success State with Related Dogs", () => {
    beforeEach(() => {
      getRelatedDogs.mockResolvedValue(mockRelatedDogs);
    });

    it("should render section title with organization name", async () => {
      // Act
      await act(async () => {
        render(
          <RelatedDogsSection
            organizationId={456}
            currentDogId={123}
            organization={mockOrganization}
          />,
        );
      });

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText("More Dogs from Pets in Turkey"),
        ).toBeInTheDocument();
      });
    });

    it("should render grid of related dog cards", async () => {
      // Act
      await act(async () => {
        render(
          <RelatedDogsSection
            organizationId={456}
            currentDogId={123}
            organization={mockOrganization}
          />,
        );
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("related-dogs-grid")).toBeInTheDocument();
        expect(screen.getByTestId("related-dog-card-124")).toBeInTheDocument();
        expect(screen.getByTestId("related-dog-card-125")).toBeInTheDocument();
      });
    });

    it("should limit display to maximum 3 dogs", async () => {
      // Arrange
      const manyDogs = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `Dog ${i + 1}`,
        breed: "Test Breed",
        age_text: "2 years",
      }));
      getRelatedDogs.mockResolvedValue(manyDogs);

      // Act
      await act(async () => {
        render(
          <RelatedDogsSection
            organizationId={456}
            currentDogId={123}
            organization={mockOrganization}
          />,
        );
      });

      // Assert
      await waitFor(() => {
        const cards = screen.getAllByTestId(/related-dog-card-/);
        expect(cards).toHaveLength(3);
      });
    });

    it('should render "View all available dogs" link', async () => {
      // Act
      await act(async () => {
        render(
          <RelatedDogsSection
            organizationId={456}
            currentDogId={123}
            organization={mockOrganization}
          />,
        );
      });

      // Assert
      await waitFor(() => {
        const viewAllLink = screen.getByText(/View all available dogs/);
        expect(viewAllLink).toBeInTheDocument();
        expect(viewAllLink.closest("a")).toHaveAttribute(
          "href",
          "/dogs?organization_id=456",
        );
      });
    });

    it("should have proper grid layout classes", async () => {
      // Act
      await act(async () => {
        render(
          <RelatedDogsSection
            organizationId={456}
            currentDogId={123}
            organization={mockOrganization}
          />,
        );
      });

      // Assert
      await waitFor(() => {
        const grid = screen.getByTestId("related-dogs-grid");
        expect(grid).toHaveClass("grid");
        expect(grid).toHaveClass("grid-cols-1");
        expect(grid).toHaveClass("md:grid-cols-3");
        expect(grid).toHaveClass("gap-6");
      });
    });
  });

  describe("Empty State", () => {
    beforeEach(() => {
      getRelatedDogs.mockResolvedValue([]);
    });

    it("should show empty state message when no related dogs", async () => {
      // Act
      await act(async () => {
        render(
          <RelatedDogsSection
            organizationId={456}
            currentDogId={123}
            organization={mockOrganization}
          />,
        );
      });

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText("No other dogs available from this rescue"),
        ).toBeInTheDocument();
      });
    });

    it('should still show "View all dogs" link in empty state', async () => {
      // Act
      await act(async () => {
        render(
          <RelatedDogsSection
            organizationId={456}
            currentDogId={123}
            organization={mockOrganization}
          />,
        );
      });

      // Assert
      await waitFor(() => {
        const viewAllLink = screen.getByText(/View all available dogs/);
        expect(viewAllLink).toBeInTheDocument();
      });
    });

    it("should maintain consistent styling in empty state", async () => {
      // Act
      await act(async () => {
        render(
          <RelatedDogsSection
            organizationId={456}
            currentDogId={123}
            organization={mockOrganization}
          />,
        );
      });

      // Assert
      await waitFor(() => {
        expect(
          screen.getByTestId("related-dogs-empty-state"),
        ).toBeInTheDocument();
        expect(screen.getByTestId("related-dogs-empty-state")).toHaveClass(
          "text-center",
        );
        expect(screen.getByTestId("related-dogs-empty-state")).toHaveClass(
          "py-8",
        );
      });
    });
  });

  describe("Error State", () => {
    beforeEach(() => {
      getRelatedDogs.mockRejectedValue(new Error("API Error"));
    });

    it("should handle API errors gracefully", async () => {
      // Act
      await act(async () => {
        render(
          <RelatedDogsSection
            organizationId={456}
            currentDogId={123}
            organization={mockOrganization}
          />,
        );
      });

      // Assert
      await waitFor(() => {
        // Should not crash and should show some fallback state
        expect(
          screen.getByText("More Dogs from Pets in Turkey"),
        ).toBeInTheDocument();
      });
    });

    it("should show error message when API fails", async () => {
      // Act
      await act(async () => {
        render(
          <RelatedDogsSection
            organizationId={456}
            currentDogId={123}
            organization={mockOrganization}
          />,
        );
      });

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText(/Unable to load related dogs/),
        ).toBeInTheDocument();
      });
    });
  });

  describe("API Integration", () => {
    it("should call getRelatedDogs with correct parameters", async () => {
      // Arrange
      getRelatedDogs.mockResolvedValue(mockRelatedDogs);

      // Act
      await act(async () => {
        render(
          <RelatedDogsSection
            organizationId={456}
            currentDogId={123}
            organization={mockOrganization}
          />,
        );
      });

      // Assert - Wait for the component to trigger the API call
      await waitFor(() => {
        expect(getRelatedDogs).toHaveBeenCalledWith(456, 123);
      });
    });

    it("should not render section when organizationId is missing", () => {
      // Act
      render(
        <RelatedDogsSection
          organizationId={null}
          currentDogId={123}
          organization={mockOrganization}
        />,
      );

      // Assert
      expect(screen.queryByText("More Dogs from")).not.toBeInTheDocument();
    });

    it("should not render section when currentDogId is missing", () => {
      // Act
      render(
        <RelatedDogsSection
          organizationId={456}
          currentDogId={null}
          organization={mockOrganization}
        />,
      );

      // Assert
      expect(screen.queryByText("More Dogs from")).not.toBeInTheDocument();
    });
  });
});
