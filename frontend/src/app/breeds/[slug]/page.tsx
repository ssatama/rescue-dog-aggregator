import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BreedDetail from "./BreedDetail";
import Layout from "@/components/layout/Layout";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import BreedStructuredData from "@/components/seo/BreedStructuredData";
import {
  getBreedBySlug,
  getMixedBreedPageData,
  getAnimals,
  getListCounts,
  getAllMetadata,
} from "@/services/serverAnimalsService";
import { FILTER_DEFAULTS } from "@/constants/filters";
import { averageAgeSentence } from "@/utils/breedMetadata";
import { clampDescription, fitTitle } from "@/utils/seoMeta";

interface BreedPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 604800;

const MIXED = "mixed";

// /breeds/mixed is the Mixed group, every other slug a breed
function getBreedPageData(slug: string) {
  return slug === MIXED ? getMixedBreedPageData() : getBreedBySlug(slug);
}

const MIXED_KEYWORDS = [
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

export async function generateMetadata(
  props: BreedPageProps,
): Promise<Metadata> {
  const params = await props.params;
  const breedData = await getBreedPageData(params.slug);

  if (!breedData) {
    return {
      title: "Breed Not Found",
      description: "The requested breed could not be found.",
    };
  }

  const isMixed = params.slug === MIXED;
  const avgAge = averageAgeSentence(breedData.average_age_months);
  // The facts first, so the clamp cuts the blurb rather than the age
  const seoDescription = clampDescription(
    isMixed
      ? `Discover ${breedData.count} unique mixed breed rescue dogs waiting for homes. ${avgAge}Each with special personality and story. Browse by size and age.`
      : `${breedData.count} ${breedData.primary_breed} rescue dogs available. ${avgAge}${breedData.description ?? ""}`,
  );

  const keywords = isMixed ? MIXED_KEYWORDS : [
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
  const dogsLabel = isMixed ? "Mixed Breed" : breedData.primary_breed;

  return {
    // The count is every country's: "Near You" would claim a location filter
    title: fitTitle(`${dogsLabel} Rescue Dogs for Adoption`, ` | ${breedData.count} Available`),
    description: seoDescription,
    keywords,
    openGraph: {
      title: `${breedData.count} ${dogsLabel} Dogs Need Homes`,
      description: seoDescription,
      images:
        breedData.topDogs
          ?.slice(0, 4)
          .map((d) => ({
            url: d.primary_image_url,
            width: 800,
            height: 600,
            alt: `${d.name} - ${isMixed ? "Mixed breed" : breedData.primary_breed} rescue dog`,
          })) || [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${breedData.count} ${dogsLabel} Dogs Need Homes`,
      description: seoDescription,
      images:
        breedData.topDogs
          ?.slice(0, 1)
          .map((d) => d.primary_image_url) || [],
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me"}/breeds/${params.slug}`,
    },
  };
}

// Nothing is prerendered at build: each breed page, /breeds/mixed included,
// renders on its first request and ISR caches it. Its fetches are strict
// (#659): a failed render keeps the last good page, or none, rather than
// cache one without its dogs; and no breed fetch can fail a deploy
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

async function fetchBreedPageData(slug: string) {
  // The breed first: with no such breed (or no Mixed group) the page 404s
  const breedData = await getBreedPageData(slug);

  if (!breedData) {
    return null;
  }

  const breedFilter = slug === MIXED ? { breed_group: "Mixed" } : { primary_breed: breedData.primary_breed };
  // The catalog's first page, in its default order
  const [initialDogs, breedCounts, metadata] = await Promise.all([
    getAnimals({ ...breedFilter, sort: FILTER_DEFAULTS.SORT, limit: 20, offset: 0 }),
    getListCounts(breedFilter),
    getAllMetadata(),
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
        <BreedDetail
          initialBreedData={breedData}
          initialDogs={initialDogs}
          breedCounts={breedCounts}
          metadata={metadata}
        />
      </ErrorBoundary>
    </Layout>
  );
}
