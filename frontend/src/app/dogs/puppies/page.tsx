import type { Metadata } from "next";
import { Suspense } from "react";
import PuppiesClient from "./PuppiesClient";
import AgeStructuredData from "@/components/age/AgeStructuredData";
import { getAnimals, getAllMetadata, getAgeStats } from "@/services/serverAnimalsService";
import { AGE_CATEGORIES } from "@/utils/ageData";
import DogCardSkeletonOptimized from "@/components/ui/DogCardSkeletonOptimized";

export const revalidate = 300;

const puppyCategory = AGE_CATEGORIES.puppies;

export async function generateMetadata(): Promise<Metadata> {
  const ageStats = await getAgeStats();
  const puppyCategoryStat = ageStats?.ageCategories?.find((c: { slug: string }) => c.slug === "puppies");
  const count = puppyCategoryStat?.count || 0;

  return {
    title: `${count.toLocaleString()}+ Rescue Puppies for Adoption | Find Your Perfect Puppy`,
    description: `Adopt a rescue puppy today. Browse ${count.toLocaleString()} puppies under 1 year old from verified rescue organizations across Europe. ${puppyCategory.tagline}`,
    keywords: puppyCategory.seoKeywords,
    alternates: {
      canonical: "https://www.rescuedogs.me/dogs/puppies",
    },
    openGraph: {
      title: `${count.toLocaleString()}+ Rescue Puppies Available for Adoption`,
      description: `Find your perfect rescue puppy. ${count.toLocaleString()} puppies currently available from trusted organizations.`,
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
    <>
      <AgeStructuredData ageCategory={puppyCategory} dogCount={totalCount} />
      <Suspense fallback={<LoadingFallback />}>
        <PuppiesClient
          ageCategory={puppyCategory}
          initialDogs={initialDogs}
          metadata={metadata}
          totalCount={totalCount}
        />
      </Suspense>
    </>
  );
}
