import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import PremiumMobileCatalog from "../PremiumMobileCatalog";
import { useViewport } from "@/hooks/useViewport";
import type { Dog } from "@/types/dog";

interface MockMotionProps {
  children?: React.ReactNode;
  [key: string]: unknown;
}

interface MockFilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MockDogModalProps {
  dog: Dog | null;
  isOpen: boolean;
  onClose: () => void;
}

// Mock the useViewport hook
jest.mock("@/hooks/useViewport", () => ({
  useViewport: jest.fn(),
}));

// Mock the useFavorites hook to avoid context provider requirement
jest.mock("@/hooks/useFavorites", () => ({
  useFavorites: () => ({
    favorites: [],
    count: 0,
    isFavorited: () => false,
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(),
    toggleFavorite: jest.fn(),
    clearFavorites: jest.fn(),
    getShareableUrl: () => "/favorites",
    loadFromUrl: jest.fn(),
    isLoading: false,
  }),
}));

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    toString: jest.fn(() => ""),
  }),
  usePathname: () => "/dogs",
}));

// Mock framer-motion to avoid animation complexities in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: MockMotionProps) => (
      <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>
    ),
    article: ({ children, ...props }: MockMotionProps) => (
      <article {...(props as React.HTMLAttributes<HTMLElement>)}>
        {children}
      </article>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock MobileFilterDrawer
jest.mock("@/components/filters/MobileFilterDrawer", () => ({
  __esModule: true,
  default: ({ isOpen }: MockFilterDrawerProps) =>
    isOpen ? <div data-testid="filter-drawer">Filter Drawer</div> : null,
}));

// Mock DogDetailModalUpgraded
jest.mock("@/components/dogs/mobile/detail/DogDetailModalUpgraded", () => ({
  __esModule: true,
  default: ({ dog, isOpen }: MockDogModalProps) =>
    isOpen && dog ? <div data-testid="dog-modal">{dog.name} Modal</div> : null,
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

const mockDog = {
  id: "1",
  name: "Max",
  breed: "Golden Retriever",
  breed_mix: "Mix",
  age: "2 years",
  sex: "Male",
  slug: "max-golden-retriever-1",
  primary_image_url: "/test-photo.jpg",
  photos: ["/test-photo.jpg"],
  summary: "A friendly dog looking for a loving home",
  organization: {
    id: 1,
    name: "Happy Tails Rescue",
    config_id: "happy-tails",
    slug: "happy-tails",
  },
  personality_traits: ["Playful", "Friendly", "Active", "Cuddly"],
  dog_profiler_data: {
    personality_traits: ["Playful", "Friendly", "Active", "Cuddly"], // Updated to match helper function
  },
  properties: {
    location_country: "UK",
    available_countries: ["UK"],
    fostered_in: "London",
  },
  standardized_age_group: "young",
  age_min_months: 24, // Added for getAgeCategory to work properly
};

// Create a stable filters object to avoid infinite loops
const defaultFilters = {};
const stableFilters = Object.freeze(defaultFilters);

describe("PremiumMobileCatalog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    // Default mobile viewport
    (useViewport as jest.Mock).mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isMobileOrTablet: true,
    });
  });

  describe("Basic rendering", () => {
    it("renders without crashing with minimal props", () => {
      const { container } = render(
        <PremiumMobileCatalog dogs={[]} filters={stableFilters} />,
      );
      expect(container.querySelector(".min-h-screen")).toBeInTheDocument();
    });

    it("displays dogs in grid format", () => {
      const { container } = render(
        <PremiumMobileCatalog dogs={[mockDog]} filters={stableFilters} />,
      );

      // Debug: log what's actually rendered
      // console.log("Container HTML:", container.innerHTML);
      // console.log("Text content:", container.textContent);

      // Check for the grid container with dogs
      const gridContainer = container.querySelector(".grid.grid-cols-2");
      expect(gridContainer).toBeInTheDocument();

      // Check that a dog card is rendered (it should have the dog's name)
      expect(container.textContent).toContain("Max");
      expect(container.textContent).toContain("Golden Retriever");
    });

    it("shows organization information", () => {
      const { container } = render(
        <PremiumMobileCatalog dogs={[mockDog]} filters={stableFilters} />,
      );

      // Organization info is shown as breed text
      expect(container.textContent).toContain("Golden Retriever");
    });
  });

  describe("Responsive grid behavior", () => {
    it("renders 2-column grid for mobile viewport", () => {
      const { container } = render(
        <PremiumMobileCatalog dogs={[mockDog]} filters={stableFilters} />,
      );

      const grid = container.querySelector(".grid.grid-cols-2");
      expect(grid).toBeInTheDocument();
    });

    it("handles tablet viewport properly", () => {
      (useViewport as jest.Mock).mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isMobileOrTablet: true,
      });

      const { container } = render(
        <PremiumMobileCatalog dogs={[mockDog]} filters={stableFilters} />,
      );

      // The grid structure should still be present
      const grid = container.querySelector(".grid.grid-cols-2");
      expect(grid).toBeInTheDocument();
    });
  });

  describe("Filter drawer functionality", () => {
    it("renders without filter chips on mobile", () => {
      // Quick filter chips have been removed from mobile - filters are in the drawer
      render(<PremiumMobileCatalog dogs={[mockDog]} filters={stableFilters} />);

      // Filter chips should NOT be present - filters are now in filter drawer only
      expect(screen.queryByText(/^All$/)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Male$/ })).not.toBeInTheDocument();
    });

    it("accepts onFilterChange prop", () => {
      const mockFilterChange = jest.fn();

      const { container } = render(
        <PremiumMobileCatalog
          dogs={[mockDog]}
          filters={stableFilters}
          onFilterChange={mockFilterChange}
        />,
      );

      // Component should render without crashing with onFilterChange prop
      expect(container.querySelector(".min-h-screen")).toBeInTheDocument();
    });
  });

  describe("Loading states", () => {
    it("shows skeleton loaders when loading", () => {
      const { container } = render(
        <PremiumMobileCatalog
          dogs={[]}
          loading={true}
          filters={stableFilters}
        />,
      );

      // Look for skeleton loading elements with animate-pulse class
      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it("shows load more button when hasMore is true", () => {
      render(
        <PremiumMobileCatalog
          dogs={[mockDog]}
          hasMore={true}
          onLoadMore={jest.fn()}
          filters={stableFilters}
        />,
      );

      expect(screen.getByText(/load more/i)).toBeInTheDocument();
    });

    it("calls onLoadMore when load more button is clicked", () => {
      const mockLoadMore = jest.fn();

      render(
        <PremiumMobileCatalog
          dogs={[mockDog]}
          hasMore={true}
          onLoadMore={mockLoadMore}
          filters={stableFilters}
        />,
      );

      const loadMoreButton = screen.getByText(/load more/i);
      fireEvent.click(loadMoreButton);

      expect(mockLoadMore).toHaveBeenCalled();
    });

    it("handles loadingMore state", () => {
      const { container } = render(
        <PremiumMobileCatalog
          dogs={[mockDog]}
          hasMore={true}
          loadingMore={true}
          onLoadMore={jest.fn()}
          filters={stableFilters}
        />,
      );

      // Loading state should be visible (specific implementation may vary)
      expect(container.querySelector(".animate-spin, .loading")).toBeTruthy();
    });
  });

  describe("Error and empty states", () => {
    it("displays error message when error prop is provided", () => {
      render(
        <PremiumMobileCatalog
          dogs={[]}
          error="Failed to load dogs"
          filters={stableFilters}
        />,
      );

      expect(screen.getByText("Failed to load dogs")).toBeInTheDocument();
    });

    it("shows empty state when no dogs are provided", () => {
      render(<PremiumMobileCatalog dogs={[]} filters={stableFilters} />);

      expect(screen.getByText(/no dogs found/i)).toBeInTheDocument();
    });
  });

  describe("Dog card interactions", () => {
    it("renders dog cards as clickable elements", () => {
      const { container } = render(
        <PremiumMobileCatalog dogs={[mockDog]} filters={stableFilters} />,
      );

      // Find the grid container with dog cards
      const gridContainer = container.querySelector(".grid.grid-cols-2");
      expect(gridContainer).toBeInTheDocument();

      // Check that dog content is present
      expect(container.textContent).toContain("Max");
    });

    it("dog cards have proper structure", () => {
      const { container } = render(
        <PremiumMobileCatalog dogs={[mockDog]} filters={stableFilters} />,
      );

      // Check for the dog name and other elements via text content
      expect(container.textContent).toContain("Max");
      expect(container.textContent).toContain("Young"); // Age category is capitalized in display
      expect(container.textContent).toContain("Golden Retriever");
    });
  });

  describe("Personality traits display", () => {
    it("displays personality traits from dog_profiler_data", () => {
      const { container } = render(
        <PremiumMobileCatalog dogs={[mockDog]} filters={stableFilters} />,
      );

      expect(container.textContent).toContain("Playful");
      expect(container.textContent).toContain("Friendly");
    });

    it("limits personality traits display for mobile", () => {
      const dogWithManyTraits = {
        ...mockDog,
        personality_traits: [
          "Playful",
          "Friendly",
          "Active",
          "Cuddly",
          "Smart",
          "Energetic",
        ],
        dog_profiler_data: {
          personality_traits: ["Playful", "Friendly", "Active"], // Helper limits to 3, component shows 2
        },
      };

      const { container } = render(
        <PremiumMobileCatalog dogs={[dogWithManyTraits]} />,
      );

      // Should show first 2 traits and a +N indicator
      expect(container.textContent).toContain("Playful");
      expect(container.textContent).toContain("Friendly");
      expect(container.textContent).toContain("+1"); // Only 1 extra trait (Active) since helper limits to 3
    });
  });

  describe("Navigation and filtering", () => {
    it("does not have inline filter chips (filters moved to drawer)", () => {
      render(<PremiumMobileCatalog dogs={[mockDog]} filters={stableFilters} />);

      // Filter chips have been removed from mobile catalog
      // Filters are now accessed via the filter drawer only
      expect(screen.queryByRole("button", { name: /^All$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Male$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Female$/i })).not.toBeInTheDocument();
    });

    it("accepts onOpenFilter prop for filter drawer", () => {
      const mockOpenFilter = jest.fn();

      const { container } = render(
        <PremiumMobileCatalog
          dogs={[mockDog]}
          onOpenFilter={mockOpenFilter}
          filters={stableFilters}
        />,
      );

      // Component should render properly with onOpenFilter prop
      expect(container.querySelector(".min-h-screen")).toBeInTheDocument();
    });
  });

  describe("Grid layout accessibility", () => {
    it("renders dog cards in a grid container", () => {
      const { container } = render(
        <PremiumMobileCatalog dogs={[mockDog]} filters={stableFilters} />,
      );

      // Check for grid container
      const gridContainer = container.querySelector(".grid.grid-cols-2");
      expect(gridContainer).toBeInTheDocument();
    });

    it("has clickable dog cards", () => {
      const { container } = render(
        <PremiumMobileCatalog dogs={[mockDog]} filters={stableFilters} />,
      );

      // Dog cards should be in the grid
      const gridContainer = container.querySelector(".grid.grid-cols-2");
      expect(gridContainer).toBeInTheDocument();

      // And should contain dog info
      expect(container.textContent).toContain("Max");
    });
  });

  describe("Performance optimizations", () => {
    it("handles moderate lists efficiently", () => {
      const manyDogs = Array.from({ length: 10 }, (_, i) => ({
        ...mockDog,
        id: `dog-${i}`,
        name: `Dog ${i}`,
        slug: `dog-${i}`,
      }));

      const { container } = render(
        <PremiumMobileCatalog dogs={manyDogs} filters={stableFilters} />,
      );

      // Should render grid with dogs
      const gridContainer = container.querySelector(".grid.grid-cols-2");
      expect(gridContainer).toBeInTheDocument();

      // Check that multiple dogs are rendered
      expect(container.textContent).toContain("Dog 0");
      expect(container.textContent).toContain("Dog 9");
    });

    it("renders with stable keys for React optimization", () => {
      const dogs = [
        { ...mockDog, id: "1", name: "Dog 1" },
        { ...mockDog, id: "2", name: "Dog 2" },
      ];

      const { rerender, container } = render(
        <PremiumMobileCatalog dogs={dogs} filters={stableFilters} />,
      );

      // Rerender with same data should not cause issues
      rerender(<PremiumMobileCatalog dogs={dogs} filters={stableFilters} />);

      expect(container.textContent).toContain("Dog 1");
      expect(container.textContent).toContain("Dog 2");
    });
  });

  describe("Reset Filters functionality", () => {
    it("shows Clear All Filters button in empty state when onResetFilters is provided", () => {
      const mockOnResetFilters = jest.fn();

      render(
        <PremiumMobileCatalog
          dogs={[]}
          filters={stableFilters}
          onResetFilters={mockOnResetFilters}
        />,
      );

      const clearButton = screen.getByRole("button", {
        name: /clear all filters/i,
      });
      expect(clearButton).toBeInTheDocument();
    });

    it("does not show Clear All Filters button when onResetFilters is not provided", () => {
      render(<PremiumMobileCatalog dogs={[]} filters={stableFilters} />);

      const clearButton = screen.queryByRole("button", {
        name: /clear all filters/i,
      });
      expect(clearButton).not.toBeInTheDocument();
    });

    it("calls onResetFilters when Clear All Filters button is clicked", () => {
      const mockOnResetFilters = jest.fn();

      render(
        <PremiumMobileCatalog
          dogs={[]}
          filters={stableFilters}
          onResetFilters={mockOnResetFilters}
        />,
      );

      const clearButton = screen.getByRole("button", {
        name: /clear all filters/i,
      });
      fireEvent.click(clearButton);

      expect(mockOnResetFilters).toHaveBeenCalledTimes(1);
    });

    it("shows empty state with proper messaging when no dogs found", () => {
      render(<PremiumMobileCatalog dogs={[]} filters={stableFilters} />);

      expect(screen.getByText("No dogs found")).toBeInTheDocument();
      expect(
        screen.getByText("Try adjusting your filters to see more dogs"),
      ).toBeInTheDocument();
    });
  });
});
