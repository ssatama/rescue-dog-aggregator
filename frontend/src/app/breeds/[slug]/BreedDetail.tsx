import { Suspense } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { cn } from "@/lib/utils";
import BreedPhotoGallery from "@/components/breeds/BreedPhotoGallery";
import { BreedInfo } from "@/components/breeds/BreedStatistics";
import BreedPracticalStats from "@/components/breeds/BreedPracticalStats";
import ServerDogListing from "@/components/dogs/ServerDogListing";
import { buildPracticalStats } from "@/utils/breedPracticalStats";
import type { BreedDetailProps } from "@/types/breeds";
import BreedCatalog from "./BreedCatalog";

// Only /breeds/mixed: a mixed-type breed with a page of its own lists its own dogs
function isMixedBreedPage(breedData: { breed_slug?: string }): boolean {
  return breedData.breed_slug === "mixed";
}

/**
 * A breed's page (#500): the breed and its practical stats, then its dogs in
 * the catalog itself, with the breed fixed, so the toolbar, chips, sort,
 * lifestyle filters and "Only dogs I can adopt" are the catalog's own.
 *
 * Everything above the list renders on the server. Only the catalog reads
 * the URL, so only it waits for the browser, behind its own Suspense (#663).
 */
export default function BreedDetail({
  initialBreedData: breedData,
  initialDogs,
  breedCounts,
  metadata,
}: BreedDetailProps) {
  const isMixed = isMixedBreedPage(breedData);
  const breadcrumbItems = [
    { name: "Home", url: "/" },
    { name: "Breeds", url: "/breeds" },
    { name: breedData.primary_breed, url: isMixed ? "/breeds/mixed" : `/breeds/${breedData.breed_slug}` },
  ];

  const galleryDogs = breedData.topDogs ?? [];

  const initialParams = isMixed ? { breed_group: "Mixed" } : { primary_breed: breedData.primary_breed };

  return (
    <div className="mx-auto max-w-7xl py-6">
      <Breadcrumbs items={breadcrumbItems} schema={false} />

      <div
        className={cn(
          "mb-8 mt-6 grid grid-cols-1 gap-8 lg:mb-12 lg:mt-8 lg:gap-12",
          galleryDogs.length > 0 && "lg:grid-cols-2",
        )}
      >
        <BreedPhotoGallery
          dogs={galleryDogs}
          breedName={breedData.primary_breed}
          className="order-2 w-full lg:order-1"
        />

        <BreedInfo
          breedData={breedData}
          adoptableOptions={breedCounts?.available_country_options}
          className="order-1 lg:order-2"
        />
      </div>

      <BreedPracticalStats stats={buildPracticalStats(breedCounts)} />

      <section id="dogs-grid" aria-labelledby="breed-dogs-heading" className="scroll-mt-20">
        <h2 id="breed-dogs-heading" className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {isMixed ? "Mixed breed dogs" : `${breedData.primary_breed} dogs`} listed now
        </h2>
        <Suspense fallback={<ServerDogListing dogs={initialDogs} />}>
          <BreedCatalog initialDogs={initialDogs} metadata={metadata} initialParams={initialParams} />
        </Suspense>
      </section>
    </div>
  );
}
