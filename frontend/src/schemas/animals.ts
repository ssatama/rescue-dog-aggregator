import { z } from "zod";
import { PaginatedResponseSchema } from "./common";

export const ApiDogProfilerDataSchema = z
  .object({
    name: z.string().optional(),
    breed: z.string().optional(),
    tagline: z.string().optional(),
    description: z.string().optional(),
    personalityTraits: z.array(z.string()).optional(),
    favoriteActivities: z.array(z.string()).optional(),
    uniqueQuirk: z.string().optional(),
    energyLevel: z
      .enum(["low", "medium", "high", "very_high"])
      .optional(),
    trainability: z.enum(["easy", "moderate", "challenging"]).optional(),
    experienceLevel: z
      .enum(["first_time_ok", "some_experience", "experienced_only"])
      .optional(),
    sociability: z
      .enum(["reserved", "moderate", "social", "very_social"])
      .optional(),
    confidence: z.enum(["shy", "moderate", "confident"]).optional(),
    homeType: z
      .enum(["apartment_ok", "house_preferred", "house_required"])
      .optional(),
    exerciseNeeds: z.enum(["minimal", "moderate", "high"]).optional(),
    groomingNeeds: z.enum(["minimal", "weekly", "frequent"]).optional(),
    yardRequired: z.boolean().optional(),
    goodWithDogs: z.enum(["yes", "no", "maybe", "unknown"]).optional(),
    goodWithCats: z.enum(["yes", "no", "maybe", "unknown"]).optional(),
    goodWithChildren: z
      .enum(["yes", "no", "maybe", "unknown"])
      .optional(),
    medicalNeeds: z.string().optional(),
    specialNeeds: z.string().optional(),
    neutered: z.boolean().optional(),
    vaccinated: z.boolean().optional(),
    readyToTravel: z.boolean().optional(),
    adoptionFeeEuros: z.number().optional(),
    confidenceScores: z.record(z.string(), z.number()).optional(),
    qualityScore: z.number().optional(),
    modelUsed: z.string().optional(),
    profiledAt: z.string().optional(),
    profilerVersion: z.string().optional(),
    promptVersion: z.string().optional(),
    processingTimeMs: z.number().optional(),
    sourceReferences: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

export const ApiOrganizationEmbeddedSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    slug: z.string().optional(),
    logo_url: z.string().optional(),
    website_url: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    ships_to: z.array(z.string()).optional(),
  })
  .passthrough();

export const ApiDogSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    name: z.string(),
    external_id: z.string().optional(),
    slug: z.string().optional(),
    breed: z.string().optional(),
    primary_breed: z.string().optional(),
    standardized_breed: z.string().optional(),
    secondary_breed: z.string().optional(),
    mixed_breed: z.boolean().optional(),
    age: z.string().optional(),
    age_text: z.string().optional(),
    age_months: z.number().optional(),
    age_min_months: z.number().optional(),
    age_max_months: z.number().optional(),
    sex: z.string().optional(),
    size: z.string().optional(),
    standardized_size: z.string().optional(),
    weight: z.string().optional(),
    coat: z.string().optional(),
    color: z.string().optional(),
    spayed_neutered: z.boolean().optional(),
    house_trained: z.boolean().optional(),
    special_needs: z.boolean().optional(),
    shots_current: z.boolean().optional(),
    good_with_children: z.boolean().optional(),
    good_with_dogs: z.boolean().optional(),
    good_with_cats: z.boolean().optional(),
    description: z.string().optional(),
    status: z.string().optional(),
    adoption_url: z.string().optional(),
    primary_image_url: z.string().optional(),
    image: z.string().optional(),
    main_image: z.string().optional(),
    images: z.array(z.string()).optional(),
    additional_images: z.array(z.string()).optional(),
    videos: z.array(z.string()).optional(),
    location: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
    organization: z
      .union([ApiOrganizationEmbeddedSchema, z.string()])
      .optional(),
    dogProfilerData: ApiDogProfilerDataSchema.optional(),
    dog_profiler_data: ApiDogProfilerDataSchema.optional(),
    personality_traits: z.array(z.string()).optional(),
    traits: z.array(z.string()).optional(),
    quality_score: z.number().optional(),
  })
  .passthrough();

export const PaginatedAnimalsSchema = PaginatedResponseSchema(ApiDogSchema);

export const QualifyingBreedSchema = z
  .object({
    primary_breed: z.string(),
    breed_slug: z.string(),
    breed_group: z.string().optional(),
    count: z.number(),
  })
  .passthrough();

export const BreedGroupSchema = z
  .object({
    name: z.string(),
    count: z.number(),
  })
  .passthrough();

export const BreedStatsSchema = z
  .object({
    total_dogs: z.number(),
    total_breeds: z.number().optional(),
    breed_groups: z.array(BreedGroupSchema).optional(),
    qualifying_breeds: z.array(QualifyingBreedSchema).optional(),
  })
  .passthrough();

export const StatisticsSchema = z
  .object({
    total_dogs: z.number(),
    total_organizations: z.number(),
    countries: z.union([z.number(), z.array(z.string())]).optional(),
    organizations: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const BreedWithImagesSchema = z
  .object({
    primary_breed: z.string(),
    breed_slug: z.string().optional(),
    count: z.number().optional(),
    sample_dogs: z
      .array(
        z
          .object({
            id: z.union([z.number(), z.string()]),
            name: z.string().optional(),
            primary_image_url: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();

export const SwipeApiDogSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    breed: z.string().optional(),
    age: z.string().optional(),
    age_min_months: z.number().optional(),
    age_max_months: z.number().optional(),
    image_url: z.string().optional(),
    primary_image_url: z.string().optional(),
    main_image: z.string().optional(),
    image: z.string().optional(),
    organization_name: z.string().optional(),
    organization: z
      .union([z.object({ name: z.string().optional() }).passthrough(), z.string()])
      .optional(),
    location: z.string().optional(),
    slug: z.string(),
    tagline: z.string().optional(),
    description: z.string().optional(),
    personality_traits: z.array(z.string()).optional(),
    energy_level: z.number().optional(),
    unique_quirk: z.string().optional(),
    special_characteristic: z.string().optional(),
    quality_score: z.number().optional(),
    created_at: z.string().optional(),
  })
  .passthrough();

export const SwipeResponseSchema = z.object({
  dogs: z.array(SwipeApiDogSchema),
  hasMore: z.boolean().optional(),
  nextOffset: z.number().optional(),
  total: z.number().optional(),
});

export type ApiDogParsed = z.infer<typeof ApiDogSchema>;
export type BreedStats = z.infer<typeof BreedStatsSchema>;
export type Statistics = z.infer<typeof StatisticsSchema>;
export type BreedWithImages = z.infer<typeof BreedWithImagesSchema>;
