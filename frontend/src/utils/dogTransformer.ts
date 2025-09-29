import { type Dog, type DogProfilerData } from "../types/dog";
import { type ApiDog, type ApiDogProfilerData } from "../types/apiDog";

/**
 * Transforms API dog profiler data (camelCase) to frontend format (snake_case)
 */
function transformProfilerData(
  apiData: ApiDogProfilerData | undefined,
): DogProfilerData | undefined {
  if (!apiData) return undefined;

  return {
    name: apiData.name,
    breed: apiData.breed,
    tagline: apiData.tagline,
    description: apiData.description,
    personality_traits: apiData.personalityTraits,
    favorite_activities: apiData.favoriteActivities,
    unique_quirk: apiData.uniqueQuirk,
    energy_level: apiData.energyLevel,
    trainability: apiData.trainability,
    experience_level: apiData.experienceLevel,
    sociability: apiData.sociability,
    confidence: apiData.confidence,
    home_type: apiData.homeType,
    exercise_needs: apiData.exerciseNeeds,
    grooming_needs: apiData.groomingNeeds,
    yard_required: apiData.yardRequired,
    good_with_dogs: apiData.goodWithDogs,
    good_with_cats: apiData.goodWithCats,
    good_with_children: apiData.goodWithChildren,
    medical_needs: apiData.medicalNeeds,
    special_needs: apiData.specialNeeds,
    neutered: apiData.neutered,
    vaccinated: apiData.vaccinated,
    ready_to_travel: apiData.readyToTravel,
    adoption_fee_euros: apiData.adoptionFeeEuros,
    confidence_scores: apiData.confidenceScores,
    quality_score: apiData.qualityScore,
    model_used: apiData.modelUsed,
    profiled_at: apiData.profiledAt,
    profiler_version: apiData.profilerVersion,
    prompt_version: apiData.promptVersion,
    processing_time_ms: apiData.processingTimeMs,
    source_references: apiData.sourceReferences,
  };
}

/**
 * Transforms API dog data to frontend Dog type
 * Handles camelCase to snake_case conversion and image normalization
 */
export function transformApiDogToDog(apiDog: ApiDog): Dog {
  // Get profiler data from either camelCase or snake_case field
  const apiProfilerData = apiDog.dogProfilerData || apiDog.dog_profiler_data;
  const transformedProfilerData = transformProfilerData(apiProfilerData);

  // Normalize image fields - ensure both primary_image_url and main_image are set
  const primaryImage =
    apiDog.primary_image_url || apiDog.image || apiDog.main_image;
  const mainImage =
    apiDog.main_image || apiDog.primary_image_url || apiDog.image;

  return {
    ...apiDog,
    // Ensure organization is kept as object
    organization:
      typeof apiDog.organization === "string"
        ? { name: apiDog.organization }
        : apiDog.organization,
    // Normalize image fields for consistent access
    primary_image_url: primaryImage,
    main_image: mainImage,
    // Set transformed profiler data
    dog_profiler_data: transformedProfilerData,
    // Preserve top-level fields for backward compatibility
    personality_traits:
      transformedProfilerData?.personality_traits ||
      apiDog.personality_traits ||
      [],
    description: transformedProfilerData?.description || apiDog.description,
  };
}

/**
 * Transforms an array of API dogs to frontend Dog types
 */
export function transformApiDogsToDogs(apiDogs: ApiDog[]): Dog[] {
  return apiDogs.map(transformApiDogToDog);
}