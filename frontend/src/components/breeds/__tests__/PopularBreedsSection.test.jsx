import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import PopularBreedsSection from "../PopularBreedsSection";

const mockPopularBreeds = [
  {
    primary_breed: "Galgo",
    breed_slug: "galgo",
    breed_type: "purebred",
    breed_group: "Hound",
    count: 120,
    sample_dogs: [
      {
        name: "Shadow",
        slug: "shadow-111",
        primary_image_url: "https://example.com/shadow.jpg",
        age_text: "4 years",
        sex: "Male",
        personality_traits: ["Gentle", "Calm"]
      },
      {
        name: "Luna",
        slug: "luna-222",
        primary_image_url: "https://example.com/luna.jpg",
        age_text: "2 years",
        sex: "Female",
        personality_traits: ["Playful", "Loyal"]
      }
    ]
  },
  {
    primary_breed: "Podenco",
    breed_slug: "podenco",
    breed_type: "purebred",
    breed_group: "Hound",
    count: 68,
    sample_dogs: [
      {
        name: "Max",
        slug: "max-333",
        primary_image_url: "https://example.com/max.jpg",
        age_text: "3 years",
        sex: "Male",
        personality_traits: ["Active", "Alert"]
      }
    ]
  },
  {
    primary_breed: "Collie",
    breed_slug: "collie",
    breed_type: "purebred",
    breed_group: "Herding",
    count: 45,
    sample_dogs: [
      {
        name: "Bella",
        slug: "bella-444",
        primary_image_url: "https://example.com/bella.jpg",
        age_text: "5 years",
        sex: "Female",
        personality_traits: ["Intelligent", "Loyal"]
      }
    ]
  },
  {
    primary_breed: "Cocker Spaniel",
    breed_slug: "cocker-spaniel",
    breed_type: "purebred",
    breed_group: "Sporting",
    count: 38,
    sample_dogs: [
      {
        name: "Charlie",
        slug: "charlie-555",
        primary_image_url: "https://example.com/charlie.jpg",
        age_text: "1 year",
        sex: "Male",
        personality_traits: ["Friendly", "Playful"]
      }
    ]
  }
];

describe("PopularBreedsSection", () => {
  it("renders section with title", () => {
    render(<PopularBreedsSection popularBreeds={mockPopularBreeds} />);
    expect(screen.getByText("Popular Breeds Available Now")).toBeInTheDocument();
  });

  it("displays breed cards with images", () => {
    render(<PopularBreedsSection popularBreeds={mockPopularBreeds} />);
    
    // Check Galgo card
    expect(screen.getByText("Galgo")).toBeInTheDocument();
    expect(screen.getByText("120 available")).toBeInTheDocument();
    const galgoImage = screen.getByAltText("Galgo rescue dog");
    expect(galgoImage).toHaveAttribute("src", "https://example.com/shadow.jpg");
    
    // Check Podenco card
    expect(screen.getByText("Podenco")).toBeInTheDocument();
    expect(screen.getByText("68 available")).toBeInTheDocument();
    const podencoImage = screen.getByAltText("Podenco rescue dog");
    expect(podencoImage).toHaveAttribute("src", "https://example.com/max.jpg");
  });

  it("displays breed group and characteristics", () => {
    render(<PopularBreedsSection popularBreeds={mockPopularBreeds} />);
    
    // Check breed groups are displayed (use getAllByText since there are multiple)
    const houndGroups = screen.getAllByText("Hound Group • Purebred");
    expect(houndGroups.length).toBeGreaterThan(0);
    
    const herdingGroup = screen.getByText("Herding Group • Purebred");
    expect(herdingGroup).toBeInTheDocument();
  });

  it("displays personality traits", () => {
    render(<PopularBreedsSection popularBreeds={mockPopularBreeds} />);
    
    // Check personality traits are shown
    expect(screen.getByText("Gentle")).toBeInTheDocument();
    expect(screen.getByText("Calm")).toBeInTheDocument();
    expect(screen.getByText("Loyal")).toBeInTheDocument();
  });

  it("links to individual breed pages", () => {
    render(<PopularBreedsSection popularBreeds={mockPopularBreeds} />);
    
    const galgoLink = screen.getByRole("link", { name: /Galgo/i });
    expect(galgoLink).toHaveAttribute("href", "/breeds/galgo");
    
    const podencoLink = screen.getByRole("link", { name: /Podenco/i });
    expect(podencoLink).toHaveAttribute("href", "/breeds/podenco");
  });

  it("displays Browse All Breeds link", () => {
    render(<PopularBreedsSection popularBreeds={mockPopularBreeds} />);
    
    const browseAllButton = screen.getByRole("button", { name: /Browse All Breeds/i });
    expect(browseAllButton).toBeInTheDocument();
  });

  it("renders empty state when no breeds provided", () => {
    render(<PopularBreedsSection popularBreeds={[]} />);
    expect(screen.queryByText("Popular Breeds Available Now")).not.toBeInTheDocument();
  });

  it("shows correct count badges", () => {
    render(<PopularBreedsSection popularBreeds={mockPopularBreeds} />);
    
    // All breeds should show their counts as badges
    mockPopularBreeds.forEach(breed => {
      expect(screen.getByText(`${breed.count} available`)).toBeInTheDocument();
    });
  });

  it("limits display to 4 breeds on desktop", () => {
    const manyBreeds = [...mockPopularBreeds, ...mockPopularBreeds]; // 8 breeds
    render(<PopularBreedsSection popularBreeds={manyBreeds} />);
    
    // Should only show first 4 breed names
    const breedNames = screen.getAllByTestId("breed-card");
    expect(breedNames).toHaveLength(4);
  });

  it("applies responsive grid layout", () => {
    const { container } = render(<PopularBreedsSection popularBreeds={mockPopularBreeds} />);
    
    const grid = container.querySelector(".grid");
    expect(grid).toHaveClass("grid-cols-1");
    expect(grid).toHaveClass("md:grid-cols-2");
    expect(grid).toHaveClass("lg:grid-cols-4");
  });
});