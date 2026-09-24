import { generateCountrySitemap } from "../sitemap";
import { getCountryStats } from "../../services/serverAnimalsService";

jest.mock("../../services/serverAnimalsService", () => ({ getCountryStats: jest.fn() }));
jest.mock("../../services/animalsService", () => ({ getAllAnimalsForSitemap: jest.fn() }));
jest.mock("../../services/organizationsService", () => ({ getAllOrganizations: jest.fn() }));

const countryUrls = (xml: string) => Array.from(xml.matchAll(/\/dogs\/country\/([a-z]+)</g), (m) => m[1]);

describe("country sitemap (#442)", () => {
  it("lists only countries that currently have dogs", async () => {
    (getCountryStats as jest.Mock).mockResolvedValue({
      total: 700,
      countries: [
        { code: "UK", count: 588 },
        { code: "RS", count: 155 },
        { code: "IT", count: 0 },
      ],
    });

    const urls = countryUrls(await generateCountrySitemap());

    expect(urls).toEqual(["uk", "rs"]);
  });

  it("keeps every configured country when the stats call failed", async () => {
    (getCountryStats as jest.Mock).mockResolvedValue({ total: 0, countries: [] });

    const urls = countryUrls(await generateCountrySitemap());

    expect(urls).toEqual(expect.arrayContaining(["uk", "de", "rs", "it"]));
  });
});
