/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import FavoritesClient from "../FavoritesClient";
import { SNAPSHOTS_KEY } from "@/utils/favoriteSnapshots";
import type { Dog } from "@/types/dog";

const mockRemoveFavorite = jest.fn();
let mockFavorites: number[] = [];

jest.mock("../../../hooks/useFavorites", () => ({
  useFavorites: () => ({
    favorites: mockFavorites,
    count: mockFavorites.length,
    getShareableUrl: () => "/favorites?shared=1",
    loadFromUrl: jest.fn(),
    isFavorited: () => true,
    toggleFavorite: jest.fn(),
    removeFavorite: mockRemoveFavorite,
    isHydrated: true,
  }),
}));

jest.mock("../../../contexts/ToastContext", () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock("@/lib/visitorLocation", () => ({
  useVisitorLocation: () => ({ country: "GB", choice: "GB", onlyAdoptable: false }),
}));

const mockTrackAdoption = jest.fn();
jest.mock("@/lib/analytics", () => ({
  ...jest.requireActual("@/lib/analytics"),
  trackAdoptionLinkClicked: (...args: unknown[]) => mockTrackAdoption(...args),
  trackFavoritesViewed: jest.fn(),
}));

jest.mock("../../../components/favorites/FilterPanel", () => {
  return function FilterPanel() {
    return <div data-testid="filter-panel" />;
  };
});

jest.mock("../../../components/favorites/CompareMode", () => {
  return function CompareMode({ dogs }: { dogs: Dog[] }) {
    return <div data-testid="compare-mode">{dogs.length} compared</div>;
  };
});

const mockGetAnimalsByIds = jest.fn();
const mockGetFilterCounts = jest.fn();
jest.mock("../../../services/animalsService", () => ({
  getAnimalsByIds: (...args: unknown[]) => mockGetAnimalsByIds(...args),
  getAvailableCountries: () => Promise.resolve(["DE", "UK"]),
  getFilterCounts: (...args: unknown[]) => mockGetFilterCounts(...args),
}));

function listedDog(id: number): Dog {
  return {
    id,
    name: `Dog ${id}`,
    slug: `dog-${id}`,
    status: "available",
    active: true,
    adoption_url: `https://rescue.example/dogs/${id}`,
    organization: { name: "Happy Paws", slug: "happy-paws" },
  };
}

const MOLLIE: Dog = {
  id: 99,
  name: "Mollie",
  slug: "mollie-99",
  status: "unknown",
  active: false,
  last_seen_at: "2026-09-12T10:00:00",
  primary_breed: "Greyhound",
  organization: { name: "Many Tears", slug: "many-tears" },
};

function savedRows(): HTMLElement[] {
  const list = screen.queryByTestId("saved-dogs");
  return list ? within(list).getAllByRole("listitem") : [];
}

describe("Favorites page (#498)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockFavorites = [];
    mockGetFilterCounts.mockResolvedValue({ total: 4 });
  });

  test("with no saved dogs, invites the visitor to browse", () => {
    render(<FavoritesClient />);
    expect(screen.getByRole("heading", { name: "No saved dogs yet" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse dogs" })).toHaveAttribute("href", "/dogs");
    expect(mockGetAnimalsByIds).not.toHaveBeenCalled();
  });

  test("with one dog: its row, adopt and remove, but no compare or insights", async () => {
    mockFavorites = [1];
    mockGetAnimalsByIds.mockResolvedValue([listedDog(1)]);
    render(<FavoritesClient />);

    await waitFor(() => expect(savedRows()).toHaveLength(1));
    expect(screen.getByRole("link", { name: /Meet Dog 1/ })).toHaveAttribute("href", "https://rescue.example/dogs/1");
    expect(screen.getByRole("button", { name: "Remove Dog 1" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compare" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("insights-container")).not.toBeInTheDocument();
  });

  test("with three dogs: newest saved first, compare opens straight on them", async () => {
    mockFavorites = [1, 2, 3];
    mockGetAnimalsByIds.mockResolvedValue([listedDog(1), listedDog(2), listedDog(3)]);
    render(<FavoritesClient />);

    await waitFor(() => expect(savedRows()).toHaveLength(3));
    expect(savedRows().map((row) => within(row).getByRole("heading").textContent)).toEqual([
      "Dog 3",
      "Dog 2",
      "Dog 1",
    ]);
    expect(screen.queryByTestId("filter-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("insights-container")).toHaveTextContent("All at Happy Paws");

    await userEvent.click(screen.getByRole("button", { name: "Compare" }));
    expect(await screen.findByTestId("compare-mode")).toHaveTextContent("3 compared");
  });

  test("with twenty dogs: all rows, and filters because there are more than six", async () => {
    mockFavorites = Array.from({ length: 20 }, (_, i) => i + 1);
    mockGetAnimalsByIds.mockResolvedValue(mockFavorites.map(listedDog));
    render(<FavoritesClient />);

    await waitFor(() => expect(savedRows()).toHaveLength(20));
    expect(await screen.findByTestId("filter-panel")).toBeInTheDocument();
    expect(mockGetAnimalsByIds).toHaveBeenCalledTimes(1);
  });

  test("the adopt button reports the conversion with source favorites", async () => {
    mockFavorites = [1];
    mockGetAnimalsByIds.mockResolvedValue([listedDog(1)]);
    render(<FavoritesClient />);

    const adopt = await screen.findByRole("link", { name: /Meet Dog 1/ });
    adopt.addEventListener("click", (e) => e.preventDefault());
    await userEvent.click(adopt);
    expect(mockTrackAdoption).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), "favorites");
  });

  test("a dog the rescue stopped listing stays, greyed, with its date and similar dogs", async () => {
    mockFavorites = [1, 99];
    mockGetAnimalsByIds.mockResolvedValue([listedDog(1), MOLLIE]);
    render(<FavoritesClient />);

    const section = await screen.findByTestId("no-longer-listed");
    expect(within(section).getByRole("heading", { name: "Mollie" })).toBeInTheDocument();
    expect(section).toHaveTextContent("No longer listed on Many Tears' site since 12 Sept");
    expect(section).not.toHaveTextContent(/adopted/i);
    expect(within(section).queryByRole("link", { name: /Meet/ })).not.toBeInTheDocument();

    const similar = await within(section).findByRole("link", { name: /See 4 similar Greyhounds you can adopt/ });
    expect(similar).toHaveAttribute("href", "/dogs?breed=Greyhound&available_country=UK");
    expect(mockGetFilterCounts).toHaveBeenCalledWith({ primary_breed: "Greyhound", available_to_country: "UK" });

    // Only the listed dog counts as saved-and-available
    expect(savedRows()).toHaveLength(1);
    expect(mockRemoveFavorite).not.toHaveBeenCalled();
  });

  test("a stale id the API has nothing for renders from its snapshot and is not removed", async () => {
    mockFavorites = [1, 404];
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify({ 404: { name: "Narla", rescue: "Dogs Trust" } }));
    mockGetAnimalsByIds.mockResolvedValue([listedDog(1)]);
    render(<FavoritesClient />);

    const section = await screen.findByTestId("no-longer-listed");
    expect(within(section).getByRole("heading", { name: "Narla" })).toBeInTheDocument();
    expect(section).toHaveTextContent("No longer listed on Dogs Trust's site.");
    // No page to link to, only a way to remove it by choice
    expect(within(section).queryByRole("link", { name: "Narla" })).not.toBeInTheDocument();
    expect(within(section).getByRole("button", { name: "Remove Narla" })).toBeInTheDocument();
    expect(mockRemoveFavorite).not.toHaveBeenCalled();
  });

  test("keeps a snapshot of every dog the API returns", async () => {
    mockFavorites = [1];
    mockGetAnimalsByIds.mockResolvedValue([{ ...listedDog(1), primary_image_url: "https://img/1.jpg" }]);
    render(<FavoritesClient />);

    await waitFor(() => expect(savedRows()).toHaveLength(1));
    expect(JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) ?? "{}")).toEqual({
      1: { name: "Dog 1", image: "https://img/1.jpg", rescue: "Happy Paws" },
    });
  });

  test("a failed fetch shows an error instead of marking every dog as gone", async () => {
    mockFavorites = [1, 2];
    mockGetAnimalsByIds.mockRejectedValue(new Error("down"));
    render(<FavoritesClient />);

    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByTestId("no-longer-listed")).not.toBeInTheDocument();
  });
});
