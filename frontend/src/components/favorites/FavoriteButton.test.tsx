import React from "react";
import { render, screen, fireEvent, waitFor } from "../../test-utils";
import "@testing-library/jest-dom";
import { FavoriteButton } from "./FavoriteButton";
import { useFavorites } from "../../hooks/useFavorites";

// Mock the useFavorites hook
jest.mock("../../hooks/useFavorites");

describe("FavoriteButton", () => {
  const mockToggleFavorite = jest.fn();
  const mockIsFavorited = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useFavorites as jest.Mock).mockReturnValue({
      toggleFavorite: mockToggleFavorite,
      isFavorited: mockIsFavorited,
      favorites: [],
      count: 0,
      addFavorite: jest.fn(),
      removeFavorite: jest.fn(),
      clearFavorites: jest.fn(),
      getShareableUrl: jest.fn(),
      loadFromUrl: jest.fn(),
      isLoading: false,
    });
  });

  it("should render an unfilled heart when not favorited", () => {
    mockIsFavorited.mockReturnValue(false);

    render(<FavoriteButton dogId={1} />);

    const button = screen.getByRole("button", { name: /add to favorites/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("should render a filled heart when favorited", () => {
    mockIsFavorited.mockReturnValue(true);

    render(<FavoriteButton dogId={1} />);

    const button = screen.getByRole("button", {
      name: /remove from favorites/i,
    });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("should toggle favorite when clicked", async () => {
    mockIsFavorited.mockReturnValue(false);
    mockToggleFavorite.mockResolvedValue(undefined);

    render(<FavoriteButton dogId={123} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToggleFavorite).toHaveBeenCalledWith(123, undefined);
    });
  });

  it("should prevent event propagation when clicked", () => {
    mockIsFavorited.mockReturnValue(false);

    const handleParentClick = jest.fn();
    render(
      <div onClick={handleParentClick}>
        <FavoriteButton dogId={1} />
      </div>,
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(handleParentClick).not.toHaveBeenCalled();
  });

  it("should handle keyboard interaction (Enter key)", () => {
    mockIsFavorited.mockReturnValue(false);

    render(<FavoriteButton dogId={1} />);

    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: "Enter", code: "Enter" });

    expect(mockToggleFavorite).toHaveBeenCalledWith(1, undefined);
  });

  it("should handle keyboard interaction (Space key)", () => {
    mockIsFavorited.mockReturnValue(false);

    render(<FavoriteButton dogId={1} />);

    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: " ", code: "Space" });

    expect(mockToggleFavorite).toHaveBeenCalledWith(1, undefined);
  });

  it("should show loading state while toggling", async () => {
    mockIsFavorited.mockReturnValue(false);

    // Make toggleFavorite take some time
    mockToggleFavorite.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    render(<FavoriteButton dogId={1} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    // Button should be disabled during loading
    expect(button).toBeDisabled();

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it("should apply custom className when provided", () => {
    mockIsFavorited.mockReturnValue(false);

    render(<FavoriteButton dogId={1} className="custom-class" />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });

  it("should have proper accessibility attributes", () => {
    mockIsFavorited.mockReturnValue(false);

    render(<FavoriteButton dogId={1} />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Add to favorites");
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveAttribute("type", "button");
  });

  it("should update aria attributes when favorited changes", () => {
    // Test unfavorited state
    mockIsFavorited.mockReturnValue(false);
    const { rerender } = render(<FavoriteButton dogId={1} />);

    let button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Add to favorites");
    expect(button).toHaveAttribute("aria-pressed", "false");

    // To test favorited state with memo, we render a new component instance
    // because memo prevents re-renders when props are the same.
    // In production, hook state changes trigger re-renders internally.
    mockIsFavorited.mockReturnValue(true);
    rerender(<FavoriteButton dogId={2} />);

    button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Remove from favorites");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("should render correct state for favorited and unfavorited dogs independently", () => {
    // This tests that the component correctly reflects the hook state
    mockIsFavorited.mockReturnValue(false);
    const { unmount } = render(<FavoriteButton dogId={1} />);
    let button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "false");
    unmount();

    mockIsFavorited.mockReturnValue(true);
    render(<FavoriteButton dogId={2} />);
    button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
});
