import CountryDogsPage, { generateMetadata } from "../page";
import { getAllMetadata, getAnimals, getCountryStats, getListCounts } from "@/services/serverAnimalsService";

jest.mock("@/services/serverAnimalsService", () => ({
  getAnimals: jest.fn(),
  getAllMetadata: jest.fn(),
  getCountryStats: jest.fn(),
  getListCounts: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("notFound()");
  }),
}));

const mock = (fn: unknown) => fn as jest.Mock;
const page = (code: string) => CountryDogsPage({ params: Promise.resolve({ code }) });

describe("a country page needs ten dogs where they are (#702)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mock(getAnimals).mockResolvedValue([{ id: 1, name: "Pepsi" }]);
    mock(getAllMetadata).mockResolvedValue({ standardizedBreeds: [], locationCountries: [], availableCountries: [], organizations: [] });
    mock(getListCounts).mockResolvedValue({});
    mock(getCountryStats).mockResolvedValue({
      total: 211,
      countries: [
        { code: "RO", name: "RO", count: 193 },
        { code: "PT", name: "PT", count: 9 },
      ],
    });
  });

  it("renders a country with enough dogs", async () => {
    await expect(page("ro")).resolves.toBeTruthy();
    expect(getAnimals).toHaveBeenCalledWith(expect.objectContaining({ location_country: "RO" }));
  });

  it.each([["pt"], ["rs"]])("404s for %s, with fewer than ten dogs or none", async (code) => {
    await expect(page(code)).rejects.toThrow("notFound()");
  });

  it("keeps a page when the stats didn't load, rather than 404 a country with dogs", async () => {
    mock(getCountryStats).mockResolvedValue({ total: 0, countries: [] });

    await expect(page("pt")).resolves.toBeTruthy();
  });

  it("says the dogs are in the country", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ code: "ro" }) });

    expect(metadata.description).toMatch(/^Browse 193 rescue dogs currently in Romania\. Dogs in Romanian shelters/);
  });
});
