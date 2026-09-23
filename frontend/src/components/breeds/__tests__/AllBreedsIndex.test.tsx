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

  it("renders nothing without breeds", () => {
    const { container } = render(<AllBreedsIndex breeds={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
