import React from "react";
import { render, screen, waitFor, fireEvent, act } from "../../../test-utils";
import { jest } from "@jest/globals";
import { flushSync } from "react-dom";

// Mock the animalsService module using a factory function
jest.doMock("../../../services/animalsService", () => ({
  getAnimals: jest.fn(),
  getAnimalById: jest.fn(),
  getAnimalsByCuration: jest.fn(),
  getStandardizedBreeds: jest.fn(),
  getBreedGroups: jest.fn(),
  getLocationCountries: jest.fn(),
  getAvailableCountries: jest.fn(),
  getAvailableRegions: jest.fn(),
  getOrganizations: jest.fn(),
  getStatistics: jest.fn(),
}));

// Now import DogSection after the mock is set up
const DogSection = require("../DogSection").default;

// Mock other dependencies
jest.mock("../../../utils/logger", () => ({
  reportError: jest.fn(),
}));

jest.mock("../../../utils/imageUtils", () => ({
  preloadImages: jest.fn(),
}));

// Mock next/link
jest.mock("next/link", () => {
  return function MockLink({ children, href, className, ...otherProps }) {
    return (
      <a href={href} className={className} {...otherProps}>
        {children}
      </a>
    );
  };
});

// Mock DogCardOptimized component
jest.mock("../../dogs/DogCardOptimized", () => {
  return function MockDogCardOptimized({ dog, priority }) {
    return (
      <div data-testid={`dog-card-${dog.id}`} data-priority={priority}>
        <h3>{dog.name}</h3>
        <p>{dog.breed}</p>
      </div>
    );
  };
});

// Mock DogCardErrorBoundary
jest.mock("../../error/DogCardErrorBoundary", () => {
  return function MockDogCardErrorBoundary({ children }) {
    return <div data-testid="error-boundary">{children}</div>;
  };
});

// Mock LoadingSkeleton components
jest.mock("../../ui/LoadingSkeleton", () => ({
  DogCardSkeleton: function MockDogCardSkeleton() {
    return <div data-testid="dog-card-skeleton">Loading dog...</div>;
  },
}));

const mockDogs = [
  {
    id: "1",
    name: "Luna",
    breed: "Mixed",
    gender: "Female",
    primary_image_url: "https://example.com/luna.jpg",
    organization: { name: "Pets in Turkey", city: "Izmir", country: "Turkey" },
    created_at: "2025-06-15T10:00:00Z", // Recent dog
  },
  {
    id: "2",
    name: "Max",
    breed: "German Shepherd",
    gender: "Male",
    primary_image_url: "https://example.com/max.jpg",
    organization: { name: "Berlin Rescue", city: "Berlin", country: "Germany" },
    created_at: "2025-06-10T10:00:00Z",
  },
  {
    id: "3",
    name: "Bella",
    breed: "Golden Retriever",
    gender: "Female",
    primary_image_url: "https://example.com/bella.jpg",
    organization: { name: "Happy Tails", city: "Munich", country: "Germany" },
    created_at: "2025-06-12T10:00:00Z",
  },
  {
    id: "4",
    name: "Rocky",
    breed: "Beagle",
    gender: "Male",
    primary_image_url: "https://example.com/rocky.jpg",
    organization: { name: "Tierschutz EU", city: "Vienna", country: "Austria" },
    created_at: "2025-06-14T10:00:00Z",
  },
];

// Import the mocked module to use in tests
const { getAnimalsByCuration } = require("../../../services/animalsService");

