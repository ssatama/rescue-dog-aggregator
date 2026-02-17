import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getAnimals,
  getAllMetadata,
} from "../../services/serverAnimalsService";
import DogsPageClientSimplified from "./DogsPageClientSimplified";
import DogCardSkeletonOptimized from "../../components/ui/DogCardSkeletonOptimized";
import "../../styles/animations.css";

interface DogsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Available Rescue Dogs",
    description: "Browse rescue dogs available for adoption from verified European rescue organizations",
    url: "https://www.rescuedogs.me/dogs",
  };

  return {
    title: "Find Your New Best Friend | Rescue Dog Aggregator",
    description:
      "Browse hundreds of rescue dogs looking for their forever homes. Filter by breed, size, age, location, and personality traits from 13 verified European organizations.",
    alternates: {
      canonical: "https://www.rescuedogs.me/dogs",
    },
    openGraph: {
      title: "Find Rescue Dogs",
      description:
        "Browse hundreds of rescue dogs looking for their forever homes.",
      images: ["/og-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: "Find Rescue Dogs",
      description: "Browse hundreds of rescue dogs looking for their forever homes.",
    },
    other: {
      "application/ld+json": JSON.stringify(collectionSchema),
    },
  };
}

function LoadingFallback(): React.JSX.Element {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <DogCardSkeletonOptimized key={i} priority={i < 4} />
        ))}
      </div>
    </div>
  );
}

export default async function DogsPageOptimized(props: DogsPageProps): Promise<React.JSX.Element> {
  const searchParams = await props.searchParams;

  const toStr = (v: string | string[] | undefined): string | undefined => {
    if (Array.isArray(v)) return v[0];
    return v || undefined;
  };

  const params = {
    limit: 20,
    offset: 0,
    search: toStr(searchParams?.search),
    size: toStr(searchParams?.size),
    age: toStr(searchParams?.age),
    sex: toStr(searchParams?.sex),
    organization_id: toStr(searchParams?.organization_id),
    breed: toStr(searchParams?.breed),
    breed_group: toStr(searchParams?.breed_group),
    location_country: toStr(searchParams?.location_country),
    available_country: toStr(searchParams?.available_country),
    available_region: toStr(searchParams?.available_region),
  };

  // Fetch initial data server-side (cached and deduplicated)
  const [initialDogs, metadata] = await Promise.all([
    getAnimals(params),
    getAllMetadata(),
  ]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <DogsPageClientSimplified
        initialDogs={initialDogs}
        metadata={metadata}
        initialParams={params}
      />
    </Suspense>
  );
}
