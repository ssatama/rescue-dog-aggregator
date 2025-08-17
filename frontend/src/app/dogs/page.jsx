import { Suspense } from "react";
import { getAnimals, getAllMetadata } from "../../services/serverAnimalsService";
import DogsPageClientSimplified from "./DogsPageClientSimplified";
import DogCardSkeletonOptimized from "../../components/ui/DogCardSkeletonOptimized";
import "../../styles/animations.css";

// Enable ISR with 5-minute revalidation
export const revalidate = 300;

// Generate metadata for SEO
export async function generateMetadata() {
  return {
    title: 'Find Your New Best Friend | Rescue Dog Aggregator',
    description: 'Browse hundreds of rescue dogs looking for their forever homes. Filter by size, age, location, and more.',
    openGraph: {
      title: 'Find Rescue Dogs',
      description: 'Browse hundreds of rescue dogs looking for their forever homes.',
      images: ['/og-dogs.jpg'],
    },
  };
}

// Server Component - fetches data at build/request time
export default async function DogsPageOptimized(props) {
  // Await searchParams in Next.js 15
  const searchParams = await props.searchParams;
  
  // Parse search params for initial filtering
  const params = {
    limit: 20,
    offset: 0,
    search: searchParams?.search || null,
    size: searchParams?.size || null,
    age: searchParams?.age || null,
    sex: searchParams?.sex || null,
    organization_id: searchParams?.organization_id || null,
    breed: searchParams?.breed || null,
    location_country: searchParams?.location_country || null,
    available_country: searchParams?.available_country || null,
    available_region: searchParams?.available_region || null,
  };

  // Fetch initial data server-side (cached and deduplicated)
  const [initialDogs, metadata] = await Promise.all([
    getAnimals(params),
    getAllMetadata(),
  ]);

  // Render loading skeletons while client hydrates
  const LoadingFallback = () => (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <DogCardSkeletonOptimized key={i} priority={i < 4} />
        ))}
      </div>
    </div>
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
      <DogsPageClientSimplified
        initialDogs={initialDogs}
        metadata={metadata}
        initialParams={params}
      />
    </Suspense>
  );
}