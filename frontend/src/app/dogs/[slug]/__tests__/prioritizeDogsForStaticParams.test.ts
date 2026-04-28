import { prioritizeDogsForStaticParams } from "../prioritizeDogsForStaticParams";
import type { Dog } from "../../../../types/dog";

const NOW = new Date("2026-04-28T00:00:00Z");
const RECENT_DATE = new Date("2026-04-15T00:00:00Z").toISOString();
const OLD_DATE = new Date("2025-12-01T00:00:00Z").toISOString();

const buildDog = (overrides: Partial<Dog>): Dog =>
  ({
    id: 1,
    slug: "default-slug",
    name: "Default",
    organization_id: 1,
    status: "available",
    ...overrides,
  }) as Dog;

describe("prioritizeDogsForStaticParams", () => {
  it("drops dogs without a slug", () => {
    const dogs = [
      buildDog({ slug: "a-1", primary_image_url: "x" }),
      buildDog({ slug: "", primary_image_url: "x" }),
      buildDog({ slug: undefined as unknown as string, primary_image_url: "x" }),
    ];
    expect(prioritizeDogsForStaticParams(dogs, 10, NOW)).toEqual([{ slug: "a-1" }]);
  });

  it("sorts by score: LLM content (10) > image (5) > recent (3)", () => {
    const dogs = [
      buildDog({ slug: "no-signals" }),
      buildDog({ slug: "recent-only", created_at: RECENT_DATE }),
      buildDog({ slug: "image-only", primary_image_url: "x" }),
      buildDog({ slug: "llm-only", llm_description: "blurb" }),
      buildDog({
        slug: "all-signals",
        llm_description: "blurb",
        primary_image_url: "x",
        created_at: RECENT_DATE,
      }),
    ];

    const result = prioritizeDogsForStaticParams(dogs, 10, NOW);

    expect(result.map((d) => d.slug)).toEqual([
      "all-signals",
      "llm-only",
      "image-only",
      "recent-only",
      "no-signals",
    ]);
  });

  it("treats dog_profiler_data.description as LLM content", () => {
    const dogs = [
      buildDog({ slug: "plain" }),
      buildDog({
        slug: "profiler",
        dog_profiler_data: { description: "Friendly", tagline: "" } as Dog["dog_profiler_data"],
      }),
    ];

    const result = prioritizeDogsForStaticParams(dogs, 10, NOW);
    expect(result[0].slug).toBe("profiler");
  });

  it("treats dogs older than 30 days as not recent", () => {
    const dogs = [
      buildDog({ slug: "old", created_at: OLD_DATE }),
      buildDog({ slug: "recent", created_at: RECENT_DATE }),
    ];

    const result = prioritizeDogsForStaticParams(dogs, 10, NOW);
    expect(result[0].slug).toBe("recent");
  });

  it("limits the result to the requested size", () => {
    const dogs = Array.from({ length: 1500 }, (_, i) =>
      buildDog({ slug: `dog-${i}`, primary_image_url: i % 2 === 0 ? "x" : undefined }),
    );

    const result = prioritizeDogsForStaticParams(dogs, 500, NOW);
    expect(result).toHaveLength(500);
  });

  it("returns objects with only a slug field (Next.js generateStaticParams contract)", () => {
    const dogs = [
      buildDog({
        slug: "a-1",
        llm_description: "x",
        primary_image_url: "x",
        created_at: RECENT_DATE,
      }),
    ];

    const result = prioritizeDogsForStaticParams(dogs, 10, NOW);
    expect(result).toEqual([{ slug: "a-1" }]);
    expect(Object.keys(result[0])).toEqual(["slug"]);
  });

  it("handles malformed created_at gracefully", () => {
    const dogs = [
      buildDog({ slug: "bad-date", created_at: "not-a-date", primary_image_url: "x" }),
    ];

    const result = prioritizeDogsForStaticParams(dogs, 10, NOW);
    expect(result).toEqual([{ slug: "bad-date" }]);
  });

  it("returns empty array when given empty input", () => {
    expect(prioritizeDogsForStaticParams([], 500, NOW)).toEqual([]);
  });
});
