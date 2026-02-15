import { z } from "zod";
import type { ApiOrganization } from "../types/apiDog";
import { get } from "../utils/api";
import { trackAPIPerformance } from "../utils/performanceMonitor";
import {
  ApiOrganizationSchema,
  EnhancedOrganizationSchema,
} from "../schemas/organizations";

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
): Promise<unknown> {
  return get("/api/animals", {
    ...params,
    organization_id: idOrSlug,
    animal_type: "dog",
  });
}

export async function getOrganizationStatistics(
  idOrSlug: number | string,
): Promise<unknown> {
  return get(`/api/organizations/${idOrSlug}/statistics`);
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

function normalizeEnhancedOrg(org: Record<string, unknown>): EnhancedOrg {
  const recentDogs = (
    (org.recent_dogs as Array<Record<string, unknown>>) || []
  ).map((dog) => ({
    ...dog,
    thumbnail_url:
      (dog.thumbnail_url as string) || (dog.image_url as string),
    primary_image_url:
      (dog.primary_image_url as string) || (dog.image_url as string),
  }));

  return {
    ...org,
    recent_dogs: recentDogs,
    total_dogs: (org.total_dogs as number) || 0,
    new_this_week: (org.new_this_week as number) || 0,
    website_url:
      (org.website_url as string) || (org.websiteUrl as string),
    logo_url: (org.logo_url as string) || (org.logoUrl as string),
    social_media:
      (org.social_media as Record<string, unknown>) ||
      (org.socialMedia as Record<string, unknown>) ||
      {},
    service_regions:
      (org.service_regions as string[]) ||
      (org.serviceRegions as string[]) ||
      [],
    ships_to:
      (org.ships_to as string[]) || (org.shipsTo as string[]) || [],
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
    const parsed = z.array(EnhancedOrganizationSchema).parse(
      Array.isArray(organizations) ? organizations : [],
    );

    return parsed.map(normalizeEnhancedOrg);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Failed to fetch enhanced organizations:", error);
    }
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
      console.warn(`SSR fetch failed with status: ${response.status}`, {
        url: `${apiUrl}/api/organizations/enhanced`,
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error(`Failed to fetch organizations: ${response.status}`);
    }

    let organizations: unknown;
    try {
      organizations = await response.json();
    } catch (jsonError) {
      console.error("SSR JSON parsing error:", jsonError);
      throw new Error("Invalid JSON response from API");
    }

    if (typeof window !== "undefined") {
      trackAPIPerformance("/api/organizations/enhanced", startTime);
    }

    const parsed = z.array(EnhancedOrganizationSchema).parse(
      Array.isArray(organizations) ? organizations : [],
    );

    const enhancedOrganizations = parsed.map(normalizeEnhancedOrg);

    console.log(
      `SSR: Successfully loaded ${enhancedOrganizations.length} organizations`,
    );
    return enhancedOrganizations;
  } catch (error) {
    const err = error as Error;
    console.error("Failed to fetch enhanced organizations (SSR):", {
      error: err.message,
      stack: err.stack,
      apiUrl: process.env.NEXT_PUBLIC_API_URL,
      timestamp: new Date().toISOString(),
    });
    return [];
  }
}

export async function getAllOrganizations(): Promise<ApiOrganization[]> {
  return getOrganizations();
}
