/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import FavoritesPage from "../page";
import type { Dog } from "@/types/dog";

// Mock react-error-boundary
jest.mock("react-error-boundary", () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

// Create stable references to avoid infinite re-renders
const mockClearFavorites = jest.fn();
const mockGetShareableUrl = jest.fn(() => "/favorites?shared=123");
const mockLoadFromUrl = jest.fn();
const mockIsFavorited = jest.fn();
const mockAddFavorite = jest.fn();
const mockRemoveFavorite = jest.fn();
const mockToggleFavorite = jest.fn();

// Mutable mock state - can be overridden per test
let mockUseFavoritesReturn = {
  favorites: [1, 2] as number[],
  count: 2,
  clearFavorites: mockClearFavorites,
  getShareableUrl: mockGetShareableUrl,
  loadFromUrl: mockLoadFromUrl,
  isFavorited: mockIsFavorited,
  addFavorite: mockAddFavorite,
  removeFavorite: mockRemoveFavorite,
  toggleFavorite: mockToggleFavorite,
  isLoading: false,
  isHydrated: true,
};

// Mock the hooks and components
jest.mock("../../../hooks/useFavorites", () => ({
  useFavorites: () => mockUseFavoritesReturn,
}));

jest.mock("../../../contexts/ToastContext", () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

jest.mock("../../../components/layout/Layout", () => {
  return function Layout({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  };
});

jest.mock("../../../components/dogs/DogCardOptimized", () => {
  return function DogCardOptimized({ dog }: { dog: Dog }) {
    return <div data-testid="dog-card">{dog.name}</div>;
  };
});

jest.mock("../../../components/dogs/DogsGrid", () => {
  return function DogsGrid({ dogs }: { dogs: Dog[] }) {
    return (
      <div data-testid="dogs-grid">
        {dogs.map((dog) => (
          <div key={dog.id} data-testid="dog-card">
            {dog.name}
          </div>
        ))}
      </div>
    );
  };
});

jest.mock("../../../components/favorites/FilterPanel", () => {
  return function FilterPanel({
    dogs,
    onFilter,
  }: {
    dogs: Dog[];
    onFilter: (filtered: Dog[]) => void;
  }) {
    return (
      <button onClick={() => onFilter(dogs.slice(0, 1))}>🔍 Filter</button>
    );
  };
});

jest.mock("../../../components/favorites/ShareModal", () => ({
  ShareModal: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? <div>Share Modal</div> : null,
}));

jest.mock("../../../components/favorites/CompareMode", () => {
  return function CompareMode({
    dogs,
    onClose,
  }: {
    dogs: Dog[];
    onClose: () => void;
  }) {
    return <div>Compare Mode</div>;
  };
});

// Mock fetch
global.fetch = jest.fn();

describe("FavoritesPage with FilterPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock state
    mockUseFavoritesReturn = {
      favorites: [1, 2],
      count: 2,
      clearFavorites: mockClearFavorites,
      getShareableUrl: mockGetShareableUrl,
      loadFromUrl: mockLoadFromUrl,
      isFavorited: mockIsFavorited,
      addFavorite: mockAddFavorite,
      removeFavorite: mockRemoveFavorite,
      toggleFavorite: mockToggleFavorite,
      isLoading: false,
      isHydrated: true,
    };
    // Mock process.env
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";

    (global.fetch as jest.Mock).mockImplementation((url) => {
      // Handle both with and without base URL
      if (
        url.includes("/api/animals/id/1") ||
        url === "http://localhost:8000/api/animals/id/1"
      ) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 1,
              name: "Buddy",
              breed: "Golden Retriever",
              age_months: 24,
              size: "large",
              organization_name: "Happy Paws",
              url: "https://example.com/adopt/buddy",
            }),
        });
      }
      if (
        url.includes("/api/animals/id/2") ||
        url === "http://localhost:8000/api/animals/id/2"
      ) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              id: 2,
              name: "Luna",
              breed: "Labrador",
              age_months: 36,
              size: "medium",
              organization_name: "Save a Soul",
              url: "https://example.com/adopt/luna",
            }),
        });
      }
      console.log("Unhandled fetch URL:", url);
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Not found" }),
      });
    });
  });

  test("renders FilterPanel component", async () => {
    render(<FavoritesPage />);

    await waitFor(() => {
      expect(screen.getByText("🔍 Filter")).toBeInTheDocument();
    });
  });

  test("shows loading state when favorites not yet hydrated from localStorage", () => {
    mockUseFavoritesReturn = {
      ...mockUseFavoritesReturn,
      favorites: [],
      count: 0,
      isHydrated: false,
    };

    render(<FavoritesPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Start Building Your Collection")).not.toBeInTheDocument();
  });
});
