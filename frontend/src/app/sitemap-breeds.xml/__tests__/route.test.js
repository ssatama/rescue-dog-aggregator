/**
 * @jest-environment node
 *
 * The breed sitemap decides what Google is invited to index, so what it
 * excludes matters as much as what it includes.
 */
import { GET } from "../route";

const breed = (over = {}) => ({
  primary_breed: "Border Collie",
  breed_slug: "border-collie",
  breed_type: "purebred",
  breed_group: "Herding",
  count: 41,
  ...over,
});

function mockStats(qualifying_breeds) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ qualifying_breeds }),
  });
}

async function slugsFrom(qualifying_breeds) {
  mockStats(qualifying_breeds);
  const xml = await (await GET()).text();
  return [...xml.matchAll(/\/breeds\/([a-z0-9-]+)/g)].map((m) => m[1]);
}

describe("breed sitemap", () => {
  afterEach(() => jest.restoreAllMocks());

  it("includes a real breed", async () => {
    expect(await slugsFrom([breed()])).toContain("border-collie");
  });

  it("excludes Unknown, which is the absence of a breed", async () => {
    const slugs = await slugsFrom([
      breed(),
      breed({
        primary_breed: "Unknown",
        breed_slug: "unknown",
        breed_type: "unknown",
        breed_group: "Unknown",
      }),
    ]);
    expect(slugs).toContain("border-collie");
    expect(slugs).not.toContain("unknown");
  });

  it("excludes mixed breeds, which have their own page", async () => {
    const slugs = await slugsFrom([
      breed(),
      breed({
        primary_breed: "Mixed Breed",
        breed_slug: "mixed-breed",
        breed_type: "mixed",
        breed_group: "Mixed",
      }),
    ]);
    expect(slugs).not.toContain("mixed-breed");
  });

  it("does not list the same slug twice", async () => {
    const slugs = await slugsFrom([breed(), breed()]);
    const breedSlugs = slugs.filter((s) => s === "border-collie");
    expect(breedSlugs).toHaveLength(1);
  });
});
