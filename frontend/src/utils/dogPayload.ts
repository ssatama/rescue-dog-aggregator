import type { Dog } from "@/types/dog";
import type { DogProfilerData } from "@/types/dogProfiler";

// Profiler bookkeeping that no page shows. Server-fetched dogs travel in the
// dog page's HTML and RSC payload, which ISR bills per 8 KB written (#760).
const PROFILER_INTERNALS = [
  "source_references",
  "model_used",
  "prompt_version",
  "profiler_version",
  "profiled_at",
] as const satisfies readonly (keyof DogProfilerData)[];

export function withoutProfilerInternals<T extends Dog>(dog: T): T {
  if (!dog.dog_profiler_data) return dog;
  const profile = { ...dog.dog_profiler_data };
  for (const key of PROFILER_INTERNALS) delete profile[key];
  return { ...dog, dog_profiler_data: profile };
}

// Exactly what DogCard reads (summary, "where", "Lives with" facts, photo,
// link, adoptable badge). Similar dogs are server-rendered into every dog
// page, and anything else they carry is written to ISR on each render (#781).
const CARD_FIELDS = [
  "id", "name", "slug", "sex", "primary_image_url",
  "breed", "primary_breed", "standardized_breed", "age_min_months", "age_text",
] as const satisfies readonly (keyof Dog)[];
const CARD_ORG_FIELDS = ["name", "slug", "country", "ships_to"] as const;
const LIVES_WITH = ["good_with_children", "good_with_dogs", "good_with_cats"] as const;

function pick<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) if (obj[key] !== undefined) out[key] = obj[key];
  return out;
}

/** A dog as DogCard uses it, and nothing more. */
export function forCard(dog: Dog): Dog {
  const card: Dog = pick(dog, CARD_FIELDS);
  if (dog.organization) card.organization = pick(dog.organization, CARD_ORG_FIELDS);
  if (dog.properties) {
    const properties = pick(dog.properties, LIVES_WITH);
    if (Object.keys(properties).length) card.properties = properties;
  }
  const profile = dog.dog_profiler_data;
  if (profile) {
    const slim: NonNullable<Dog["dog_profiler_data"]> = pick(profile, LIVES_WITH);
    if (profile.confidence_scores) {
      const scores = pick(profile.confidence_scores, LIVES_WITH);
      if (Object.keys(scores).length) slim.confidence_scores = scores;
    }
    if (Object.keys(slim).length) card.dog_profiler_data = slim;
  }
  return card;
}
