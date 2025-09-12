import { Suspense } from "react";
import { notFound } from "next/navigation";
import BreedDetailClient from "./BreedDetailClient";
import BreedDetailSkeleton from "@/components/ui/BreedDetailSkeleton";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import BreedStructuredData from "@/components/seo/BreedStructuredData";
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
    const { default: breedDescriptions } = await import(
      "@/utils/breedDescriptions"
    );
    const breedKey = breedData.primary_breed.toLowerCase().replace(/\s+/g, "_");
    const description = breedDescriptions[breedKey];

    // Enhanced SEO description with location and age information
    const avgAge = breedData.average_age
      ? `Average age ${Math.round(breedData.average_age)} years. `
      : "";
    const locations =
      breedData.top_locations?.slice(0, 3).join(", ") || "multiple locations";

    const seoDescription = description?.tagline
      ? `${description.tagline} ${breedData.count} ${breedData.primary_breed} rescue dogs available. ${avgAge}Adoptable in ${locations}.`
      : `Find ${breedData.count} ${breedData.primary_breed} rescue dogs for adoption. ${avgAge}View photos, profiles, and apply from verified rescues in ${locations}.`;

    // Build comprehensive keywords
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
      title: `${breedData.primary_breed} Rescue Dogs for Adoption | ${breedData.count} Available Near You`,
      description: seoDescription.substring(0, 160), // Keep under 160 chars
      keywords,
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
        description: seoDescription.substring(0, 120),
        images:
          breedData.topDogs
            ?.filter((d) => d.primary_image_url)
            .slice(0, 1)
            .map((d) => d.primary_image_url) || [],
      },
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me"}/breeds/${params.slug}`,
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
      breedStats.qualifying_breeds
        ?.filter((breed) => {
          // Exclude mixed breeds from static generation
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
  } catch (error) {
    console.error("Error generating static params:", error);
    return [];
  }
}

export default async function BreedDetailPage(props) {
  try {
    const params = await props.params;

    // Mixed breed redirects are now handled by middleware

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

    // Import breed descriptions for structured data
    const { default: breedDescriptions } = await import(
      "@/utils/breedDescriptions"
    );
    const breedKey = breedData.primary_breed.toLowerCase().replace(/\s+/g, "_");
    const enrichedBreedData = {
      ...breedData,
      description: breedDescriptions[breedKey] || breedData.description,
    };

    return (
      <>
        <BreedStructuredData
          breedData={enrichedBreedData}
          dogs={initialDogs}
          pageType="detail"
        />
        <ErrorBoundary fallbackMessage="Unable to load breed details. Please try refreshing the page.">
          <Suspense fallback={<BreedDetailSkeleton />}>
            <BreedDetailClient
              initialBreedData={breedData}
              initialDogs={initialDogs}
              initialParams={{}}
            />
          </Suspense>
        </ErrorBoundary>
      </>
    );
  } catch (error) {
    console.error("Error loading breed page:", error);
    notFound();
  }
}
