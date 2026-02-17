"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStatistics } from "../../services/animalsService";
import OrganizationLink from "../ui/OrganizationLink";
import OrganizationCard from "../organizations/OrganizationCard";
import { TrustStatsSkeleton } from "../ui/LoadingSkeleton";
import { reportError } from "../../utils/logger";
import { Button } from "@/components/ui/button";
import type { TrustSectionProps } from "@/types/homeComponents";
import type { OrganizationCardData } from "@/types/organizationComponents";
import type { Statistics } from "@/schemas/animals";

export default function TrustSection({ initialStatistics = null }: TrustSectionProps) {
  const router = useRouter();
  const [statistics, setStatistics] = useState<Statistics | null>(initialStatistics);
  const [loading, setLoading] = useState(!initialStatistics);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch if we don't have initial data
    if (!initialStatistics) {
      const fetchStatistics = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await getStatistics();
          setStatistics(data);
        } catch (err: unknown) {
          reportError(err, {
            context: "TrustSection.fetchStatistics",
          });
          setError("Unable to load statistics. Please try again later.");
        } finally {
          setLoading(false);
        }
      };

      fetchStatistics();
    }
  }, [initialStatistics]);

  if (loading) {
    return (
      <section
        data-testid="trust-section"
        role="region"
        aria-label="Platform statistics and organizations"
        className="py-16 bg-muted"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div data-testid="trust-section-loading">
            <div data-testid="trust-section-skeletons">
              <TrustStatsSkeleton />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        data-testid="trust-section"
        role="region"
        aria-label="Platform statistics and organizations"
        className="py-16 bg-muted"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center" data-testid="trust-section-error">
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!statistics) {
    return null;
  }

  const {
    total_dogs,
    total_organizations,
    countries = [],
    organizations = [],
  } = statistics;

  // Calculate countries count from the countries array (consistent with HeroSection)
  const total_countries = countries.length;

  // Show top 8 organizations for grid display with field mapping
  const topOrganizations: OrganizationCardData[] = organizations.slice(0, 8).map((org) => ({
    ...org,
    total_dogs: org.dog_count || org.total_dogs || 0,
    ships_to: org.ships_to || [],
    service_regions: org.service_regions || [],
    recent_dogs: org.recent_dogs || [],
    new_this_week: org.new_this_week || 0,
    social_media: org.social_media || {},
    logo_url: org.logo_url ?? undefined,
    country: org.country ?? undefined,
    city: org.city ?? undefined,
  }));
  const remainingCount = organizations.length - 8;

  return (
    <section
      data-testid="trust-section"
      role="region"
      aria-label="Platform statistics and organizations"
      className="py-16 bg-muted relative"
    >
      {/* Top gradient border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 via-amber-300 to-orange-400" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Organizations Stat */}
          <div className="bg-card rounded-lg shadow-sm hover:shadow-md dark:shadow-purple-500/10 hover:dark:shadow-purple-500/20 transition-shadow duration-200 p-6 text-center">
            <div
              data-testid="organizations-icon"
              className="w-16 h-16 mx-auto mb-4 bg-orange-100 dark:bg-orange-950/30 rounded-full flex items-center justify-center"
            >
              <svg
                className="w-8 h-8 text-orange-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 8a1 1 0 011-1h4a1 1 0 011 1v4H7v-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div
              className="text-4xl font-bold text-foreground mb-2"
              data-testid="organizations-stat"
            >
              {total_organizations.toLocaleString()}
            </div>
            <div className="text-lg text-muted-foreground">
              Rescue Organizations
            </div>
          </div>

          {/* Dogs Stat */}
          <div className="bg-card rounded-lg shadow-sm hover:shadow-md dark:shadow-purple-500/10 hover:dark:shadow-purple-500/20 transition-shadow duration-200 p-6 text-center">
            <div
              data-testid="dogs-icon"
              className="w-16 h-16 mx-auto mb-4 bg-orange-100 dark:bg-orange-950/30 rounded-full flex items-center justify-center"
            >
              <svg
                className="w-8 h-8 text-orange-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM4 8a1 1 0 000 2h1a1 1 0 100-2H4zm0 4a1 1 0 100 2h1a1 1 0 100-2H4zm4-4a1 1 0 000 2h1a1 1 0 100-2H8zm0 4a1 1 0 100 2h1a1 1 0 100-2H8zm4-4a1 1 0 000 2h1a1 1 0 100-2h-1zm0 4a1 1 0 100 2h1a1 1 0 100-2h-1z" />
              </svg>
            </div>
            <div
              className="text-4xl font-bold text-foreground mb-2"
              data-testid="total-dogs-stat"
            >
              {total_dogs.toLocaleString()}
            </div>
            <div className="text-lg text-muted-foreground">Dogs Available</div>
          </div>

          {/* Countries Stat */}
          <div className="bg-card rounded-lg shadow-sm hover:shadow-md dark:shadow-purple-500/10 hover:dark:shadow-purple-500/20 transition-shadow duration-200 p-6 text-center">
            <div
              data-testid="countries-icon"
              className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-950/30 rounded-full flex items-center justify-center"
            >
              <svg
                className="w-8 h-8 text-green-700"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div
              className="text-4xl font-bold text-foreground mb-2"
              data-testid="countries-stat"
            >
              {total_countries.toLocaleString()}
            </div>
            <div className="text-lg text-muted-foreground">Countries</div>
          </div>
        </div>

        {/* Organizations Grid */}
        <div className="text-center">
          <h2 className="text-section text-foreground mb-6">
            Dogs available from these organizations:
          </h2>

          {/* Organization Cards Grid */}
          <div
            data-testid="organizations-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-6 max-w-7xl mx-auto"
          >
            {topOrganizations.map((org) => (
              <OrganizationCard key={org.id} organization={org} size="small" />
            ))}
          </div>

          {/* Show More Button */}
          {remainingCount > 0 && (
            <Button
              variant="ghost"
              onClick={() => router.push("/organizations")}
              className="text-orange-600 hover:text-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/30"
              data-testid="trust-section-show-more"
            >
              {`+ ${remainingCount} more organization${remainingCount === 1 ? "" : "s"}`}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
