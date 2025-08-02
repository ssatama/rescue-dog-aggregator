// Related Dogs API service
import { getAnimals } from "./animalsService";
import { logger } from "../utils/logger";

/**
 * Fetches related dogs from the same organization, excluding the current dog
 * @param {number} organizationId - ID of the organization
 * @param {number} currentDogId - ID of the current dog to exclude from results
 * @returns {Promise<Array>} - Promise resolving to array of related dog objects
 */
export async function getRelatedDogs(organizationId, currentDogId) {
  logger.log(
    `Fetching related dogs for organization ${organizationId}, excluding dog ${currentDogId}`,
  );

  try {
    // Fetch dogs from the same organization
    const dogs = await getAnimals({
      organization_id: organizationId,
      limit: 4,
      status: "available",
    });

    // Filter out the current dog from results
    const relatedDogs = dogs.filter((dog) => dog.id !== currentDogId);

    logger.log(`Found ${relatedDogs.length} related dogs`);
    return relatedDogs;
  } catch (error) {
    logger.error("Error fetching related dogs:", error);
    throw error;
  }
}
