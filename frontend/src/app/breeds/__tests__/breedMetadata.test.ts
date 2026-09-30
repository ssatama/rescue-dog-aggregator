import { generateMetadata } from "../[slug]/page";
import { averageAgeSentence } from "@/utils/breedMetadata";
import { getBreedBySlug } from "@/services/serverAnimalsService";

jest.mock("@/services/serverAnimalsService", () => ({
  getBreedBySlug: jest.fn(),
}));

const borderCollie = {
  primary_breed: "Border Collie",
  breed_slug: "border-collie",
  count: 32,
  average_age_months: 83,
  description:
    "Border Collies are brilliant herding dogs considered the most intelligent breed, originally developed in the Scottish Borders for sheep herding. These intense, focused workers need jobs to stay happy.",
  topDogs: [],
};
const params = { params: Promise.resolve({ slug: "border-collie" }) };

describe("breed page meta description (#664)", () => {
  it("leads with the count and the age the page shows, and cuts the blurb at a word", async () => {
    (getBreedBySlug as unknown as jest.Mock).mockResolvedValue(borderCollie);

    const { description } = await generateMetadata(params);

    expect(description).toMatch(/^32 Border Collie rescue dogs available\. Average age 6\.9 yrs\. Border Collies are/);
    expect(description).not.toContain("multiple locations");
    expect(description!.length).toBeLessThanOrEqual(160);
    expect(description).toMatch(/[a-z]…$/);
  });

  it("keeps a long breed's title to 65 characters, cut at a word", async () => {
    (getBreedBySlug as unknown as jest.Mock).mockResolvedValue({ ...borderCollie, primary_breed: "Staffordshire Bull Terrier" });

    const { title } = await generateMetadata(params);

    // Whole phrases dropped, never "| 32…"
    expect(title).toBe("Staffordshire Bull Terrier Rescue Dogs for Adoption");
  });

  it("drops only as much of the title as it has to", async () => {
    (getBreedBySlug as unknown as jest.Mock).mockResolvedValue({ ...borderCollie, primary_breed: "Labrador Retriever" });

    const { title } = await generateMetadata(params);

    expect(title).toBe("Labrador Retriever Rescue Dogs for Adoption | 32 Available");
  });

  it("keeps the full title when it fits", async () => {
    (getBreedBySlug as unknown as jest.Mock).mockResolvedValue({ ...borderCollie, primary_breed: "Pug", count: 5 });

    const { title } = await generateMetadata(params);

    expect(title).toBe("Pug Rescue Dogs for Adoption | 5 Available");
  });

  it("leaves the age out when it isn't known", async () => {
    (getBreedBySlug as unknown as jest.Mock).mockResolvedValue({ ...borderCollie, average_age_months: undefined });

    const { description } = await generateMetadata(params);

    expect(description).toMatch(/^32 Border Collie rescue dogs available\. Border Collies are/);
  });
});

describe("averageAgeSentence", () => {
  it.each([
    [undefined, ""],
    [1, "Average age 1 mo. "],
    [12, "Average age 1 yr. "],
    [13, "Average age 1 yr. "],
    [83, "Average age 6.9 yrs. "],
  ])("%p months → %p", (months, sentence) => {
    expect(averageAgeSentence(months)).toBe(sentence);
  });
});
