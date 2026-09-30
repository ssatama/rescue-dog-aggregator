import { generateMetadata } from "../[slug]/page";
import { getBreedBySlug } from "@/services/serverAnimalsService";

jest.mock("@/services/serverAnimalsService", () => ({
  getBreedBySlug: jest.fn(),
}));

describe("a breed page whose data fails (#659)", () => {
  it("fails its metadata too, rather than cache a generic title", async () => {
    (getBreedBySlug as unknown as jest.Mock).mockRejectedValue(new Error("API unreachable"));

    await expect(generateMetadata({ params: Promise.resolve({ slug: "greyhound" }) })).rejects.toThrow(
      "API unreachable",
    );
  });
});
