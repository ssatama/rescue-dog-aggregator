import Link from "next/link";
import { getIndexableBreeds } from "@/utils/indexableBreeds";

interface AllBreedsIndexProps {
  breeds?: Array<{ primary_breed?: string; breed_slug?: string; breed_type?: string; breed_group?: string; count?: number }>;
}

/**
 * Server-rendered A–Z links to every breed page in the sitemap, so the hub links each
 * one without depending on a group being expanded (#438).
 */
export default function AllBreedsIndex({ breeds }: AllBreedsIndexProps) {
  const indexable = getIndexableBreeds(breeds).sort((a, b) =>
    (a.primary_breed ?? "").localeCompare(b.primary_breed ?? "", "en"),
  );
  if (indexable.length === 0) return null;

  return (
    <section id="all-breeds" className="py-12 bg-white dark:bg-gray-900" aria-labelledby="all-breeds-heading">
      <div className="container mx-auto px-4">
        <h2 id="all-breeds-heading" className="text-3xl font-bold mb-8 text-center dark:text-white">
          All Breeds A–Z
        </h2>
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
          {indexable.map((breed) => (
            <li key={breed.breed_slug}>
              <Link
                href={`/breeds/${breed.breed_slug}`}
                className="text-gray-700 dark:text-gray-300 hover:text-primary hover:underline"
              >
                {breed.primary_breed}
              </Link>
              {breed.count ? <span className="text-sm text-gray-500 dark:text-gray-400"> ({breed.count})</span> : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
