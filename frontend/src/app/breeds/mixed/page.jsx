import { Suspense } from "react";
import { notFound } from "next/navigation";
import BreedDetailClient from "../[slug]/BreedDetailClient";
import BreedDetailSkeleton from "@/components/ui/BreedDetailSkeleton";
import {
  getBreedBySlug,
  getAnimals,
  getBreedStats,
} from "@/services/serverAnimalsService";

export const revalidate = 3600;

export async function generateMetadata() {
  try {
    const breedData = await getBreedBySlug("mixed");
    
    const seoDescription = `Discover ${breedData.count} unique mixed breed rescue dogs waiting for homes. Each one has a special personality and story. Browse by size, age, and location.`;

    return {
      title: `Mixed Breed Rescue Dogs | ${breedData.count} Available for Adoption`,
      description: seoDescription,
      keywords: [
        'mixed breed rescue',
        'mixed breed adoption',
        'mixed breed dogs',
        'rescue dogs',
        'dog adoption',
        'unique dogs',
        'crossbreed dogs',
        'mutt adoption'
      ].join(', '),
      openGraph: {
        title: `${breedData.count} Mixed Breed Dogs Need Loving Homes`,
        description: seoDescription,
        images:
          breedData.topDogs
            ?.filter((d) => d.primary_image_url)
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
        images: breedData.topDogs
          ?.filter((d) => d.primary_image_url)
          .slice(0, 1)
          .map((d) => d.primary_image_url) || [],
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Mixed Breed Rescue Dogs",
      description: "Find unique mixed breed rescue dogs for adoption",
    };
  }
}

export default async function MixedBreedsPage(props) {
  try {
    const params = await props.params;

    // Get mixed breed data using the enhanced getBreedBySlug function
    const breedData = await getBreedBySlug("mixed");

    if (!breedData) {
      notFound();
    }

    // Get initial dogs for mixed breeds
    const initialDogsResponse = await getAnimals({
      breed_group: "Mixed",
      limit: 12,
      offset: 0,
    });

    const initialDogs = initialDogsResponse?.results || [];

    // Use the same BreedDetailClient component as other breed pages
    return (
      <Suspense fallback={<BreedDetailSkeleton />}>
        <BreedDetailClient
          initialBreedData={breedData}
          initialDogs={initialDogs}
          initialParams={{}}
        />
      </Suspense>
    );
  } catch (error) {
    console.error("Error loading mixed breeds page:", error);
    notFound();
  }
}