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
import { breedCatalogHref, getIndexableBreeds } from "@/utils/indexableBreeds";
import { isBreedType } from "@/utils/breedTypes";
import type { BreedStats } from "@/schemas/animals";

export const revalidate = 604800;

// The breeds the hub lists (#668): those with a page, then the ones too small
// for one. Types like "Hound" and mixes are listed, but aren't breeds
function listedBreeds(breedStats: BreedStats) {
  const withPage = getIndexableBreeds(breedStats.qualifying_breeds).filter((breed) => !isBreedType(breed.primary_breed));
  return { withPage, other: breedStats.other_breeds ?? [] };
}

export async function generateMetadata(): Promise<Metadata> {
  const breedStats = await getBreedStats();
  const { withPage, other } = listedBreeds(breedStats);

  return {
    title: `Dog Breeds | ${formatCount(breedStats.total_dogs)} Rescue Dogs Across ${withPage.length + other.length} Breeds`,
    description: clampDescription(`Discover rescue dogs by breed. Browse ${withPage.length} breeds with their own page, personality profiles, and real-time availability from verified rescue organizations.`),
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
    // Extra, so the tiles stay full after mixes and types are left out (#669)
    getPopularBreedsWithImages(12),
    getBreedGroupsWithTopBreeds(),
  ]);
  const searchableBreeds = [
    ...getIndexableBreeds(breedStats.qualifying_breeds).map((breed) => ({
      name: breed.primary_breed,
      href: `/breeds/${breed.breed_slug}`,
      count: breed.count,
    })),
    ...listedBreeds(breedStats).other.map((breed) => ({
      name: breed.primary_breed,
      href: breedCatalogHref(breed.primary_breed),
      count: breed.count,
    })),
    ...(mixedBreedData?.count ? [{ name: "Mixed breeds", href: "/breeds/mixed", count: mixedBreedData.count }] : []),
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
      <AllBreedsIndex breeds={breedStats.qualifying_breeds} otherBreeds={breedStats.other_breeds} />
    </Layout>
  );
}
