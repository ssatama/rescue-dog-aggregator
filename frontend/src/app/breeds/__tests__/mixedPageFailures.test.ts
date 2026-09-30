import MixedBreedsPage from "../mixed/page";
import { getAllMetadata, getAnimals, getMixedBreedPageData, getListCounts } from "@/services/serverAnimalsService";

jest.mock("@/services/serverAnimalsService", () => ({
  getMixedBreedPageData: jest.fn(),
  getAnimals: Object.assign(jest.fn(), { orThrow: jest.fn() }),
  getListCounts: Object.assign(jest.fn(), { orThrow: jest.fn() }),
  getAllMetadata: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("notFound()");
  }),
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

  describe("with no Mixed group in a good stats response", () => {
    const phase = process.env.NEXT_PHASE;
    afterEach(() => {
      process.env.NEXT_PHASE = phase;
    });

    it("throws at request time, so ISR keeps the last good page", async () => {
      delete process.env.NEXT_PHASE;
      mock(getMixedBreedPageData).mockResolvedValue(null);

      await expect(MixedBreedsPage()).rejects.toThrow("No Mixed group");
    });

    it("prerenders a 404 at build rather than fail every deploy", async () => {
      process.env.NEXT_PHASE = "phase-production-build";
      mock(getMixedBreedPageData).mockResolvedValue(null);

      await expect(MixedBreedsPage()).rejects.toThrow("notFound()");
    });
  });

  it("takes dogs, counts and filter options strictly", async () => {
    await MixedBreedsPage();

    expect(getAllMetadata).toHaveBeenCalledWith({ strict: true });
    expect(getAnimals).not.toHaveBeenCalled();
    expect(getListCounts).not.toHaveBeenCalled();
  });
});
