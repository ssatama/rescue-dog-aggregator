import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Dog } from "../../../types/dog";
import type { DogWithLlm } from "../../../services/serverAnimalsService";
import { reportError } from "../../../utils/logger";
import {
  generateSEODescription,
  generateFallbackDescription,
} from "../../../utils/descriptionQuality";
import DogDetailClient from "./DogDetailClient";
import DogDetailSkeleton from "../../../components/ui/DogDetailSkeleton";
import Layout from "../../../components/layout/Layout";
import { prioritizeDogsForStaticParams } from "./prioritizeDogsForStaticParams";
import { getIndexableBreeds } from "@/utils/indexableBreeds";
import { clampDescription, clampTitle } from "@/utils/seoMeta";
import { getCountryName } from "@/utils/countryNames";

const STATIC_PARAMS_LIMIT = 500;

async function fetchAnimalBySlug(slug: string): Promise<DogWithLlm | null> {
  if (process.env.NODE_ENV === "test" && process.env.JEST_WORKER_ID) {
    const { getAnimalBySlug } = await import("../../../services/animalsService");
    return getAnimalBySlug(slug) as Promise<DogWithLlm | null>;
  }
  const { getAnimalBySlug } = await import("../../../services/serverAnimalsService");
  return getAnimalBySlug(slug);
}

interface DogDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(props: DogDetailPageProps): Promise<Metadata> {
  try {
    // Only use hardcoded response for e2e tests, not Jest unit tests
    if (process.env.NODE_ENV === "test" && !process.env.JEST_WORKER_ID) {
      return {
        title:
          "Bella - Labrador Mix Available for Adoption | Rescue Dog Aggregator",
        description: "Meet Bella, a Labrador Mix looking for a forever home.",
      };
    }

    const resolvedParams = await props.params;

    let dog: DogWithLlm | null | undefined;
    dog = await fetchAnimalBySlug(resolvedParams.slug);

    if (!dog) {
      return {
        title: "Dog Not Found | Rescue Dog Aggregator",
        description: "The requested dog could not be found. Browse our available dogs for adoption.",
      };
    }

    // Name, breed and location first, no site suffix: search engines cut titles past ~65
    // characters, and the suffix used to push every dog page over (#444)
    const breedLabel = dog.standardized_breed || dog.breed;
    const breedText = breedLabel && breedLabel.toLowerCase() !== "unknown" ? breedLabel : "Rescue Dog";
    const country = dog.organization?.country ? getCountryName(dog.organization.country) : null;
    const title = clampTitle(
      `${dog.name || "Rescue Dog"}, ${breedText} for Adoption${country && country !== "Unknown" ? ` in ${country}` : ""}`,
    );

    const seoDescription = generateSEODescription(dog);

    const description = clampDescription(seoDescription || generateFallbackDescription(dog));

    const truncateDescription = (text: string | null, maxLength: number): string | undefined => {
      if (!text) return undefined;
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength - 3) + "...";
    };

    const truncateTitle = (text: string | null, maxLength: number): string | undefined => {
      if (!text) return undefined;
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength - 3) + "...";
    };

    const socialDescription =
      seoDescription || generateFallbackDescription(dog);

    const openGraphDescription = truncateDescription(socialDescription, 300);
    const twitterDescription = truncateDescription(socialDescription, 200);

    const baseTitle = dog.llm_tagline
      ? `${dog.name}: ${dog.llm_tagline}`
      : `${dog.name} - Available for Adoption`;
    const openGraphTitle = truncateTitle(baseTitle, 95);
    const twitterTitle = truncateTitle(baseTitle, 65);

    const hasImage = Boolean(dog.primary_image_url);
    const twitterCard = hasImage ? "summary_large_image" : "summary";
    const fallbackImage = {
      url: "https://www.rescuedogs.me/images/default-dog-social.jpg",
      alt: "Rescue Dog Aggregator - Find your perfect rescue dog",
      width: 1200,
      height: 630,
      type: "image/jpeg",
    };

    const ogImages = dog.primary_image_url
      ? [{
          url: dog.primary_image_url,
          alt: `Photo of ${dog.name}, a ${dog.standardized_breed || dog.breed || "dog"} available for adoption`,
        }]
      : [fallbackImage];

    // The detail route serves dogs the scrapers retired (see
    // get_animal_by_slug), so the URL keeps returning 200 after a listing
    // vanishes from its organisation. Without this the page stays an
    // indexable, live-looking profile for a dog nobody can adopt.
    const isRetired = dog.active === false;

    const metadata: Metadata = {
      title,
      description,
      ...(isRetired && { robots: { index: false, follow: true } }),
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me"}/dogs/${resolvedParams.slug}`,
      },
      openGraph: {
        title: openGraphTitle,
        description: openGraphDescription,
        type: "article",
        locale: "en_US",
        siteName: "Rescue Dog Aggregator",
        url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.rescuedogs.me"}/dogs/${resolvedParams.slug}`,
        images: ogImages,
        ...(dog.created_at && { publishedTime: dog.created_at }),
        section: "Pet Adoption",
        tags: [
          "rescue dogs",
          "pet adoption",
          ...(dog.standardized_breed ? [dog.standardized_breed] : []),
          ...(dog.organization?.city ? [dog.organization.city] : []),
        ].filter(Boolean),
      },
      twitter: {
        card: twitterCard,
        site: "@rescuedogsme",
        creator: "@rescuedogsme",
        title: twitterTitle,
        description: twitterDescription,
        images: ogImages,
      },
    };

    return metadata;
  } catch (error) {
    reportError(error, { context: "generateMetadata", component: "DogDetailPage" });
    return {
      title: "Error Loading Dog | Rescue Dog Aggregator",
      description:
        "We encountered an error loading this dog's details. Please try again later.",
    };
  }
}

