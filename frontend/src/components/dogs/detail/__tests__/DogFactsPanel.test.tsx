import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import DogFactsPanel, { MobileAdoptBar } from "../DogFactsPanel";
import { trackAdoptionLinkClicked } from "@/lib/analytics";
import type { Dog } from "@/types/dog";

jest.mock("@/lib/analytics", () => ({
  trackAdoptionLinkClicked: jest.fn(),
  trackFavoriteToggle: jest.fn(),
}));
jest.mock("@/lib/monitoring/breadcrumbs", () => ({
  trackExternalLinkClick: jest.fn(),
  trackFavoriteToggle: jest.fn(),
}));
jest.mock("@/hooks/useFavorites", () => ({
  useFavorites: () => ({ isFavorited: () => false, toggleFavorite: jest.fn() }),
}));
jest.mock("@/components/ui/ShareButton", () => ({
  __esModule: true,
  default: () => <button type="button">Share</button>,
}));

const base: Dog = {
  id: 7,
  name: "Dolly",
  status: "available",
  adoption_url: "https://www.dogstrust.org.uk/rehoming/dogs/dolly",
  organization: { id: 1, name: "Dogs Trust", slug: "dogs-trust", city: "London", country: "GB" },
} as Dog;

const dog = (fields: Partial<Dog> = {}): Dog => ({ ...base, ...fields }) as Dog;

describe("DogFactsPanel", () => {
  beforeEach(() => jest.clearAllMocks());

  it("looks complete with only a name, a rescue and an adoption link", () => {
    render(<DogFactsPanel dog={dog()} />);

    expect(screen.getByRole("heading", { level: 1, name: "Dolly" })).toBeInTheDocument();
    expect(screen.getByTestId("adopt-button-panel")).toHaveTextContent("Meet Dolly at Dogs Trust");
    expect(screen.getByText("Opens Dolly's page on dogstrust.org.uk. You apply with them directly.")).toBeInTheDocument();
    // Nothing known about companions or care: those rows are left out
    expect(screen.queryByText("Lives with")).not.toBeInTheDocument();
    expect(screen.queryByText("Good to know")).not.toBeInTheDocument();
    expect(screen.queryByText(/unknown|not yet assessed/i)).not.toBeInTheDocument();
  });

  it("shows known companions and one quiet chip for the rest", () => {
    render(
      <DogFactsPanel
        dog={dog({ dog_profiler_data: { good_with_dogs: "yes", good_with_children: "no", good_with_cats: "unknown" } })}
      />,
    );

    const livesWith = screen.getByRole("list", { name: "Lives with" });
    const chips = within(livesWith).getAllByRole("listitem").map((li) => li.textContent);
    expect(chips).toEqual(["✓ Dogs: yes", "✗ Children: no", "Cats not assessed"]);
  });

  it("shows a rescue's qualified answer instead of calling it not assessed", () => {
    render(
      <DogFactsPanel
        dog={dog({ properties: { good_with_dogs: "selective", good_with_children: "true" } })}
      />,
    );

    const livesWith = screen.getByRole("list", { name: "Lives with" });
    const chips = within(livesWith).getAllByRole("listitem").map((li) => li.textContent);
    expect(chips).toEqual(["✓ Children: yes", "Dogs: selective", "Cats not assessed"]);
  });

  it("joins several unknown companions into that one quiet chip", () => {
    render(<DogFactsPanel dog={dog({ dog_profiler_data: { good_with_dogs: "no" } })} />);

    expect(screen.getByText("Children, cats not assessed")).toBeInTheDocument();
  });

  it("lists good-to-know facts and a real medical note", () => {
    render(
      <DogFactsPanel
        dog={dog({
          dog_profiler_data: { energy_level: "high", experience_level: "first_time_ok" },
          properties: {
            spayed_neutered: "true",
            medical_status: "vaccinated and chipped",
            medical_issues: "I have Grade 3 bilateral luxating patellas.",
          },
        })}
      />,
    );

    const goodToKnow = screen.getByRole("list", { name: "Good to know" });
    expect(within(goodToKnow).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "High energy",
      "Good for first-time owners",
      "Neutered",
      "Vaccinated",
    ]);
    expect(screen.getByText("I have Grade 3 bilateral luxating patellas.")).toBeInTheDocument();
  });

  it("says where the dog is, falling back to the rescue's town", () => {
    const { rerender } = render(
      <DogFactsPanel dog={dog({ properties: { location: "Evesham (Worcestershire) (Evesham)" } })} />,
    );
    expect(screen.getByText(/Evesham \(Worcestershire\)/)).toBeInTheDocument();

    rerender(<DogFactsPanel dog={dog({ properties: {} })} />);
    expect(screen.getByText(/London, United Kingdom/)).toBeInTheDocument();
  });

  it("reports which adopt button was used", () => {
    render(
      <>
        <DogFactsPanel dog={dog()} />
        <MobileAdoptBar dog={dog()} />
      </>,
    );

    fireEvent.click(screen.getByTestId("adopt-button-panel"));
    fireEvent.click(screen.getByTestId("adopt-button-bar"));

    expect(trackAdoptionLinkClicked).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 7 }), "detail_page", "panel");
    expect(trackAdoptionLinkClicked).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 7 }), "detail_page", "bar");
  });

  it.each([
    ["a retired listing", { active: false }],
    ["a reserved dog", { status: "reserved" }],
    ["a dog without a usable link", { adoption_url: "javascript:alert(1)" }],
  ])("offers no adopt button for %s", (_, fields) => {
    render(
      <>
        <DogFactsPanel dog={dog(fields as Partial<Dog>)} />
        <MobileAdoptBar dog={dog(fields as Partial<Dog>)} />
      </>,
    );

    expect(screen.queryByTestId("adopt-button-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mobile-adopt-bar")).not.toBeInTheDocument();
    // With no bottom bar, the panel's Save must show at every width
    const save = screen.getByRole("button", { name: /favorites/i });
    expect(save.closest("span")).toHaveClass("contents");
    expect(save.closest("span")).not.toHaveClass("hidden");
  });
});
