import { generateMetadata } from "../[slug]/page";
import { getMixedBreedPageData } from "@/services/serverAnimalsService";

jest.mock("@/services/serverAnimalsService", () => ({
  getMixedBreedPageData: jest.fn(),
  getBreedBySlug: jest.fn(),
}));

const params = { params: Promise.resolve({ slug: "mixed" }) };

const mixed = { primary_breed: "Mixed Breed", breed_slug: "mixed", count: 534, average_age_months: 54, topDogs: [] };

describe("/breeds/mixed metadata (#664)", () => {
  it("gives the count and age in the title and every description", async () => {
    (getMixedBreedPageData as unknown as jest.Mock).mockResolvedValue(mixed);

    const metadata = await generateMetadata(params);

    expect(metadata.title).toBe("Mixed Breed Rescue Dogs for Adoption | 534 Available");
    expect(metadata.description).toMatch(/^Discover 534 unique mixed breed rescue dogs waiting for homes\. Average age 4\.5 yrs\./);
    expect(metadata.twitter?.description).toBe(metadata.description);
  });

  it("keeps the count in the title past a thousand dogs", async () => {
    (getMixedBreedPageData as unknown as jest.Mock).mockResolvedValue({ ...mixed, count: 1234 });

    const { title } = await generateMetadata(params);

    expect(title).toBe("Mixed Breed Rescue Dogs for Adoption | 1234 Available");
  });
});
