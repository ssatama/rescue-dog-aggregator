import type { ApiDog } from "../types/apiDog";
import { getAnimals } from "./animalsService";
import { logger, reportError } from "../utils/logger";

export async function getRelatedDogs(
  organizationId: number | string,
  currentDogId: number | string,
): Promise<ApiDog[]> {
  logger.log(
    `Fetching related dogs for organization ${organizationId}, excluding dog ${currentDogId}`,
  );

  try {
    const dogs = await getAnimals({
      organization_id: organizationId,
      limit: 4,
      status: "available",
    });

    const relatedDogs = dogs.filter(
      (dog: ApiDog) => dog.id !== currentDogId,
    );

    logger.log(`Found ${relatedDogs.length} related dogs`);
    return relatedDogs;
  } catch (error) {
    logger.error("Error fetching related dogs:", error);
    reportError(error, { context: "getRelatedDogs", organizationId, currentDogId });
    throw error;
  }
}
