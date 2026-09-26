import { formatCount } from "@/utils/formatCount";
import type { Metadata } from "next";
import AgeHubClient from "./AgeHubClient";
import Layout from "@/components/layout/Layout";
import AgeStructuredData from "@/components/age/AgeStructuredData";
import { getAgeStats } from "@/services/serverAnimalsService";

export const revalidate = 604800;

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getAgeStats();
  const totalDogs = stats?.total || 1200;
  const puppyCount = stats?.ageCategories?.find((c: { slug: string }) => c.slug === "puppies")?.count || 600;
  const seniorCount = stats?.ageCategories?.find((c: { slug: string }) => c.slug === "senior")?.count || 500;

  return {
    title: `Browse Dogs by Age | ${formatCount(puppyCount)} Puppies & ${formatCount(seniorCount)} Seniors`,
    description: `Find your perfect match by age. Browse ${formatCount(puppyCount)} playful puppies ready for adventure or ${formatCount(seniorCount)} wise senior dogs with so much love to give.`,
    keywords:
      "rescue puppies, senior rescue dogs, adopt puppy, adopt senior dog, older dogs for adoption, young rescue dogs",
    alternates: {
      canonical: "https://www.rescuedogs.me/dogs/age",
    },
    openGraph: {
      title: "Browse Rescue Dogs by Age",
      description: `${formatCount(puppyCount)} puppies and ${formatCount(seniorCount)} senior dogs waiting for their forever homes`,
      type: "website",
      images: ["/og-image.png"],
    },
  };
}

export default async function AgeHubPage(): Promise<React.JSX.Element> {
  const ageStats = await getAgeStats();

  return (
    <Layout>
      <AgeStructuredData stats={ageStats} pageType="index" />
      <AgeHubClient initialStats={ageStats} />
    </Layout>
  );
}
