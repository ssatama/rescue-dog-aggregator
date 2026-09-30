import BreedDetailPage from "../[slug]/page";
import { getAllMetadata, getAnimals, getMixedBreedPageData, getListCounts } from "@/services/serverAnimalsService";

jest.mock("@/services/serverAnimalsService", () => ({
  getMixedBreedPageData: jest.fn(),
  getBreedBySlug: jest.fn(),
  getAnimals: Object.assign(jest.fn(), { orFallback: jest.fn() }),
  getListCounts: Object.assign(jest.fn(), { orFallback: jest.fn() }),
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
    mock(getListCounts).mockResolvedValue({});
    // The fallback variants would hand back empty data and let the render succeed
    mock(getAnimals.orFallback).mockResolvedValue([]);
    mock(getListCounts.orFallback).mockResolvedValue(null);
    mock(getAllMetadata).mockResolvedValue({ standardizedBreeds: [], locationCountries: [], availableCountries: [], organizations: [] });
  });

  it.each([
    ["its dogs", () => mock(getAnimals).mockRejectedValue(new Error("API unreachable"))],
    ["its counts", () => mock(getListCounts).mockRejectedValue(new Error("API unreachable"))],
  ])("fails the render when %s can't be fetched", async (_, fail) => {
    fail();

    await expect(BreedDetailPage({ params: Promise.resolve({ slug: "mixed" }) })).rejects.toThrow("API unreachable");
  });

  it("404s with no Mixed group in a good stats response: no mixed dogs are listed", async () => {
    mock(getMixedBreedPageData).mockResolvedValue(null);

    await expect(BreedDetailPage({ params: Promise.resolve({ slug: "mixed" }) })).rejects.toThrow("notFound()");
  });

  it("404s on a missing Mixed group before fetching any list", async () => {
    mock(getMixedBreedPageData).mockResolvedValue(null);
    mock(getListCounts).mockRejectedValue(new Error("API unreachable"));

    await expect(BreedDetailPage({ params: Promise.resolve({ slug: "mixed" }) })).rejects.toThrow("notFound()");
    expect(getListCounts).not.toHaveBeenCalled();
  });

  it("lists the Mixed group", async () => {
    await BreedDetailPage({ params: Promise.resolve({ slug: "mixed" }) });

    expect(getAnimals).toHaveBeenCalledWith(expect.objectContaining({ breed_group: "Mixed" }));
    expect(getListCounts).toHaveBeenCalledWith({ breed_group: "Mixed" });
  });

  it("never takes the fallback variants", async () => {
    await BreedDetailPage({ params: Promise.resolve({ slug: "mixed" }) });

    expect(getAllMetadata).toHaveBeenCalledWith();
    expect(getAnimals.orFallback).not.toHaveBeenCalled();
    expect(getListCounts.orFallback).not.toHaveBeenCalled();
  });
});
