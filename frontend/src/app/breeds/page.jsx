import { Suspense } from "react";
import BreedsHubClient from "./BreedsHubClient";
import { getBreedStats } from "@/services/serverAnimalsService";
import { Card } from "@/components/ui/card";
import SkeletonPulse from "@/components/ui/SkeletonPulse";

export const revalidate = 300; // 5-minute revalidation

export async function generateMetadata() {
  return {
    title: "Dog Breeds | 2,717 Rescue Dogs Across 259 Breeds",
    description: "Discover rescue dogs by breed. Browse 26 popular breeds with dedicated pages, personality profiles, and real-time availability from verified rescue organizations.",
    openGraph: {
      title: "Find Rescue Dogs by Breed",
      description: "Browse rescue dogs by breed with personality profiles and real-time availability.",
      images: ["/og-breeds.jpg"],
    },
  };
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <SkeletonPulse className="h-12 w-96 mx-auto mb-4" />
          <SkeletonPulse className="h-6 w-72 mx-auto mb-2" />
          <SkeletonPulse className="h-5 w-64 mx-auto" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <SkeletonPulse className="h-6 w-32 mb-2" />
              <SkeletonPulse className="h-8 w-24" />
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Card key={i} className="p-6">
              <SkeletonPulse className="h-6 w-40 mb-2" />
              <SkeletonPulse className="h-5 w-20" />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function BreedsPage(props) {
  const searchParams = await props.searchParams;
  
  // Fetch breed statistics from the new API endpoint
  const breedStats = await getBreedStats();
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BreedsHubClient 
        initialBreedStats={breedStats}
        initialParams={searchParams}
      />
    </Suspense>
  );
}