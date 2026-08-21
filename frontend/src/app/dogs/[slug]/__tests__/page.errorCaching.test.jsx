/**
 * The dog detail route is ISR-cached for `revalidate` (48h). A render that
 * silently produced a page with no dog in it would be cached for that whole
 * window, so a momentary API failure became a permanently broken page.
 * Production symptom: 6 of 10 sampled available dogs served an ~84KB shell
 * with no name, no About content and no Pet JSON-LD.
 */
import { notFound } from "next/navigation";
import { DogDetailPageAsync } from "../page";
import { getAnimalBySlug } from "../../../../services/animalsService";

jest.mock("../../../../services/animalsService", () => ({
  getAnimalBySlug: jest.fn(),
  getAllAnimals: jest.fn(),
  getAllAnimalsForSitemap: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

jest.mock("../../../../utils/logger", () => ({
  reportError: jest.fn(),
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const props = { params: Promise.resolve({ slug: "sid-border-collie-cross-11006" }) };

describe("dog detail page — failed fetches must not be cached", () => {
  beforeEach(() => jest.clearAllMocks());

  it("propagates the error instead of rendering a dog page with no dog", async () => {
    getAnimalBySlug.mockRejectedValue(new Error("HTTP 503"));

    await expect(DogDetailPageAsync(props)).rejects.toThrow("HTTP 503");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("still 404s when the dog genuinely does not exist", async () => {
    getAnimalBySlug.mockResolvedValue(null);

    await expect(DogDetailPageAsync(props)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });
});

describe("dog detail page — an unresolvable slug is a failure, not an empty page", () => {
  beforeEach(() => jest.clearAllMocks());

  it("propagates a params resolution failure instead of rendering a shell", async () => {
    const badProps = { params: Promise.reject(new Error("params unavailable")) };

    await expect(DogDetailPageAsync(badProps)).rejects.toThrow("params unavailable");
    expect(getAnimalBySlug).not.toHaveBeenCalled();
  });
});
