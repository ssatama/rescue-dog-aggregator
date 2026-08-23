/**
 * A dog whose listing vanished from the source organisation must not be
 * offered to search engines as a live listing.
 *
 * The detail route deliberately serves inactive dogs (see
 * `get_animal_by_slug`), so the URL keeps returning 200. Without a `noindex`
 * the page stays an indexable, live-looking profile for a dog nobody can
 * adopt - the soft-404 pattern that leaves an orphaned URL behind every time
 * a dog cycles out of the sitemap.
 */
import { generateMetadata } from "../page";
import { getAnimalBySlug } from "../../../../services/animalsService";

jest.mock("../../../../services/animalsService", () => ({
  getAnimalBySlug: jest.fn(),
  getAnimals: jest.fn(),
}));

const baseDog = {
  id: 1,
  slug: "skyla-mixed-breed-10039",
  name: "Skyla",
  standardized_breed: "Mixed Breed",
  created_at: "2026-01-01T00:00:00",
};

function metadataFor(dog) {
  getAnimalBySlug.mockResolvedValue(dog);
  return generateMetadata({ params: Promise.resolve({ slug: dog.slug }) });
}

describe("dog detail metadata: retired listings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps a live dog indexable", async () => {
    const metadata = await metadataFor({
      ...baseDog,
      active: true,
      status: "available",
    });

    expect(metadata.robots?.index).not.toBe(false);
  });

  it("marks a dog the scrapers retired as noindex", async () => {
    const metadata = await metadataFor({
      ...baseDog,
      active: false,
      status: "unknown",
    });

    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("still follows outbound links on a retired dog", async () => {
    const metadata = await metadataFor({
      ...baseDog,
      active: false,
      status: "unknown",
    });

    expect(metadata.robots.follow).toBe(true);
  });

  it("retires a dog the API reports inactive even while status still reads available", async () => {
    // 199 rows in production carry status='available' with active=false, so
    // status alone is not a sufficient signal.
    const metadata = await metadataFor({
      ...baseDog,
      active: false,
      status: "available",
    });

    expect(metadata.robots?.index).toBe(false);
  });

  it("treats a payload with no active flag as live", async () => {
    // Older API responses omit the field entirely; absence must not retire a
    // dog that is genuinely still listed.
    const metadata = await metadataFor({ ...baseDog, status: "available" });

    expect(metadata.robots?.index).not.toBe(false);
  });
});
