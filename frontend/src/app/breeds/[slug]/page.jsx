import { Suspense } from "react";
import { notFound } from "next/navigation";
import BreedDetailClient from "./BreedDetailClient";
import BreedDetailSkeleton from "@/components/ui/BreedDetailSkeleton";
import {
  getBreedBySlug,
  getAnimals,
  getBreedStats,
} from "@/services/serverAnimalsService";

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  try {
    const resolvedParams = await params;
    const breedData = await getBreedBySlug(resolvedParams.slug);

    if (!breedData) {
      return {
        title: "Breed Not Found",
        description: "The requested breed could not be found.",
      };
    }

    return {
      title: `${breedData.primary_breed} Rescue Dogs | ${breedData.count} Available for Adoption`,
      description: `Find ${breedData.count} ${breedData.primary_breed} rescue dogs for adoption. View photos, personality profiles, and apply from verified rescue organizations.`,
      openGraph: {
        title: `${breedData.count} ${breedData.primary_breed} Dogs Need Homes`,
        description: `Browse ${breedData.primary_breed} rescue dogs with personality profiles and real-time availability.`,
        images:
          breedData.topDogs?.slice(0, 4).map((d) => ({
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
        description: `Browse ${breedData.primary_breed} rescue dogs with personality profiles and real-time availability.`,
        images: breedData.topDogs?.[0]?.primary_image_url
          ? [breedData.topDogs[0].primary_image_url]
          : [],
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
    const searchParams = await props.searchParams;

    const breedData = await getBreedBySlug(params.slug);

    if (!breedData) {
      notFound();
    }

    const initialDogsResponse = await getAnimals({
      breed: breedData.primary_breed,
      limit: 12,
      offset: 0,
    });

    const initialDogs =
      initialDogsResponse?.results || initialDogsResponse || [];

    return (
      <Suspense fallback={<BreedDetailSkeleton />}>
        <BreedDetailClient
          initialBreedData={breedData}
          initialDogs={initialDogs}
          initialParams={searchParams || {}}
        />
      </Suspense>
    );
  } catch (error) {
    console.error("Error loading breed page:", error);
    notFound();
  }
}
