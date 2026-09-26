"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Breadcrumbs from "../../../components/ui/Breadcrumbs";
import RescueHeader from "../../../components/organizations/RescueHeader";
import DogsPageClientSimplified from "../../dogs/DogsPageClientSimplified";
import { trackOrgPageView } from "@/lib/monitoring/breadcrumbs";
import { trackOrganizationViewed } from "@/lib/analytics";
import type { OrganizationDetailClientProps } from "@/types/pageComponents";

/**
 * A rescue's page (#501): who they are and where they rehome to, then their
 * dogs in the catalog itself with the rescue fixed, so the count, chips,
 * sort, lifestyle filters and "Only dogs I can adopt" are the catalog's own
 * and the list takes the same URL params as /dogs.
 */
export default function OrganizationDetailClient({
  organization,
  initialDogs,
  metadata,
  counts,
}: OrganizationDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!organization.slug) return;
    trackOrganizationViewed(organization.slug, organization.total_dogs ?? 0);
    trackOrgPageView(organization.slug, organization.total_dogs ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per organization
  }, [organization.slug]);

  // The list's own filter, set through the URL the catalog reads
  const showAdoptable = useCallback(
    (countryValue: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("available_country", countryValue);
      params.delete("available_region");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById("dogs-grid")?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    },
    [router, pathname, searchParams],
  );

  const initialParams = useMemo(() => ({ organization_id: String(organization.id) }), [organization.id]);

  return (
    <div className="mx-auto max-w-7xl py-6">
      <Breadcrumbs
        items={[
          { name: "Home", url: "/" },
          { name: "Rescues", url: "/organizations" },
          { name: organization.name },
        ]}
        schema={false}
      />

      <div className="mb-8 mt-6 lg:mb-10">
        <RescueHeader
          organization={organization}
          adoptableOptions={counts?.available_country_options}
          onShowAdoptable={showAdoptable}
        />
      </div>

      <section id="dogs-grid" aria-labelledby="rescue-dogs-heading" className="scroll-mt-20">
        <h2 id="rescue-dogs-heading" className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
          Their dogs
        </h2>
        <DogsPageClientSimplified
          initialDogs={initialDogs}
          metadata={metadata}
          initialParams={initialParams}
          hideHero
          hideBreadcrumbs
        />
      </section>
    </div>
  );
}
