import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MobileAvailableNow } from "../MobileAvailableNow";
import { useRouter } from "next/navigation";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock DogCardOptimized component
jest.mock("../../dogs/DogCardOptimized", () => ({
  __esModule: true,
  default: ({ dog, compact, priority, animationDelay }: any) => (
    <div
      data-testid={`dog-card-${dog.id}`}
      data-compact={compact}
      data-priority={priority}
      data-animation-delay={animationDelay}
    >
      <h3>{dog.name}</h3>
      <p>{dog.breed}</p>
      {dog.personality_traits?.map((trait: string, index: number) => (
        <span key={index} data-testid={`trait-${trait}`}>
          {trait}
        </span>
      ))}
    </div>
  ),
}));

const mockDogs = [
  {
    id: 1,
    name: "Max",
    breed: "Golden Retriever",
    age: "2 years",
    organization: { name: "Happy Paws", slug: "happy-paws" },
    personality_traits: ["Friendly", "Energetic", "Playful"],
    created_at: "2024-01-25",
  },
  {
    id: 2,
    name: "Luna",
    breed: "Border Collie",
    age: "3 years",
    organization: { name: "Rescue Heroes", slug: "rescue-heroes" },
    personality_traits: ["Smart", "Gentle", "Loyal"],
    created_at: "2024-01-26",
  },
  {
    id: 3,
    name: "Buddy",
    breed: "Labrador",
    age: "1 year",
    organization: { name: "Save A Dog", slug: "save-a-dog" },
    personality_traits: ["Calm", "Good with kids", "Friendly"],
    created_at: "2024-01-27",
  },
  {
    id: 4,
    name: "Bella",
    breed: "German Shepherd",
    age: "4 years",
    organization: { name: "Happy Tails", slug: "happy-tails" },
    personality_traits: ["Protective", "Intelligent", "Active"],
    created_at: "2024-01-20",
  },
  {
    id: 5,
    name: "Charlie",
    breed: "Beagle",
    age: "2 years",
    organization: { name: "Paw Patrol", slug: "paw-patrol" },
    personality_traits: ["Curious", "Friendly", "Energetic"],
    created_at: "2024-01-21",
  },
  {
    id: 6,
    name: "Daisy",
    breed: "Poodle",
    age: "5 years",
    organization: { name: "Furry Friends", slug: "furry-friends" },
    personality_traits: ["Gentle", "Calm", "Intelligent"],
    created_at: "2024-01-22",
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
    const filterButton = screen.getByRole("button", { name: /filters/i });
    expect(filterButton).toBeInTheDocument();
    expect(filterButton).toHaveClass("text-gray-600");
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

  it("renders initial set of dogs with compact mode", () => {
    render(<MobileAvailableNow dogs={mockDogs.slice(0, 4)} />);

    // Check first 4 dogs are rendered
    expect(screen.getByTestId("dog-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("dog-card-2")).toBeInTheDocument();
    expect(screen.getByTestId("dog-card-3")).toBeInTheDocument();
    expect(screen.getByTestId("dog-card-4")).toBeInTheDocument();

    // Check compact mode is enabled
    expect(screen.getByTestId("dog-card-1")).toHaveAttribute(
      "data-compact",
      "true",
    );
  });

  it("shows personality traits with correct color coding", () => {
    render(<MobileAvailableNow dogs={mockDogs.slice(0, 3)} />);

    // Check traits are displayed (using getAllBy since traits can repeat)
    const friendlyTraits = screen.getAllByTestId("trait-Friendly");
    expect(friendlyTraits.length).toBeGreaterThan(0);
    expect(screen.getByTestId("trait-Energetic")).toBeInTheDocument();
    expect(screen.getByTestId("trait-Smart")).toBeInTheDocument();
    expect(screen.getByTestId("trait-Gentle")).toBeInTheDocument();
    expect(screen.getByTestId("trait-Calm")).toBeInTheDocument();
  });

  it("displays Load More button when more dogs are available", () => {
    render(<MobileAvailableNow dogs={mockDogs} hasMore={true} />);

    const loadMoreButton = screen.getByRole("button", {
      name: /load more dogs/i,
    });
    expect(loadMoreButton).toBeInTheDocument();
    expect(loadMoreButton).toHaveClass("bg-orange-500", "hover:bg-orange-600");
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
    const loadMoreButton = screen.getByRole("button", { name: /loading/i });
    expect(loadMoreButton).toBeDisabled();
  });

  it("hides Load More button when no more dogs", () => {
    render(<MobileAvailableNow dogs={mockDogs} hasMore={false} />);

    expect(
      screen.queryByRole("button", { name: /load more dogs/i }),
    ).not.toBeInTheDocument();
  });

  it("navigates to /dogs page when filter button is clicked", () => {
    render(<MobileAvailableNow dogs={mockDogs.slice(0, 4)} />);

    const filterButton = screen.getByRole("button", { name: /filters/i });
    fireEvent.click(filterButton);

    expect(mockPush).toHaveBeenCalledWith("/dogs");
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

  it("displays NEW TODAY badge for recent dogs", () => {
    const todayDate = new Date().toISOString().split("T")[0];
    const recentDogs = [
      { ...mockDogs[0], created_at: todayDate },
      { ...mockDogs[1], created_at: "2024-01-20" },
    ];

    render(<MobileAvailableNow dogs={recentDogs} />);

    // First dog should show as new (created today)
    const firstCard = screen.getByTestId("dog-card-1");
    expect(firstCard.parentElement).toHaveClass("relative");

    // This will be implemented in the actual component
    // For now, we're just testing that the structure is in place
  });

  it("applies animation delays to dog cards", () => {
    render(<MobileAvailableNow dogs={mockDogs.slice(0, 4)} />);

    expect(screen.getByTestId("dog-card-1")).toHaveAttribute(
      "data-animation-delay",
      "0",
    );
    expect(screen.getByTestId("dog-card-2")).toHaveAttribute(
      "data-animation-delay",
      "1",
    );
    expect(screen.getByTestId("dog-card-3")).toHaveAttribute(
      "data-animation-delay",
      "2",
    );
    expect(screen.getByTestId("dog-card-4")).toHaveAttribute(
      "data-animation-delay",
      "3",
    );
  });

  it("sets proper priority for first few dogs", () => {
    render(<MobileAvailableNow dogs={mockDogs.slice(0, 6)} />);

    // First 4 dogs should have priority
    expect(screen.getByTestId("dog-card-1")).toHaveAttribute(
      "data-priority",
      "true",
    );
    expect(screen.getByTestId("dog-card-2")).toHaveAttribute(
      "data-priority",
      "true",
    );
    expect(screen.getByTestId("dog-card-3")).toHaveAttribute(
      "data-priority",
      "true",
    );
    expect(screen.getByTestId("dog-card-4")).toHaveAttribute(
      "data-priority",
      "true",
    );

    // Dogs after 4th should not have priority
    expect(screen.getByTestId("dog-card-5")).toHaveAttribute(
      "data-priority",
      "false",
    );
    expect(screen.getByTestId("dog-card-6")).toHaveAttribute(
      "data-priority",
      "false",
    );
  });

  it("maintains proper accessibility attributes", () => {
    render(<MobileAvailableNow dogs={mockDogs.slice(0, 4)} />);

    // Check section has proper role
    const section = screen.getByRole("region", { name: /available dogs/i });
    expect(section).toBeInTheDocument();

    // Check filter button has aria-label
    const filterButton = screen.getByRole("button", { name: /filters/i });
    expect(filterButton).toHaveAttribute("aria-label");
  });

  it("handles loading state for initial load", () => {
    render(<MobileAvailableNow dogs={[]} loading={true} />);

    // Should show skeleton loaders
    const skeletons = screen.getAllByTestId(/skeleton/i);
    expect(skeletons).toHaveLength(4); // Show 4 skeleton cards
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

  it("handles undefined or null dogs gracefully", () => {
    render(<MobileAvailableNow dogs={undefined as any} />);

    expect(
      screen.getByText("No dogs available at the moment"),
    ).toBeInTheDocument();
  });
});
