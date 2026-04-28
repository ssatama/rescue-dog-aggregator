import type { Dog } from "../../../types/dog";

const RECENT_WINDOW_DAYS = 30;
const SCORE_HAS_LLM_CONTENT = 10;
const SCORE_HAS_IMAGE = 5;
const SCORE_RECENT = 3;

const isRecent = (dateStr: string | null | undefined, now: Date = new Date()): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - RECENT_WINDOW_DAYS);
  return date > cutoff;
};

const scoreDog = (dog: Dog, now: Date): number => {
  const hasLLMContent = !!(dog.llm_description || dog.dog_profiler_data?.description);
  const hasImage = !!dog.primary_image_url;
  return (
    (hasLLMContent ? SCORE_HAS_LLM_CONTENT : 0) +
    (hasImage ? SCORE_HAS_IMAGE : 0) +
    (isRecent(dog.created_at, now) ? SCORE_RECENT : 0)
  );
};

export function prioritizeDogsForStaticParams(
  dogs: Dog[],
  limit: number,
  now: Date = new Date(),
): Array<{ slug: string }> {
  return dogs
    .filter((dog): dog is Dog & { slug: string } => typeof dog.slug === "string" && dog.slug !== "")
    .map((dog) => ({ slug: dog.slug, priority: scoreDog(dog, now) }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
    .map(({ slug }) => ({ slug }));
}
