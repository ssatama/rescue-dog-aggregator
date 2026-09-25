import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SwipeCard } from "../SwipeCard";
import { FavoritesProvider } from "../../../contexts/FavoritesContext";
import { ToastProvider } from "../../../contexts/ToastContext";
import type { Dog } from "@/types/dog";

jest.mock("../../ui/ShareButton", () => {
  return function MockShareButton({ url }: { url?: string }) {
    return (
      <button data-testid="share-button" data-url={url} aria-label="Share">
        Share
      </button>
    );
  };
});

jest.mock("@/lib/visitorLocation", () => ({
  useVisitorLocation: () => ({ country: "GB", choice: "GB", onlyAdoptable: false }),
}));

const renderCard = (dog: Dog, onOpenDetails = jest.fn()) =>
  render(
    <ToastProvider>
      <FavoritesProvider>
        <SwipeCard dog={dog} onOpenDetails={onOpenDetails} />
      </FavoritesProvider>
    </ToastProvider>,
  );

const buddy: Dog = {
  id: 1,
  name: "Buddy",
  primary_breed: "Golden Retriever",
  standardized_breed: "Golden Retriever",
  age_min_months: 30,
  age_max_months: 36,
  sex: "Male",
  primary_image_url: "https://example.com/buddy.jpg",
  organization: { name: "Happy Paws Rescue", country: "UK", ships_to: ["UK"] },
  slug: "buddy-golden",
  dog_profiler_data: {
    tagline: "Your next adventure companion",
    personality_traits: ["playful", "loyal", "gentle", "calm"],
  },
};

describe("SwipeCard (#499)", () => {
  beforeEach(() => localStorage.clear());

  it("shows name, breed · age · sex and where the dog is", () => {
    renderCard(buddy);
    expect(screen.getByRole("heading", { name: "Buddy" })).toBeInTheDocument();
    expect(screen.getByText("Golden Retriever · Young · Male")).toBeInTheDocument();
    expect(screen.getByText("Happy Paws Rescue · United Kingdom")).toBeInTheDocument();
    expect(screen.getByText(/Adoptable to you/)).toBeInTheDocument();
  });

  it("shows the tagline and at most three traits", () => {
    renderCard(buddy);
    expect(screen.getByText("Your next adventure companion")).toBeInTheDocument();
    expect(screen.getByText("Playful")).toBeInTheDocument();
    expect(screen.getByText("Gentle")).toBeInTheDocument();
    expect(screen.queryByText("Calm")).not.toBeInTheDocument();
  });

  it("leaves out facts that are missing instead of showing Unknown", () => {
    renderCard({ id: 2, name: "Nameonly", primary_breed: "Unknown" });
    expect(screen.getByRole("heading", { name: "Nameonly" })).toBeInTheDocument();
    expect(screen.queryByText(/Unknown/)).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Personality" })).not.toBeInTheDocument();
  });

  it("has a labelled heart that toggles the favorite", () => {
    renderCard(buddy);
    const heart = screen.getByRole("button", { name: "Add Buddy to favorites" });
    expect(heart).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(heart);
    expect(screen.getByRole("button", { name: "Remove Buddy from favorites" })).toHaveAttribute("aria-pressed", "true");
  });

  it("puts the heart on a solid disc so it reads on light photos", () => {
    renderCard(buddy);
    const heart = screen.getByRole("button", { name: "Add Buddy to favorites" });
    expect(heart).toHaveClass("bg-white", "shadow-md");
    expect(heart.className).not.toMatch(/bg-white\//);
  });

  it("shares the dog's page", () => {
    renderCard(buddy);
    expect(screen.getByTestId("share-button").getAttribute("data-url")).toMatch(/\/dogs\/buddy-golden$/);
  });

  it("offers a details button", () => {
    const onOpenDetails = jest.fn();
    renderCard(buddy, onOpenDetails);
    fireEvent.click(screen.getByRole("button", { name: "Tap for details" }));
    expect(onOpenDetails).toHaveBeenCalledTimes(1);
  });

  describe("gallery", () => {
    const withGallery: Dog = {
      ...buddy,
      images: [{ url: "https://example.com/1.jpg" }, { url: "https://example.com/2.jpg" }, { url: "https://example.com/3.jpg" }],
    };

    it("has no dots or photo steps for a single photo", () => {
      renderCard(buddy);
      expect(screen.queryByTestId("photo-dots")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Next photo" })).not.toBeInTheDocument();
    });

    it("steps through the photos with the edge buttons, wrapping around", () => {
      const onOpenDetails = jest.fn();
      renderCard(withGallery, onOpenDetails);
      expect(screen.getByTestId("photo-dots").children).toHaveLength(3);
      expect(screen.getByAltText("Buddy, photo 1 of 3")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Next photo" }));
      expect(screen.getByAltText("Buddy, photo 2 of 3")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));
      fireEvent.click(screen.getByRole("button", { name: "Previous photo" }));
      expect(screen.getByAltText("Buddy, photo 3 of 3")).toBeInTheDocument();
      // Stepping photos never opens the details
      expect(onOpenDetails).not.toHaveBeenCalled();
    });
  });

  it("shows a placeholder when there is no photo at all", () => {
    renderCard({ id: 3, name: "Nophoto" });
    expect(screen.getByTestId("image-container")).toHaveTextContent("🐾");
  });
});
