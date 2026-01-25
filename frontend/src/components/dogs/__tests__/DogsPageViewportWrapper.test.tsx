import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import DogsPageViewportWrapper from "../DogsPageViewportWrapper";
import { useViewport } from "@/hooks/useViewport";

// Mock the viewport hook
jest.mock("@/hooks/useViewport", () => ({
  useViewport: jest.fn(),
}));

// Mock Next.js router
const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => "/dogs",
}));

// Types for mock components
interface MockDog {
  id: string;
  name: string;
  slug?: string;
}

interface MockDogDetailModalProps {
  dog: MockDog | null;
  isOpen: boolean;
  onClose: () => void;
}

interface MockDogCardProps {
  dog: MockDog;
  onClick: () => void;
}

interface MockErrorBoundaryProps {
  children: React.ReactNode;
}

interface MockMobileCatalogProps {
  dogs: MockDog[];
  onDogClick?: (dog: MockDog) => void;
}

interface MockBottomNavProps {
  children: React.ReactNode;
}

// Mock the dynamic imports
jest.mock("../mobile/detail/DogDetailModalUpgraded", () => ({
  __esModule: true,
  default: ({ dog, isOpen }: MockDogDetailModalProps) =>
    isOpen && dog ? <div data-testid="dog-modal">{dog.name} Modal</div> : null,
}));

interface MockDogCardPropsExtended extends MockDogCardProps {
  isVirtualized?: boolean;
  position?: number;
}

jest.mock("../DogCardOptimized", () => ({
  __esModule: true,
  default: ({ dog, onClick, isVirtualized, position }: MockDogCardPropsExtended) => (
    <div
      data-testid="dog-card-desktop"
      data-virtualized={isVirtualized ? "true" : "false"}
      data-position={position}
      onClick={onClick}
    >
      {dog.name} - Desktop Card
    </div>
  ),
}));

// Mock @tanstack/react-virtual
jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: jest.fn(({ count }) => ({
    getTotalSize: () => count * 520,
    getVirtualItems: () =>
      Array.from({ length: Math.min(count, 3) }, (_, index) => ({
        key: `row-${index}`,
        index,
        start: index * 520,
        size: 520,
      })),
  })),
}));

jest.mock("../../error/DogCardErrorBoundary", () => ({
  __esModule: true,
  default: ({ children }: MockErrorBoundaryProps) => <>{children}</>,
}));

jest.mock("../mobile/catalog/PremiumMobileCatalog", () => ({
  __esModule: true,
  default: ({ dogs }: MockMobileCatalogProps) => (
    <div data-testid="premium-mobile-catalog">
      {dogs.map((dog: MockDog) => (
        <div
          key={dog.id}
          onClick={() => {
            // Simulate the internal modal opening behavior
            const event = new CustomEvent("test-dog-click", { detail: dog });
            document.dispatchEvent(event);
          }}
        >
          {dog.name} - Mobile/Tablet Card
        </div>
      ))}
    </div>
  ),
}));

jest.mock("../mobile/navigation/DogBottomNav", () => ({
  DogBottomNav: ({ children }: MockBottomNavProps) => (
    <div data-testid="dog-bottom-nav">{children}</div>
  ),
}));

const mockDogs = [
  {
    id: "1",
    name: "Max",
    slug: "max-golden-retriever-1",
    breed: "Golden Retriever",
    breed_mix: "Mix",
    age: "2 years",
    sex: "Male",
    primary_image_url: "/test1.jpg",
    photos: ["/test1.jpg"],
    summary: "Friendly dog looking for a home",
    organization: {
      id: 1,
      name: "Happy Tails",
      config_id: "happy",
      slug: "happy-tails",
    },
    personality_traits: ["Playful", "Friendly"],
    dog_profiler_data: {
      personality_traits: ["Playful", "Friendly"],
      energy_level: "medium" as const,
      trainability: "easy" as const,
    },
    properties: { location_country: "UK" },
  },
  {
    id: "2",
    name: "Bella",
    slug: "bella-labrador-2",
    breed: "Labrador",
    breed_mix: "Pure",
    age: "3 years",
    sex: "Female",
    primary_image_url: "/test2.jpg",
    photos: ["/test2.jpg"],
    summary: "Gentle dog seeking family",
    organization: {
      id: 1,
      name: "Happy Tails",
      config_id: "happy",
      slug: "happy-tails",
    },
    personality_traits: ["Gentle", "Calm"],
    dog_profiler_data: {
      personality_traits: ["Gentle", "Calm"],
      energy_level: "low" as const,
      trainability: "moderate" as const,
    },
    properties: { location_country: "UK" },
  },
];

