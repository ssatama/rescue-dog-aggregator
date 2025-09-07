import BreedsHubClient from "./BreedsHubClient";
import { getBreedStats } from "@/services/serverAnimalsService";
import { getMixedBreedData, getPopularBreedsWithImages } from "@/services/breedImagesService";

export const revalidate = 300; // 5-minute revalidation

export async function generateMetadata() {
  return {
    title: "Dog Breeds | 2,717 Rescue Dogs Across 259 Breeds",
    description:
      "Discover rescue dogs by breed. Browse 26 popular breeds with dedicated pages, personality profiles, and real-time availability from verified rescue organizations.",
    openGraph: {
      title: "Find Rescue Dogs by Breed",
      description:
        "Browse rescue dogs by breed with personality profiles and real-time availability.",
      images: ["/og-breeds.jpg"],
    },
  };
}

export default async function BreedsPage() {
  // Fetch all data in parallel
  const [breedStats, mixedBreedData, popularBreeds] = await Promise.all([
    getBreedStats(),
    getMixedBreedData(),
    getPopularBreedsWithImages(8)
  ]);

  // Since data is fetched before rendering, Suspense won't trigger
  // The loading state would be handled by Next.js loading.jsx if needed
  return (
    <BreedsHubClient 
      initialBreedStats={breedStats}
      mixedBreedData={mixedBreedData}
      popularBreedsWithImages={popularBreeds}
    />
  );
}
