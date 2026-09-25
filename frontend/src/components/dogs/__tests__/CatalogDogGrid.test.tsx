import React from "react";
import { render, screen } from "../../../test-utils";
import CatalogDogGrid from "../CatalogDogGrid";
import type { Dog } from "@/types/dog";

jest.mock("../DogCard", () => ({
  __esModule: true,
  default: function MockDogCard({ dog, onOpen }: { dog: Dog; onOpen?: unknown }) {
    return (
      <a href={`/dogs/${dog.slug}`} data-testid={`dog-card-${dog.id}`} data-opens-overlay={Boolean(onOpen)}>
        {dog.name}
      </a>
    );
  },
}));

const dogs = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, name: `Dog ${i + 1}`, slug: `dog-${i + 1}` })) as Dog[];

describe("CatalogDogGrid", () => {
  it("lays every dog out on the one responsive grid, whatever the width", () => {
    render(<CatalogDogGrid dogs={dogs} />);
    dogs.forEach((dog) => expect(screen.getByTestId(`dog-card-${dog.id}`)).toBeInTheDocument());
    const row = screen.getByTestId("dog-card-1").parentElement;
    expect(row).toHaveClass("grid-cols-2", "sm:grid-cols-3", "xl:grid-cols-4");
  });

  it("opens a dog on its own page, never in an overlay", () => {
    render(<CatalogDogGrid dogs={dogs} />);
    const card = screen.getByTestId("dog-card-3");
    expect(card).toHaveAttribute("href", "/dogs/dog-3");
    expect(card).toHaveAttribute("data-opens-overlay", "false");
  });
});
