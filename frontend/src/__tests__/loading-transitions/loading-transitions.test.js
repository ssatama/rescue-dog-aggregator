import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { jest } from "@jest/globals";

// Mock services
jest.mock("../../services/animalsService");
const { getAnimalsByCuration } = require("../../services/animalsService");

// Mock other dependencies
jest.mock("../../utils/logger", () => ({
  reportError: jest.fn(),
}));

jest.mock("../../utils/imageUtils", () => ({
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

// Mock DogCard component
jest.mock("../../components/dogs/DogCard", () => {
  return function MockDogCard({ dog, priority }) {
    return (
      <div data-testid={`dog-card-${dog.id}`} data-priority={priority}>
        <h3>{dog.name}</h3>
        <p>{dog.breed}</p>
      </div>
    );
  };
});

// Mock DogCardErrorBoundary
jest.mock("../../components/error/DogCardErrorBoundary", () => {
  return function MockDogCardErrorBoundary({ children }) {
    return <div data-testid="error-boundary">{children}</div>;
  };
});

// Import components to test
import DogSection from "../../components/home/DogSection";

const mockDogs = [
  {
    id: "1",
    name: "Luna",
    breed: "Mixed",
    primary_image_url: "https://example.com/luna.jpg",
    organization: { name: "Pets in Turkey", city: "Izmir", country: "Turkey" },
    created_at: "2025-06-15T10:00:00Z",
  },
  {
    id: "2",
    name: "Max",
    breed: "German Shepherd",
    primary_image_url: "https://example.com/max.jpg",
    organization: { name: "Berlin Rescue", city: "Berlin", country: "Germany" },
    created_at: "2025-06-10T10:00:00Z",
  },
];

describe("Loading Transitions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("DogSection Loading Transitions", () => {
    test("should maintain stable layout during loading transition", () => {
      // Mock loading state
      getAnimalsByCuration.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <DogSection
          title="Test Section"
          subtitle="Test subtitle"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      // Check for container with min-height during loading
      const container = screen.getByTestId("dog-section-container-recent");
      expect(container).toHaveClass("min-h-[400px]");

      // Should show skeleton grid during loading
      expect(screen.getByTestId("skeleton-grid")).toBeInTheDocument();
    });

    test("should have smooth opacity transitions between states", () => {
      getAnimalsByCuration.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <DogSection
          title="Test Section"
          subtitle="Test subtitle"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      // Check for transition classes on skeleton container
      const skeletonContainer =
        screen.getByTestId("skeleton-grid").parentElement;
      expect(skeletonContainer).toHaveClass(
        "transition-opacity",
        "duration-300",
      );
    });

    test("should show skeleton content with proper test IDs for easy detection", () => {
      getAnimalsByCuration.mockImplementation(() => new Promise(() => {}));

      render(
        <DogSection
          title="Test Section"
          subtitle="Test subtitle"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      // Should have proper test IDs for skeleton elements
      expect(screen.getByTestId("skeleton-grid")).toBeInTheDocument();
      const skeletons = screen.getAllByTestId("dog-card-skeleton");
      expect(skeletons).toHaveLength(4);

      // Each skeleton should have proper structure
      skeletons.forEach((skeleton) => {
        expect(skeleton).toHaveAttribute("role", "status");
        expect(skeleton).toHaveAttribute(
          "aria-label",
          "Loading dog information",
        );
      });
    });

    test("should preserve responsive grid layout in loading state", () => {
      getAnimalsByCuration.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <DogSection
          title="Test Section"
          subtitle="Test subtitle"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      // Check skeleton grid classes
      const skeletonGrid = screen.getByTestId("skeleton-grid");
      expect(skeletonGrid).toHaveClass(
        "grid",
        "grid-cols-1",
        "md:grid-cols-2",
        "lg:grid-cols-4",
      );
    });

    test("should handle loading state properly", () => {
      // Test basic loading functionality without complex state transitions
      getAnimalsByCuration.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <DogSection
          title="Test Section"
          subtitle="Test subtitle"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      // Should show loading skeleton
      expect(screen.getByTestId("skeleton-grid")).toBeInTheDocument();
      expect(screen.queryByTestId("dog-section")).not.toBeInTheDocument();
    });
  });

  describe("Performance and Accessibility", () => {
    test("should use proper ARIA attributes for loading states", () => {
      getAnimalsByCuration.mockImplementation(() => new Promise(() => {}));

      render(
        <DogSection
          title="Test Section"
          subtitle="Test subtitle"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      // Check skeleton accessibility
      const skeletons = screen.getAllByRole("status");
      expect(skeletons.length).toBeGreaterThan(0);

      skeletons.forEach((skeleton) => {
        expect(skeleton).toHaveAttribute(
          "aria-label",
          "Loading dog information",
        );
      });
    });

    test("should prevent content layout shifts with consistent dimensions", () => {
      getAnimalsByCuration.mockImplementation(() => new Promise(() => {}));

      render(
        <DogSection
          title="Test Section"
          subtitle="Test subtitle"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      // Check that skeleton cards have proper dimensions matching real cards
      const skeletons = screen.getAllByTestId("dog-card-skeleton");
      skeletons.forEach((skeleton) => {
        expect(skeleton).toHaveClass("h-full"); // Match DogCard height
        expect(skeleton).toHaveClass("rounded-lg"); // Match DogCard styling
        expect(skeleton).toHaveClass("shadow-blue-sm"); // Match DogCard shadow
      });
    });

    test("should use performant shimmer animations", () => {
      getAnimalsByCuration.mockImplementation(() => new Promise(() => {}));

      render(
        <DogSection
          title="Test Section"
          subtitle="Test subtitle"
          curationType="recent"
          viewAllHref="/dogs"
        />,
      );

      // Check for shimmer effects in skeleton elements
      const shimmerElements = screen.getAllByTestId("skeleton-shimmer");
      expect(shimmerElements.length).toBeGreaterThan(0);

      shimmerElements.forEach((shimmer) => {
        expect(shimmer).toHaveClass("skeleton-shimmer");
      });
    });
  });

  describe("Error State Transitions", () => {
    test.skip("should transition smoothly from loading to error state", async () => {
      getAnimalsByCuration.mockRejectedValue(new Error("API Error"));

      await act(async () => {
        render(
          <DogSection
            title="Test Section"
            subtitle="Test subtitle"
            curationType="recent"
            viewAllHref="/dogs"
          />,
        );
      });

      // Should show error state (React.startTransition is async)
      await waitFor(
        () => {
          expect(screen.getByText(/Could not load dogs/)).toBeInTheDocument();
          expect(screen.getByText("Retry")).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Should maintain layout stability in error state
      const container = screen.getByTestId("dog-section-container-recent");
      expect(container).toHaveClass("min-h-[400px]");
    });
  });
});
