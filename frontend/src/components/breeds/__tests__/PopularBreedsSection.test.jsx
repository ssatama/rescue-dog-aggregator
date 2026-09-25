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
        personality_traits: ["Gentle", "Calm"],
      },
      {
        name: "Luna",
        slug: "luna-222",
        primary_image_url: "https://example.com/luna.jpg",
        age_text: "2 years",
        sex: "Female",
        personality_traits: ["Playful", "Loyal"],
      },
    ],
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
        personality_traits: ["Active", "Alert"],
      },
    ],
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
        personality_traits: ["Intelligent", "Loyal"],
      },
    ],
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
        personality_traits: ["Friendly", "Playful"],
      },
    ],
  },
];

const mixed = {
  primary_breed: "Mixed Breed",
  breed_slug: "mixed",
  breed_type: "mixed",
  breed_group: "Mixed",
  count: 70,
  sample_dogs: [{ name: "Pip", primary_image_url: "https://example.com/pip.jpg" }],
};

describe("PopularBreedsSection (#500)", () => {
  it("links each breed tile to its page with its count and group", () => {
    render(<PopularBreedsSection popularBreeds={mockPopularBreeds} />);

    expect(screen.getByRole("heading", { name: "Most dogs listed" })).toBeInTheDocument();
    const galgo = screen.getByRole("link", { name: /Galgo/ });
    expect(galgo).toHaveAttribute("href", "/breeds/galgo");
    expect(galgo).toHaveTextContent("120 dogs · Hound");
    expect(screen.getAllByTestId("breed-card")).toHaveLength(4);
  });

  it("shows mixed breeds as one tile among the breeds, placed by count", () => {
    render(<PopularBreedsSection popularBreeds={[...mockPopularBreeds, mixed]} mixedBreed={mixed} />);

    const names = screen.getAllByTestId("breed-card").map((tile) => tile.querySelector("h3")?.textContent);
    expect(names).toEqual(["Galgo", "Mixed breeds", "Podenco", "Collie", "Cocker Spaniel"]);
    expect(screen.getByRole("link", { name: /Mixed breeds/ })).toHaveAttribute("href", "/breeds/mixed");
  });

  it("drops the generic trait chips every breed shared", () => {
    render(<PopularBreedsSection popularBreeds={mockPopularBreeds} />);

    expect(screen.queryByText("Gentle")).not.toBeInTheDocument();
    expect(screen.queryByText("Playful")).not.toBeInTheDocument();
  });

  it("links to the A–Z list", () => {
    render(<PopularBreedsSection popularBreeds={mockPopularBreeds} />);

    expect(screen.getByRole("link", { name: /All breeds A–Z/ })).toHaveAttribute("href", "#all-breeds");
  });

  it("renders nothing without breeds", () => {
    const { container } = render(<PopularBreedsSection popularBreeds={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
