import MixedBreedsPage from "../mixed/page";
import { getAllMetadata, getAnimals, getMixedBreedPageData, getListCounts } from "@/services/serverAnimalsService";

jest.mock("@/services/serverAnimalsService", () => ({
  getMixedBreedPageData: jest.fn(),
  getAnimals: Object.assign(jest.fn(), { orThrow: jest.fn() }),
  getListCounts: Object.assign(jest.fn(), { orThrow: jest.fn() }),
  getAllMetadata: jest.fn(),
}));

const mock = (fn: unknown) => fn as jest.Mock;

describe("/breeds/mixed whose data fails (#659)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mock(getMixedBreedPageData).mockResolvedValue({ primary_breed: "Mixed Breed", breed_slug: "mixed", count: 534, topDogs: [] });
    mock(getAnimals).mockResolvedValue([]);
    mock(getListCounts).mockResolvedValue(null);
    mock(getAnimals.orThrow).mockResolvedValue([]);
    mock(getListCounts.orThrow).mockResolvedValue({});
    mock(getAllMetadata).mockResolvedValue({ standardizedBreeds: [], locationCountries: [], availableCountries: [], organizations: [] });
  });

  it.each([
    ["its dogs", () => mock(getAnimals.orThrow).mockRejectedValue(new Error("API unreachable"))],
    ["its counts", () => mock(getListCounts.orThrow).mockRejectedValue(new Error("API unreachable"))],
  ])("fails the render when %s can't be fetched", async (_, fail) => {
    fail();

    await expect(MixedBreedsPage()).rejects.toThrow("API unreachable");
  });

  it("takes dogs, counts and filter options strictly", async () => {
    await MixedBreedsPage();

    expect(getAllMetadata).toHaveBeenCalledWith({ strict: true });
    expect(getAnimals).not.toHaveBeenCalled();
    expect(getListCounts).not.toHaveBeenCalled();
  });
});
