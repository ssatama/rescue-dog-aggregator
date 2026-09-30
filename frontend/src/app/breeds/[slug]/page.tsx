import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import BreedDetailClient from "./BreedDetailClient";
import Layout from "@/components/layout/Layout";
import ServerDogListing from "@/components/dogs/ServerDogListing";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import BreedStructuredData from "@/components/seo/BreedStructuredData";
import {
  getBreedBySlug,
  getAnimals,
  getBreedStats,
  getListCounts,
  getAllMetadata,
} from "@/services/serverAnimalsService";
import { FILTER_DEFAULTS } from "@/constants/filters";
import { averageAgeSentence } from "@/utils/breedMetadata";
import { clampDescription, clampTitle } from "@/utils/seoMeta";

interface BreedPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 604800;

export async function generateMetadata(
  props: BreedPageProps,
): Promise<Metadata> {
  const params = await props.params;
  const breedData = await getBreedBySlug(params.slug);

  if (!breedData) {
    return {
      title: "Breed Not Found",
      description: "The requested breed could not be found.",
    };
  }

  // The facts first, so the clamp cuts the blurb rather than the age
  const seoDescription = clampDescription(
    `${breedData.count} ${breedData.primary_breed} rescue dogs available. ${averageAgeSentence(breedData.average_age_months)}${breedData.description ?? ""}`,
  );

  const keywords = [
    `${breedData.primary_breed} rescue`,
    `${breedData.primary_breed} adoption`,
    `${breedData.primary_breed} dogs for adoption`,
    `${breedData.primary_breed} puppies`,
    `adopt ${breedData.primary_breed}`,
    `${breedData.primary_breed} rescue near me`,
    `${breedData.primary_breed} temperament`,
    `${breedData.primary_breed} personality`,
    breedData.breed_group && `${breedData.breed_group} group dogs`,
    "rescue dogs",
    "dog adoption",
    "adoptable dogs",
  ]
    .filter(Boolean)
    .join(", ");

  return {
    title: clampTitle(`${breedData.primary_breed} Rescue Dogs for Adoption | ${breedData.count} Available Near You`),
    description: seoDescription,
    keywords,
    openGraph: {
      title: `${breedData.count} ${breedData.primary_breed} Dogs Need Homes`,
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
            alt: `${d.name} - ${breedData.primary_breed} rescue dog`,
          })) || [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${breedData.count} ${breedData.primary_breed} Dogs Need Homes`,
      description: seoDescription,
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
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me"}/breeds/${params.slug}`,
    },
  };
}

// Strict: a build during an outage fails, and Vercel keeps the last
// deployment, rather than shipping one with no breed pages prerendered
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const breedStats = await getBreedStats.orThrow();
  return (
    breedStats.qualifying_breeds
      ?.filter((breed) => {
        const isMixed =
          breed.breed_type === "mixed" ||
          breed.breed_group === "Mixed" ||
          breed.primary_breed?.toLowerCase().includes("mix");
        return !isMixed;
      })
      .map((breed) => ({
        slug: breed.breed_slug,
      })) || []
  );
}

async function fetchBreedPageData(slug: string) {
  const breedData = await getBreedBySlug(slug);

  if (!breedData) {
    return null;
  }

  const breedFilter = { primary_breed: breedData.primary_breed };
  // The catalog's first page, in its default order
  const [initialDogs, breedCounts, metadata] = await Promise.all([
    getAnimals.orThrow({ ...breedFilter, sort: FILTER_DEFAULTS.SORT, limit: 20, offset: 0 }),
    getListCounts.orThrow(breedFilter),
    getAllMetadata({ strict: true }),
  ]);

  return { breedData, initialDogs, breedCounts, metadata };
}

export default async function BreedDetailPage(props: BreedPageProps) {
  const params = await props.params;
  const data = await fetchBreedPageData(params.slug);

  if (!data) {
    notFound();
  }

  const { breedData, initialDogs, breedCounts, metadata } = data;

  return (
    <Layout>
      <BreedStructuredData
        breedData={breedData}
        dogs={initialDogs}
        pageType="detail"
      />
      <ErrorBoundary fallbackMessage="Unable to load breed details. Please try refreshing the page.">
        <Suspense
          fallback={
            <ServerDogListing
              title={breedData.primary_breed}
              intro={breedData.description}
              dogs={initialDogs}
            />
          }
        >
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