describe("DogSection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default successful mock
    getAnimalsByCuration.mockImplementation(() => {
      return Promise.resolve(mockDogs);
    });
  });

  describe("Component Structure", () => {
    test("renders section with title and subtitle", () => {
      render(
        <DogSection
          title="Just Added"
          subtitle="New dogs looking for homes"
          curationType="recent"
          viewAllHref="/dogs?curation=recent"
        />,
      );

      expect(screen.getByText("Just Added")).toBeInTheDocument();
      expect(
        screen.getByText("New dogs looking for homes"),
      ).toBeInTheDocument();
    });

    test("renders View all link with correct href", () => {
      render(
        <DogSection
          title="From Different Rescues"
          subtitle="Dogs from each organization"
          curationType="diverse"
          viewAllHref="/dogs?curation=diverse"
        />,
      );

      const viewAllLink = screen.getByText("View all");
      expect(viewAllLink).toBeInTheDocument();
      expect(viewAllLink.closest("a")).toHaveAttribute(
        "href",
        "/dogs?curation=diverse",
      );
    });

    test("renders error state when API fails", async () => {
      // Mock the function to reject
      getAnimalsByCuration.mockRejectedValue(new Error("API Error"));

      let component;
      await act(async () => {
        component = render(
          <DogSection
            title="Test Section"
            subtitle="Test subtitle"
            curationType="recent"
            viewAllHref="/dogs"
          />,
        );
        // Force React to flush all effects and state updates
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Wait for error state to appear
      await waitFor(
        () => {
          expect(screen.getByTestId("dog-section-error")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Should show retry button
      expect(screen.getByTestId("dog-section-retry")).toBeInTheDocument();
    });
  });

  describe("API Integration", () => {
    test("attempts to call getAnimalsByCuration on mount", async () => {
      render(
        <DogSection
          title="Just Added"
          subtitle="New dogs"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      // Wait for component to settle
      await waitFor(() => {
        expect(screen.getByRole("region")).toBeInTheDocument();
      });

      // The function should have been called even if it fails
      expect(getAnimalsByCuration).toHaveBeenCalled();
      expect(getAnimalsByCuration).toHaveBeenCalledWith("recent", 4);
    });

    test("rerenders when curationType changes", async () => {
      const { rerender } = render(
        <DogSection
          title="Test"
          subtitle="Test"
          curationType="diverse"
          viewAllHref="/dogs"
        />,
      );

      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByRole("region")).toBeInTheDocument();
      });

      const callCount = getAnimalsByCuration.mock.calls.length;

      rerender(
        <DogSection
          title="Test"
          subtitle="Test"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      // Should be called again on rerender with different curationType
      await waitFor(() => {
        expect(getAnimalsByCuration).toHaveBeenCalledTimes(callCount + 1);
        expect(getAnimalsByCuration).toHaveBeenLastCalledWith("recent", 4);
      });
    });
  });

  describe("Loading States", () => {
    test("shows loading state while fetching data", () => {
      getAnimalsByCuration.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <DogSection
          title="Test"
          subtitle="Test"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      expect(screen.getByTestId("skeleton-grid")).toBeInTheDocument();
    });

    test("hides loading state after data loads", async () => {
      getAnimalsByCuration.mockResolvedValue(mockDogs);

      render(
        <DogSection
          title="Test"
          subtitle="Test"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      await waitFor(() => {
        expect(screen.queryByTestId("skeleton-grid")).not.toBeInTheDocument();
      });
    });
  });

  describe("Enhanced Loading States (Skeleton)", () => {
    test("should show skeleton grid on desktop during loading", () => {
      // Mock loading state
      getAnimalsByCuration.mockImplementation(() => new Promise(() => {}));

      render(
        <DogSection
          title="Test Section"
          subtitle="Test subtitle"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      // Should show 4 skeletons in grid
      const skeletons = screen.getAllByTestId("dog-card-skeleton");
      expect(skeletons).toHaveLength(4);

      // Grid container should have proper classes
      const container = screen.getByTestId("skeleton-grid");
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass("grid");
    });

    test("should show mobile carousel skeletons during loading", () => {
      // Mock mobile viewport
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 375,
      });
      jest
        .mocked(getAnimalsByCuration)
        .mockImplementation(() => new Promise(() => {}));

      render(
        <DogSection
          title="Test Section"
          subtitle="Test subtitle"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      // Should show skeletons (mobile carousel will be handled by component)
      const skeletons = screen.getAllByTestId("dog-card-skeleton");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    test("should show different content when loading completes", async () => {
      // Test the basic transition from loading to loaded state
      getAnimalsByCuration.mockResolvedValue(mockDogs);

      render(
        <DogSection
          title="Test Section"
          subtitle="Test subtitle"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByTestId("dog-section")).toBeInTheDocument();
      });

      // Should have dog grid content
      expect(screen.getByTestId("dog-grid")).toBeInTheDocument();
    });

    test("should maintain exact layout dimensions to prevent shifts", () => {
      render(
        <DogSection
          title="Test Section"
          subtitle="Test subtitle"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      const container = screen.getByTestId("dog-section-container-recent");

      // Should have minimum height to prevent layout shifts
      expect(container).toHaveClass("min-h-[400px]");
    });

    test("should have smooth transition classes for loading states", () => {
      render(
        <DogSection
          title="Test Section"
          subtitle="Test subtitle"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      // Check for transition classes
      const skeletonContainer =
        screen.getByTestId("skeleton-grid").parentElement;
      expect(skeletonContainer).toHaveClass(
        "transition-opacity",
        "duration-300",
      );
    });
  });

  describe("Error Handling", () => {
    test("shows error message when API call fails", async () => {
      // Mock async rejection
      getAnimalsByCuration.mockRejectedValue(new Error("API Error"));

      let component;
      await act(async () => {
        component = render(
          <DogSection
            title="Test"
            subtitle="Test"
            curationType="recent"
            viewAllHref="/dogs"
          />,
        );
        // Force React to flush all effects and state updates
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Wait for the error state to be set
      await waitFor(
        () => {
          expect(screen.getByTestId("dog-section-error")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });

    test("shows retry button on error", async () => {
      // Mock async rejection
      getAnimalsByCuration.mockRejectedValue(new Error("API Error"));

      let component;
      await act(async () => {
        component = render(
          <DogSection
            title="Test"
            subtitle="Test"
            curationType="recent"
            viewAllHref="/dogs"
          />,
        );
        // Force React to flush all effects and state updates
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Wait for the error state with retry button
      await waitFor(
        () => {
          expect(screen.getByTestId("dog-section-error")).toBeInTheDocument();
          expect(screen.getByTestId("dog-section-retry")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });

    test("retry button refetches data", async () => {
      getAnimalsByCuration
        .mockRejectedValueOnce(new Error("API Error"))
        .mockResolvedValueOnce(mockDogs);

      let component;
      await act(async () => {
        component = render(
          <DogSection
            title="Test"
            subtitle="Test"
            curationType="recent"
            viewAllHref="/dogs"
          />,
        );
        // Force React to flush all effects and state updates
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await waitFor(
        () => {
          expect(screen.getByText("Retry")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      await act(async () => {
        fireEvent.click(screen.getByText("Retry"));
        // Force React to flush all effects and state updates
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await waitFor(
        () => {
          expect(getAnimalsByCuration).toHaveBeenCalledTimes(2);
          expect(screen.getByTestId("dog-grid")).toBeInTheDocument();
          // Dog cards now have dynamic testids like "dog-card-1", "dog-card-2", etc.
          const dogCards = screen.getAllByTestId(/^dog-card-/);
          expect(dogCards).toHaveLength(mockDogs.length);
        },
        { timeout: 5000 },
      );
    }, 10000); // Increase timeout to 10 seconds
  });

  describe("Empty State", () => {
    test("shows empty message when no dogs returned", async () => {
      // Override default mock for this test
      getAnimalsByCuration.mockResolvedValue([]);

      let component;
      await act(async () => {
        component = render(
          <DogSection
            title="Test"
            subtitle="Test"
            curationType="recent"
            viewAllHref="/dogs"
          />,
        );
        // Force React to flush all effects and state updates
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should show empty state message
      await waitFor(
        () => {
          expect(
            screen.getByText("No dogs available at the moment."),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });
  });

  describe("Responsive Design", () => {
    test.skip("applies correct CSS classes for responsive grid", async () => {
      await act(async () => {
        render(
          <DogSection
            title="Test"
            subtitle="Test"
            curationType="recent"
            viewAllHref="/dogs"
          />,
        );
      });

      await waitFor(() => {
        const gridContainer = screen.getByTestId("dog-grid");
        expect(gridContainer).toHaveClass("grid");
        expect(gridContainer).toHaveClass("grid-cols-1");
        expect(gridContainer).toHaveClass("md:grid-cols-2");
        expect(gridContainer).toHaveClass("lg:grid-cols-4");
      });
    });
  });

  describe("Accessibility", () => {
    test("has proper ARIA labels", async () => {
      render(
        <DogSection
          title="Just Added"
          subtitle="New dogs"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      await waitFor(() => {
        const section = screen.getByRole("region");
        expect(section).toHaveAttribute("aria-labelledby");
      });
    });

    test("View all link has proper accessibility attributes", async () => {
      render(
        <DogSection
          title="Just Added"
          subtitle="New dogs"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      const viewAllLink = screen.getByText("View all").closest("a");
      expect(viewAllLink).toHaveAttribute("aria-label", "View all just added");
      expect(viewAllLink).toHaveAttribute("href", "/dogs");
    });
  });

  describe("Server-Side Rendering Support", () => {
    test("renders with initial dogs data without loading state", () => {
      render(
        <DogSection
          title="Just Added"
          subtitle="New dogs looking for homes"
          curationType="recent"
          viewAllHref="/dogs?curation=recent"
          initialDogs={mockDogs}
          priority={true}
        />,
      );

      // Should not show loading state (element exists but should be hidden)
      const loadingElement = screen.getByTestId("dog-section-loading");
      expect(loadingElement).toHaveClass("opacity-0");
      
      // Should show dog grid immediately
      expect(screen.getByTestId("dog-grid")).toBeInTheDocument();
      
      // Should render dog cards
      expect(screen.getByTestId("dog-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("dog-card-2")).toBeInTheDocument();
      
      // First dog should have priority loading
      const firstCard = screen.getByTestId("dog-card-1");
      expect(firstCard).toHaveAttribute("data-priority", "true");
      
      // Second dog should not have priority
      const secondCard = screen.getByTestId("dog-card-2");
      expect(secondCard).toHaveAttribute("data-priority", "false");
      
      // Should not call API when initial data is provided
      expect(getAnimalsByCuration).not.toHaveBeenCalled();
    });

    test("falls back to API fetch when no initial dogs provided", async () => {
      getAnimalsByCuration.mockResolvedValue(mockDogs);
      
      render(
        <DogSection
          title="Just Added"
          subtitle="New dogs looking for homes"
          curationType="recent"
          viewAllHref="/dogs?curation=recent"
        />,
      );

      // Should show loading state initially (visible)
      const loadingElement = screen.getByTestId("dog-section-loading");
      expect(loadingElement).toHaveClass("opacity-100");
      
      // Should call API
      expect(getAnimalsByCuration).toHaveBeenCalledWith("recent", 4);
      
      // Wait for dogs to load
      await waitFor(() => {
        expect(screen.getByTestId("dog-grid")).toBeInTheDocument();
      });
    });
  });
});