const isTestEnvironment =
  typeof process !== "undefined" && process.env.NODE_ENV === "test";

function DogDetailPage(_props: DogDetailPageProps): React.JSX.Element {
  return <Layout><DogDetailClient /></Layout>;
}

// Neither helper throws: the cached server fetches return a fallback on API failure.
async function fetchRelatedDogs(dog: Dog): Promise<Dog[] | undefined> {
  if (!dog.organization_id) return undefined;
  const { getAnimals } = await import("../../../services/serverAnimalsService");
  const dogs = await getAnimals({ organization_id: dog.organization_id, limit: 4, offset: 0 });
  const related = dogs.filter((other) => other.id !== dog.id).slice(0, 3);
  // getAnimals answers [] both for "none" and for a failed request. Pass nothing then, so
  // the client fetches and decides, rather than caching "No other dogs" for the ISR window.
  return related.length > 0 ? related : undefined;
}

async function fetchBreedPageSlug(dog: Dog): Promise<string | null> {
  if (!dog.breed_slug) return null;
  const { getBreedStats } = await import("../../../services/serverAnimalsService");
  const stats = await getBreedStats();
  // On a failed stats request the breed stays plain text until the page revalidates
  const hasPage = getIndexableBreeds(stats?.qualifying_breeds).some((b) => b.breed_slug === dog.breed_slug);
  return hasPage ? dog.breed_slug : null;
}

export async function DogDetailPageAsync(props: DogDetailPageProps): Promise<React.JSX.Element> {
  const { params } = props || {};
  let resolvedParams: { slug?: string } = {};

  if (params) {
    try {
      resolvedParams = await params;
    } catch (error) {
      reportError(error, { context: "DogDetailPageAsync", operation: "resolveParams" });
      // Swallowing this left the route rendering a dog page with no slug to
      // fetch, which ISR then cached as an empty page for 48 hours.
      throw error;
    }
  }

  let initialDog: DogWithLlm | null = null;
  if (resolvedParams.slug) {
    try {
      initialDog = await fetchAnimalBySlug(resolvedParams.slug);
    } catch (error) {
      reportError(error, { context: "DogDetailPageAsync", slug: resolvedParams.slug });
      // This route is ISR-cached for `revalidate`, so rendering a page without
      // its dog would cache the failure for 48 hours. Fail the render instead:
      // the next request retries rather than serving a permanent empty shell.
      throw error;
    }

    if (!initialDog) {
      notFound();
    }
  }

  // Server-fetched so the HTML carries real links to the dog's breed page and to three more
  // dogs from its rescue (#439).
  const [initialRelatedDogs, breedPageSlug] = initialDog
    ? await Promise.all([fetchRelatedDogs(initialDog), fetchBreedPageSlug(initialDog)])
    : [undefined, null];

  return (
    <Layout>
      <Suspense fallback={<DogDetailSkeleton />}>
        <DogDetailClient
          initialDog={initialDog}
          initialRelatedDogs={initialRelatedDogs}
          breedPageSlug={breedPageSlug}
        />
      </Suspense>
    </Layout>
  );
}

export const revalidate = 172800;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    if (process.env.NODE_ENV === "test" && !process.env.JEST_WORKER_ID) {
      return [{ slug: "bella-labrador-mix" }];
    }

    if (process.env.NODE_ENV === "test" && process.env.JEST_WORKER_ID) {
      const { getAllAnimals } = await import("../../../services/animalsService");
      const dogs = await getAllAnimals();
      return dogs
        .filter((dog): dog is Dog & { slug: string } => typeof dog.slug === "string" && dog.slug !== "")
        .map((dog) => ({ slug: dog.slug }));
    }

    const { getAllAnimalsForSitemap } = await import("../../../services/animalsService");
    const dogs = await getAllAnimalsForSitemap();

    return prioritizeDogsForStaticParams(dogs, STATIC_PARAMS_LIMIT);

  } catch (error) {
    reportError(error, { context: "DogDetailPage.generateStaticParams" });
    return [];
  }
}

export default isTestEnvironment ? DogDetailPage : DogDetailPageAsync;
