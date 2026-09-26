import React from "react";
import { render, screen } from "@testing-library/react";
import ServerDogListing from "../ServerDogListing";
import type { Dog } from "@/types/dog";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src, priority }: { alt: string; src: string; priority?: boolean }) => (
    <img alt={alt} src={src} data-priority={String(Boolean(priority))} />
  ),
}));

const dogs = [
  { id: 1, name: "Mabel", slug: "mabel-dachshund-1", standardized_breed: "Dachshund", primary_image_url: "https://images.rescuedogs.me/a.jpg" },
  { id: 2, name: "Greta", slug: "greta-podenco-2", breed: "Podenco" },
  { id: 3, name: "Nameless" },
  { id: 4, name: "Rocco", slug: "rocco-unknown-4", breed: "Unknown", standardized_breed: "Unknown" },
] as Dog[];

describe("ServerDogListing", () => {
  it("renders one H1, the intro and a link to every dog (#437)", () => {
    const { container } = render(<ServerDogListing title="Rescue Puppies" intro="Small paws." dogs={dogs} />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rescue Puppies");
    expect(screen.getByText("Small paws.")).toBeInTheDocument();
    const hrefs = Array.from(container.querySelectorAll("a")).map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/dogs/mabel-dachshund-1", "/dogs/greta-podenco-2", "/dogs/unknown-dog-3", "/dogs/rocco-unknown-4"]);
  });

  it("preloads nothing: hydration replaces it before its photos would show (#506)", () => {
    render(<ServerDogListing title="Dogs" dogs={dogs} />);

    expect(screen.getByAltText("Mabel")).toHaveAttribute("data-priority", "false");
  });

  it("labels images with the dog's name and shows the breed", () => {
    render(<ServerDogListing title="Dogs" dogs={dogs} />);

    expect(screen.getByAltText("Mabel")).toBeInTheDocument();
    expect(screen.getByText("Dachshund")).toBeInTheDocument();
    expect(screen.getByText("Podenco")).toBeInTheDocument();
  });

  it("leaves an unknown breed out rather than printing Unknown", () => {
    render(<ServerDogListing title="Dogs" dogs={dogs} />);

    expect(screen.getByText("Rocco")).toBeInTheDocument();
    expect(screen.queryByText("Unknown")).not.toBeInTheDocument();
  });
});
