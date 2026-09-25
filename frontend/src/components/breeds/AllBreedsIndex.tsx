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
    <section id="all-breeds" className="container mx-auto scroll-mt-20 px-4 pb-12 pt-8" aria-labelledby="all-breeds-heading">
      <h2 id="all-breeds-heading" className="mb-4 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
        All breeds A–Z
      </h2>
      <ul className="grid grid-cols-2 gap-x-6 md:grid-cols-3 lg:grid-cols-4">
        {indexable.map((breed) => (
          <li key={breed.breed_slug}>
            <Link
              href={`/breeds/${breed.breed_slug}`}
              className="block py-2.5 text-ink hover:text-orange-700 hover:underline dark:hover:text-orange-400"
            >
              {breed.primary_breed}
              {breed.count ? <span className="text-sm text-subtle"> ({breed.count})</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
