import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import BreedPhotoGallery from "../BreedPhotoGallery";

describe("BreedPhotoGallery", () => {
  it("leaves the gallery out when there are no photos (#660)", () => {
    const { container } = render(<BreedPhotoGallery dogs={[]} breedName="Greyhound" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("links each photo to its dog", () => {
    render(
      <BreedPhotoGallery
        dogs={[{ name: "Felix", slug: "felix-greyhound-11693", primary_image_url: "https://images.rescuedogs.me/felix.jpg" }]}
        breedName="Greyhound"
      />,
    );

    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/dogs/felix-greyhound-11693"));
  });
});
