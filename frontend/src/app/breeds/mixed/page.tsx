import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import BreedDetailClient from "../[slug]/BreedDetailClient";
import BreedDetailSkeleton from "@/components/ui/BreedDetailSkeleton";
import BreedStructuredData from "@/components/seo/BreedStructuredData";
import {
  getBreedBySlug,
  getAnimals,
} from "@/services/serverAnimalsService";
import { logger, reportError } from "@/utils/logger";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const breedData = await getBreedBySlug("mixed");

    if (!breedData) {
      return {
        title: "Mixed Breed Rescue Dogs for Adoption",
        description: "Find unique mixed breed rescue dogs for adoption.",
      };
    }

    const avgAge = breedData.average_age
      ? `Average age ${Math.round(breedData.average_age)} years. `
      : "";
    const locations =
      breedData.top_locations?.slice(0, 3).join(", ") || "multiple locations";

    const seoDescription = `Discover ${breedData.count} unique mixed breed rescue dogs waiting for homes. ${avgAge}Each with special personality and story. Browse by size, age in ${locations}.`;

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
      title: `Mixed Breed Rescue Dogs for Adoption | ${breedData.count} Unique Dogs Available`,
      description: seoDescription.substring(0, 160),
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
  } catch (error) {
    reportError(error, { context: "mixed-generateMetadata" });
    logger.error("Error generating metadata:", error);
    return {
      title: "Mixed Breed Rescue Dogs",
      description: "Find unique mixed breed rescue dogs for adoption",
    };
  }
}

async function fetchMixedBreedData() {
  const breedData = await getBreedBySlug("mixed");

  if (!breedData) {
    return null;
  }

  const initialDogs = await getAnimals({
    breed_group: "Mixed",
    limit: 12,
    offset: 0,
  });

  return { breedData, initialDogs };
}

export default async function MixedBreedsPage() {
  const data = await fetchMixedBreedData();

  if (!data) {
    notFound();
  }

  const { breedData, initialDogs } = data;

  return (
    <>
      <BreedStructuredData
        breedData={breedData}
        dogs={initialDogs}
        pageType="detail"
      />
      <Suspense fallback={<BreedDetailSkeleton />}>
        <BreedDetailClient
          initialBreedData={breedData}
          initialDogs={initialDogs}
        />
      </Suspense>
    </>
  );
}
