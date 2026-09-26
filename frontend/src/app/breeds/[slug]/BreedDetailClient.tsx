"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import BreedPhotoGallery from "@/components/breeds/BreedPhotoGallery";
import { BreedInfo } from "@/components/breeds/BreedStatistics";
import BreedPracticalStats from "@/components/breeds/BreedPracticalStats";
import DogsPageClientSimplified from "@/app/dogs/DogsPageClientSimplified";
import useShowAdoptable from "@/hooks/dogs/useShowAdoptable";
import { buildPracticalStats } from "@/utils/breedPracticalStats";
import type { BreedDetailClientProps, SampleDog } from "@/types/breeds";

export function isMixedBreedPage(breedData: { breed_slug?: string; breed_type?: string }): boolean {
  return breedData.breed_slug === "mixed" || breedData.breed_type === "mixed";
}

/**
 * A breed's page (#500): the breed and its practical stats, then its dogs in
 * the catalog itself, with the breed fixed, so the toolbar, chips, sort,
 * lifestyle filters and "Only dogs I can adopt" are the catalog's own.
 */
export default function BreedDetailClient({
  initialBreedData: breedData,
  initialDogs,
  breedCounts,
  metadata,
  lastUpdated,
}: BreedDetailClientProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  const isMixed = isMixedBreedPage(breedData);
  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Breeds", url: "/breeds" },
    { name: breedData.primary_breed, url: isMixed ? "/breeds/mixed" : `/breeds/${breedData.breed_slug}` },
  ];

  const showAdoptable = useShowAdoptable();

  // Links from before #500 filtered by ?available_to_country=; the catalog
  // reads available_country, so carry the old name over once
  useEffect(() => {
    const legacy = searchParams?.get("available_to_country");
    if (!searchParams || !legacy || searchParams.get("available_country")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("available_to_country");
    params.set("available_country", legacy);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const practicalStats = useMemo(() => buildPracticalStats(breedCounts), [breedCounts]);
  const initialParams = useMemo(
    () => (isMixed ? { breed_group: "Mixed" } : { primary_breed: breedData.primary_breed }),
    [isMixed, breedData.primary_breed],
  );

  return (
    <div className="mx-auto max-w-7xl py-6">
      <Breadcrumbs items={breadcrumbItems} schema={false} />

      <div className="mb-8 mt-6 grid grid-cols-1 gap-8 lg:mb-12 lg:mt-8 lg:grid-cols-2 lg:gap-12">
        <BreedPhotoGallery
          dogs={(breedData.topDogs ?? [])
            .filter(
              (dog): dog is SampleDog & { primary_image_url: string } => Boolean(dog.primary_image_url),
            )
            .map((dog, index) => ({
              id: dog.slug || index,
              name: dog.name,
              slug: dog.slug,
              primary_image_url: dog.primary_image_url,
            }))}
          breedName={breedData.primary_breed}
          className="order-2 w-full lg:order-1"
        />

        <BreedInfo
          breedData={breedData}
          adoptableOptions={breedCounts?.available_country_options}
          onShowAdoptable={showAdoptable}
          lastUpdated={lastUpdated}
          className="order-1 lg:order-2"
        />
      </div>

      <BreedPracticalStats stats={practicalStats} />

      <section id="dogs-grid" aria-labelledby="breed-dogs-heading" className="scroll-mt-20">
        <h2 id="breed-dogs-heading" className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {isMixed ? "Mixed breed dogs" : `${breedData.primary_breed} dogs`} listed now
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
