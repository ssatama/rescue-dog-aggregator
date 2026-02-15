import { z } from "zod";

export const ApiOrganizationSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    slug: z.string().optional(),
    logo_url: z.string().optional(),
    website_url: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    ships_to: z.array(z.string()).optional(),
    active: z.boolean().optional(),
    config_id: z.string().optional(),
    social_media: z.record(z.string(), z.unknown()).optional(),
    service_regions: z.array(z.string()).optional(),
  })
  .passthrough();

const EnhancedOrgDogSchema = z
  .object({
    id: z.union([z.number(), z.string()]),
    name: z.string().optional(),
    thumbnail_url: z.string().optional(),
    primary_image_url: z.string().optional(),
    image_url: z.string().optional(),
    slug: z.string().optional(),
  })
  .passthrough();

export const EnhancedOrganizationSchema = z
  .object({
    id: z.number().optional(),
    name: z.string(),
    slug: z.string().optional(),
    logo_url: z.string().optional(),
    logoUrl: z.string().optional(),
    website_url: z.string().optional(),
    websiteUrl: z.string().optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    ships_to: z.array(z.string()).optional(),
    shipsTo: z.array(z.string()).optional(),
    social_media: z.record(z.string(), z.unknown()).optional(),
    socialMedia: z.record(z.string(), z.unknown()).optional(),
    service_regions: z.array(z.string()).optional(),
    serviceRegions: z.array(z.string()).optional(),
    recent_dogs: z.array(EnhancedOrgDogSchema).optional(),
    total_dogs: z.number().optional(),
    new_this_week: z.number().optional(),
  })
  .passthrough();

export const OrganizationStatsSchema = z
  .object({
    total_dogs: z.number().optional(),
    breed_count: z.number().optional(),
    recent_count: z.number().optional(),
  })
  .passthrough();

export type ApiOrganizationParsed = z.infer<typeof ApiOrganizationSchema>;
export type EnhancedOrganization = z.infer<typeof EnhancedOrganizationSchema>;
