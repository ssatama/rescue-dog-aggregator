import { z } from "zod";

export const SizeEnum = z.enum(["Tiny", "Small", "Medium", "Large", "XLarge"]);
export const AgeCategoryEnum = z.enum(["puppy", "young", "adult", "senior"]);
export const SexEnum = z.enum(["male", "female"]);
export const EnergyLevelEnum = z.enum(["low", "medium", "high", "very_high"]);
export const ExperienceLevelEnum = z.enum([
  "first_time_ok",
  "some_experience",
  "experienced_only",
]);
export const HomeTypeEnum = z.enum([
  "apartment_ok",
  "house_preferred",
  "house_required",
]);
export const ResponseFormatEnum = z.enum(["markdown", "json"]);
export const ImagePresetEnum = z.enum(["thumbnail", "medium"]);

export const SearchDogsInputSchema = z
  .object({
    query: z
      .string()
      .optional()
      .describe("Free-text search in dog names and descriptions"),
    breed: z
      .string()
      .optional()
      .describe("Filter by breed name (e.g., 'Golden Retriever', 'Mixed')"),
    breed_group: z
      .string()
      .optional()
      .describe(
        "Filter by FCI breed group (e.g., 'Herding', 'Sporting', 'Hound')"
      ),
    size: SizeEnum.optional().describe("Filter by standardized size"),
    age_category: AgeCategoryEnum.optional().describe("Filter by age category"),
    sex: SexEnum.optional().describe("Filter by sex"),
    energy_level: EnergyLevelEnum.optional().describe(
      "Filter by energy level from LLM profiler data"
    ),
    experience_level: ExperienceLevelEnum.optional().describe(
      "Filter by required owner experience level"
    ),
    home_type: HomeTypeEnum.optional().describe(
      "Filter by required home type"
    ),
    adoptable_to_country: z
      .string()
      .optional()
      .describe("ISO country code where dog can be adopted to (e.g., 'GB', 'IE', 'FR')"),
    organization_id: z
      .number()
      .int()
      .optional()
      .describe("Filter by specific rescue organization ID"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe("Number of results to return (1-50)"),
    offset: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe("Number of results to skip for pagination"),
    include_images: z
      .boolean()
      .default(false)
      .describe("Include dog photos in response (opt-in, increases response size)"),
    image_preset: ImagePresetEnum.default("thumbnail").describe(
      "Image size preset: 'thumbnail' (200x200) or 'medium' (400x400)"
    ),
    response_format: ResponseFormatEnum.default("markdown").describe(
      "Response format: 'markdown' for human-readable or 'json' for structured data"
    ),
  })
  .strict();

export const GetDogDetailsInputSchema = z
  .object({
    slug: z
      .string()
      .describe("Dog's URL-friendly slug (e.g., 'buddy-12345')"),
    include_image: z
      .boolean()
      .default(true)
      .describe("Include dog photo in response"),
    image_preset: ImagePresetEnum.default("medium").describe(
      "Image size preset: 'thumbnail' (200x200) or 'medium' (400x400)"
    ),
    response_format: ResponseFormatEnum.default("markdown").describe(
      "Response format: 'markdown' for human-readable or 'json' for structured data"
    ),
  })
  .strict();

export const ListBreedsInputSchema = z
  .object({
    breed_group: z
      .string()
      .optional()
      .describe("Filter by FCI breed group (e.g., 'Herding', 'Sporting')"),
    min_count: z
      .number()
      .int()
      .min(1)
      .default(1)
      .describe("Minimum number of dogs available for a breed to be included"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .default(20)
      .describe("Number of breeds to return"),
    response_format: ResponseFormatEnum.default("markdown").describe(
      "Response format: 'markdown' for human-readable or 'json' for structured data"
    ),
  })
  .strict();

export const GetStatisticsInputSchema = z
  .object({
    response_format: ResponseFormatEnum.default("markdown").describe(
      "Response format: 'markdown' for human-readable or 'json' for structured data"
    ),
  })
  .strict();

export const GetFilterCountsInputSchema = z
  .object({
    current_filters: z
      .object({
        breed: z.string().optional(),
        size: z.string().optional(),
        age_category: z.string().optional(),
        sex: z.string().optional(),
        adoptable_to_country: z.string().optional(),
      })
      .optional()
      .describe("Current filter context to show remaining options"),
    response_format: ResponseFormatEnum.default("markdown").describe(
      "Response format: 'markdown' for human-readable or 'json' for structured data"
    ),
  })
  .strict();

export const ListOrganizationsInputSchema = z
  .object({
    country: z
      .string()
      .optional()
      .describe("Filter by ISO country code (e.g., 'GB', 'ES', 'RO')"),
    active_only: z
      .boolean()
      .default(true)
      .describe("Only return active organizations"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20)
      .describe("Number of organizations to return"),
    response_format: ResponseFormatEnum.default("markdown").describe(
      "Response format: 'markdown' for human-readable or 'json' for structured data"
    ),
  })
  .strict();

export const LivingSituationEnum = z.enum([
  "apartment",
  "house_small_garden",
  "house_large_garden",
  "rural",
]);
export const ActivityLevelEnum = z.enum([
  "sedentary",
  "moderate",
  "active",
  "very_active",
]);
export const ExperienceEnum = z.enum(["first_time", "some", "experienced"]);

export const MatchPreferencesInputSchema = z
  .object({
    living_situation: LivingSituationEnum.describe(
      "Your living situation for home type matching"
    ),
    activity_level: ActivityLevelEnum.describe(
      "Your activity level for energy matching"
    ),
    experience: ExperienceEnum.describe("Your dog ownership experience level"),
    has_children: z
      .boolean()
      .optional()
      .describe("Whether you have children at home"),
    has_other_dogs: z
      .boolean()
      .optional()
      .describe("Whether you have other dogs at home"),
    has_cats: z
      .boolean()
      .optional()
      .describe("Whether you have cats at home"),
    adoptable_to_country: z
      .string()
      .optional()
      .describe("ISO country code where you can adopt (e.g., 'GB', 'IE')"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(5)
      .describe("Number of matching dogs to return"),
    include_images: z
      .boolean()
      .default(false)
      .describe("Include dog photos in response"),
    response_format: ResponseFormatEnum.default("markdown").describe(
      "Response format: 'markdown' for human-readable or 'json' for structured data"
    ),
  })
  .strict();

export const AdoptionGuideTopicEnum = z.enum([
  "overview",
  "transport",
  "fees",
  "requirements",
  "timeline",
]);

export const GetAdoptionGuideInputSchema = z
  .object({
    topic: AdoptionGuideTopicEnum.optional()
      .default("overview")
      .describe("Specific adoption topic to get information about"),
    country: z
      .string()
      .optional()
      .describe("ISO country code for country-specific adoption info"),
  })
  .strict();

// Type inference helpers
export type SearchDogsInput = z.infer<typeof SearchDogsInputSchema>;
export type GetDogDetailsInput = z.infer<typeof GetDogDetailsInputSchema>;
export type ListBreedsInput = z.infer<typeof ListBreedsInputSchema>;
export type GetStatisticsInput = z.infer<typeof GetStatisticsInputSchema>;
export type GetFilterCountsInput = z.infer<typeof GetFilterCountsInputSchema>;
export type ListOrganizationsInput = z.infer<typeof ListOrganizationsInputSchema>;
export type MatchPreferencesInput = z.infer<typeof MatchPreferencesInputSchema>;
export type GetAdoptionGuideInput = z.infer<typeof GetAdoptionGuideInputSchema>;
