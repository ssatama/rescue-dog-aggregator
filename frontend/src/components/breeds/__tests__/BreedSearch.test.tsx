import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import BreedSearch, { matchBreeds } from "../BreedSearch";

const breeds = [
  { name: "Labrador Retriever", href: "/breeds/labrador-retriever", count: 40 },
  { name: "Golden Retriever", href: "/breeds/golden-retriever", count: 12 },
  { name: "Staffordshire Bull Terrier", href: "/breeds/staffordshire-bull-terrier", count: 60 },
  { name: "Bull Terrier", href: "/breeds/bull-terrier", count: 5 },
  { name: "Podenco", href: "/breeds/podenco", count: 30 },
  { name: "Mixed breeds", href: "/breeds/mixed", count: 500 },
  { name: "Dalmatian", href: "/dogs?breed=Dalmatian", count: 1 },
];

describe("matchBreeds (#500)", () => {
  it("puts names that start with the query first, then word starts, then by count", () => {
    expect(matchBreeds(breeds, "bull").map((breed) => breed.href)).toEqual(["/breeds/bull-terrier", "/breeds/staffordshire-bull-terrier"]);
    expect(matchBreeds(breeds, "retr").map((breed) => breed.href)).toEqual(["/breeds/labrador-retriever", "/breeds/golden-retriever"]);
  });

  it("ignores case, accents and punctuation", () => {
    expect(matchBreeds(breeds, "  PODÉNCO ")[0].href).toBe("/breeds/podenco");
    expect(matchBreeds(breeds, "bull-terrier")[0].href).toBe("/breeds/bull-terrier");
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

  it("finds a breed too small for a page, in the catalog, with its count (#668)", () => {
    render(<BreedSearch breeds={breeds} />);
    fireEvent.change(screen.getByLabelText("Find a breed"), { target: { value: "dalmatian" } });

    const dalmatian = screen.getByRole("link", { name: /Dalmatian/ });
    expect(dalmatian).toHaveAttribute("href", "/dogs?breed=Dalmatian");
    expect(dalmatian).toHaveTextContent("1 dog");
    expect(dalmatian).not.toHaveTextContent("1 dogs");
  });

  it("offers the catalog search, which knows nicknames, when no breed matches", () => {
    render(<BreedSearch breeds={breeds} />);
    fireEvent.change(screen.getByLabelText("Find a breed"), { target: { value: "staffy" } });

    expect(screen.getByText(/No breed called/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Search all dogs for it" })).toHaveAttribute("href", "/dogs?search=staffy");
  });

  it("leaves the focus ring to the wrapper, not the global input ring too (#671)", () => {
    render(<BreedSearch breeds={breeds} />);
    const input = screen.getByLabelText("Find a breed");

    expect(input).toHaveClass("focus:ring-0");
    expect(input.parentElement).toHaveClass("focus-within:ring-2");
  });
});
