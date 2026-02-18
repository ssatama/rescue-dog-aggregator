import type { Metadata } from "next";

import BreedsHubClient from "./BreedsHubClient";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { getBreedStats, clearCache } from "@/services/serverAnimalsService";
import {
  getMixedBreedData,
  getPopularBreedsWithImages,
  getBreedGroupsWithTopBreeds,
} from "@/services/breedImagesService";
import BreedStructuredData from "@/components/seo/BreedStructuredData";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const breedStats = await getBreedStats();
  const totalDogs = Number(breedStats?.total_dogs || 2717);
  const uniqueBreeds = Number(breedStats?.unique_breeds || 259);
  const qualifyingBreedsCount = breedStats?.qualifying_breeds?.length || 26;

  return {
    title: `Dog Breeds | ${totalDogs.toLocaleString()} Rescue Dogs Across ${uniqueBreeds} Breeds`,
    description:
      `Discover rescue dogs by breed. Browse ${qualifyingBreedsCount} popular breeds with dedicated pages, personality profiles, and real-time availability from verified rescue organizations.`,
    keywords:
      "rescue dogs by breed, dog breeds for adoption, breed-specific rescue, purebred rescue dogs, mixed breed dogs, dog breed finder, rescue dog breeds, adoptable dog breeds",
    openGraph: {
      title: "Find Rescue Dogs by Breed",
      description:
        "Browse rescue dogs by breed with personality profiles and real-time availability.",
      images: ["/og-image.png"],
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me"}/breeds`,
    },
  };
}

async function fetchBreedsData() {
  const [breedStats, mixedBreedData, popularBreeds, breedGroups] =
    await Promise.all([
      getBreedStats(),
      getMixedBreedData(),
      getPopularBreedsWithImages(8),
      getBreedGroupsWithTopBreeds(),
    ]);
  return { breedStats, mixedBreedData, popularBreeds, breedGroups };
}

export default async function BreedsPage() {
  let { breedStats, mixedBreedData, popularBreeds, breedGroups } =
    await fetchBreedsData();

  // Retry once if all sections empty (cold-start resilience)
  const allEmpty =
    !mixedBreedData &&
    popularBreeds.length === 0 &&
    breedGroups.length === 0;

  if (allEmpty) {
    clearCache();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    ({ breedStats, mixedBreedData, popularBreeds, breedGroups } =
      await fetchBreedsData());
  }

  // Since data is fetched before rendering, Suspense won't trigger
  // The loading state would be handled by Next.js loading.jsx if needed
  return (
    <>
      <BreedStructuredData
        breedData={{
          primary_breed: "All Breeds",
          count: breedStats?.total_dogs ?? 0,
          unique_breeds: breedStats?.total_breeds,
          qualifying_breeds: breedStats?.qualifying_breeds?.map((b) => ({
            primary_breed: b.primary_breed,
            breed_slug: b.breed_slug,
            count: b.count,
          })),
        }}
        pageType="hub"
      />
      <ErrorBoundary fallbackMessage="Unable to load breeds page. Please try refreshing the page.">
        <BreedsHubClient
          initialBreedStats={breedStats}
          mixedBreedData={mixedBreedData}
          popularBreedsWithImages={popularBreeds}
          breedGroups={breedGroups}
        />
      </ErrorBoundary>
    </>
  );
}
