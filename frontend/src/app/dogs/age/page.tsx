import type { Metadata } from "next";
import { Suspense } from "react";
import AgeHubClient from "./AgeHubClient";
import Layout from "@/components/layout/Layout";
import AgeStructuredData from "@/components/age/AgeStructuredData";
import { getAgeStats } from "@/services/serverAnimalsService";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getAgeStats();
  const totalDogs = stats?.total || 1200;
  const puppyCount = stats?.ageCategories?.find((c: { slug: string }) => c.slug === "puppies")?.count || 600;
  const seniorCount = stats?.ageCategories?.find((c: { slug: string }) => c.slug === "senior")?.count || 500;

  return {
    title: `Browse Dogs by Age | ${puppyCount.toLocaleString()} Puppies & ${seniorCount.toLocaleString()} Seniors`,
    description: `Find your perfect match by age. Browse ${puppyCount.toLocaleString()} playful puppies ready for adventure or ${seniorCount.toLocaleString()} wise senior dogs with so much love to give.`,
    keywords:
      "rescue puppies, senior rescue dogs, adopt puppy, adopt senior dog, older dogs for adoption, young rescue dogs",
    alternates: {
      canonical: "https://www.rescuedogs.me/dogs/age",
    },
    openGraph: {
      title: "Browse Rescue Dogs by Age",
      description: `${puppyCount.toLocaleString()} puppies and ${seniorCount.toLocaleString()} senior dogs waiting for their forever homes`,
      type: "website",
      images: ["/og-image.png"],
    },
  };
}

function LoadingFallback(): React.JSX.Element {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-64 bg-muted animate-pulse rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

export default async function AgeHubPage(): Promise<React.JSX.Element> {
  const ageStats = await getAgeStats();

  return (
    <Layout>
      <AgeStructuredData stats={ageStats} pageType="index" />
      <Suspense fallback={<LoadingFallback />}>
        <AgeHubClient initialStats={ageStats} />
      </Suspense>
    </Layout>
  );
}
