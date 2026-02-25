import type { Metadata } from "next";

import BreedsHubClient from "./BreedsHubClient";
import Layout from "@/components/layout/Layout";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { getBreedStats, clearCache } from "@/services/serverAnimalsService";
import {
  getMixedBreedData,
  getPopularBreedsWithImages,
  getBreedGroupsWithTopBreeds,
} from "@/services/breedImagesService";
import BreedStructuredData from "@/components/seo/BreedStructuredData";
import { logger, reportError } from "@/utils/logger";

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

function isEmptyBreedsData(data: Awaited<ReturnType<typeof fetchBreedsData>>): boolean {
  const breedStatsError = "error" in data.breedStats && data.breedStats.error === true;
  return (
    breedStatsError ||
    (!data.mixedBreedData &&
      data.popularBreeds.length === 0 &&
      data.breedGroups.length === 0)
  );
}

export default async function BreedsPage() {
  const initialData = await fetchBreedsData();

  // Retry once if all sections empty (cold-start resilience)
  const data = isEmptyBreedsData(initialData)
    ? (logger.warn("Breeds page: all sections empty, retrying (cold-start resilience)"),
      clearCache(),
      await new Promise((r) => setTimeout(r, 500)),
      await fetchBreedsData())
    : initialData;

  if (isEmptyBreedsData(data) && isEmptyBreedsData(initialData)) {
    reportError(new Error("Breeds page: retry also returned empty data"), {
      context: "BreedsPage",
    });
  }

  const { breedStats, mixedBreedData, popularBreeds, breedGroups } = data;

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
        />
      </ErrorBoundary>
    </Layout>
  );
}
