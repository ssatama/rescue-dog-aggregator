import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SwipeContainerWithFilters } from "../SwipeContainerWithFilters";
import { useFavorites } from "../../../hooks/useFavorites";
import useSwipeFilters from "../../../hooks/useSwipeFilters";
import { useRouter } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

jest.mock("../../../hooks/useFavorites");
jest.mock("../../../hooks/useSwipeFilters");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));
jest.mock("@sentry/nextjs", () => ({
  captureEvent: jest.fn(),
  captureException: jest.fn(),
}));

// Mock SwipeCard, SwipeOnboarding, and SwipeFilters
jest.mock("../SwipeCard", () => ({
  SwipeCard: ({ dog }: { dog: any }) => (
    <div data-testid="swipe-card">
      <div>{dog.name}</div>
      <div>{dog.breed}</div>
    </div>
  ),
}));

jest.mock("../SwipeOnboarding", () => {
  return function SwipeOnboarding({ onComplete }: { onComplete: any }) {
    return (
      <div data-testid="swipe-onboarding">
        <button onClick={() => onComplete(true)}>Skip Onboarding</button>
      </div>
    );
  };
});

jest.mock("../SwipeFilters", () => {
  return function SwipeFilters({ onFiltersChange, compact }: any) {
    if (compact) {
      return <div data-testid="compact-filters">Compact Filters</div>;
    }
    return (
      <div data-testid="filters">
        <button onClick={() => onFiltersChange({})}>Apply Filters</button>
      </div>
    );
  };
});

describe("SwipeContainerWithFilters - Paw Navigation", () => {
  const mockDogs = [
    {
      id: 1,
      name: "Buddy",
      breed: "Golden Retriever",
      age: "2 years",
      slug: "buddy-1",
      image: "/dog1.jpg",
      organization: "Happy Paws",
      location: "New York",
      description: "Friendly dog",
      traits: ["Friendly", "Playful"],
      energy_level: 4,
    },
    {
      id: 2,
      name: "Max",
      breed: "Labrador",
      age: "3 years",
      slug: "max-2",
      image: "/dog2.jpg",
      organization: "Pet Rescue",
      location: "Boston",
      description: "Energetic pup",
      traits: ["Energetic", "Loyal"],
      energy_level: 5,
    },
    {
      id: 3,
      name: "Luna",
      breed: "Husky",
      age: "1 year",
      slug: "luna-3",
      image: "/dog3.jpg",
      organization: "Animal Haven",
      location: "Chicago",
      description: "Beautiful husky",
      traits: ["Independent", "Active"],
      energy_level: 5,
    },
  ];

  const mockFetchDogs = jest.fn().mockResolvedValue(mockDogs);
  const mockOnSwipe = jest.fn();
  const mockOnCardExpanded = jest.fn();
  const mockAddFavorite = jest.fn();
  const mockIsFavorited = jest.fn().mockReturnValue(false);
  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();

    (useFavorites as jest.Mock).mockReturnValue({
      addFavorite: mockAddFavorite,
      isFavorited: mockIsFavorited,
    });

    (useSwipeFilters as jest.Mock).mockReturnValue({
      filters: {},
      setFilters: jest.fn(),
      isValid: true,
      toQueryString: jest.fn().mockReturnValue("age=0-10&breed=all"),
      needsOnboarding: false,
      completeOnboarding: jest.fn(),
    });

    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it("should navigate to next dog with paw button", async () => {
    render(
      <SwipeContainerWithFilters
        fetchDogs={mockFetchDogs}
        onSwipe={mockOnSwipe}
        onCardExpanded={mockOnCardExpanded}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Buddy")).toBeInTheDocument();
    });

    // Find and click the Next paw button
    const nextButton = screen.getByLabelText("Next dog");
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText("Max")).toBeInTheDocument();
    });

    expect(Sentry.captureEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "swipe.card.viewed",
        extra: expect.objectContaining({
          dogId: 2,
          dogName: "Max",
        }),
      }),
    );
  });

  it("should navigate to previous dog with paw button", async () => {
    render(
      <SwipeContainerWithFilters
        fetchDogs={mockFetchDogs}
        onSwipe={mockOnSwipe}
        onCardExpanded={mockOnCardExpanded}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Buddy")).toBeInTheDocument();
    });

    // First go to next dog
    const nextButton = screen.getByLabelText("Next dog");
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText("Max")).toBeInTheDocument();
    });

    // Then go back
    const prevButton = screen.getByLabelText("Previous dog");
    fireEvent.click(prevButton);

    await waitFor(() => {
      expect(screen.getByText("Buddy")).toBeInTheDocument();
    });
  });

  it("should disable previous button at first dog", async () => {
    render(
      <SwipeContainerWithFilters
        fetchDogs={mockFetchDogs}
        onSwipe={mockOnSwipe}
        onCardExpanded={mockOnCardExpanded}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Buddy")).toBeInTheDocument();
    });

    const prevButton = screen.getByLabelText("Previous dog");
    expect(prevButton).toBeDisabled();
  });

  it("should disable next button at last dog", async () => {
    // Mock fetch to return dogs initially, then empty array when loading more
    const limitedFetchDogs = jest
      .fn()
      .mockResolvedValueOnce(mockDogs) // Initial load
      .mockResolvedValue([]); // Any subsequent loads return empty

    render(
      <SwipeContainerWithFilters
        fetchDogs={limitedFetchDogs}
        onSwipe={mockOnSwipe}
        onCardExpanded={mockOnCardExpanded}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Buddy")).toBeInTheDocument();
    });

    // Navigate to the last dog
    const nextButton = screen.getByLabelText("Next dog");

    // Click to go to Max (index 1)
    fireEvent.click(nextButton);
    await waitFor(() => expect(screen.getByText("Max")).toBeInTheDocument());

    // Click to go to Luna (index 2, last dog)
    fireEvent.click(nextButton);
    await waitFor(() => expect(screen.getByText("Luna")).toBeInTheDocument());

    // Wait a bit for any async load operations to complete
    await waitFor(
      () => {
        // Now the button should be disabled since Luna is the last dog
        // and no more dogs were loaded
        const nextButtonAfterLastDog = screen.getByLabelText("Next dog");
        expect(nextButtonAfterLastDog).toBeDisabled();
      },
      { timeout: 2000 },
    );
  });

  it("should show paw icons on navigation buttons", async () => {
    render(
      <SwipeContainerWithFilters
        fetchDogs={mockFetchDogs}
        onSwipe={mockOnSwipe}
        onCardExpanded={mockOnCardExpanded}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Buddy")).toBeInTheDocument();
    });

    // Check for paw emojis - there should be two (one for each button)
    const pawEmojis = screen.getAllByText("🐾");
    expect(pawEmojis).toHaveLength(2);

    // Check for button labels
    expect(screen.getByText("Back")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });
});
