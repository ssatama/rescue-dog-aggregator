import { z } from "zod";

export const FilterCountSchema = z
  .object({
    value: z.union([z.string(), z.number(), z.boolean()]),
    count: z.number(),
    label: z.string().optional(),
  })
  .passthrough();

export const FilterCountsResponseSchema = z
  .object({
    sex_options: z.array(FilterCountSchema).optional(),
    size_options: z.array(FilterCountSchema).optional(),
    age_options: z.array(FilterCountSchema).optional(),
    breed_options: z.array(FilterCountSchema).optional(),
    organization_options: z.array(FilterCountSchema).optional(),
    location_country_options: z.array(FilterCountSchema).optional(),
    available_country_options: z.array(FilterCountSchema).optional(),
    available_region_options: z.array(FilterCountSchema).optional(),
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
