import type { Metadata } from "next";
import { Suspense } from "react";
import BreedDetailClient from "../[slug]/BreedDetailClient";
import Layout from "@/components/layout/Layout";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import BreedDetailSkeleton from "@/components/ui/BreedDetailSkeleton";
import BreedStructuredData from "@/components/seo/BreedStructuredData";
import {
  getMixedBreedPageData,
  getAnimals,
  getListCounts,
  getAllMetadata,
} from "@/services/serverAnimalsService";
import { FILTER_DEFAULTS } from "@/constants/filters";
import { averageAgeSentence } from "@/utils/breedMetadata";
import { clampDescription, fitTitle } from "@/utils/seoMeta";

export const revalidate = 604800;

export async function generateMetadata(): Promise<Metadata> {
  const breedData = await getMixedBreedPageData();

  const avgAge = averageAgeSentence(breedData.average_age_months);

  const seoDescription = clampDescription(
    `Discover ${breedData.count} unique mixed breed rescue dogs waiting for homes. ${avgAge}Each with special personality and story. Browse by size and age.`,
  );

  const keywords = [
    "mixed breed rescue",
    "mixed breed dogs for adoption",
    "mixed breed puppies",
    "mutt adoption",
    "crossbreed dogs",
    "hybrid dogs for adoption",
    "unique rescue dogs",
    "mixed puppies for adoption",
    "adopt mixed breed",
    "mixed breed rescue near me",
    "rescue mutts",
    "designer mix dogs",
    "rescue dogs",
    "dog adoption",
  ].join(", ");

  return {
    title: fitTitle("Mixed Breed Rescue Dogs for Adoption", ` | ${breedData.count} Unique Dogs Available`),
    description: seoDescription,
    keywords,
    openGraph: {
      title: `${breedData.count} Mixed Breed Dogs Need Loving Homes`,
      description: seoDescription,
      images:
        breedData.topDogs
          ?.filter(
            (d): d is typeof d & { primary_image_url: string } =>
              Boolean(d.primary_image_url),
          )
          .slice(0, 4)
          .map((d) => ({
            url: d.primary_image_url,
            width: 800,
            height: 600,
            alt: `${d.name} - Mixed breed rescue dog`,
          })) || [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${breedData.count} Mixed Breed Dogs Need Homes`,
      description: `Unique personalities from diverse backgrounds. Find your perfect mixed breed rescue dog.`,
      images:
        breedData.topDogs
          ?.filter(
            (d): d is typeof d & { primary_image_url: string } =>
              Boolean(d.primary_image_url),
          )
          .slice(0, 1)
          .map((d) => d.primary_image_url) || [],
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me"}/breeds/mixed`,
    },
  };
}

async function fetchMixedBreedData() {
  // The breed, and the catalog's first page in its default order
  const [breedData, initialDogs, breedCounts, metadata] = await Promise.all([
    getMixedBreedPageData(),
    getAnimals.orThrow({ breed_group: "Mixed", sort: FILTER_DEFAULTS.SORT, limit: 20, offset: 0 }),
    getListCounts.orThrow({ breed_group: "Mixed" }),
    getAllMetadata({ strict: true }),
  ]);

  return { breedData, initialDogs, breedCounts, metadata };
}

export default async function MixedBreedsPage() {
  const { breedData, initialDogs, breedCounts, metadata } = await fetchMixedBreedData();

  // The same frame as every other breed page: the site header was missing here
  return (
    <Layout>
      <BreedStructuredData
        breedData={breedData}
        dogs={initialDogs}
        pageType="detail"
      />
      <ErrorBoundary fallbackMessage="Unable to load mixed breeds. Please try refreshing the page.">
        <Suspense fallback={<BreedDetailSkeleton />}>
          <BreedDetailClient
            initialBreedData={breedData}
            initialDogs={initialDogs}
            breedCounts={breedCounts}
            metadata={metadata}
          />
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}
