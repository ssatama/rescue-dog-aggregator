/**
 * A dog's page is its dog. Its similar dogs and the link to its breed page only
 * add to it, so their fetches opt into the fallback (#675): a failure leaves the
 * similar dogs to the browser and the breed as plain text, and never fails the
 * render the way a failed dog fetch does.
 */
import { DogDetailPageAsync } from "../page";
import { getAnimalBySlug } from "../../../../services/animalsService";
import { getAnimals, getBreedStats } from "../../../../services/serverAnimalsService";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
  permanentRedirect: jest.fn(),
}));

jest.mock("../../../../services/animalsService", () => ({
  getAnimalBySlug: jest.fn(),
}));

jest.mock("../../../../services/serverAnimalsService", () => {
  const unreachable = () => jest.fn().mockRejectedValue(new Error("API unreachable"));
  return {
    getAnimals: Object.assign(unreachable(), { orFallback: jest.fn().mockResolvedValue([]) }),
    getBreedStats: Object.assign(unreachable(), {
      orFallback: jest.fn().mockResolvedValue({ total_dogs: 0, breed_groups: [], qualifying_breeds: [] }),
    }),
  };
});

const dog = {
  id: 11687,
  slug: "sunny-11687",
  name: "Sunny",
  standardized_size: "Medium",
  breed_slug: "greyhound",
  created_at: "2026-01-01T00:00:00",
};

describe("dog detail page: its extras can't be fetched (#675)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("still renders the dog, taking the fallbacks for similar dogs and the breed link", async () => {
    getAnimalBySlug.mockResolvedValue(dog);

    const page = await DogDetailPageAsync({ params: Promise.resolve({ slug: "sunny-11687" }) });

    expect(page).toBeTruthy();
    expect(getAnimals.orFallback).toHaveBeenCalled();
    expect(getBreedStats.orFallback).toHaveBeenCalled();
    expect(getAnimals).not.toHaveBeenCalled();
    expect(getBreedStats).not.toHaveBeenCalled();
  });
});
