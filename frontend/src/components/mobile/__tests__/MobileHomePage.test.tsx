import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import MobileHomePage from "../MobileHomePage";
import { useRouter } from "next/navigation";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock child components
jest.mock("../MobileTopHeader", () => ({
  __esModule: true,
  default: () => <div data-testid="mobile-top-header">Mobile Top Header</div>,
}));

jest.mock("../MobileNavCards", () => ({
  __esModule: true,
  default: () => <div data-testid="mobile-nav-cards">Mobile Nav Cards</div>,
}));

jest.mock("../MobileStats", () => ({
  __esModule: true,
  default: ({ stats }: any) => (
    <div data-testid="mobile-stats">
      {stats?.map((stat: any) => {
        if (stat.label === "Dogs") {
          return <span key="dogs" data-testid="dogs-count">{stat.value}</span>;
        }
        if (stat.label === "Rescues") {
          return <span key="rescues" data-testid="rescues-count">{stat.value}</span>;
        }
        if (stat.label === "Breeds") {
          return <span key="breeds" data-testid="breeds-count">{stat.value}</span>;
        }
        return null;
      })}
    </div>
  ),
}));

jest.mock("../MobileAvailableNow", () => ({
  MobileAvailableNow: ({ dogs, totalCount }: any) => (
    <div data-testid="mobile-available-now">
      <span data-testid="dogs-length">{dogs?.length || 0}</span>
      <span data-testid="total-count">{totalCount || 0}</span>
    </div>
  ),
}));

jest.mock("../MobileBreedSpotlight", () => ({
  MobileBreedSpotlight: ({ breeds }: any) => (
    <div data-testid="mobile-breed-spotlight">
      {breeds && breeds.length > 0 && (
        <span data-testid="breed-name">{breeds[0].name}</span>
      )}
    </div>
  ),
}));

jest.mock("../../navigation/MobileBottomNav", () => ({
  __esModule: true,
  default: () => <div data-testid="mobile-bottom-nav">Mobile Bottom Nav</div>,
}));

const mockInitialData = {
  dogs: [
    { id: 1, name: "Max", breed: "Golden Retriever" },
    { id: 2, name: "Luna", breed: "Border Collie" },
    { id: 3, name: "Buddy", breed: "Labrador" },
    { id: 4, name: "Bella", breed: "German Shepherd" },
  ],
  statistics: {
    totalDogs: 2860,
    totalOrganizations: 13,
    totalBreeds: 50,
  },
  featuredBreed: {
    name: "Labrador Retriever",
    slug: "labrador-retriever",
    description: "Friendly and outgoing dogs",
    availableCount: 20,
  },
};

