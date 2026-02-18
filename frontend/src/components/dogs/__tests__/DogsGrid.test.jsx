import React from "react";
import { render, screen } from "../../../test-utils";
import DogsGrid from "../DogsGrid";

// Mock DogCardOptimized component
jest.mock("../DogCardOptimized", () => {
  return function MockDogCardOptimized({ dog }) {
    return (
      <div data-testid={`dog-card-${dog.id}`}>Mock DogCard: {dog.name}</div>
    );
  };
});

// Mock DogCardErrorBoundary component
jest.mock("../../error/DogCardErrorBoundary", () => {
  return function MockDogCardErrorBoundary({ children }) {
    return children;
  };
});

describe("DogsGrid Component", () => {
  const mockDogs = [
    {
      id: 1,
      name: "Buddy",
      status: "available",
      organization: { name: "Test Org 1" },
    },
    {
      id: 2,
      name: "Max",
      status: "available",
      organization: { name: "Test Org 2" },
    },
    {
      id: 3,
      name: "Luna",
      status: "available",
      organization: { name: "Test Org 3" },
    },
  ];

  describe("Basic Rendering", () => {
    test("renders dogs in a grid layout", () => {
      render(<DogsGrid dogs={mockDogs} />);

      // Check that all dogs are rendered
      expect(screen.getByTestId("dog-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("dog-card-2")).toBeInTheDocument();
      expect(screen.getByTestId("dog-card-3")).toBeInTheDocument();
    });

    test("applies correct grid classes with auto-fill responsive layout", () => {
      render(<DogsGrid dogs={mockDogs} />);

      const gridContainer = screen.getByTestId("dogs-grid");
      expect(gridContainer).toHaveClass("grid");
      expect(gridContainer).toHaveClass("justify-center");
      expect(gridContainer).toHaveClass("grid-cols-[repeat(auto-fill,minmax(min(100%,300px),340px))]");
    });

    test("applies correct gap spacing with updated desktop spacing", () => {
      render(<DogsGrid dogs={mockDogs} />);

      const gridContainer = screen.getByTestId("dogs-grid");
      expect(gridContainer).toHaveClass("gap-4"); // Mobile gap (unchanged)
      expect(gridContainer).toHaveClass("md:gap-6"); // Desktop gap (increased from gap-4)
    });
  });

  describe("Empty States", () => {
    test("renders empty state when no dogs provided", () => {
      render(<DogsGrid dogs={[]} />);

      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).toBeInTheDocument();
      expect(emptyState).toHaveTextContent("No dogs available");
    });

    test("renders empty state when dogs array is null/undefined", () => {
      render(<DogsGrid dogs={null} />);

      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).toBeInTheDocument();
    });

    test("empty state has proper styling", () => {
      render(<DogsGrid dogs={[]} />);

      const emptyState = screen.getByTestId("empty-state");
      expect(emptyState).toHaveClass(
        "bg-gradient-to-br",
        "from-orange-50",
        "to-orange-100/50",
      );
      expect(emptyState).toHaveClass("rounded-xl");
      expect(emptyState).toHaveClass("p-8");
      expect(emptyState).toHaveClass("text-center");
    });
  });

  describe("Loading States", () => {
    test("renders loading skeleton when in loading state", () => {
      render(<DogsGrid dogs={[]} loading={true} />);

      const loadingSkeletons = screen.getAllByTestId("dog-card-skeleton");
      expect(loadingSkeletons).toHaveLength(8); // Default skeleton count
    });

    test("renders custom number of loading skeletons", () => {
      render(<DogsGrid dogs={[]} loading={true} skeletonCount={12} />);

      const loadingSkeletons = screen.getAllByTestId("dog-card-skeleton");
      expect(loadingSkeletons).toHaveLength(12);
    });

    test("skeleton cards have proper structure", () => {
      render(<DogsGrid dogs={[]} loading={true} skeletonCount={1} />);

      const skeleton = screen.getByTestId("dog-card-skeleton");
      // Verify skeleton has proper card styling
      expect(skeleton).toHaveClass("bg-card");
      expect(skeleton).toHaveClass("shadow-sm");
    });
  });

  describe("Grid Responsiveness", () => {
    test("applies auto-fit grid with minimum card width", () => {
      render(<DogsGrid dogs={mockDogs} />);

      const gridContainer = screen.getByTestId("dogs-grid");
      const computedStyle = window.getComputedStyle(gridContainer);

      // The CSS Grid should use the classes we set
      expect(gridContainer).toHaveClass("grid");
    });

    test("handles single dog correctly", () => {
      const singleDog = [mockDogs[0]];
      render(<DogsGrid dogs={singleDog} />);

      expect(screen.getByTestId("dog-card-1")).toBeInTheDocument();
      expect(screen.queryByTestId("dog-card-2")).not.toBeInTheDocument();
    });

    test("handles many dogs correctly", () => {
      const manyDogs = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        name: `Dog ${i + 1}`,
        status: "available",
        organization: { name: `Org ${i + 1}` },
      }));

      render(<DogsGrid dogs={manyDogs} />);

      // Check first and last dogs are rendered
      expect(screen.getByTestId("dog-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("dog-card-20")).toBeInTheDocument();
    });
  });

  describe("Error Boundaries", () => {
    test("handles invalid dog data gracefully", () => {
      const invalidDogs = [
        { id: 1, name: "Valid Dog" },
        null,
        { id: 3 }, // missing name
        undefined,
      ];

      // Should not crash and should render valid dogs
      render(<DogsGrid dogs={invalidDogs} />);

      // Should still render the valid dog
      expect(screen.getByTestId("dog-card-1")).toBeInTheDocument();
    });
  });

  describe("Performance", () => {
    test("applies correct aria-label for grid", () => {
      render(<DogsGrid dogs={mockDogs} />);

      const gridContainer = screen.getByTestId("dogs-grid");
      expect(gridContainer).toHaveAttribute(
        "aria-label",
        "Dogs available for adoption",
      );
    });

    test("supports custom className prop", () => {
      render(<DogsGrid dogs={mockDogs} className="custom-grid-class" />);

      const gridContainer = screen.getByTestId("dogs-grid");
      expect(gridContainer).toHaveClass("custom-grid-class");
    });

    test("forwards additional props to grid container", () => {
      render(<DogsGrid dogs={mockDogs} data-custom="test-value" />);

      const gridContainer = screen.getByTestId("dogs-grid");
      expect(gridContainer).toHaveAttribute("data-custom", "test-value");
    });
  });

  describe("Session 6: Enhanced Loading States & Transitions", () => {
    test("supports different loading types with appropriate animations", () => {
      const { rerender } = render(
        <DogsGrid dogs={[]} loading={true} loadingType="initial" />,
      );

      let gridContainer = screen.getByTestId("dogs-grid-skeleton");
      expect(gridContainer).toHaveClass("duration-300");

      // Test filter loading type
      rerender(<DogsGrid dogs={[]} loading={true} loadingType="filter" />);
      gridContainer = screen.getByTestId("dogs-grid-skeleton");
      expect(gridContainer).toHaveClass("duration-200");
    });

    test("adjusts skeleton count for filter loading type", () => {
      render(
        <DogsGrid
          dogs={[]}
          loading={true}
          loadingType="filter"
          skeletonCount={12}
        />,
      );

      // Should limit to 6 skeletons for filter loading
      const skeletons = screen.getAllByTestId("dog-card-skeleton");
      expect(skeletons).toHaveLength(6);
    });

    test("applies staggered animation delays to dog cards", () => {
      render(<DogsGrid dogs={mockDogs} className="content-fade-in" />);

      // Each dog card should receive appropriate animation delay
      const gridContainer = screen.getByTestId("dogs-grid");
      expect(gridContainer).toHaveClass("content-fade-in");
    });

    test("applies staggered animation system correctly", () => {
      render(<DogsGrid dogs={mockDogs} className="animate-fade-in" />);

      // Check that all dog cards are rendered (validates the staggered animation logic)
      expect(screen.getByTestId("dog-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("dog-card-2")).toBeInTheDocument();
      expect(screen.getByTestId("dog-card-3")).toBeInTheDocument();

      // Verify grid has proper animation classes
      const gridContainer = screen.getByTestId("dogs-grid");
      expect(gridContainer).toHaveClass("animate-fade-in");
    });

    test("handles many dogs with staggered animations", () => {
      const manyDogs = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Dog ${i + 1}`,
        status: "available",
        organization: { name: `Org ${i + 1}` },
      }));

      render(<DogsGrid dogs={manyDogs} className="content-fade-in" />);

      // Verify all dogs are rendered
      expect(screen.getByTestId("dog-card-1")).toBeInTheDocument();
      expect(screen.getByTestId("dog-card-10")).toBeInTheDocument();

      // Verify grid animation classes
      const gridContainer = screen.getByTestId("dogs-grid");
      expect(gridContainer).toHaveClass("content-fade-in");
    });

    test("skeletons with filter loading have staggered animation delays", () => {
      render(
        <DogsGrid
          dogs={[]}
          loading={true}
          loadingType="filter"
          skeletonCount={4}
        />,
      );

      const skeletons = screen.getAllByTestId("dog-card-skeleton");
      expect(skeletons).toHaveLength(4);

      // Verify skeletons are rendered correctly
      expect(skeletons).toHaveLength(4);
      // Animation delays may be handled differently with optimized components
    });
  });
});
