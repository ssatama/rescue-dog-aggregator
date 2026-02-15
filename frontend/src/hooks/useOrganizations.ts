import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOrganizations,
  getEnhancedOrganizations,
} from "@/services/organizationsService";

export interface Organization {
  id: number;
  name: string;
  description: string;
  logo_url: string | null;
  website_url: string;
  country: string;
  city: string;
  social_media: Record<string, string>;
  service_regions: string[];
  ships_to: string[];
  slug: string;
  total_dogs: number;
  new_this_week: number;
  recent_dogs?: Array<{
    id: number;
    name: string;
    image_url: string;
    thumbnail_url?: string;
  }>;
}

// Query keys factory for better organization
export const organizationKeys = {
  all: ["organizations"] as const,
  lists: () => [...organizationKeys.all, "list"] as const,
  list: (filters?: Record<string, any>) =>
    [...organizationKeys.lists(), filters] as const,
  enhanced: () => [...organizationKeys.all, "enhanced"] as const,
  details: () => [...organizationKeys.all, "detail"] as const,
  detail: (id: number | string) => [...organizationKeys.details(), id] as const,
};

// Hook for fetching enhanced organizations with SSR support
export function useEnhancedOrganizations(initialData?: Organization[]) {
  return useQuery({
    queryKey: organizationKeys.enhanced(),
    queryFn: getEnhancedOrganizations,
    initialData: initialData as Awaited<ReturnType<typeof getEnhancedOrganizations>> | undefined,
    // With SSR, we have fresh data, so set a longer stale time
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Keep data in cache for 30 minutes
    gcTime: 30 * 60 * 1000,
    // Always refetch if SSR returned empty data to ensure client-side fallback
    refetchOnMount: !initialData || (initialData && initialData.length === 0),
    refetchOnWindowFocus: false,
    // Enable retries with exponential backoff for production resilience
    retry: (failureCount, error) => {
      // Don't retry for 4xx errors (client errors)
      if (error?.message?.includes("4")) {
        return false;
      }
      // Retry up to 2 times for 5xx errors (server errors)
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Hook for fetching organizations with filters
export function useOrganizations(filters?: Record<string, any>) {
  return useQuery({
    queryKey: organizationKeys.list(filters),
    queryFn: () => getOrganizations(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Hook for prefetching organizations (useful for hover prefetch)
export function usePrefetchOrganization() {
  const queryClient = useQueryClient();

  return (organizationSlug: string) => {
    queryClient.prefetchQuery({
      queryKey: organizationKeys.detail(organizationSlug),
      queryFn: async () => {
        // This would fetch organization detail
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/organizations/${organizationSlug}`,
        );
        if (!response.ok) throw new Error("Failed to fetch organization");
        return response.json();
      },
      staleTime: 5 * 60 * 1000,
    });
  };
}

// Hook for invalidating organization queries (useful after mutations)
export function useInvalidateOrganizations() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: organizationKeys.all });
  };
}
