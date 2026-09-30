import React from "react";
import { render } from "@testing-library/react";
import AllBreedsIndex from "../AllBreedsIndex";

const breeds = [
  { primary_breed: "Greyhound", breed_slug: "greyhound", breed_type: "purebred", count: 12 },
  { primary_breed: "Beagle", breed_slug: "beagle", breed_type: "purebred", count: 5 },
  { primary_breed: "Mixed Breed", breed_slug: "mixed-breed", breed_type: "mixed", count: 400 },
  { primary_breed: "Unknown", breed_slug: "unknown", breed_type: "unknown", count: 3 },
  { primary_breed: "Beagle", breed_slug: "beagle", breed_type: "purebred", count: 5 },
];

describe("AllBreedsIndex", () => {
  it("links every indexable breed once, A–Z, and skips mixed and unknown (#438)", () => {
    const { container } = render(<AllBreedsIndex breeds={breeds} />);

    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/breeds/beagle", "/breeds/greyhound"]);
  });

  it("lists types like Hound apart from the breeds, as types (#669)", () => {
    const { container, getByRole } = render(
      <AllBreedsIndex
        breeds={[
          ...breeds,
          { primary_breed: "Hound", breed_slug: "hound", breed_type: "crossbreed", count: 16 },
          { primary_breed: "Livestock Guardian Dog", breed_slug: "livestock-guardian-dog", breed_type: "crossbreed", count: 20 },
        ]}
      />,
    );

    const hrefsIn = (id: string) =>
      Array.from(container.querySelectorAll(`#${id} a`)).map((a) => a.getAttribute("href"));
    expect(hrefsIn("all-breeds")).toEqual(["/breeds/beagle", "/breeds/greyhound"]);
    expect(hrefsIn("breed-types")).toEqual(["/breeds/hound", "/breeds/livestock-guardian-dog"]);
    expect(getByRole("heading", { name: "Breed types" })).toBeInTheDocument();
  });

  it("links each breed too small for a page to the catalog, with its count (#668)", () => {
    const { container } = render(
      <AllBreedsIndex breeds={breeds} otherBreeds={[{ primary_breed: "Dalmatian", count: 1 }, { primary_breed: "Shar Pei", count: 2 }]} />,
    );

    const others = Array.from(container.querySelectorAll("#other-breeds a"));
    expect(others.map((a) => a.getAttribute("href"))).toEqual(["/dogs?breed=Dalmatian", "/dogs?breed=Shar%20Pei"]);
    expect(others[1]).toHaveTextContent("Shar Pei (2)");
  });

  it("renders nothing without breeds", () => {
    const { container } = render(<AllBreedsIndex breeds={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
