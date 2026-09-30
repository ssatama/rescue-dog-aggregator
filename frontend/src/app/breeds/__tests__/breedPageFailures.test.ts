import BreedDetailPage, { generateMetadata, generateStaticParams } from "../[slug]/page";
import { getAllMetadata, getAnimals, getBreedBySlug, getBreedStats, getListCounts } from "@/services/serverAnimalsService";

jest.mock("@/services/serverAnimalsService", () => ({
  getBreedBySlug: jest.fn(),
  getBreedStats: Object.assign(jest.fn(), { orThrow: jest.fn() }),
  getAnimals: Object.assign(jest.fn(), { orThrow: jest.fn() }),
  getListCounts: Object.assign(jest.fn(), { orThrow: jest.fn() }),
  getAllMetadata: jest.fn(),
}));

const mock = (fn: unknown) => fn as jest.Mock;
const params = { params: Promise.resolve({ slug: "greyhound" }) };

describe("a breed page whose data fails (#659)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mock(getBreedBySlug).mockResolvedValue({ primary_breed: "Greyhound", breed_slug: "greyhound", count: 18, topDogs: [] });
    // The fallback variants would hand back empty data and let the render succeed
    mock(getAnimals).mockResolvedValue([]);
    mock(getListCounts).mockResolvedValue(null);
    mock(getAnimals.orThrow).mockResolvedValue([]);
    mock(getListCounts.orThrow).mockResolvedValue({});
    mock(getAllMetadata).mockResolvedValue({ standardizedBreeds: [], locationCountries: [], availableCountries: [], organizations: [] });
  });

  it("fails its metadata too, rather than cache a generic title", async () => {
    mock(getBreedBySlug).mockRejectedValue(new Error("API unreachable"));

    await expect(generateMetadata(params)).rejects.toThrow("API unreachable");
  });

  it.each([
    ["its dogs", () => mock(getAnimals.orThrow).mockRejectedValue(new Error("API unreachable"))],
    ["its counts", () => mock(getListCounts.orThrow).mockRejectedValue(new Error("API unreachable"))],
  ])("fails the render when %s can't be fetched", async (_, fail) => {
    fail();

    await expect(BreedDetailPage(params)).rejects.toThrow("API unreachable");
  });

  it("fails the build rather than prerender no breed pages", async () => {
    mock(getBreedStats).mockResolvedValue({ qualifying_breeds: [] });
    mock(getBreedStats.orThrow).mockRejectedValue(new Error("API unreachable"));

    await expect(generateStaticParams()).rejects.toThrow("API unreachable");
  });

  it("takes the filter options strictly", async () => {
    await BreedDetailPage(params);

    expect(getAllMetadata).toHaveBeenCalledWith({ strict: true });
    expect(getAnimals).not.toHaveBeenCalled();
    expect(getListCounts).not.toHaveBeenCalled();
  });
});
