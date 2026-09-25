import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import BreedSearch, { matchBreeds } from "../BreedSearch";

const breeds = [
  { name: "Labrador Retriever", slug: "labrador-retriever", count: 40 },
  { name: "Golden Retriever", slug: "golden-retriever", count: 12 },
  { name: "Staffordshire Bull Terrier", slug: "staffordshire-bull-terrier", count: 60 },
  { name: "Bull Terrier", slug: "bull-terrier", count: 5 },
  { name: "Podenco", slug: "podenco", count: 30 },
  { name: "Mixed breeds", slug: "mixed", count: 500 },
];

describe("matchBreeds (#500)", () => {
  it("puts names that start with the query first, then word starts, then by count", () => {
    expect(matchBreeds(breeds, "bull").map((breed) => breed.slug)).toEqual(["bull-terrier", "staffordshire-bull-terrier"]);
    expect(matchBreeds(breeds, "retr").map((breed) => breed.slug)).toEqual(["labrador-retriever", "golden-retriever"]);
  });

  it("ignores case, accents and punctuation", () => {
    expect(matchBreeds(breeds, "  PODÉNCO ")[0].slug).toBe("podenco");
    expect(matchBreeds(breeds, "bull-terrier")[0].slug).toBe("bull-terrier");
  });

  it("matches nothing for an empty query", () => {
    expect(matchBreeds(breeds, "   ")).toEqual([]);
  });
});

describe("BreedSearch (#500)", () => {
  it("lists matching breed pages as links while typing", () => {
    render(<BreedSearch breeds={breeds} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Find a breed"), { target: { value: "lab" } });
    expect(screen.getByRole("link", { name: /Labrador Retriever/ })).toHaveAttribute("href", "/breeds/labrador-retriever");
  });

  it("offers the catalog search, which knows nicknames, when no breed page matches", () => {
    render(<BreedSearch breeds={breeds} />);
    fireEvent.change(screen.getByLabelText("Find a breed"), { target: { value: "staffy" } });

    expect(screen.getByText(/No breed page for/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Search all dogs for it" })).toHaveAttribute("href", "/dogs?search=staffy");
  });
});
