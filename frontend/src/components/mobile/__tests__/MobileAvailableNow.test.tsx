import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MobileAvailableNow } from "../MobileAvailableNow";
import { useRouter } from "next/navigation";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock useFavorites hook
jest.mock("../../../hooks/useFavorites", () => ({
  useFavorites: jest.fn(() => ({
    favorites: [],
    toggleFavorite: jest.fn(),
  })),
}));

// Mock Next Image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, className, ...props }: any) => (
    <img src={src} alt={alt} className={className} {...props} />
  ),
}));

// Mock MobileFilterDrawer
jest.mock("../../filters/MobileFilterDrawer", () => ({
  __esModule: true,
  default: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="mobile-filter-drawer">Filter Drawer</div> : null,
}));

const mockDogs = [
  {
    id: "1",
    name: "Max",
    breed: "Golden Retriever",
    primary_breed: "Golden Retriever",
    age: "2 years",
    age_text: "2 years",
    age_min_months: 24,
    sex: "male",
    primary_image_url: "/dog1.jpg",
    organization: {
      id: 1,
      name: "Happy Paws",
      slug: "happy-paws",
      config_id: "happy-paws",
    },
    personality_traits: ["Friendly", "Energetic", "Playful"],
    dog_profiler_data: {
      personality_traits: ["Friendly", "Energetic", "Playful"],
    },
    created_at: "2024-01-25",
    slug: "max-1",
  },
  {
    id: "2",
    name: "Luna",
    breed: "Border Collie",
    primary_breed: "Border Collie",
    age: "3 years",
    age_text: "3 years",
    age_min_months: 36,
    sex: "female",
    primary_image_url: "/dog2.jpg",
    organization: {
      id: 2,
      name: "Rescue Heroes",
      slug: "rescue-heroes",
      config_id: "rescue-heroes",
    },
    personality_traits: ["Smart", "Gentle", "Loyal"],
    dog_profiler_data: {
      personality_traits: ["Smart", "Gentle", "Loyal"],
    },
    created_at: "2024-01-26",
    slug: "luna-2",
  },
  {
    id: "3",
    name: "Buddy",
    breed: "Labrador",
    primary_breed: "Labrador",
    age: "1 year",
    age_text: "1 year",
    age_min_months: 12,
    sex: "male",
    primary_image_url: "/dog3.jpg",
    organization: {
      id: 3,
      name: "Save A Dog",
      slug: "save-a-dog",
      config_id: "save-a-dog",
    },
    personality_traits: ["Calm", "Good with kids", "Friendly"],
    dog_profiler_data: {
      personality_traits: ["Calm", "Good with kids", "Friendly"],
    },
    created_at: "2024-01-27",
    slug: "buddy-3",
  },
  {
    id: "4",
    name: "Bella",
    breed: "German Shepherd",
    primary_breed: "German Shepherd",
    age: "4 years",
    age_text: "4 years",
    age_min_months: 48,
    sex: "female",
    primary_image_url: "/dog4.jpg",
    organization: {
      id: 4,
      name: "Happy Tails",
      slug: "happy-tails",
      config_id: "happy-tails",
    },
    personality_traits: ["Protective", "Intelligent", "Active"],
    dog_profiler_data: {
      personality_traits: ["Protective", "Intelligent", "Active"],
    },
    created_at: "2024-01-20",
    slug: "bella-4",
  },
  {
    id: "5",
    name: "Charlie",
    breed: "Beagle",
    primary_breed: "Beagle",
    age: "2 years",
    age_text: "2 years",
    age_min_months: 24,
    sex: "male",
    primary_image_url: "/dog5.jpg",
    organization: {
      id: 5,
      name: "Paw Patrol",
      slug: "paw-patrol",
      config_id: "paw-patrol",
    },
    personality_traits: ["Curious", "Friendly", "Energetic"],
    dog_profiler_data: {
      personality_traits: ["Curious", "Friendly", "Energetic"],
    },
    created_at: "2024-01-21",
    slug: "charlie-5",
  },
  {
    id: "6",
    name: "Daisy",
    breed: "Poodle",
    primary_breed: "Poodle",
    age: "5 years",
    age_text: "5 years",
    age_min_months: 60,
    sex: "female",
    primary_image_url: "/dog6.jpg",
    organization: {
      id: 6,
      name: "Furry Friends",
      slug: "furry-friends",
      config_id: "furry-friends",
    },
    personality_traits: ["Gentle", "Calm", "Intelligent"],
    dog_profiler_data: {
      personality_traits: ["Gentle", "Calm", "Intelligent"],
    },
    created_at: "2024-01-22",
    slug: "daisy-6",
  },
];

