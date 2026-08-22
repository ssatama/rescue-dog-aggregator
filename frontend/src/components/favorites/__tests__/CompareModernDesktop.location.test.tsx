import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import CompareModernDesktop from "../CompareModernDesktop";
import type { Dog } from "../types";

// `location` is declared in ApiDogSchema but the API never sends it - it is
// not a field on the Animal response model. The component read
// `dog.location || "UK"`, so every dog was labelled UK, including the 57% of
// available dogs that come from organisations outside the UK.
const createMockDog = (overrides: Partial<Dog> = {}): Dog =>
  ({
    id: 1,
    name: "Buddy",
    breed: "Labrador Retriever",
    standardized_breed: "Labrador Retriever",
    age_min_months: 24,
    age_max_months: 36,
    age_text: "2-3 years",
    sex: "Male",
    standardized_size: "Large",
    organization_name: "Test Rescue",
    primary_image_url: "/test-image.jpg",
    adoption_url: "https://test.com/buddy",
    ...overrides,
  }) as Dog;

describe("CompareModernDesktop location", () => {
  it("falls back to the organisation's country when the dog has no location", () => {
    const dog = createMockDog({
      name: "Bulgarian Dog",
      organization: { country: "BG" },
    } as Partial<Dog>);

    render(<CompareModernDesktop dogs={[dog]} onClose={jest.fn()} />);

    expect(screen.getByText("BG")).toBeInTheDocument();
    expect(screen.queryByText("UK")).not.toBeInTheDocument();
  });

  it("does not claim a country it has no basis for", () => {
    const dog = createMockDog({ name: "Unknown Origin" });

    render(<CompareModernDesktop dogs={[dog]} onClose={jest.fn()} />);

    expect(screen.getByText("Unknown")).toBeInTheDocument();
    expect(screen.queryByText("UK")).not.toBeInTheDocument();
  });
});
