import type { Dog } from "../types/dog";
import { getAnimals } from "./animalsService";
import { pickSimilarDogs, similarDogsQuery, SIMILAR_CANDIDATES } from "../utils/dogFacts";

/** Up to three available dogs like this one, from across rescues (#489). */
export async function getSimilarDogs(dog: Dog): Promise<Dog[]> {
  const query = similarDogsQuery(dog);
  if (!query) return [];
  return pickSimilarDogs(dog, await getAnimals({ ...query, limit: SIMILAR_CANDIDATES }));
}
