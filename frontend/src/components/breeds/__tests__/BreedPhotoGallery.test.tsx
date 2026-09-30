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
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/dogs/felix-greyhound-11693");
  });

  it("has no phone carousel: the list's own cards are the photos there (#661)", () => {
    render(
      <BreedPhotoGallery
        dogs={[{ name: "Felix", slug: "felix-greyhound-11693", primary_image_url: "https://images.rescuedogs.me/felix.jpg" }]}
        breedName="Greyhound"
      />,
    );

    expect(screen.queryByRole("region", { name: /carousel/ })).not.toBeInTheDocument();
  });
});
