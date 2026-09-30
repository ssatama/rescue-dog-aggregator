import { generateMetadata } from "../page";
import { getBreedStats } from "@/services/serverAnimalsService";

jest.mock("@/services/serverAnimalsService", () => ({ getBreedStats: jest.fn() }));
jest.mock("@/services/breedImagesService", () => ({}));

const breed = (primary_breed: string, breed_type = "purebred") => ({
  primary_breed,
  breed_slug: primary_breed.toLowerCase().replace(/ /g, "-"),
  breed_type,
  count: 5,
});

describe("/breeds metadata (#668)", () => {
  it("counts the breeds the hub lists: those with a page and the smaller ones, not types or mixes", async () => {
    (getBreedStats as unknown as jest.Mock).mockResolvedValue({
      total_dogs: 1264,
      unique_breeds: 94,
      qualifying_breeds: [breed("Greyhound"), breed("Beagle"), breed("Hound", "crossbreed"), breed("Mixed Breed", "mixed")],
      other_breeds: [{ primary_breed: "Dalmatian", count: 1 }],
    });

    const metadata = await generateMetadata();

    expect(metadata.title).toBe("Dog Breeds | 1,264 Rescue Dogs Across 3 Breeds");
    expect(metadata.description).toContain("Browse 2 breeds with their own page");
  });
});
