import { FILTER_DEFAULTS } from "@/constants/filters";
import { formatCount } from "@/utils/formatCount";
import { clampDescription } from "@/utils/seoMeta";
import type { Metadata } from "next";
import { Suspense } from "react";
import AgeLandingClient from "../age/AgeLandingClient";
import Layout from "@/components/layout/Layout";
import ServerDogListing from "@/components/dogs/ServerDogListing";
import AgeStructuredData from "@/components/age/AgeStructuredData";
import { getAnimals, getAllMetadata, getAgeStats, getListCounts } from "@/services/serverAnimalsService";
import { AGE_CATEGORIES } from "@/utils/ageData";

export const revalidate = 86400;

const puppyCategory = AGE_CATEGORIES.puppies;

export async function generateMetadata(): Promise<Metadata> {
  const ageStats = await getAgeStats();
  const puppyCategoryStat = ageStats?.ageCategories?.find((c: { slug: string }) => c.slug === "puppies");
  const count = puppyCategoryStat?.count || 0;

  return {
    title: `${formatCount(count)}+ Rescue Puppies for Adoption | Find Your Perfect Puppy`,
    description: clampDescription(`Adopt a rescue puppy today. Browse ${formatCount(count)} puppies under 1 year old from verified rescue organizations across Europe. ${puppyCategory.tagline}`),
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
  const [initialDogs, metadata, ageStats, counts] = await Promise.all([
    getAnimals({
      age_category: puppyCategory.apiValue,
      age_known: true,
      sort: FILTER_DEFAULTS.SORT,
      limit: 20,
      offset: 0,
    }),
    getAllMetadata(),
    getAgeStats(),
    getListCounts({ age_category: puppyCategory.apiValue }),
  ]);

  const puppyCategoryStat = ageStats?.ageCategories?.find((c: { slug: string }) => c.slug === "puppies");
  const totalCount = puppyCategoryStat?.count || 0;

  return (
    <Layout>
      <AgeStructuredData ageCategory={puppyCategory} dogCount={totalCount} />
      <Suspense fallback={<ServerDogListing title={puppyCategory.title} intro={puppyCategory.tagline} dogs={initialDogs} />}>
        <AgeLandingClient
          ageCategory={puppyCategory}
          initialDogs={initialDogs}
          metadata={metadata}
          totalCount={totalCount}
          adoptableOptions={counts?.available_country_options}
        />
      </Suspense>
    </Layout>
  );
}
