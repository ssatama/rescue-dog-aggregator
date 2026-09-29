/**
 * A dog's page is at its current slug. An old one (#634's "-unknown-" slugs, or
 * any rename) is answered by the API through the id it ends with; the page then
 * redirects permanently, so search engines and shared links move to the new URL.
 */
import { permanentRedirect } from "next/navigation";
import { DogDetailPageAsync } from "../page";
import { getAnimalBySlug } from "../../../../services/animalsService";

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
  permanentRedirect: jest.fn(),
}));

jest.mock("../../../../services/animalsService", () => ({
  getAnimalBySlug: jest.fn(),
  getAnimals: jest.fn().mockResolvedValue([]),
}));

const dog = { id: 11687, slug: "sunny-11687", name: "Sunny", created_at: "2026-01-01T00:00:00" };

describe("dog detail page: an old slug", () => {
  beforeEach(() => jest.clearAllMocks());

  it("redirects permanently to the dog's current slug", async () => {
    getAnimalBySlug.mockResolvedValue(dog);

    await DogDetailPageAsync({ params: Promise.resolve({ slug: "sunny-unknown-11687" }) });

    expect(permanentRedirect).toHaveBeenCalledWith("/dogs/sunny-11687");
  });

  it("does not redirect the current slug", async () => {
    getAnimalBySlug.mockResolvedValue(dog);

    await DogDetailPageAsync({ params: Promise.resolve({ slug: "sunny-11687" }) });

    expect(permanentRedirect).not.toHaveBeenCalled();
  });
});
