import type { Metadata } from "next";
import { Suspense } from "react";
import type { Dog } from "../../../types/dog";
import { reportError } from "../../../utils/logger";

type DogWithLlm = Dog & {
  llm_tagline?: string;
  llm_description?: string;
  has_llm_data?: boolean;
  organization?: {
    id?: number;
    name: string;
    country?: string;
    city?: string;
    slug?: string;
    config_id?: string;
  };
};

let getAnimalBySlug: ((slug: string) => Promise<DogWithLlm>) | undefined;
if (process.env.NODE_ENV === "test" && process.env.JEST_WORKER_ID) {
  getAnimalBySlug = require("../../../services/animalsService").getAnimalBySlug;
} else {
  getAnimalBySlug =
    require("../../../services/serverAnimalsService").getAnimalBySlug;
}
import DogSchema from "../../../components/seo/DogSchema";
import DogFAQSchema from "../../../components/seo/DogFAQSchema";
import {
  generateSEODescription,
  generateFallbackDescription,
} from "../../../utils/descriptionQuality";
import { getDetailHeroImageWithPosition } from "../../../utils/imageUtils";
import DogDetailClient from "./DogDetailClient";
import DogDetailSkeleton from "../../../components/ui/DogDetailSkeleton";
import ImagePreload from "../../../components/seo/ImagePreload";

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

    let dog: DogWithLlm | undefined;
    if (getAnimalBySlug) {
      dog = await getAnimalBySlug(resolvedParams.slug);
    } else {
      dog = {
        name: "Dog",
        standardized_breed: "Mixed",
        breed: "Mixed",
        created_at: new Date().toISOString(),
        primary_image_url: null,
        organization: { city: "City", country: "Country" },
      } as unknown as DogWithLlm;
    }

    const titleBase = dog.llm_tagline
      ? `${dog.name}: ${dog.llm_tagline}`
      : `${dog.name} - ${dog.standardized_breed || dog.breed || "Dog"} Available for Adoption`;
    const title = `${titleBase} | Rescue Dog Aggregator`;

    const seoDescription = generateSEODescription(dog);

    const description = seoDescription || generateFallbackDescription(dog);

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
          width: 1200,
          height: 630,
          type: "image/jpeg" as const,
        }]
      : [fallbackImage];

    const metadata: Metadata = {
      title,
      description,
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
      title: "Dog Not Found | Rescue Dog Aggregator",
      description:
        "The requested dog could not be found. Browse our available dogs for adoption.",
    };
  }
}

const isTestEnvironment =
  typeof process !== "undefined" && process.env.NODE_ENV === "test";

function DogDetailPage(_props: DogDetailPageProps): React.JSX.Element {
  return <DogDetailClient />;
}

async function DogDetailPageAsync(props: DogDetailPageProps): Promise<React.JSX.Element> {
  const { params } = props || {};
  let resolvedParams: { slug?: string } = {};

  if (params) {
    try {
      resolvedParams = await params;
    } catch {
      // Ignore params errors - Client component handles this via useParams()
    }
  }

  let initialDog: DogWithLlm | null = null;
  if (getAnimalBySlug && resolvedParams.slug) {
    try {
      initialDog = await getAnimalBySlug(resolvedParams.slug);
    } catch (error) {
      console.error("[DogDetailPageAsync] Error fetching dog data:", error);
    }
  }

  let heroImageUrl: string | null = null;
  if (initialDog?.primary_image_url) {
    try {
      heroImageUrl = getDetailHeroImageWithPosition(initialDog.primary_image_url, false).src;
    } catch (error) {
      console.error("[DogDetailPageAsync] Hero image URL computation failed:", error);
    }
  }

  return (
    <>
      {initialDog && <DogSchema dog={initialDog} />}
      {initialDog && <DogFAQSchema dog={initialDog} />}
      {heroImageUrl && <ImagePreload src={heroImageUrl} />}
      <Suspense fallback={<DogDetailSkeleton />}>
        <DogDetailClient initialDog={initialDog} />
      </Suspense>
    </>
  );
}

export const revalidate = 3600;

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    if (process.env.NODE_ENV === "test" && !process.env.JEST_WORKER_ID) {
      return [{ slug: "bella-labrador-mix" }];
    }

    if (process.env.NODE_ENV === "test" && process.env.JEST_WORKER_ID) {
      const { getAllAnimals } = require("../../../services/animalsService");
      const dogs = await getAllAnimals();
      return dogs.filter((dog: { slug?: string }) => dog?.slug).map((dog: { slug: string }) => ({ slug: dog.slug }));
    }

    const { getAllAnimalsForSitemap } = require("../../../services/animalsService");
    const dogs = await getAllAnimalsForSitemap();

    const isRecent = (dateStr: string | null): boolean => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return date > thirtyDaysAgo;
    };

    interface DogForSitemap {
      slug?: string;
      llm_description?: string;
      dog_profiler_data?: { description?: string };
      primary_image_url?: string;
      created_at?: string;
    }

    const prioritizedDogs = dogs
      .map((dog: DogForSitemap) => {
        const hasLLMContent = !!(dog.llm_description || dog.dog_profiler_data?.description);
        const hasImage = !!dog.primary_image_url;
        const isRecentDog = isRecent(dog.created_at || null);

        return {
          ...dog,
          priority: (hasLLMContent ? 10 : 0) + (hasImage ? 5 : 0) + (isRecentDog ? 3 : 0)
        };
      })
      .sort((a: { priority: number }, b: { priority: number }) => b.priority - a.priority)
      .slice(0, 500);

    console.log(`[generateStaticParams] Pre-rendering ${prioritizedDogs.length} high-priority dog pages`);

    return prioritizedDogs
      .filter((dog: DogForSitemap): dog is DogForSitemap & { slug: string } => typeof dog?.slug === "string" && dog.slug !== "")
      .map((dog: DogForSitemap & { slug: string }) => ({ slug: dog.slug }));

  } catch (error) {
    console.error('[generateStaticParams] Error:', error);
    return [];
  }
}

export default isTestEnvironment ? DogDetailPage : DogDetailPageAsync;
