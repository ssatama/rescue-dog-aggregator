import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SwipeCard } from "../SwipeCard";
import { FavoritesProvider } from "../../../contexts/FavoritesContext";
import { ToastProvider } from "../../../contexts/ToastContext";

const renderWithProvider = (component) => {
  return render(
    <ToastProvider>
      <FavoritesProvider>{component}</FavoritesProvider>
    </ToastProvider>,
  );
};

describe("SwipeCard", () => {
  const mockDog = {
    id: 1,
    name: "Buddy",
    breed: "Golden Retriever",
    age: "2 years",
    image: "https://example.com/buddy.jpg",
    organization: "Happy Paws Rescue",
    location: "San Francisco, CA",
    slug: "buddy-golden",
    description: "A friendly and energetic companion",
    dogProfilerData: {
      tagline: "Buddy: Your next adventure companion!",
      uniqueQuirk: "Loves to play fetch for hours",
      personalityTraits: ["Playful", "Loyal", "Gentle"],
      favoriteActivities: ["fetch", "swimming"],
      qualityScore: 90,
    },
    created_at: new Date().toISOString(),
  };

  it("should display dog name and tagline", () => {
    renderWithProvider(<SwipeCard dog={mockDog} />);

    expect(screen.getByText("Buddy")).toBeInTheDocument();
    // Shows enriched tagline
    expect(
      screen.getByText(/Buddy: Your next adventure companion!/),
    ).toBeInTheDocument();
  });

  it("should show personality traits", () => {
    renderWithProvider(<SwipeCard dog={mockDog} />);

    expect(screen.getByText("Playful")).toBeInTheDocument();
    expect(screen.getByText("Loyal")).toBeInTheDocument();
    expect(screen.getByText("Gentle")).toBeInTheDocument();
  });

  it("should have heart and share action buttons", () => {
    renderWithProvider(<SwipeCard dog={mockDog} />);

    expect(screen.getByLabelText("Add to favorites")).toBeInTheDocument();
    expect(screen.getByLabelText("Share")).toBeInTheDocument();
  });

  it("should not display energy level (removed in redesign)", () => {
    renderWithProvider(<SwipeCard dog={mockDog} />);

    expect(screen.queryByTestId("energy-indicator")).not.toBeInTheDocument();
    expect(screen.queryByText("Energy:")).not.toBeInTheDocument();
  });

  it("should show unique quirk", () => {
    renderWithProvider(<SwipeCard dog={mockDog} />);

    expect(screen.getByText(/Loves to play fetch/)).toBeInTheDocument();
    expect(screen.getByText(/✨/)).toBeInTheDocument();
  });

  it("should show NEW badge for recent dogs", () => {
    const newDog = {
      ...mockDog,
      created_at: new Date().toISOString(),
    };

    renderWithProvider(<SwipeCard dog={newDog} />);

    expect(screen.getByText("NEW")).toBeInTheDocument();
  });

  it("should not show NEW badge for dogs older than 7 days", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 8);
    const oldDog = {
      ...mockDog,
      created_at: oldDate.toISOString(),
    };

    renderWithProvider(<SwipeCard dog={oldDog} />);

    expect(screen.queryByText("NEW")).not.toBeInTheDocument();
  });

  it("should not display organization and location (removed in redesign)", () => {
    renderWithProvider(<SwipeCard dog={mockDog} />);

    expect(screen.queryByText(/Happy Paws Rescue/)).not.toBeInTheDocument();
    expect(screen.queryByText(/San Francisco, CA/)).not.toBeInTheDocument();
  });

  it("should show placeholder when no image provided", () => {
    const dogWithoutImage = {
      ...mockDog,
      image: undefined,
    };

    renderWithProvider(<SwipeCard dog={dogWithoutImage} />);

    // The FallbackImage component will render a placeholder
    // Check for the fallback image or placeholder element
    const container = screen.getByTestId("image-container");
    expect(container).toBeInTheDocument();
    
    // The FallbackImage should still render an img element with fallback src
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/placeholder_dog.svg');
  });

  it("should handle missing optional fields gracefully", () => {
    const minimalDog = {
      id: 2,
      name: "Max",
      slug: "max",
    };

    renderWithProvider(<SwipeCard dog={minimalDog} />);

    expect(screen.getByText("Max")).toBeInTheDocument();
    expect(screen.queryByText("Energy:")).not.toBeInTheDocument();
    expect(screen.queryByText("🦴")).not.toBeInTheDocument();
  });

  it("should apply proper styling with rounded corners and shadow", () => {
    const { container } = renderWithProvider(<SwipeCard dog={mockDog} />);

    const card = container.querySelector(".rounded-xl");
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass("shadow-xl");
  });

  it("should have 4:3 aspect ratio for image container", () => {
    renderWithProvider(<SwipeCard dog={mockDog} />);

    const imageContainer = screen.getByTestId("image-container");
    expect(imageContainer).toHaveClass("aspect-[4/3]");
  });
});