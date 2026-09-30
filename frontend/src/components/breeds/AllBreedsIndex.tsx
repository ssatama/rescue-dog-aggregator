import Link from "next/link";
import { getIndexableBreeds } from "@/utils/indexableBreeds";
import { isBreedType } from "@/utils/breedTypes";

interface AllBreedsIndexProps {
  breeds?: Array<{ primary_breed?: string; breed_slug?: string; breed_type?: string; breed_group?: string; count?: number }>;
}

type IndexedBreed = NonNullable<AllBreedsIndexProps["breeds"]>[number];

function BreedLinks({ breeds }: { breeds: IndexedBreed[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-6 md:grid-cols-3 lg:grid-cols-4">
      {breeds.map((breed) => (
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
  );
}

/**
 * Server-rendered A–Z links to every breed page in the sitemap, so the hub links each
 * one without depending on a group being expanded (#438). Types such as "Hound" have
 * pages too, listed apart so they don't read as breeds (#669).
 */
export default function AllBreedsIndex({ breeds }: AllBreedsIndexProps) {
  const indexable = getIndexableBreeds(breeds).sort((a, b) =>
    (a.primary_breed ?? "").localeCompare(b.primary_breed ?? "", "en"),
  );
  const breedsOnly = indexable.filter((breed) => !isBreedType(breed.primary_breed));
  const types = indexable.filter((breed) => isBreedType(breed.primary_breed));
  if (indexable.length === 0) return null;

  return (
    <div className="container mx-auto px-4 pb-12">
      {breedsOnly.length > 0 && (
        <section id="all-breeds" className="scroll-mt-20 pt-8" aria-labelledby="all-breeds-heading">
          <h2 id="all-breeds-heading" className="mb-4 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
            All breeds A–Z
          </h2>
          <BreedLinks breeds={breedsOnly} />
        </section>
      )}
      {types.length > 0 && (
        <section id="breed-types" className="scroll-mt-20 pt-8" aria-labelledby="breed-types-heading">
          <h2 id="breed-types-heading" className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Breed types
          </h2>
          <p className="mb-2 mt-1 text-subtle">Dogs their rescue lists as a type, such as a hound cross, rather than a breed.</p>
          <BreedLinks breeds={types} />
        </section>
      )}
    </div>
  );
}
