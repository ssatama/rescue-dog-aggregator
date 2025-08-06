"use client";

import { useState, useEffect } from "react";
import Layout from "../../components/layout/Layout";
import OrganizationCard from "../../components/organizations/OrganizationCard";
import OrganizationCardSkeleton from "../../components/ui/OrganizationCardSkeleton";
import EmptyState from "../../components/ui/EmptyState";
import { getEnhancedOrganizations } from "../../services/organizationsService";
import { reportError, logger } from "../../utils/logger";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import { BreadcrumbSchema } from "../../components/seo";

export default function OrganizationsClient() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enhancementLoading, setEnhancementLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch enhanced organizations data with statistics and recent dogs
      const data = await getEnhancedOrganizations();
      setOrganizations(data);

      logger.info("Organizations loaded successfully", {
        count: data.length,
        withStats: data.filter((org) => org.total_dogs !== undefined).length,
        withRecentDogs: data.filter(
          (org) => org.recent_dogs && org.recent_dogs.length > 0,
        ).length,
      });
    } catch (err) {
      reportError("Error fetching enhanced organizations", {
        error: err.message,
        stack: err.stack,
      });
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

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
          adopting through them, you're supporting their mission to save more
          animals.
        </p>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <p>
              There was an error loading organizations. Please try again later.
            </p>
            <button
              onClick={fetchOrganizations}
              className="mt-2 text-small font-medium text-red-700 underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {Array.from({ length: 6 }, (_, index) => (
              <OrganizationCardSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        ) : organizations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {organizations.map((org) => (
              <OrganizationCard key={org.id} organization={org} />
            ))}
          </div>
        ) : (
          <EmptyState
            variant="noOrganizations"
            onRefresh={fetchOrganizations}
          />
        )}
      </div>
    </Layout>
  );
}
