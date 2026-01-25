"use client";

import Layout from "../../components/layout/Layout";
import OrganizationCard from "../../components/organizations/OrganizationCard";
import OrganizationCardSkeleton from "../../components/ui/OrganizationCardSkeleton";
import EmptyState from "../../components/ui/EmptyState";
import {
  useEnhancedOrganizations,
  usePrefetchOrganization,
} from "../../hooks/useOrganizations";
import { reportError, logger } from "../../utils/logger";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import { BreadcrumbSchema } from "../../components/seo";
import { useEffect } from "react";

export default function OrganizationsClient({
  initialData = [],
}) {
  // Use React Query hook with SSR initial data
  const {
    data: organizations = initialData,
    isLoading,
    error,
    refetch,
  } = useEnhancedOrganizations(initialData);

  // Prefetch hook for hover optimization
  const prefetchOrganization = usePrefetchOrganization();

  // Log successful data loads
  useEffect(() => {
    if (organizations && organizations.length > 0 && !isLoading) {
      logger.info("Organizations loaded via React Query", {
        count: organizations.length,
        withStats: organizations.filter((org) => org.total_dogs !== undefined)
          .length,
        withRecentDogs: organizations.filter(
          (org) => org.recent_dogs && org.recent_dogs.length > 0,
        ).length,
        source: initialData.length ? "SSR" : "client-fetch",
      });
    }
  }, [organizations, isLoading, initialData.length]);

  // Log errors
  useEffect(() => {
    if (error) {
      reportError(error, {
        context: "OrganizationsClient.useOrganizations",
      });
    }
  }, [error]);

  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Organizations" },
  ];

  return (
    <Layout>
      {/* SEO: Breadcrumb structured data */}
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs items={breadcrumbItems} />

        <h1 className="text-title text-gray-900 mb-4">Rescue Organizations</h1>
        <p className="text-body text-gray-600 mb-8">
          These organizations work tirelessly to rescue and rehome dogs. By
          adopting through them, you&apos;re supporting their mission to save more
          animals.
        </p>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <p>
              There was an error loading organizations. Please try again later.
            </p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-small font-medium text-red-700 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {Array.from({ length: 6 }, (_, index) => (
              <OrganizationCardSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        ) : organizations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 content-fade-in">
            {organizations.map((org) => (
              <div
                key={org.id}
                onMouseEnter={() => prefetchOrganization(org.slug)}
              >
                <OrganizationCard organization={org} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState variant="noOrganizations" onRefresh={() => refetch()} />
        )}
      </div>
    </Layout>
  );
}
