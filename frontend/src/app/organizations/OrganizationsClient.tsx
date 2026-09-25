"use client";

import { useEffect, useMemo } from "react";
import RescueCard from "../../components/organizations/RescueCard";
import OrganizationCardSkeleton from "../../components/ui/OrganizationCardSkeleton";
import EmptyState from "../../components/ui/EmptyState";
import type { Organization } from "../../hooks/useOrganizations";
import { useEnhancedOrganizations } from "../../hooks/useOrganizations";
import { reportError } from "../../utils/logger";
import Breadcrumbs from "../../components/ui/Breadcrumbs";
import type { OrganizationsClientProps } from "@/types/pageComponents";
import type { OrganizationCardData } from "@/types/organizationComponents";

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6";

/** The rescues index (#501): every rescue as one calm card. */
export default function OrganizationsClient({
  initialData = [],
}: OrganizationsClientProps) {
  const {
    data = initialData,
    isLoading,
    error,
    refetch,
  } = useEnhancedOrganizations(initialData as unknown as Organization[]);
  const organizations = data as unknown as OrganizationCardData[];

  const countryCount = useMemo(
    () => new Set(organizations.map((org) => org.country).filter(Boolean)).size,
    [organizations],
  );

  useEffect(() => {
    if (error) {
      reportError(error, {
        context: "OrganizationsClient.useOrganizations",
      });
    }
  }, [error]);

  return (
    <div className="mx-auto max-w-7xl py-6 lg:py-8">
      <Breadcrumbs items={[{ name: "Home", url: "/" }, { name: "Rescues" }]} />

      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Rescue organizations
      </h1>
      <p className="mt-2 max-w-2xl text-base text-subtle">
        {organizations.length > 0 && countryCount > 0
          ? `${organizations.length} rescues in ${countryCount} ${countryCount === 1 ? "country" : "countries"}. `
          : ""}
        Every dog here is listed by one of them, and you adopt through the rescue.
      </p>

      {error && (
        <div className="mt-6 rounded-lg border border-line bg-bad-soft px-4 py-3 text-bad">
          <p>We couldn&apos;t load the rescues. Please try again.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-2 text-sm font-medium underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <div className={GRID}>
            {Array.from({ length: 6 }, (_, index) => (
              <OrganizationCardSkeleton key={`skeleton-${index}`} />
            ))}
          </div>
        ) : organizations.length > 0 ? (
          <ul className={GRID}>
            {organizations.map((org) => (
              <li key={org.id}>
                <RescueCard organization={org} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState variant="noOrganizations" onRefresh={() => refetch()} />
        )}
      </div>
    </div>
  );
}
