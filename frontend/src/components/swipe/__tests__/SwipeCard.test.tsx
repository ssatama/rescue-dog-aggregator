import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SwipeCard } from "../SwipeCard";

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
    traits: ["Playful", "Loyal", "Gentle"],
    energy_level: 4,
    special_characteristic: "Loves to play fetch",
    quality_score: 0.9,
    created_at: new Date().toISOString(),
  };

  it("should display dog name, age, and breed", () => {
    render(<SwipeCard dog={mockDog} />);
    
    expect(screen.getByText("Buddy")).toBeInTheDocument();
    expect(screen.getByText(/Golden Retriever/)).toBeInTheDocument();
    expect(screen.getByText(/2 years/)).toBeInTheDocument();
  });

  it("should show LLM tagline", () => {
    render(<SwipeCard dog={mockDog} />);
    
    expect(screen.getByText(/A friendly and energetic companion/)).toBeInTheDocument();
  });

  it("should render personality traits (max 3)", () => {
    const dogWithManyTraits = {
      ...mockDog,
      traits: ["Playful", "Loyal", "Gentle", "Smart", "Curious"],
    };
    
    render(<SwipeCard dog={dogWithManyTraits} />);
    
    expect(screen.getByText("Playful")).toBeInTheDocument();
    expect(screen.getByText("Loyal")).toBeInTheDocument();
    expect(screen.getByText("Gentle")).toBeInTheDocument();
    expect(screen.queryByText("Smart")).not.toBeInTheDocument();
    expect(screen.queryByText("Curious")).not.toBeInTheDocument();
  });

  it("should display energy level indicator", () => {
    render(<SwipeCard dog={mockDog} />);
    
    expect(screen.getByTestId("energy-indicator")).toBeInTheDocument();
    expect(screen.getByText("Energy:")).toBeInTheDocument();
  });

  it("should show unique quirk", () => {
    render(<SwipeCard dog={mockDog} />);
    
    expect(screen.getByText(/Loves to play fetch/)).toBeInTheDocument();
    expect(screen.getByText(/🦴/)).toBeInTheDocument();
  });

  it("should indicate new dogs with badge", () => {
    const newDog = {
      ...mockDog,
      created_at: new Date().toISOString(),
    };
    
    render(<SwipeCard dog={newDog} />);
    
    expect(screen.getByText("NEW")).toBeInTheDocument();
  });

  it("should not show NEW badge for dogs older than 7 days", () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 8);
    const oldDog = {
      ...mockDog,
      created_at: oldDate.toISOString(),
    };
    
    render(<SwipeCard dog={oldDog} />);
    
    expect(screen.queryByText("NEW")).not.toBeInTheDocument();
  });

  it("should display organization and location", () => {
    render(<SwipeCard dog={mockDog} />);
    
    expect(screen.getByText(/Happy Paws Rescue/)).toBeInTheDocument();
    expect(screen.getByText(/San Francisco, CA/)).toBeInTheDocument();
  });

  it("should show placeholder when no image provided", () => {
    const dogWithoutImage = {
      ...mockDog,
      image: undefined,
    };
    
    render(<SwipeCard dog={dogWithoutImage} />);
    
    expect(screen.getByText("🐕")).toBeInTheDocument();
  });

  it("should handle missing optional fields gracefully", () => {
    const minimalDog = {
      id: 2,
      name: "Max",
      slug: "max",
    };
    
    render(<SwipeCard dog={minimalDog} />);
    
    expect(screen.getByText("Max")).toBeInTheDocument();
    expect(screen.queryByText("Energy:")).not.toBeInTheDocument();
    expect(screen.queryByText("🦴")).not.toBeInTheDocument();
  });

  it("should apply proper styling with rounded corners and shadow", () => {
    const { container } = render(<SwipeCard dog={mockDog} />);
    
    const card = container.querySelector(".rounded-2xl");
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass("shadow-lg");
  });

  it("should maintain 16:9 aspect ratio for image container", () => {
    render(<SwipeCard dog={mockDog} />);
    
    const imageContainer = screen.getByTestId("image-container");
    expect(imageContainer).toHaveClass("aspect-video");
  });
});