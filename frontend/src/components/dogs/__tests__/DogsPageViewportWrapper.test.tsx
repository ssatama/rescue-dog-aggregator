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

// Mock the dynamic imports
jest.mock("../mobile/detail/DogDetailModal", () => ({
  __esModule: true,
  default: ({ dog, isOpen, onClose }: any) =>
    isOpen && dog ? <div data-testid="dog-modal">{dog.name} Modal</div> : null,
}));

jest.mock("../DogCardOptimized", () => ({
  __esModule: true,
  default: ({ dog, onClick }: any) => (
    <div data-testid="dog-card-desktop" onClick={onClick}>
      {dog.name} - Desktop Card
    </div>
  ),
}));

jest.mock("../../error/DogCardErrorBoundary", () => ({
  __esModule: true,
  default: ({ children }: any) => <>{children}</>,
}));

jest.mock("../mobile/catalog/DogGrid", () => ({
  __esModule: true,
  default: ({ dogs, variant, onDogClick }: any) => (
    <div data-testid="dog-grid-mobile" className={`dog-grid--${variant}`}>
      {dogs.map((dog: any) => (
        <div key={dog.id} onClick={() => onDogClick(dog)}>
          {dog.name} - Mobile/Tablet Card
        </div>
      ))}
    </div>
  ),
}));

const mockDogs = [
  {
    id: "1",
    name: "Max",
    breed: "Golden Retriever",
    breed_mix: "Mix",
    age: "2 years",
    sex: "Male",
    photos: ["/test1.jpg"],
    summary: "Friendly dog",
    organization: { id: 1, name: "Happy Tails", config_id: "happy" },
    personality_traits: ["Playful", "Friendly"],
  },
  {
    id: "2",
    name: "Bella",
    breed: "Labrador",
    breed_mix: "Pure",
    age: "3 years",
    sex: "Female",
    photos: ["/test2.jpg"],
    summary: "Gentle dog",
    organization: { id: 1, name: "Happy Tails", config_id: "happy" },
    personality_traits: ["Gentle", "Calm"],
  },
];

// Store original window.location
const originalLocation = window.location;

describe("DogsPageViewportWrapper", () => {
  beforeAll(() => {
    // Mock window.location
    delete (window as any).location;
    window.location = {
      href: "http://localhost:3000/dogs",
      pathname: "/dogs",
      assign: jest.fn(),
    } as any;
  });

  afterAll(() => {
    // Restore original window.location
    window.location = originalLocation;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.history.pushState = jest.fn();
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

    it("renders existing DogCardOptimized components for desktop", async () => {
      const { container } = render(<DogsPageViewportWrapper dogs={mockDogs} />);

      // Wait for dynamic imports to load
      await waitFor(() => {
        // Check that desktop grid structure exists
        const gridContainer = container.querySelector(".grid");
        expect(gridContainer).toBeInTheDocument();
        expect(gridContainer).toHaveClass("grid-cols-1");
        expect(gridContainer).toHaveClass("xl:grid-cols-4");
      });

      // Should NOT render mobile grid
      expect(screen.queryByTestId("dog-grid-mobile")).not.toBeInTheDocument();

      // Verify dogs array is being passed correctly (2 dogs)
      const gridContainer = container.querySelector(".grid");
      // The grid should have children for each dog (even if empty due to dynamic imports)
      expect(gridContainer?.children.length).toBe(2);
    });

    it("maintains 4-column grid layout on desktop", () => {
      const { container } = render(<DogsPageViewportWrapper dogs={mockDogs} />);

      const gridContainer = container.firstChild;
      expect(gridContainer).toHaveClass("xl:grid-cols-4");
      expect(gridContainer).toHaveClass("lg:grid-cols-3");
      expect(gridContainer).toHaveClass("md:grid-cols-2");
    });

    it("navigates to separate detail page on desktop click", () => {
      render(<DogsPageViewportWrapper dogs={mockDogs} />);

      const firstCard = screen.getByText("Max - Desktop Card");
      fireEvent.click(firstCard);

      // Should use router.push to navigate
      expect(mockPush).toHaveBeenCalledWith("/dogs/1");

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

    it("applies correct classes for desktop layout", () => {
      const { container } = render(
        <DogsPageViewportWrapper dogs={mockDogs} className="custom-class" />,
      );

      const gridContainer = container.firstChild;
      expect(gridContainer).toHaveClass("grid");
      expect(gridContainer).toHaveClass("custom-class");
      expect(gridContainer).toHaveClass("gap-4");
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

    it("renders DogGrid component for mobile", () => {
      render(<DogsPageViewportWrapper dogs={mockDogs} />);

      // Should render mobile grid
      expect(screen.getByTestId("dog-grid-mobile")).toBeInTheDocument();
      expect(screen.getByTestId("dog-grid-mobile")).toHaveClass(
        "dog-grid--mobile",
      );

      // Should NOT render desktop cards
      expect(screen.queryByTestId("dog-card-desktop")).not.toBeInTheDocument();
    });

    it("opens modal on mobile click instead of navigation", async () => {
      render(<DogsPageViewportWrapper dogs={mockDogs} />);

      const firstCard = screen.getByText("Max - Mobile/Tablet Card");
      fireEvent.click(firstCard);

      // Should open modal
      await waitFor(() => {
        expect(screen.getByTestId("dog-modal")).toBeInTheDocument();
        expect(screen.getByText("Max Modal")).toBeInTheDocument();
      });

      // URL handling is different in test environment, just verify modal opens
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

    it("renders DogGrid component for tablet", () => {
      render(<DogsPageViewportWrapper dogs={mockDogs} />);

      // Should render tablet grid
      expect(screen.getByTestId("dog-grid-mobile")).toBeInTheDocument();
      expect(screen.getByTestId("dog-grid-mobile")).toHaveClass(
        "dog-grid--tablet",
      );

      // Should NOT render desktop cards
      expect(screen.queryByTestId("dog-card-desktop")).not.toBeInTheDocument();
    });

    it("opens modal on tablet click", async () => {
      render(<DogsPageViewportWrapper dogs={mockDogs} />);

      const firstCard = screen.getByText("Max - Mobile/Tablet Card");
      fireEvent.click(firstCard);

      // Should open modal
      await waitFor(() => {
        expect(screen.getByTestId("dog-modal")).toBeInTheDocument();
      });
    });
  });

  describe("Viewport Transitions", () => {
    it("switches from desktop to mobile layout when viewport changes", () => {
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
      expect(screen.getByTestId("dog-grid-mobile")).toBeInTheDocument();
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
      expect(container.querySelector(".dog-grid")).not.toBeInTheDocument(); // No mobile grid
      expect(container.querySelector(".dog-grid-card")).not.toBeInTheDocument(); // No compact cards
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
});
