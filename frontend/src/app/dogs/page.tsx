import type { Metadata } from "next";
import { clampDescription } from "@/utils/seoMeta";
import { formatCount } from "@/utils/formatCount";
import { Suspense } from "react";
import {
  getAnimals,
  getAllMetadata,
  getStatistics,
} from "../../services/serverAnimalsService";
import DogsPageClientSimplified from "./DogsPageClientSimplified";
import Layout from "../../components/layout/Layout";
import ServerDogListing from "@/components/dogs/ServerDogListing";
import "../../styles/animations.css";

export const revalidate = 21600;

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getStatistics();
  return {
    title: "Find Your New Best Friend | Rescue Dog Aggregator",
    // Live figures, as on the homepage; the hardcoded "hundreds … 13 organizations" went stale (#444)
    description: clampDescription(
      stats.total_dogs > 0
        ? `Browse ${formatCount(stats.total_dogs)} rescue dogs from ${stats.total_organizations} verified European rescues. Filter by breed, size, age, location and personality.`
        : "Browse rescue dogs from verified European rescues. Filter by breed, size, age, location and personality.",
    ),
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
      <Suspense fallback={<ServerDogListing title="Find Your New Best Friend" intro="Browse adoptable dogs from verified European rescue organizations." dogs={initialDogs} />}>
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
