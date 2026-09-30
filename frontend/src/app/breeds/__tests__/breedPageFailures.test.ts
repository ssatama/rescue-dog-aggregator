import BreedDetailPage, { generateMetadata, generateStaticParams } from "../[slug]/page";
import { getAllMetadata, getAnimals, getBreedBySlug, getBreedStats, getListCounts } from "@/services/serverAnimalsService";

jest.mock("@/services/serverAnimalsService", () => ({
  getBreedBySlug: jest.fn(),
  getMixedBreedPageData: jest.fn(),
  getBreedStats: Object.assign(jest.fn(), { orFallback: jest.fn() }),
  getAnimals: Object.assign(jest.fn(), { orFallback: jest.fn() }),
  getListCounts: Object.assign(jest.fn(), { orFallback: jest.fn() }),
  getAllMetadata: jest.fn(),
}));

const mock = (fn: unknown) => fn as jest.Mock;
const params = { params: Promise.resolve({ slug: "greyhound" }) };

describe("a breed page whose data fails (#659)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mock(getBreedBySlug).mockResolvedValue({ primary_breed: "Greyhound", breed_slug: "greyhound", count: 18, topDogs: [] });
    mock(getAnimals).mockResolvedValue([]);
    mock(getListCounts).mockResolvedValue({});
    // The fallback variants would hand back empty data and let the render succeed
    mock(getAnimals.orFallback).mockResolvedValue([]);
    mock(getListCounts.orFallback).mockResolvedValue(null);
    mock(getAllMetadata).mockResolvedValue({ standardizedBreeds: [], locationCountries: [], availableCountries: [], organizations: [] });
  });

  it("fails its metadata too, rather than cache a generic title", async () => {
    mock(getBreedBySlug).mockRejectedValue(new Error("API unreachable"));

    await expect(generateMetadata(params)).rejects.toThrow("API unreachable");
  });

  it.each([
    ["its dogs", () => mock(getAnimals).mockRejectedValue(new Error("API unreachable"))],
    ["its counts", () => mock(getListCounts).mockRejectedValue(new Error("API unreachable"))],
  ])("fails the render when %s can't be fetched", async (_, fail) => {
    fail();

    await expect(BreedDetailPage(params)).rejects.toThrow("API unreachable");
  });

  it("prerenders nothing, so no breed fetch can fail a deploy", async () => {
    await expect(generateStaticParams()).resolves.toEqual([]);
    expect(getBreedStats).not.toHaveBeenCalled();
  });

  it("never takes the fallback variants", async () => {
    await BreedDetailPage(params);

    expect(getAllMetadata).toHaveBeenCalledWith();
    expect(getAnimals.orFallback).not.toHaveBeenCalled();
    expect(getListCounts.orFallback).not.toHaveBeenCalled();
  });
});
