import BreedsPage from "../page";
import { getBreedStats } from "@/services/serverAnimalsService";
import { getBreedGroupsWithTopBreeds, getMixedBreedData, getPopularBreedsWithImages } from "@/services/breedImagesService";

jest.mock("@/services/serverAnimalsService", () => ({ getBreedStats: jest.fn() }));
jest.mock("@/services/breedImagesService", () => ({
  getMixedBreedData: jest.fn(),
  getPopularBreedsWithImages: jest.fn(),
  getBreedGroupsWithTopBreeds: jest.fn(),
}));

const mock = (fn: unknown) => fn as jest.Mock;

// The hub is cached for a week: a render built without its breeds would stay
// that long, while one that throws keeps the last good hub (#675)
describe("/breeds whose data fails", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mock(getBreedStats).mockResolvedValue({ total_dogs: 10, breed_groups: [], qualifying_breeds: [] });
    mock(getMixedBreedData).mockResolvedValue(null);
    mock(getPopularBreedsWithImages).mockResolvedValue([]);
    mock(getBreedGroupsWithTopBreeds).mockResolvedValue([]);
  });

  it.each([
    ["the breed stats", getBreedStats],
    ["the popular breeds", getPopularBreedsWithImages],
    ["the mixed breeds", getMixedBreedData],
    ["the breed groups", getBreedGroupsWithTopBreeds],
  ])("fails the render when %s can't be fetched", async (_, fetcher) => {
    mock(fetcher).mockRejectedValue(new Error("API unreachable"));

    await expect(BreedsPage()).rejects.toThrow("API unreachable");
  });
});
