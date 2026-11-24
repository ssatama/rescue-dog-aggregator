import { forCard, withoutProfilerInternals } from "../dogPayload";
import type { Dog } from "@/types/dog";

const dog = {
  id: 7,
  name: "Juan",
  slug: "juan-7",
  description: "A long story about Juan.",
  primary_image_url: "https://images.rescuedogs.me/juan.jpg",
  properties: { description: "Raw scraped text.", size: "Medium" },
  organization: { name: "Rescue", slug: "rescue", ships_to: ["DE"], social_media: { facebook: "x" } },
  dog_profiler_data: {
    tagline: "Gentle soul",
    description: "Profile text.",
    confidence_scores: { energy_level: 0.9 },
    source_references: { description: "quoted source" },
    model_used: "google/gemini-3.8-flash",
    prompt_version: "1.0.0",
    profiler_version: "1.0.0",
    profiled_at: "2026-09-27T14:37:23Z",
  },
} as unknown as Dog;

describe("withoutProfilerInternals", () => {
  it("drops profiler bookkeeping and keeps everything shown", () => {
    const slim = withoutProfilerInternals(dog);
    expect(slim.dog_profiler_data).toEqual({
      tagline: "Gentle soul",
      description: "Profile text.",
      confidence_scores: { energy_level: 0.9 },
    });
    expect(slim.description).toBe(dog.description);
    expect(slim.properties).toBe(dog.properties);
  });

  it("leaves a dog without a profile alone", () => {
    const plain = { id: 1, name: "Rex" } as Dog;
    expect(withoutProfilerInternals(plain)).toBe(plain);
  });

  it("does not mutate the input", () => {
    withoutProfilerInternals(dog);
    expect(dog.dog_profiler_data?.source_references).toBeDefined();
  });
});

describe("forCard keeps what the card shows", () => {
  it("keeps the 'Lives with' facts companionAnswer reads", () => {
    const withFacts = {
      ...dog,
      properties: { description: "x", good_with_cats: "yes", good_with_dogs: true },
      dog_profiler_data: { ...dog.dog_profiler_data, good_with_cats: "yes", confidence_scores: { good_with_cats: 0.9 } },
    } as unknown as Dog;
    const card = forCard(withFacts);
    expect(card.properties).toEqual({ good_with_cats: "yes", good_with_dogs: true });
    expect(card.dog_profiler_data?.good_with_cats).toBe("yes");
    expect(card.dog_profiler_data?.confidence_scores).toEqual({ good_with_cats: 0.9 });
  });

  it("handles a dog with no properties, organization or profile", () => {
    const bare = { id: 2, name: "Rex", slug: "rex-2" } as Dog;
    expect(forCard(bare)).toEqual(bare);
  });
});
