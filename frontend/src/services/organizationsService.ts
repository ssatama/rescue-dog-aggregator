import { z } from "zod";
import type { ApiDog, ApiOrganization } from "../types/apiDog";
import type { Dog } from "../types/dog";
import { get, stripNulls } from "../utils/api";
import { reportError } from "../utils/logger";
import { trackAPIPerformance } from "../utils/performanceMonitor";
import { ApiDogSchema } from "../schemas/animals";
import { transformApiDogsToDogs } from "../utils/dogTransformer";
import {
  ApiOrganizationSchema,
  EnhancedOrganizationSchema,
  OrganizationStatsSchema,
} from "../schemas/organizations";

type EnhancedOrganizationParsed = z.infer<typeof EnhancedOrganizationSchema>;
type OrganizationStats = z.infer<typeof OrganizationStatsSchema>;

export async function getOrganizations(): Promise<ApiOrganization[]> {
  return get<ApiOrganization[]>("/api/organizations", {}, {
    schema: z.array(ApiOrganizationSchema),
  });
}

export async function getOrganizationById(
  id: number | string,
): Promise<ApiOrganization> {
  return get<ApiOrganization>(`/api/organizations/${id}`, {}, {
    schema: ApiOrganizationSchema,
  });
}

export async function getOrganizationBySlug(
  slug: string,
): Promise<ApiOrganization> {
  return get<ApiOrganization>(`/api/organizations/${slug}`, {}, {
    schema: ApiOrganizationSchema,
  });
}

export async function getOrganizationDogs(
  idOrSlug: number | string,
  params: Record<string, unknown> = {},
): Promise<Dog[]> {
  const raw = await get<ApiDog[]>("/api/animals", {
    ...params,
    organization_id: idOrSlug,
    animal_type: "dog",
  }, {
    schema: z.array(ApiDogSchema),
  });
  return transformApiDogsToDogs(raw);
}

export async function getOrganizationStatistics(
  idOrSlug: number | string,
): Promise<OrganizationStats> {
  return get(`/api/organizations/${idOrSlug}/statistics`, {}, {
    schema: OrganizationStatsSchema,
  });
}

export async function getOrganizationRecentDogs(
  idOrSlug: number | string,
  limit: number = 3,
): Promise<unknown> {
  return get(`/api/organizations/${idOrSlug}/recent-dogs`, { limit });
}

interface EnhancedOrg {
  recent_dogs: Array<{
    thumbnail_url?: string;
    primary_image_url?: string;
    image_url?: string;
    [key: string]: unknown;
  }>;
  total_dogs: number;
  new_this_week: number;
  website_url?: string;
  websiteUrl?: string;
  logo_url?: string;
  logoUrl?: string;
  social_media: Record<string, unknown>;
  socialMedia?: Record<string, unknown>;
  service_regions: string[];
  serviceRegions?: string[];
  ships_to: string[];
  shipsTo?: string[];
  [key: string]: unknown;
}

function normalizeEnhancedOrg(org: EnhancedOrganizationParsed): EnhancedOrg {
  const recentDogs = (org.recent_dogs || []).map((dog) => ({
    ...dog,
    thumbnail_url: dog.thumbnail_url || dog.image_url,
    primary_image_url: dog.primary_image_url || dog.image_url,
  }));

  return {
    ...org,
    recent_dogs: recentDogs,
    total_dogs: org.total_dogs || 0,
    new_this_week: org.new_this_week || 0,
    website_url: org.website_url || org.websiteUrl,
    logo_url: org.logo_url || org.logoUrl,
    social_media: org.social_media || org.socialMedia || {},
    service_regions: org.service_regions || org.serviceRegions || [],
    ships_to: org.ships_to || org.shipsTo || [],
  };
}

export async function getEnhancedOrganizations(): Promise<EnhancedOrg[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const response = await fetch(`${apiUrl}/api/organizations/enhanced`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch organizations: ${response.status}`);
    }

    const organizations: unknown = await response.json();
    const parsed = z.array(EnhancedOrganizationSchema).parse(stripNulls(organizations));

    return parsed.map(normalizeEnhancedOrg);
  } catch (error) {
    reportError(error, { context: "getEnhancedOrganizations" });
    throw error;
  }
}

export async function getEnhancedOrganizationsSSR(): Promise<EnhancedOrg[]> {
  const startTime = Date.now();

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const response = await fetch(`${apiUrl}/api/organizations/enhanced`, {
      next: { revalidate: 300 },
      headers: {
        "Content-Type": "application/json",
      },
    } as RequestInit);

    if (!response.ok) {
      throw new Error(`Failed to fetch organizations: ${response.status}`);
    }

    let organizations: unknown;
    try {
      organizations = await response.json();
    } catch (jsonError) {
      throw new Error("Invalid JSON response from API", { cause: jsonError });
    }

    if (typeof window !== "undefined") {
      trackAPIPerformance("/api/organizations/enhanced", startTime);
    }

    const parsed = z.array(EnhancedOrganizationSchema).parse(stripNulls(organizations));

    const enhancedOrganizations = parsed.map(normalizeEnhancedOrg);

    return enhancedOrganizations;
  } catch (error) {
    reportError(error, { context: "getEnhancedOrganizationsSSR", apiUrl: process.env.NEXT_PUBLIC_API_URL });
    return [];
  }
}

export async function getAllOrganizations(): Promise<ApiOrganization[]> {
  return getOrganizations();
}
