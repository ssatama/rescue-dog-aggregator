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
  description: "Border Collies are brilliant herding dogs considered the most intelligent breed, originally developed in the Scottish Borders.",
  topDogs: [],
};

describe("breed page meta description (#664)", () => {
  it("gives the average age from the fields the API sends, and no made-up location", async () => {
    (getBreedBySlug as unknown as jest.Mock).mockResolvedValue(borderCollie);

    const { description } = await generateMetadata({ params: Promise.resolve({ slug: "border-collie" }) });

    expect(description).toContain("32 Border Collie rescue dogs available. Average age 7 years.");
    expect(description).not.toContain("multiple locations");
    expect(description!.length).toBeLessThanOrEqual(160);
  });

  it("leaves the age out when it isn't known", async () => {
    (getBreedBySlug as unknown as jest.Mock).mockResolvedValue({ ...borderCollie, average_age_months: undefined, description: undefined });

    const { description } = await generateMetadata({ params: Promise.resolve({ slug: "border-collie" }) });

    expect(description).not.toContain("Average age");
    expect(description).toContain("Find 32 Border Collie rescue dogs for adoption.");
  });
});

describe("averageAgeSentence", () => {
  it.each([
    [undefined, ""],
    [8, "Average age 8 months. "],
    [14, "Average age 1 year. "],
    [80, "Average age 7 years. "],
  ])("%p months → %p", (months, sentence) => {
    expect(averageAgeSentence(months)).toBe(sentence);
  });
});