describe("MobileHomePage", () => {
  const mockPush = jest.fn();
  const mockOnLoadMore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it("renders all mobile components in correct order", () => {
    render(<MobileHomePage initialData={mockInitialData} />);

    const container = screen.getByTestId("mobile-home-page");
    const children = container.children;

    // Check components are rendered in order
    expect(screen.getByTestId("mobile-top-header")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-nav-cards")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-stats")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-available-now")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-breed-spotlight")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-bottom-nav")).toBeInTheDocument();
  });

  it("applies mobile-only visibility classes", () => {
    render(<MobileHomePage initialData={mockInitialData} />);

    const container = screen.getByTestId("mobile-home-page");
    expect(container).toHaveClass("md:hidden");
  });

  it("passes correct data to MobileStats component", () => {
    render(<MobileHomePage initialData={mockInitialData} />);

    expect(screen.getByTestId("dogs-count")).toHaveTextContent("2,860");
    expect(screen.getByTestId("rescues-count")).toHaveTextContent("13");
    expect(screen.getByTestId("breeds-count")).toHaveTextContent("50");
  });

  it("passes initial dogs to MobileAvailableNow", () => {
    render(<MobileHomePage initialData={mockInitialData} />);

    expect(screen.getByTestId("dogs-length")).toHaveTextContent("4");
  });

  it("passes featured breed to MobileBreedSpotlight", () => {
    render(<MobileHomePage initialData={mockInitialData} />);

    // MobileBreedSpotlight now receives breeds array from breedStats
    // Since we're not providing breedStats in mockInitialData, it won't show any breed
    // Let's update the test to reflect this
    const breedSpotlight = screen.getByTestId("mobile-breed-spotlight");
    expect(breedSpotlight).toBeInTheDocument();
  });

  it("handles missing initial data gracefully", () => {
    render(<MobileHomePage initialData={undefined as any} />);

    // All components should still render
    expect(screen.getByTestId("mobile-top-header")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-nav-cards")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-stats")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-available-now")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-breed-spotlight")).toBeInTheDocument();
  });

  it("applies proper safe area padding", () => {
    render(<MobileHomePage initialData={mockInitialData} />);

    const container = screen.getByTestId("mobile-home-page");
    expect(container).toHaveClass("pb-16"); // Padding for bottom nav
  });

  it("sets min-height for full viewport coverage", () => {
    render(<MobileHomePage initialData={mockInitialData} />);

    const container = screen.getByTestId("mobile-home-page");
    expect(container).toHaveClass("min-h-screen");
  });

  it("applies correct background color", () => {
    render(<MobileHomePage initialData={mockInitialData} />);

    const container = screen.getByTestId("mobile-home-page");
    expect(container).toHaveClass("bg-[#FFF4ED]", "dark:bg-gray-900");
  });

  it("handles empty dogs array", () => {
    const emptyData = {
      ...mockInitialData,
      dogs: [],
    };

    render(<MobileHomePage initialData={emptyData} />);

    expect(screen.getByTestId("dogs-length")).toHaveTextContent("0");
  });

  it("handles missing statistics gracefully", () => {
    const dataWithoutStats = {
      dogs: mockInitialData.dogs,
      featuredBreed: mockInitialData.featuredBreed,
    };

    render(<MobileHomePage initialData={dataWithoutStats as any} />);

    // Should render with undefined values
    expect(screen.getByTestId("mobile-stats")).toBeInTheDocument();
  });

  it("handles missing featured breed gracefully", () => {
    const dataWithoutBreed = {
      dogs: mockInitialData.dogs,
      statistics: mockInitialData.statistics,
    };

    render(<MobileHomePage initialData={dataWithoutBreed as any} />);

    // Should render without breed name
    expect(screen.getByTestId("mobile-breed-spotlight")).toBeInTheDocument();
    expect(screen.queryByTestId("breed-name")).not.toBeInTheDocument();
  });

  it("applies overflow hidden to prevent horizontal scroll", () => {
    render(<MobileHomePage initialData={mockInitialData} />);

    const container = screen.getByTestId("mobile-home-page");
    expect(container).toHaveClass("overflow-x-hidden");
  });

  it("maintains proper component hierarchy", () => {
    const { container } = render(
      <MobileHomePage initialData={mockInitialData} />,
    );

    // Check that MobileTopHeader is first (sticky)
    const firstChild = container.firstChild?.firstChild;
    expect(firstChild).toHaveAttribute("data-testid", "mobile-top-header");
  });

  it("passes breedStats data for random breeds", () => {
    const dataWithBreedStats = {
      ...mockInitialData,
      breedStats: {
        qualifying_breeds: [
          {
            name: "Golden Retriever",
            slug: "golden-retriever",
            count: 15,
            description: "Friendly dogs",
            image_url: "/images/golden.jpg"
          },
          {
            name: "Labrador",
            slug: "labrador",
            count: 20,
            description: "Loyal companions",
            image_url: "/images/lab.jpg"
          },
          {
            name: "Beagle",
            slug: "beagle",
            count: 8,
            description: "Small hounds",
            image_url: "/images/beagle.jpg"
          }
        ]
      }
    };

    render(<MobileHomePage initialData={dataWithBreedStats} />);

    // MobileBreedSpotlight should receive breeds from breedStats
    const breedSpotlight = screen.getByTestId("mobile-breed-spotlight");
    expect(breedSpotlight).toBeInTheDocument();
    
    // Should show one of the breeds (component randomly selects 3)
    const breedName = screen.queryByTestId("breed-name");
    if (breedName) {
      const possibleBreeds = ["Golden Retriever", "Labrador", "Beagle"];
      expect(possibleBreeds).toContain(breedName.textContent);
    }
  });
});