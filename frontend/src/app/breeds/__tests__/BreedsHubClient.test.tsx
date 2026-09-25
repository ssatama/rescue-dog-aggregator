import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import BreedsHubClient from "../BreedsHubClient";

jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));

const labrador = {
  primary_breed: "Labrador Retriever",
  breed_slug: "labrador-retriever",
  breed_group: "Sporting",
  count: 40,
  sample_dogs: [],
};
const mixed = { primary_breed: "Mixed Breed", breed_slug: "mixed", breed_group: "Mixed", count: 30, sample_dogs: [] };

function renderHub(overrides: Partial<React.ComponentProps<typeof BreedsHubClient>> = {}) {
  return render(
    <BreedsHubClient
      initialBreedStats={{ total_dogs: 113, qualifying_breeds: [] } as never}
      mixedBreedData={mixed}
      popularBreedsWithImages={[labrador]}
      breedGroups={[]}
      searchableBreeds={[{ name: "Labrador Retriever", slug: "labrador-retriever", count: 40 }]}
      {...overrides}
    />,
  );
}

describe("BreedsHubClient (#500)", () => {
  it("opens with the breed search, before any breed tiles", () => {
    renderHub();

    const search = screen.getByLabelText("Find a breed");
    const firstTile = screen.getAllByTestId("breed-card")[0];
    expect(search.compareDocumentPosition(firstTile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Rescue dogs by breed" })).toBeInTheDocument();
  });

  it("shows mixed breeds as a tile, with no hero or decorative hearts", () => {
    const { container } = renderHub();

    expect(screen.getByRole("link", { name: /Mixed breeds/ })).toHaveAttribute("href", "/breeds/mixed");
    expect(screen.queryByText("Every Dog is Unique")).not.toBeInTheDocument();
    expect(container.querySelector(".lucide-heart")).toBeNull();
  });

  it("says so when the breed data could not load", () => {
    renderHub({ initialBreedStats: null as never });
    expect(screen.getByText("Unable to load breed data")).toBeInTheDocument();
  });
});
