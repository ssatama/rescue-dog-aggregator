import { Suspense } from "react";
import MixedBreedsClient from "./MixedBreedsClient";
import BreedDetailSkeleton from "@/components/ui/BreedDetailSkeleton";
import { getAnimals, getBreedStats } from "@/services/serverAnimalsService";

export const revalidate = 3600;

export async function generateMetadata() {
  try {
    const stats = await getBreedStats();
    const mixedCount = stats?.breed_groups?.find(g => g.name === "Mixed")?.count || 0;
    
    return {
      title: `Mixed Breed Rescue Dogs | ${mixedCount} Available for Adoption`,
      description: `Discover ${mixedCount} unique mixed breed rescue dogs waiting for homes. Each one has a special personality and story. Browse by size, age, and location.`,
      openGraph: {
        title: `${mixedCount} Mixed Breed Dogs Need Loving Homes`,
        description: `Every mixed breed is unique! Browse ${mixedCount} rescue dogs with diverse personalities and find your perfect companion.`,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `${mixedCount} Mixed Breed Dogs Need Homes`,
        description: `Unique personalities from diverse backgrounds. Find your perfect mixed breed rescue dog.`,
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Mixed Breed Rescue Dogs",
      description: "Find unique mixed breed rescue dogs for adoption",
    };
  }
}

export default async function MixedBreedsPage(props) {
  try {
    const searchParams = await props.searchParams;
    
    // Get breed statistics
    const breedStats = await getBreedStats();
    const mixedBreedData = {
      primary_breed: "Mixed Breed",
      breed_type: "mixed",
      breed_group: "Mixed",
      count: breedStats?.breed_groups?.find(g => g.name === "Mixed")?.count || 0,
      organizations: [],
      countries: [],
    };

    // Get initial mixed breed dogs
    const initialDogsResponse = await getAnimals({
      breed_type: "mixed",
      limit: 12,
      offset: 0,
    });

    const initialDogs = Array.isArray(initialDogsResponse) ? initialDogsResponse : (initialDogsResponse?.results || []);
    
    // Get popular mixed breed types (e.g., Collie Mix, Lab Mix)
    const popularMixes = await getPopularMixes();

    return (
      <Suspense fallback={<BreedDetailSkeleton />}>
        <MixedBreedsClient
          breedData={mixedBreedData}
          initialDogs={initialDogs}
          popularMixes={popularMixes}
          breedStats={breedStats}
          initialParams={searchParams || {}}
        />
      </Suspense>
    );
  } catch (error) {
    console.error("Error loading mixed breeds page:", error);
    throw error;
  }
}

async function getPopularMixes() {
  try {
    // Get counts for specific mixed breed types
    const mixTypes = [
      "Collie Mix",
      "Jack Russell Terrier Mix", 
      "Labrador Retriever Mix",
      "Cavalier King Charles Spaniel Mix",
      "Spaniel Mix",
      "Cocker Spaniel Mix",
      "German Shepherd Mix",
      "Terrier Mix",
      "Staffie Mix",
      "Lurcher"
    ];
    
    const mixCounts = await Promise.all(
      mixTypes.map(async (mixType) => {
        const response = await getAnimals({
          primary_breed: mixType,
          limit: 1,
        });
        const total = response?.total || (Array.isArray(response) ? response.length : 0);
        return {
          name: mixType,
          count: total,
          slug: mixType.toLowerCase().replace(/\s+/g, '-'),
        };
      })
    );
    
    // Filter out mixes with less than 15 dogs and sort by count
    return mixCounts
      .filter(mix => mix.count >= 15)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  } catch (error) {
    console.error("Error getting popular mixes:", error);
    return [];
  }
}