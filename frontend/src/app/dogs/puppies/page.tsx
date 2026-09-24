import { formatCount } from "@/utils/formatCount";
import type { Metadata } from "next";
import { Suspense } from "react";
import PuppiesClient from "./PuppiesClient";
import Layout from "@/components/layout/Layout";
import ServerDogListing from "@/components/dogs/ServerDogListing";
import AgeStructuredData from "@/components/age/AgeStructuredData";
import { getAnimals, getAllMetadata, getAgeStats } from "@/services/serverAnimalsService";
import { AGE_CATEGORIES } from "@/utils/ageData";

export const revalidate = 86400;

const puppyCategory = AGE_CATEGORIES.puppies;

export async function generateMetadata(): Promise<Metadata> {
  const ageStats = await getAgeStats();
  const puppyCategoryStat = ageStats?.ageCategories?.find((c: { slug: string }) => c.slug === "puppies");
  const count = puppyCategoryStat?.count || 0;

  return {
    title: `${formatCount(count)}+ Rescue Puppies for Adoption | Find Your Perfect Puppy`,
    description: `Adopt a rescue puppy today. Browse ${formatCount(count)} puppies under 1 year old from verified rescue organizations across Europe. ${puppyCategory.tagline}`,
    keywords: puppyCategory.seoKeywords,
    alternates: {
      canonical: "https://www.rescuedogs.me/dogs/puppies",
    },
    openGraph: {
      title: `${formatCount(count)}+ Rescue Puppies Available for Adoption`,
      description: `Find your perfect rescue puppy. ${formatCount(count)} puppies currently available from trusted organizations.`,
      type: "website",
      images: ["/og-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${count} Rescue Puppies for Adoption`,
      description: `Browse ${count} rescue puppies under 1 year old`,
    },
  };
}


export default async function PuppiesPage(): Promise<React.JSX.Element> {
  const [initialDogs, metadata, ageStats] = await Promise.all([
    getAnimals({
      age_category: puppyCategory.apiValue,
      limit: 20,
      offset: 0,
    }),
    getAllMetadata(),
    getAgeStats(),
  ]);

  const puppyCategoryStat = ageStats?.ageCategories?.find((c: { slug: string }) => c.slug === "puppies");
  const totalCount = puppyCategoryStat?.count || 0;

  return (
    <Layout>
      <AgeStructuredData ageCategory={puppyCategory} dogCount={totalCount} />
      <Suspense fallback={<ServerDogListing title="Rescue Puppies" intro={puppyCategory.tagline} dogs={initialDogs} />}>
        <PuppiesClient
          ageCategory={puppyCategory}
          initialDogs={initialDogs}
          metadata={metadata}
          totalCount={totalCount}
        />
      </Suspense>
    </Layout>
  );
}
