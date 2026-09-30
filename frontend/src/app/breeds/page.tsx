import { formatCount } from "@/utils/formatCount";
import { clampDescription } from "@/utils/seoMeta";
import type { Metadata } from "next";

import BreedsHubClient from "./BreedsHubClient";
import Layout from "@/components/layout/Layout";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { getBreedStats } from "@/services/serverAnimalsService";
import {
  getMixedBreedData,
  getPopularBreedsWithImages,
  getBreedGroupsWithTopBreeds,
} from "@/services/breedImagesService";
import BreedStructuredData from "@/components/seo/BreedStructuredData";
import AllBreedsIndex from "@/components/breeds/AllBreedsIndex";
import { getIndexableBreeds } from "@/utils/indexableBreeds";

export const revalidate = 604800;

export async function generateMetadata(): Promise<Metadata> {
  const breedStats = await getBreedStats();
  const totalDogs = Number(breedStats?.total_dogs || 2717);
  const uniqueBreeds = Number(breedStats?.unique_breeds || 259);
  const qualifyingBreedsCount = breedStats?.qualifying_breeds?.length || 26;

  return {
    title: `Dog Breeds | ${formatCount(totalDogs)} Rescue Dogs Across ${uniqueBreeds} Breeds`,
    description: clampDescription(`Discover rescue dogs by breed. Browse ${qualifyingBreedsCount} popular breeds with dedicated pages, personality profiles, and real-time availability from verified rescue organizations.`),
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

export default async function BreedsPage() {
  // Any of these failing fails the render, which keeps the last good hub (#675)
  const [breedStats, mixedBreedData, popularBreeds, breedGroups] = await Promise.all([
    getBreedStats(),
    getMixedBreedData(),
    getPopularBreedsWithImages(8),
    getBreedGroupsWithTopBreeds(),
  ]);
  const searchableBreeds = [
    ...getIndexableBreeds(breedStats?.qualifying_breeds).map((breed) => ({
      name: breed.primary_breed,
      slug: breed.breed_slug,
      count: breed.count,
    })),
    ...(mixedBreedData?.count ? [{ name: "Mixed breeds", slug: "mixed", count: mixedBreedData.count }] : []),
  ];

  return (
    <Layout>
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
          searchableBreeds={searchableBreeds}
        />
      </ErrorBoundary>
      <AllBreedsIndex breeds={breedStats?.qualifying_breeds} />
    </Layout>
  );
}
