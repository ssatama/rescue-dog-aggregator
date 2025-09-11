import BreedsHubClient from "./BreedsHubClient";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { getBreedStats } from "@/services/serverAnimalsService";
import { getMixedBreedData, getPopularBreedsWithImages, getBreedGroupsWithTopBreeds } from "@/services/breedImagesService";

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
  const [breedStats, mixedBreedData, popularBreeds, breedGroups] = await Promise.all([
    getBreedStats(),
    getMixedBreedData(),
    getPopularBreedsWithImages(8),
    getBreedGroupsWithTopBreeds()
  ]);

  // Since data is fetched before rendering, Suspense won't trigger
  // The loading state would be handled by Next.js loading.jsx if needed
  return (
    <ErrorBoundary fallbackMessage="Unable to load breeds page. Please try refreshing the page.">
      <BreedsHubClient 
        initialBreedStats={breedStats}
        mixedBreedData={mixedBreedData}
        popularBreedsWithImages={popularBreeds}
        breedGroups={breedGroups}
      />
    </ErrorBoundary>
  );
}
