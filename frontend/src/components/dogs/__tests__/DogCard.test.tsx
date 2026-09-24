import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import DogCard, { getDogSummary, getLivesWithFacts } from "../DogCard";
import { trackDogCardClicked } from "@/lib/analytics";
import type { Dog } from "@/types/dog";

const mockToggleFavorite = jest.fn();
let mockFavorited = false;

jest.mock("@/hooks/useFavorites", () => ({
  useFavorites: () => ({
    isFavorited: () => mockFavorited,
    toggleFavorite: mockToggleFavorite,
  }),
}));

jest.mock("@/lib/analytics", () => ({ trackDogCardClicked: jest.fn() }));
jest.mock("@/lib/monitoring/breadcrumbs", () => ({
  trackDogCardClick: jest.fn(),
  trackFavoriteToggle: jest.fn(),
}));

const fullDog: Dog = {
  id: 7,
  slug: "bella-labrador-7",
  name: "Bella",
  standardized_breed: "Labrador Retriever",
  age_min_months: 18,
  sex: "Female",
  primary_image_url: "https://images.rescuedogs.me/bella.jpg",
  status: "available",
  organization: { name: "Happy Tails", country: "GB", slug: "happy-tails" },
  dog_profiler_data: {
    good_with_dogs: "yes",
    good_with_cats: "no",
    good_with_children: "yes",
  },
};

const nameAndPhotoOnly: Dog = {
  id: 8,
  name: "Max",
  primary_image_url: "https://images.rescuedogs.me/max.jpg",
  status: "available",
};

function loadPhoto(naturalWidth: number, naturalHeight: number, clientWidth = 300) {
  const img = screen.getByAltText(/^(Bella|Max)$/);
  Object.defineProperty(img, "naturalWidth", { value: naturalWidth });
  Object.defineProperty(img, "naturalHeight", { value: naturalHeight });
  Object.defineProperty(img, "clientWidth", { value: clientWidth });
  fireEvent.load(img);
  return img;
}

describe("DogCard", () => {
  beforeEach(() => {
    mockFavorited = false;
    jest.clearAllMocks();
  });

  it("shows name, breed · age · sex and where the dog is", () => {
    render(<DogCard dog={fullDog} />);

    expect(screen.getByRole("link", { name: "Bella" })).toHaveAttribute(
      "href",
      "/dogs/bella-labrador-7",
    );
    expect(screen.getByText("Labrador Retriever · Young · Female")).toBeInTheDocument();
    expect(screen.getByText("Happy Tails · United Kingdom")).toBeInTheDocument();
  });

  it("renders cleanly for a dog with only a name and a photo", () => {
    const { container } = render(<DogCard dog={nameAndPhotoOnly} />);

    expect(screen.getByRole("link", { name: "Max" })).toBeInTheDocument();
    expect(screen.getByAltText("Max")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Lives with" })).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/unknown|not yet assessed|undefined|null/i);
  });

  it("shows a quiet placeholder when there is no photo", () => {
    render(<DogCard dog={{ ...nameAndPhotoOnly, primary_image_url: undefined }} />);

    expect(screen.getByTestId("dog-photo-missing")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Max" })).not.toBeInTheDocument();
  });

  it("shows at most two known lives-with facts, good ones first", () => {
    render(<DogCard dog={fullDog} />);

    const items = within(screen.getByRole("list", { name: "Lives with" })).getAllByRole(
      "listitem",
    );
    expect(items.map((li) => li.textContent)).toEqual([
      "✓ Children: yes",
      "✓ Dogs: yes",
    ]);
  });

  it("leaves out unknown and maybe compatibility", () => {
    expect(
      getLivesWithFacts({
        ...nameAndPhotoOnly,
        dog_profiler_data: {
          good_with_dogs: "maybe",
          good_with_cats: "unknown",
          good_with_children: "no",
        },
      }),
    ).toEqual([{ label: "Children", good: false }]);
  });

  it("reads compatibility from scraped properties when there is no profile", () => {
    expect(
      getLivesWithFacts({ ...nameAndPhotoOnly, properties: { good_with_cats: true } }),
    ).toEqual([{ label: "Cats", good: true }]);
  });

  it("builds the summary from whatever is known", () => {
    expect(getDogSummary(nameAndPhotoOnly)).toBe("");
    expect(getDogSummary({ ...nameAndPhotoOnly, sex: "m", standardized_breed: "Unknown" })).toBe(
      "Male",
    );
  });

  describe("photo fit", () => {
    it("fills the frame with a photo close to 4:3", () => {
      render(<DogCard dog={fullDog} />);
      expect(loadPhoto(1200, 900)).toHaveAttribute("data-fit", "fill");
    });

    it("fills the frame with a square photo", () => {
      render(<DogCard dog={fullDog} />);
      expect(loadPhoto(600, 600, 139)).toHaveAttribute("data-fit", "fill");
    });

    it("shows a very tall photo whole over a blurred copy", () => {
      render(<DogCard dog={fullDog} />);
      expect(loadPhoto(600, 1200)).toHaveAttribute("data-fit", "whole");
      expect(screen.getAllByRole("presentation", { hidden: true }).length).toBeGreaterThan(0);
    });

    it("shows a very wide photo whole", () => {
      render(<DogCard dog={fullDog} />);
      expect(loadPhoto(1600, 500)).toHaveAttribute("data-fit", "whole");
    });

    it("never stretches a photo smaller than the frame", () => {
      render(<DogCard dog={fullDog} />);
      expect(loadPhoto(160, 120, 300)).toHaveAttribute("data-fit", "whole");
    });
  });

  describe("favorite heart", () => {
    it("toggles the favorite without following the card link", () => {
      render(<DogCard dog={fullDog} />);

      fireEvent.click(screen.getByRole("button", { name: "Add Bella to favorites" }));

      expect(mockToggleFavorite).toHaveBeenCalledWith(7, "Bella");
    });

    it("reflects a saved dog", () => {
      mockFavorited = true;
      render(<DogCard dog={fullDog} />);

      expect(screen.getByRole("button", { name: "Remove Bella from favorites" })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    it("is left out of the compact size", () => {
      render(<DogCard dog={fullDog} size="compact" />);

      expect(screen.queryByRole("button", { name: /favorites/ })).not.toBeInTheDocument();
      expect(screen.getByTestId("dog-card-7")).toHaveAttribute("data-size", "compact");
    });
  });

  describe("opening a dog", () => {
    it("tracks the click with its position and list", () => {
      render(<DogCard dog={fullDog} position={3} listContext="breed-page" />);

      fireEvent.click(screen.getByRole("link", { name: "Bella" }));

      expect(trackDogCardClicked).toHaveBeenCalledWith("7", 3, "breed-page");
    });

    it("hands a plain click to onOpen instead of navigating", () => {
      const onOpen = jest.fn();
      render(<DogCard dog={fullDog} onOpen={onOpen} />);

      const plainClick = fireEvent.click(screen.getByRole("link", { name: "Bella" }));

      expect(onOpen).toHaveBeenCalledWith(fullDog);
      expect(plainClick).toBe(false); // default prevented
    });

    it("lets a new-tab click follow the link", () => {
      const onOpen = jest.fn();
      render(<DogCard dog={fullDog} onOpen={onOpen} />);

      fireEvent.click(screen.getByRole("link", { name: "Bella" }), { metaKey: true });

      expect(onOpen).not.toHaveBeenCalled();
    });
  });
});
