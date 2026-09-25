"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import BreedSearch from "@/components/breeds/BreedSearch";
import PopularBreedsSection from "@/components/breeds/PopularBreedsSection";
import BreedGroupsSection from "@/components/breeds/BreedGroupsSection";
import { formatCount } from "@/utils/formatCount";
import type { BreedsHubClientProps } from "@/types/breeds";

const breadcrumbItems = [{ name: "Home", url: "/" }, { name: "Breeds" }];

/**
 * The breeds index (#500): search first, so any breed is two taps away on a
 * phone, then the breeds with most dogs (mixed breeds among them), groups,
 * and the A–Z list the page renders after this.
 */
export default function BreedsHubClient({
  initialBreedStats: breedStats,
  mixedBreedData,
  popularBreedsWithImages,
  breedGroups,
  searchableBreeds,
}: BreedsHubClientProps) {
  const router = useRouter();

  if (!breedStats) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title="Unable to load breed data"
          description="We're having trouble loading breed information. Please try again later."
          actionButton={{ text: "Browse all dogs", onClick: () => router.push("/dogs") }}
        />
      </div>
    );
  }

  const totalDogs = breedStats.total_dogs ?? 0;

  return (
    <div className="container mx-auto px-4">
      <div className="pt-4">
        <Breadcrumbs items={breadcrumbItems} schema={false} />
      </div>

      <header className="flex flex-col gap-3 pb-2 pt-4 sm:pt-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Rescue dogs by breed</h1>
        {totalDogs > 0 && (
          <p className="text-subtle">
            {formatCount(totalDogs)} dogs listed now, from Labradors to one-of-a-kind mixes.{" "}
            <Link href="/dogs" className="font-semibold text-orange-700 hover:underline dark:text-orange-400">
              Browse them all
            </Link>
          </p>
        )}
        <BreedSearch breeds={searchableBreeds} />
      </header>

      <PopularBreedsSection popularBreeds={popularBreedsWithImages} mixedBreed={mixedBreedData} />

      {breedGroups && breedGroups.length > 0 && <BreedGroupsSection breedGroups={breedGroups} />}
    </div>
  );
}
