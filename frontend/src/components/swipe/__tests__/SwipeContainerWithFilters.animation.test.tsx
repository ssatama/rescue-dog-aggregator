import React from "react";
import { render } from "@testing-library/react";
import { SwipeContainerWithFilters } from "../SwipeContainerWithFilters";
import { useFavorites } from "../../../hooks/useFavorites";
import useSwipeFilters from "../../../hooks/useSwipeFilters";
import { useRouter } from "next/navigation";

jest.mock("../../../hooks/useFavorites");
jest.mock("../../../hooks/useSwipeFilters");
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));
jest.mock("@sentry/nextjs", () => ({
  addBreadcrumb: jest.fn(),
  captureEvent: jest.fn(),
  captureException: jest.fn(),
}));

jest.mock("../SwipeCard", () => ({
  SwipeCard: () => <div data-testid="swipe-card">Dog Card</div>,
}));

jest.mock("../SwipeOnboarding", () => {
  return function SwipeOnboarding() {
    return null;
  };
});

jest.mock("../SwipeFilters", () => {
  return function SwipeFilters() {
    return <div data-testid="filters">Filters</div>;
  };
});

describe("SwipeContainerWithFilters - Paw Navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();

    (useFavorites as jest.Mock).mockReturnValue({
      addFavorite: jest.fn(),
      isFavorited: jest.fn().mockReturnValue(false),
    });

    (useSwipeFilters as jest.Mock).mockReturnValue({
      filters: {},
      setFilters: jest.fn(),
      isValid: true,
      toQueryString: jest.fn().mockReturnValue(""),
      needsOnboarding: false,
      completeOnboarding: jest.fn(),
    });

    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
  });

  it("should render without crashing", () => {
    const mockFetchDogs = jest.fn(() => Promise.resolve([]));

    const { container } = render(
      <SwipeContainerWithFilters
        fetchDogs={mockFetchDogs}
        onSwipe={jest.fn()}
        onCardExpanded={jest.fn()}
      />,
    );

    expect(container).toBeTruthy();
  });
});
