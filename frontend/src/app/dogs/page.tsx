import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getAnimals,
  getAllMetadata,
} from "../../services/serverAnimalsService";
import DogsPageClientSimplified from "./DogsPageClientSimplified";
import DogCardSkeletonOptimized from "../../components/ui/DogCardSkeletonOptimized";
import Layout from "../../components/layout/Layout";
import "../../styles/animations.css";

export const revalidate = 21600;

export async function generateMetadata(): Promise<Metadata> {
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

export default async function DogsPageOptimized(): Promise<React.JSX.Element> {
  // Deliberately independent of searchParams so this route stays statically
  // cacheable. Reading them opts the page into dynamic rendering, which made
  // every request — overwhelmingly bots — re-render and re-query the backend.
  //
  // Nothing is lost: the client discards initialDogs whenever the URL carries
  // filters (useDogsPagination) and reads each filter value from
  // useSearchParams (useDogsFilters), which already takes precedence over
  // initialParams. The server-side filtered fetch was work the client threw
  // away.
  const [initialDogs, metadata] = await Promise.all([
    getAnimals({ limit: 20, offset: 0 }),
    getAllMetadata(),
  ]);

  const collectionJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Available Rescue Dogs",
    description: "Browse rescue dogs available for adoption from verified European rescue organizations",
    url: "https://www.rescuedogs.me/dogs",
  }).replace(/</g, "\\u003c");

  return (
    <Layout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: collectionJsonLd }}
      />
      <Suspense fallback={<LoadingFallback />}>
        <DogsPageClientSimplified
          initialDogs={initialDogs}
          metadata={metadata}
          initialParams={{}}
        />
      </Suspense>
      <section className="container mx-auto px-4 py-12 lg:pl-[calc(16rem+2rem+1rem)]">
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto text-center leading-relaxed">
          Every dog listed here is available for adoption from a verified
          European rescue organization. Our listings are updated multiple times
          per week with new dogs from shelters and rescues across the continent.
          Use the filters to search by breed, size, age, sex, or location.
        </p>
      </section>
    </Layout>
  );
}
