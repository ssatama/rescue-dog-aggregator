import React from "react";
import { render } from "@testing-library/react";
import DogCard from "@/components/dogs/DogCard";
import { forCard } from "../dogPayload";
import { resetVisitorLocationForTests, setVisitorCountry } from "@/lib/visitorLocation";
import type { Dog } from "@/types/dog";

jest.mock("@/hooks/useFavorites", () => ({
  useFavorites: () => ({ isFavorited: () => false, toggleFavorite: jest.fn() }),
}));
jest.mock("@/lib/analytics", () => ({ trackDogCardClicked: jest.fn(), trackLocationSet: jest.fn() }));
jest.mock("@/lib/monitoring/breadcrumbs", () => ({ trackDogCardClick: jest.fn(), trackFavoriteToggle: jest.fn() }));

// Every field a similar-dog card could read, as the API returns it
const apiDog = {
  id: 42,
  external_id: "hund-lioba",
  slug: "lioba-mixed-breed-42",
  name: "Lioba",
  breed: "Mischling",
  primary_breed: "Mixed Breed",
  standardized_breed: "Mixed Breed",
  breed_slug: "mixed-breed",
  age_text: "05/2025",
  age_min_months: 17,
  age_max_months: 18,
  sex: "Female",
  size: "Large",
  standardized_size: "Large",
  status: "available",
  adoption_url: "https://rescue.example/lioba",
  primary_image_url: "https://images.rescuedogs.me/lioba.jpg",
  main_image: "https://images.rescuedogs.me/lioba.jpg",
  images: [{ image_url: "https://images.rescuedogs.me/lioba-2.jpg" }],
  description: "A long story.",
  llm_description: "A long story, translated.",
  created_at: "2026-11-01T00:00:00Z",
  properties: { description: "Raw text", good_with_cats: "no", good_with_dogs: true, weight: "25kg" },
  organization: {
    id: 3,
    name: "Daisy Family Rescue",
    slug: "daisy-family-rescue",
    country: "MK",
    city: "Skopje",
    ships_to: ["DE", "AT"],
    website_url: "https://rescue.example",
    social_media: { facebook: "x" },
  },
  dog_profiler_data: {
    tagline: "Sporty and smart",
    description: "Profile text",
    personality_traits: ["smart", "sporty"],
    energy_level: "high",
    good_with_children: "yes",
    good_with_dogs: "maybe",
    good_with_cats: "no",
    confidence_scores: { good_with_children: 0.9, good_with_dogs: 0.4, good_with_cats: 0.8, energy_level: 0.9 },
    model_used: "google/gemini-3.8-flash",
  },
} as unknown as Dog;

const renderCard = (dog: Dog) =>
  render(<DogCard dog={dog} position={0} listContext="similar" />).container.innerHTML;

describe("forCard", () => {
  afterEach(() => resetVisitorLocationForTests());

  it("renders the same similar-dog card as the full dog", () => {
    setVisitorCountry("DE");
    expect(renderCard(forCard(apiDog))).toBe(renderCard(apiDog));
  });

  it("keeps only what the card reads", () => {
    const card = forCard(apiDog) as unknown as Record<string, unknown>;
    expect(Object.keys(card).sort()).toEqual(
      [
        "age_min_months", "age_text", "breed", "dog_profiler_data", "id", "name", "organization",
        "primary_breed", "primary_image_url", "properties", "sex", "slug", "standardized_breed",
      ].sort(),
    );
    expect(card.organization).toEqual({
      name: "Daisy Family Rescue", slug: "daisy-family-rescue", country: "MK", ships_to: ["DE", "AT"],
    });
    expect(card.properties).toEqual({ good_with_cats: "no", good_with_dogs: true });
    expect(card.dog_profiler_data).toEqual({
      good_with_children: "yes",
      good_with_dogs: "maybe",
      good_with_cats: "no",
      confidence_scores: { good_with_children: 0.9, good_with_dogs: 0.4, good_with_cats: 0.8 },
    });
  });

  it("leaves out what the dog does not have", () => {
    expect(forCard({ id: 2, name: "Rex", slug: "rex-2" } as Dog)).toEqual({ id: 2, name: "Rex", slug: "rex-2" });
  });
});