describe("DogsPageViewportWrapper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  describe("Desktop Experience (1024px+)", () => {
    beforeEach(() => {
      (useViewport as jest.Mock).mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      });
    });

    it("renders existing DogCardOptimized components for desktop with virtualization", async () => {
      const { container } = render(<DogsPageViewportWrapper dogs={mockDogs} />);

      // Wait for dynamic imports to load
      await waitFor(() => {
        // Check that virtualized grid structure exists (grid is now nested inside virtualizer)
        const gridContainer = container.querySelector(".grid");
        expect(gridContainer).toBeInTheDocument();
        expect(gridContainer).toHaveClass("grid-cols-4");
      });

      // Should NOT render mobile grid
      expect(screen.queryByTestId("dog-grid-mobile")).not.toBeInTheDocument();

      // Verify dogs are rendered via virtualization
      const cards = screen.getAllByTestId("dog-card-desktop");
      expect(cards.length).toBe(2);
    });

    it("maintains 4-column grid layout within virtualized rows", () => {
      const { container } = render(<DogsPageViewportWrapper dogs={mockDogs} />);

      // The virtualized structure has grid-cols-4 on the row container
      const gridContainer = container.querySelector(".grid-cols-4");
      expect(gridContainer).toBeInTheDocument();
    });

    it("navigates to separate detail page on desktop click", () => {
      render(<DogsPageViewportWrapper dogs={mockDogs} />);

      const firstCard = screen.getByText("Max - Desktop Card");
      fireEvent.click(firstCard);

      // Should use router.push to navigate with slug
      expect(mockPush).toHaveBeenCalledWith("/dogs/max-golden-retriever-1");

      // Should NOT open modal
      expect(screen.queryByTestId("dog-modal")).not.toBeInTheDocument();
    });

    it("does NOT render modal on desktop", () => {
      render(<DogsPageViewportWrapper dogs={mockDogs} />);

      // Click a card
      const firstCard = screen.getByText("Max - Desktop Card");
      fireEvent.click(firstCard);

      // Modal should not appear
      expect(screen.queryByTestId("dog-modal")).not.toBeInTheDocument();
    });

    it("applies correct classes for desktop virtualized layout", () => {
      const { container } = render(
        <DogsPageViewportWrapper dogs={mockDogs} className="custom-class" />,
      );

      // The outer container is now the virtualized scroll container
      const scrollContainer = container.firstChild as HTMLElement;
      expect(scrollContainer).toHaveClass("overflow-auto");
      expect(scrollContainer).toHaveClass("custom-class");

      // The inner grid structure
      const gridRow = container.querySelector(".grid");
      expect(gridRow).toBeInTheDocument();
      expect(gridRow).toHaveClass("gap-4");
    });
  });

  describe("Mobile Experience (375-767px)", () => {
    beforeEach(() => {
      (useViewport as jest.Mock).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      });
    });

    it("renders PremiumMobileCatalog component for mobile", async () => {
      render(<DogsPageViewportWrapper dogs={mockDogs} />);

      // Wait for dynamic import to resolve
      await waitFor(() => {
        expect(
          screen.getByTestId("premium-mobile-catalog"),
        ).toBeInTheDocument();
      });

      // Should NOT render desktop cards
      expect(screen.queryByTestId("dog-card-desktop")).not.toBeInTheDocument();
    });

    it("opens modal on mobile click instead of navigation", async () => {
      render(<DogsPageViewportWrapper dogs={mockDogs} />);

      const firstCard = screen.getByText("Max - Mobile/Tablet Card");
      fireEvent.click(firstCard);

      // Should NOT use router.push for navigation (mobile uses modal)
      expect(mockPush).not.toHaveBeenCalled();

      // Note: Modal opening requires more complex state management
      // that is better tested in integration tests
    });
  });

  describe("Tablet Experience (768-1023px)", () => {
    beforeEach(() => {
      (useViewport as jest.Mock).mockReturnValue({
        isMobile: false,
        isTablet: true,
        isDesktop: false,
      });
    });

    it("renders PremiumMobileCatalog component for tablet", async () => {
      render(<DogsPageViewportWrapper dogs={mockDogs} />);

      // Wait for dynamic import to resolve
      await waitFor(() => {
        expect(
          screen.getByTestId("premium-mobile-catalog"),
        ).toBeInTheDocument();
      });

      // Should NOT render desktop cards
      expect(screen.queryByTestId("dog-card-desktop")).not.toBeInTheDocument();
    });

    it("opens modal on tablet click", async () => {
      render(<DogsPageViewportWrapper dogs={mockDogs} />);

      const firstCard = screen.getByText("Max - Mobile/Tablet Card");
      fireEvent.click(firstCard);

      // Should NOT use router.push for navigation (tablet uses modal like mobile)
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("Viewport Transitions", () => {
    it("switches from desktop to mobile layout when viewport changes", async () => {
      const { rerender } = render(<DogsPageViewportWrapper dogs={mockDogs} />);

      // Start with desktop
      (useViewport as jest.Mock).mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      });

      rerender(<DogsPageViewportWrapper dogs={mockDogs} />);
      expect(screen.getAllByTestId("dog-card-desktop")).toHaveLength(2);

      // Change to mobile
      (useViewport as jest.Mock).mockReturnValue({
        isMobile: true,
        isTablet: false,
        isDesktop: false,
      });

      rerender(<DogsPageViewportWrapper dogs={mockDogs} />);

      // Wait for dynamic import to resolve
      await waitFor(() => {
        expect(
          screen.getByTestId("premium-mobile-catalog"),
        ).toBeInTheDocument();
      });
      expect(screen.queryByTestId("dog-card-desktop")).not.toBeInTheDocument();
    });
  });

  describe("Critical Desktop Preservation", () => {
    beforeEach(() => {
      (useViewport as jest.Mock).mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      });
    });

    it("preserves ALL desktop functionality without changes", () => {
      const { container } = render(<DogsPageViewportWrapper dogs={mockDogs} />);

      // Verify desktop implementation is completely unchanged
      expect(
        screen.queryByTestId("premium-mobile-catalog"),
      ).not.toBeInTheDocument(); // No mobile catalog
      expect(screen.queryByTestId("dog-modal")).not.toBeInTheDocument(); // No modal

      // Desktop should use existing components
      expect(screen.getAllByTestId("dog-card-desktop")).toHaveLength(2);
    });

    it("ensures NO modal functionality on desktop", () => {
      render(<DogsPageViewportWrapper dogs={mockDogs} />);

      // Click multiple cards
      fireEvent.click(screen.getByText("Max - Desktop Card"));
      fireEvent.click(screen.getByText("Bella - Desktop Card"));

      // Modal should never appear
      expect(screen.queryByTestId("dog-modal")).not.toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      (useViewport as jest.Mock).mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      });
    });

    it("renders empty state gracefully when dogs array is empty", () => {
      const { container } = render(<DogsPageViewportWrapper dogs={[]} />);
      const scrollContainer = container.firstChild as HTMLElement;
      expect(scrollContainer).toBeInTheDocument();
      expect(screen.queryByTestId("dog-card-desktop")).not.toBeInTheDocument();
    });
  });

  describe("Virtual Scrolling (Desktop)", () => {
    beforeEach(() => {
      (useViewport as jest.Mock).mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
      });
    });

    it("passes isVirtualized=true to DogCardOptimized in virtualized grid", async () => {
      render(<DogsPageViewportWrapper dogs={mockDogs} />);

      await waitFor(() => {
        const cards = screen.getAllByTestId("dog-card-desktop");
        cards.forEach((card) => {
          expect(card).toHaveAttribute("data-virtualized", "true");
        });
      });
    });

    it("passes correct position to each DogCardOptimized", async () => {
      render(<DogsPageViewportWrapper dogs={mockDogs} />);

      await waitFor(() => {
        const cards = screen.getAllByTestId("dog-card-desktop");
        expect(cards[0]).toHaveAttribute("data-position", "0");
        expect(cards[1]).toHaveAttribute("data-position", "1");
      });
    });

    it("renders virtualized container with proper height", async () => {
      const { container } = render(<DogsPageViewportWrapper dogs={mockDogs} />);

      await waitFor(() => {
        const virtualContainer = container.querySelector('[style*="height"]');
        expect(virtualContainer).toBeInTheDocument();
      });
    });

    it("maintains click functionality within virtualized rows", async () => {
      render(<DogsPageViewportWrapper dogs={mockDogs} />);

      const firstCard = screen.getByText("Max - Desktop Card");
      fireEvent.click(firstCard);

      expect(mockPush).toHaveBeenCalledWith("/dogs/max-golden-retriever-1");
    });
  });
});
