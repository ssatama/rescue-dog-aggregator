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

/** A dog as DogCard uses it: cards never show descriptions or social links. */
export function forCard(dog: Dog): Dog {
  const { description: _description, ...slim } = withoutProfilerInternals(dog);
  if (slim.properties) {
    const { description: _scraped, ...properties } = slim.properties;
    slim.properties = properties;
  }
  if (slim.organization) {
    const { social_media: _social, ...organization } = slim.organization as typeof slim.organization & {
      social_media?: unknown;
    };
    slim.organization = organization;
  }
  return slim;
}
