import { z } from "zod";

export const SwipeCountrySchema = z
  .object({
    code: z.string(),
    name: z.string(),
    dogCount: z.number(),
  })
  .passthrough();

export type SwipeCountry = z.infer<typeof SwipeCountrySchema>;
