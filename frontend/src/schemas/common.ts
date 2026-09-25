import { z } from "zod";

export const FilterCountSchema = z
  .object({
    value: z.union([z.string(), z.number(), z.boolean()]),
    count: z.number(),
    label: z.string().optional(),
  })
  .passthrough();

const LifestyleCountSchema = z.object({
  /** Dogs the filter would show, given every other filter */
  count: z.number(),
  /** Dogs whose profile records this at all, given every other filter */
  known: z.number(),
});

export const FilterCountsResponseSchema = z
  .object({
    total_count: z.number().optional(),
    /** Dogs matching every filter, as the list returns them (#494). */
    total: z.number().optional(),
    sex_options: z.array(FilterCountSchema).optional(),
    size_options: z.array(FilterCountSchema).optional(),
    age_options: z.array(FilterCountSchema).optional(),
    breed_options: z.array(FilterCountSchema).optional(),
    organization_options: z.array(FilterCountSchema).optional(),
    location_country_options: z.array(FilterCountSchema).optional(),
    available_country_options: z.array(FilterCountSchema).optional(),
    available_region_options: z.array(FilterCountSchema).optional(),
    lifestyle: z
      .object({
        good_with_kids: LifestyleCountSchema,
        good_with_dogs: LifestyleCountSchema,
        good_with_cats: LifestyleCountSchema,
        first_time_friendly: LifestyleCountSchema,
        energy_low: LifestyleCountSchema,
        energy_medium: LifestyleCountSchema,
        energy_high: LifestyleCountSchema,
      })
      .nullish(),
  })
  .passthrough();

export const SearchSuggestionSchema = z.union([
  z.string(),
  z
    .object({
      name: z.string(),
      slug: z.string().optional(),
      type: z.string().optional(),
    })
    .passthrough(),
]);

export type FilterCount = z.infer<typeof FilterCountSchema>;
export type FilterCountsResponse = z.infer<typeof FilterCountsResponseSchema>;
export type LifestyleCount = z.infer<typeof LifestyleCountSchema>;
