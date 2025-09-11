import { Suspense } from "react";
import { notFound } from "next/navigation";
import BreedDetailClient from "./BreedDetailClient";
import BreedDetailSkeleton from "@/components/ui/BreedDetailSkeleton";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import {
  getBreedBySlug,
  getAnimals,
  getBreedStats,
} from "@/services/serverAnimalsService";

export const revalidate = 3600;

export async function generateMetadata(props) {
  try {
    const params = await props.params;
    const breedData = await getBreedBySlug(params.slug);

    if (!breedData) {
      return {
        title: "Breed Not Found",
        description: "The requested breed could not be found.",
      };
    }

    // Import breed descriptions for enhanced SEO
    const { default: breedDescriptions } = await import('@/utils/breedDescriptions');
    const breedKey = breedData.primary_breed.toLowerCase().replace(/\s+/g, '_');
    const description = breedDescriptions[breedKey];
    
    const seoDescription = description?.tagline 
      ? `${description.tagline} Find ${breedData.count} ${breedData.primary_breed} rescue dogs for adoption from verified organizations.`
      : `Find ${breedData.count} ${breedData.primary_breed} rescue dogs for adoption. View photos, personality profiles, and apply from verified rescue organizations.`;

    return {
      title: `${breedData.primary_breed} Rescue Dogs | ${breedData.count} Available for Adoption`,
      description: seoDescription,
      keywords: [
        `${breedData.primary_breed} rescue`,
        `${breedData.primary_breed} adoption`,
        `${breedData.primary_breed} dogs`,
        'rescue dogs',
        'dog adoption',
        breedData.breed_group && `${breedData.breed_group} group dogs`
      ].filter(Boolean).join(', '),
      openGraph: {
        title: `${breedData.count} ${breedData.primary_breed} Dogs Need Homes`,
        description: seoDescription,
        images:
          breedData.topDogs
            ?.filter((d) => d.primary_image_url)
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
        images: breedData.topDogs
          ?.filter((d) => d.primary_image_url)
          .slice(0, 1)
          .map((d) => d.primary_image_url) || [],
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Breed Details",
      description: "View rescue dogs by breed",
    };
  }
}

export async function generateStaticParams() {
  try {
    const breedStats = await getBreedStats();
    return (
      breedStats.qualifying_breeds?.map((breed) => ({
        slug: breed.breed_slug,
      })) || []
    );
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

export default async function BreedDetailPage(props) {
  try {
    const params = await props.params;

    const breedData = await getBreedBySlug(params.slug);

    if (!breedData) {
      notFound();
    }

    const initialDogsResponse = await getAnimals({
      breed: breedData.primary_breed,
      limit: 12,
      offset: 0,
    });

    const initialDogs = initialDogsResponse?.results || [];

    return (
      <ErrorBoundary fallbackMessage="Unable to load breed details. Please try refreshing the page.">
        <Suspense fallback={<BreedDetailSkeleton />}>
          <BreedDetailClient
            initialBreedData={breedData}
            initialDogs={initialDogs}
            initialParams={{}}
          />
        </Suspense>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error("Error loading breed page:", error);
    notFound();
  }
}
