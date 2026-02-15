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
    sex: z.array(FilterCountSchema).optional(),
    standardized_size: z.array(FilterCountSchema).optional(),
    age_category: z.array(FilterCountSchema).optional(),
    breed_group: z.array(FilterCountSchema).optional(),
    location_country: z.array(FilterCountSchema).optional(),
    available_to_country: z.array(FilterCountSchema).optional(),
    organization_id: z.array(FilterCountSchema).optional(),
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
