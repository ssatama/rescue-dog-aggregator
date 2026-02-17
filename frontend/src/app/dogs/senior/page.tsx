import type { Metadata } from "next";
import { Suspense } from "react";
import SeniorDogsClient from "./SeniorDogsClient";
import AgeStructuredData from "@/components/age/AgeStructuredData";
import { getAnimals, getAllMetadata, getAgeStats } from "@/services/serverAnimalsService";
import { AGE_CATEGORIES } from "@/utils/ageData";
import DogCardSkeletonOptimized from "@/components/ui/DogCardSkeletonOptimized";

export const revalidate = 300;

const seniorCategory = AGE_CATEGORIES.senior;

export async function generateMetadata(): Promise<Metadata> {
  const ageStats = await getAgeStats();
  const seniorCategoryStat = ageStats?.ageCategories?.find((c: { slug: string }) => c.slug === "senior");
  const count = seniorCategoryStat?.count || 0;

  return {
    title: `${count.toLocaleString()}+ Senior Rescue Dogs for Adoption | Give an Older Dog a Home`,
    description: `Adopt a senior rescue dog (8+ years). ${count.toLocaleString()} gentle, loving older dogs seeking their forever homes. Often house-trained with calm temperaments. ${seniorCategory.tagline}`,
    keywords: seniorCategory.seoKeywords,
    alternates: {
      canonical: "https://www.rescuedogs.me/dogs/senior",
    },
    openGraph: {
      title: `${count.toLocaleString()}+ Senior Rescue Dogs Available for Adoption`,
      description: `Give an older dog a loving home. ${count.toLocaleString()} senior dogs currently available from trusted organizations.`,
      type: "website",
      images: ["/og-image.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${count} Senior Rescue Dogs for Adoption`,
      description: `Browse ${count} senior rescue dogs (8+ years)`,
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

export default async function SeniorDogsPage(): Promise<React.JSX.Element> {
  const [initialDogs, metadata, ageStats] = await Promise.all([
    getAnimals({
      age_category: seniorCategory.apiValue,
      limit: 20,
      offset: 0,
    }),
    getAllMetadata(),
    getAgeStats(),
  ]);

  const seniorCategoryStat = ageStats?.ageCategories?.find((c: { slug: string }) => c.slug === "senior");
  const totalCount = seniorCategoryStat?.count || 0;

  return (
    <>
      <AgeStructuredData ageCategory={seniorCategory} dogCount={totalCount} />
      <Suspense fallback={<LoadingFallback />}>
        <SeniorDogsClient
          ageCategory={seniorCategory}
          initialDogs={initialDogs}
          metadata={metadata}
          totalCount={totalCount}
        />
      </Suspense>
    </>
  );
}