describe("MobileAvailableNow", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  it("renders the component with correct structure", () => {
    render(<MobileAvailableNow dogs={mockDogs.slice(0, 4)} />);

    // Check header section
    expect(screen.getByText("Available Now")).toBeInTheDocument();

    // Check filter button
    const filterButton = screen.getByRole("button", { name: /open filters/i });
    expect(filterButton).toBeInTheDocument();
  });

  it("applies mobile-only visibility classes", () => {
    const { container } = render(
      <MobileAvailableNow dogs={mockDogs.slice(0, 4)} />,
    );
    const section = container.firstChild;
    expect(section).toHaveClass("md:hidden");
  });

  it("displays dogs in a 2-column grid on mobile", () => {
    render(<MobileAvailableNow dogs={mockDogs.slice(0, 4)} />);

    const grid = screen.getByTestId("dogs-grid");
    expect(grid).toHaveClass("grid", "grid-cols-2", "gap-3");
  });

  it("renders dog cards with name and age", () => {
    render(<MobileAvailableNow dogs={mockDogs.slice(0, 2)} />);

    // Check that dog names with age are displayed
    expect(screen.getByText("Max, Young")).toBeInTheDocument();
    expect(screen.getByText("Luna, Adult")).toBeInTheDocument();
  });

  it("shows personality traits with colored badges", () => {
    render(<MobileAvailableNow dogs={mockDogs.slice(0, 2)} />);

    // Check traits are displayed as badges
    expect(screen.getByText("Friendly")).toBeInTheDocument();
    expect(screen.getByText("Energetic")).toBeInTheDocument();
    expect(screen.getByText("Smart")).toBeInTheDocument();
    expect(screen.getByText("Gentle")).toBeInTheDocument();
  });

  it("displays Load More button when more dogs are available", () => {
    render(<MobileAvailableNow dogs={mockDogs} hasMore={true} />);

    const loadMoreButton = screen.getByRole("button", {
      name: /load more dogs/i,
    });
    expect(loadMoreButton).toBeInTheDocument();
  });

  it("handles Load More button click", async () => {
    const mockOnLoadMore = jest.fn();
    render(
      <MobileAvailableNow
        dogs={mockDogs.slice(0, 4)}
        hasMore={true}
        onLoadMore={mockOnLoadMore}
      />,
    );

    const loadMoreButton = screen.getByRole("button", {
      name: /load more dogs/i,
    });
    fireEvent.click(loadMoreButton);

    expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
  });

  it("shows loading state on Load More button", () => {
    render(
      <MobileAvailableNow
        dogs={mockDogs.slice(0, 4)}
        hasMore={true}
        loadingMore={true}
      />,
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("hides Load More button when no more dogs", () => {
    render(<MobileAvailableNow dogs={mockDogs} hasMore={false} />);

    expect(
      screen.queryByRole("button", { name: /load more dogs/i }),
    ).not.toBeInTheDocument();
  });

  it("opens filter drawer when filter button is clicked", () => {
    render(<MobileAvailableNow dogs={mockDogs.slice(0, 4)} />);

    const filterButton = screen.getByRole("button", { name: /open filters/i });
    fireEvent.click(filterButton);

    // Should open the filter drawer
    expect(screen.getByTestId("mobile-filter-drawer")).toBeInTheDocument();
  });

  it("handles empty dogs array gracefully", () => {
    render(<MobileAvailableNow dogs={[]} />);

    expect(screen.getByText("Available Now")).toBeInTheDocument();
    expect(
      screen.getByText("No dogs available at the moment"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Check back soon for new arrivals!"),
    ).toBeInTheDocument();
  });

  it("handles favorite toggle", () => {
    const { useFavorites } = require("../../../hooks/useFavorites");
    const mockToggleFavorite = jest.fn();
    useFavorites.mockReturnValue({
      favorites: [1],
      toggleFavorite: mockToggleFavorite,
    });

    render(<MobileAvailableNow dogs={mockDogs.slice(0, 2)} />);

    // Find and click favorite button (heart icon)
    const favoriteButtons = screen.getAllByRole("button", {
      name: /add to favorites|remove from favorites/i,
    });

    fireEvent.click(favoriteButtons[0]);
    expect(mockToggleFavorite).toHaveBeenCalledWith(1, "Max");
  });

  it("displays dog images", () => {
    render(<MobileAvailableNow dogs={mockDogs.slice(0, 2)} />);

    const maxImage = screen.getByAltText("Max");
    expect(maxImage).toHaveAttribute("src", "/dog1.jpg");

    const lunaImage = screen.getByAltText("Luna");
    expect(lunaImage).toHaveAttribute("src", "/dog2.jpg");
  });

  it("handles loading state for initial load", () => {
    render(<MobileAvailableNow dogs={[]} loading={true} />);

    // Should show skeleton loaders
    const grid = screen.getByTestId("dogs-grid");
    expect(grid).toBeInTheDocument();
    expect(grid.children.length).toBeGreaterThan(0);
  });

  it("applies proper styling to section container", () => {
    const { container } = render(
      <MobileAvailableNow dogs={mockDogs.slice(0, 4)} />,
    );
    const section = container.firstChild;

    expect(section).toHaveClass("px-4", "py-6", "bg-white", "dark:bg-gray-900");
  });

  it("displays count of available dogs", () => {
    render(<MobileAvailableNow dogs={mockDogs} totalCount={150} />);

    expect(screen.getByText("150 dogs available")).toBeInTheDocument();
  });

  it("shows extra traits count when more than 2", () => {
    render(<MobileAvailableNow dogs={mockDogs.slice(2, 3)} />);

    // Buddy has 3 traits, should show 2 + count
    expect(screen.getByText("Calm")).toBeInTheDocument();
    expect(screen.getByText("Good with kids")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });
});
